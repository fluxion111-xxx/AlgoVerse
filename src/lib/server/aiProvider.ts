import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { aiProviders, getAIModel, isApiKey, isQwenWorkspaceId, modelSelectionMessage, parseAISelection, workbenchModelMessage, type AIErrorCode, type AIProvider, type AISelection, type TokenUsage } from "@/lib/aiSettings";
import { isPlatformModel, platformModelIds, type PlatformModel } from "@/lib/platformAI";
import { retryAfterSeconds } from "@/lib/aiRateLimit";
import { platformQuotaConfigured, platformVisitor, reservePlatformAttempt } from "./platformLimits";
import { confirmZeroSiliconFlowPrice } from "./siliconflowPricing";
import { credentialAuthFailure, savedAICredential } from "./aiCredentialSession";

// Official DashScope regional domains accept keys from the matching region.
const qwenEndpoints = {
  "cn-beijing": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  "ap-southeast-1": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
} satisfies Record<Extract<AISelection, { provider: "qwen" }>["region"], string>;
const requestTimeoutMs = 25_000;
const reasoningTimeoutMs = 55_000;
const minuteMs = 60_000;
const maxPerKey = 6;
const maxAttemptsPerKey = 12;
const maxPerProcess = 60;
const maxConcurrent = 8;
const qwenTextModeTtlMs = 10 * minuteMs;

type PlatformSelection = { provider: "siliconflow"; model: PlatformModel };
type PersonalOperation = { admitted?: boolean; retries?: number };
type BYOKCredentials = { apiKey: string; selection: AISelection; signal: AbortSignal; visitor?: undefined; operation?: PersonalOperation;
  credentialVersion?: string; workspaceId?: string; onAuthFailure?: () => void };
type PlatformCredentials = { apiKey: string; selection: PlatformSelection; signal: AbortSignal; visitor: string; exactModel?: boolean };
export type AICredentials = BYOKCredentials | PlatformCredentials;

const siliconFlowModels = {
  primary: { id: platformModelIds.primary, thinking: false, timeoutMs: 25_000 },
  backup: { id: platformModelIds.backup, thinking: true, timeoutMs: 25_000 },
} as const;
const siliconFlowEndpoint = "https://api.siliconflow.cn/v1/chat/completions";
export type PendingAIRequest<T> = { fingerprint: string; task: Promise<T> };
type Operation = "connection_test" | "quick_start_plan" | "experiment_diagnosis" | "experiment_creator" | "experiment_agent" | "tutor" | "learning_advice";
type DialogueMessage = { role: "user" | "assistant"; content: string };
type RequestOptions<T> = {
  operation: Operation;
  instructions: string;
  input: unknown;
  dialogue?: DialogueMessage[];
  maxTokens: number;
  normalizeContent?: (content: string) => string;
  backupTutorFormat?: { instructions: string; normalizeContent: (content: string) => string };
  retryFormat?: boolean;
  validate: (value: unknown) => T | null;
};
type CompletionOptions = {
  endpoint: string;
  model: string;
  parameters: object;
  output: "json-object" | "text";
  timeoutMs: number;
  region?: string;
};

export class AIRequestError extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  readonly code?: AIErrorCode;

  constructor(message: string, status: number, retryAfter?: number, code?: AIErrorCode) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
    this.code = code;
  }
}

export class AIUnverifiedError extends AIRequestError {}

type Limits = { secret: Buffer; keys: Map<string, number>; attempts?: Map<string, number>; expiresAt: number; count: number; active: number };
const processState = globalThis as typeof globalThis & { algoVerseAILimits?: Limits };
const pendingRequestSecret = randomBytes(32);
const qwenTextModeUntil = new Map<string, number>();

export function sharePersonalOperation(credentials: AICredentials): AICredentials {
  return credentials.visitor === undefined ? { ...credentials, operation: credentials.operation ?? {} } : credentials;
}

export function reusePendingAI<T>(pending: Map<string, PendingAIRequest<T>>, id: string, credentials: AICredentials, generate: () => Promise<T>) {
  const fingerprint = createHmac("sha256", pendingRequestSecret)
    .update(JSON.stringify([credentials.selection, credentials.apiKey, credentials.visitor,
      credentials.visitor === undefined ? credentials.workspaceId : undefined])).digest("hex");
  const existing = pending.get(id);
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new AIRequestError("本轮正在生成。请稍后重试。", 409);
    return existing.task;
  }
  const task = generate().finally(() => pending.delete(id));
  pending.set(id, { fingerprint, task });
  return task;
}

function reserveRequest(provider: AIProvider, apiKey: string, operation: PersonalOperation) {
  const now = Date.now();
  const limits: Limits = processState.algoVerseAILimits ??= {
    secret: randomBytes(32), keys: new Map(), expiresAt: now + minuteMs, count: 0, active: 0,
  };
  const attempts = limits.attempts ??= new Map();
  if (now >= limits.expiresAt) {
    limits.keys.clear();
    attempts.clear();
    limits.count = 0;
    limits.expiresAt = now + minuteMs;
  }
  if (limits.active >= maxConcurrent) throw new AIRequestError("本站请求较多，请稍后再试。", 429, 5);
  const fingerprint = createHmac("sha256", limits.secret).update(`${provider}:${apiKey}`).digest("hex");
  const keyCount = limits.keys.get(fingerprint) ?? 0;
  const attemptCount = attempts.get(fingerprint) ?? 0;
  if ((!operation.admitted && keyCount >= maxPerKey) || attemptCount >= maxAttemptsPerKey || limits.count >= maxPerProcess) {
    throw new AIRequestError("本站请求太频繁，请稍后再试。", 429, Math.ceil((limits.expiresAt - now) / 1000));
  }
  if (!operation.admitted) {
    limits.keys.set(fingerprint, keyCount + 1);
    operation.admitted = true;
  }
  attempts.set(fingerprint, attemptCount + 1);
  limits.count += 1;
  limits.active += 1;
  return () => { limits.active -= 1; };
}

function allowsRequestTransport(request: Request): boolean {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (url.protocol === "https:") {
    const forwardedProtocol = request.headers.get("x-forwarded-proto");
    return (!forwardedProtocol || forwardedProtocol === "https") && (!origin || origin.startsWith("https://"));
  }
  if (url.protocol !== "http:" || process.env.NODE_ENV !== "development") return false;

  // Next can build request.url from its listener address, so also check the actual Host.
  const host = request.headers.get("host")?.toLowerCase();
  const forwardedHost = request.headers.get("x-forwarded-host")?.toLowerCase();
  const peer = request.headers.get("x-forwarded-for") ?? "";
  return !!host && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
    && (!origin || origin === `http://${host}`)
    && (!forwardedHost || forwardedHost === host)
    && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer);
}

export function assertAIRequestOrigin(request: Request) {
  if (!allowsRequestTransport(request)) {
    throw new AIRequestError("请通过 HTTPS 使用 AI。", 403);
  }
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  if ((site && site !== "same-origin" && site !== "none")
    || (origin && origin !== `${url.protocol}//${request.headers.get("host") ?? url.host}`)) {
    throw new AIRequestError("请在本站发起请求。", 403);
  }
}

export function readAICredentials(request: Request, workbench = false, configuring = false): AICredentials {
  assertAIRequestOrigin(request);
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new AIRequestError("请求格式有误。", 415);
  }
  const provider = request.headers.get("x-ai-provider") ?? "deepseek";
  const mode = request.headers.get("x-ai-mode");
  const model = request.headers.get("x-ai-model");
  const region = request.headers.get("x-ai-region");
  const authorization = request.headers.get("authorization");
  const credentialVersion = request.headers.get("x-ai-credential-version");
  const workspaceId = request.headers.get("x-ai-qwen-workspace");
  if (workspaceId !== null && (!configuring || provider !== "qwen" || !authorization || !isQwenWorkspaceId(workspaceId))) {
    throw new AIRequestError("请检查百炼工作空间 ID。", 400, undefined, "invalid_parameters");
  }
  if (provider === "siliconflow") {
    const chosen = request.headers.get("x-ai-platform-model") ?? "primary";
    if (!isPlatformModel(chosen) || model !== null || mode !== null || region !== null || authorization !== null || credentialVersion !== null) {
      throw new AIRequestError("请选择平台免费模型。", 400);
    }
    const apiKey = process.env.SILICONFLOW_API_KEY?.trim();
    if (!apiKey || !platformQuotaConfigured()) {
      console.warn("AlgoVerse platform AI configuration is incomplete.");
      throw new AIUnverifiedError("平台免费 AI 待管理员配置。", 503);
    }
    return { apiKey, selection: { provider, model: chosen }, signal: request.signal, visitor: platformVisitor(request),
      exactModel: request.headers.get("x-ai-exact-model") === "1" };
  }
  if (request.headers.has("x-ai-platform-model")) throw new AIRequestError(modelSelectionMessage, 400);
  const selection = mode === null ? parseAISelection(provider, model, region) : null;
  if (!selection) throw new AIRequestError(modelSelectionMessage, 400);
  if (workbench && !getAIModel(selection).workbench) throw new AIRequestError(workbenchModelMessage, 422);

  if (authorization === null) {
    const saved = savedAICredential(request, selection);
    if (credentialVersion !== null && credentialVersion !== saved?.credentialVersion) {
      throw new AIRequestError("AI 配置已变更。请重试。", 409, undefined, "credential_changed");
    }
    if (!saved) throw new AIRequestError("请在 AI 设置中配置此服务商的 Key。", 400, undefined, "credential_missing");
    return { apiKey: saved.apiKey, credentialVersion: saved.credentialVersion, workspaceId: saved.workspaceId, selection,
      signal: request.signal, onAuthFailure: credentialAuthFailure(request, selection.provider) };
  }
  const apiKey = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!isApiKey(apiKey)) throw new AIRequestError("请检查 Key 格式。", 400);
  return { apiKey, selection, signal: request.signal, workspaceId: workspaceId ?? undefined };
}

export function platformAIConfigured() {
  return Boolean(process.env.SILICONFLOW_API_KEY?.trim() && platformQuotaConfigured());
}

export function aiJson(value: unknown, status = 200, retryAfter?: number) {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  if (retryAfter !== undefined) headers.set("Retry-After", String(retryAfter));
  return Response.json(value, { status, headers });
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AIRequestError) {
    return aiJson({ status: "error", message: error.message, ...(error.code && { code: error.code }) }, error.status, error.retryAfter);
  }
  console.error("AlgoVerse AI request failed.");
  return aiJson({ status: "error", message: "服务暂不可用，请重试。" }, 500);
}

export function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readUsage(value: unknown): TokenUsage | null {
  const usage = asObject(value);
  const inputTokens = usage?.prompt_tokens;
  const outputTokens = usage?.completion_tokens;
  const totalTokens = usage?.total_tokens;
  if (typeof inputTokens !== "number" || !Number.isSafeInteger(inputTokens) || inputTokens < 0
    || typeof outputTokens !== "number" || !Number.isSafeInteger(outputTokens) || outputTokens < 0
    || !Number.isSafeInteger(totalTokens) || totalTokens !== inputTokens + outputTokens) return null;
  return { inputTokens, outputTokens, totalTokens };
}

class PlatformUpstreamError extends AIRequestError {
  readonly retryable: boolean;

  constructor(status: number, retryable: boolean, retryAfter?: number) {
    super(retryable ? "平台免费 AI 暂不可用。" : "免费服务异常。请联系管理员。", status, retryAfter);
    this.retryable = retryable;
  }
}

type CompletionFormatError = "json" | "schema" | "empty" | "truncated";

class AICompletionFormatError extends AIRequestError {
  readonly reason: CompletionFormatError;

  constructor(reason: CompletionFormatError) {
    super(reason === "empty" ? "AI 未返回正文，请重试。"
      : reason === "truncated" ? "AI 回复未写完，请重试。" : "AI 返回格式有误，请重试。", 502);
    this.reason = reason;
  }
}

class QwenThinkingFormatError extends AIRequestError {
  constructor() {
    super("百炼暂不支持此思考输出格式。", 422);
  }
}

async function retryCompletionFormat<T>(enabled: boolean, attempt: (retry: boolean) => Promise<T>) {
  try {
    return await attempt(false);
  } catch (error) {
    if (!enabled || !(error instanceof AICompletionFormatError)) throw error;
    return attempt(true);
  }
}

function repairInstructions(instructions: string) {
  return `${instructions}\n上次回复为空、未写完或未通过格式校验。请重新作答。只输出一个完整的 JSON 对象。保留用户的要求，缩短解释，按上面的字段和类型输出。省略用不到的可选字段。`;
}

async function providerError(provider: AIProvider | "siliconflow", response: Response) {
  const { status } = response;
  const retryAfter = status === 429 || status === 503 ? retryAfterSeconds(response.headers.get("Retry-After")) : undefined;
  if (provider === "siliconflow") {
    void response.body?.cancel().catch(() => {});
    if (status === 429 || status === 408 || status >= 500) {
      return new PlatformUpstreamError(status === 429 ? 429 : status === 408 || status === 504 ? 504 : 503, true,
        retryAfter ?? (status === 429 ? 30 : undefined));
    }
    console.warn("AlgoVerse SiliconFlow request rejected.", { status });
    return new PlatformUpstreamError(503, false);
  }
  if ([400, 422].includes(status) || (provider === "qwen" && [401, 403, 429].includes(status))) {
    const body = asObject(await response.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) return null;
      throw error;
    }));
    const detail = asObject(body?.error) ?? body;
    const code = detail?.code ?? body?.code;
    const message = detail?.message ?? body?.message;
    if ((status === 400 || status === 422) && (code === "context_length_exceeded" || code === "PromptTokensExceeded"
      || (typeof message === "string" && /maximum context length|range of input length|input length exceeds/i.test(message)))) {
      return new AIRequestError("上下文超长。请缩短输入。", 422, undefined, "context_limit");
    }
    if (provider === "qwen" && (status === 400 || status === 422) && typeof message === "string"
      && /json mode response is not supported when enable_thinking is true/i.test(message)) {
      return new QwenThinkingFormatError();
    }
    if (code === "Arrearage" || code === "isv.OUT_OF_SERVICE") return new AIRequestError("百炼余额不足。请充值后重试。", 402, undefined, "balance");
    if (code === "InvalidApiKey" || code === "invalid_api_key") return new AIRequestError("授权失败。请检查 Key、地域和工作空间。", 401, undefined, "authentication");
    if (code === "insufficient_quota" || code === "Throttling.AllocationQuota") return new AIRequestError("百炼额度不足。请检查用量。", 429);
    if (code === "model_not_found" || code === "ModelNotFound" || code === "model_not_supported") {
      return new AIRequestError(modelSelectionMessage, 404, undefined, "model_unavailable");
    }
    if (code === "Model.AccessDenied" || code === "access_denied") {
      return new AIRequestError("百炼拒绝访问。请检查模型权限。", 403, undefined, "model_unavailable");
    }
  } else {
    void response.body?.cancel().catch(() => {});
  }
  if (status === 401) return new AIRequestError(provider === "qwen" ? "授权失败。请检查 Key、地域和权限。" : "授权失败，请检查 Key。", 401, undefined, "authentication");
  if (status === 403) return new AIRequestError("访问受限。请检查模型权限。", 403, undefined, "model_unavailable");
  if (status === 402) return new AIRequestError("余额不足，请充值后重试。", 402, undefined, "balance");
  if (status === 404) return new AIRequestError(modelSelectionMessage, 404, undefined, "model_unavailable");
  if (status === 429) return new AIRequestError("服务商限流。请稍后重试。", 429, retryAfter ?? 30, "upstream_rate_limit");
  if (status === 400 || status === 422) {
    return new AIRequestError(provider === "qwen" ? "百炼拒绝请求参数。请检查所选模型。" : "DeepSeek 拒绝请求参数。请检查所选模型。", 422, undefined, "invalid_parameters");
  }
  if (status === 408 || status === 504 || status === 524) return new AIRequestError("AI 响应超时，请重试。", 504, undefined, "timeout");
  if (status >= 500) return new AIRequestError("AI 服务正忙。请稍后重试。", 503, retryAfter, "upstream");
  return new AIRequestError("AI 请求失败。请稍后重试。", 502);
}

export async function requestAIJson<T>(credentials: AICredentials, options: RequestOptions<T>) {
  if (JSON.stringify(options.input)?.includes(credentials.apiKey) || options.dialogue?.some(({ content }) => content.includes(credentials.apiKey))) {
    throw new AIRequestError("请先移除问题里的 Key。", 400);
  }
  // Repair only model output. Tool execution and confirmation happen after validation.
  const canRepair = options.operation === "experiment_agent" || (credentials.visitor === undefined && options.operation === "connection_test");
  const completion = canRepair ? { ...options, retryFormat: true } : options;
  if (credentials.visitor !== undefined) return requestPlatformAI(credentials, completion);
  const byok = credentials.selection;
  const { provider, model } = byok;
  const operation = credentials.operation ?? {};
  const profile = getAIModel(byok);
  if (options.operation === "experiment_agent" && !profile.workbench) throw new AIRequestError(workbenchModelMessage, 422);
  const reasoning = profile.thinking === "enabled";
  const testing = options.operation === "connection_test";
  const reasoningBudget = testing ? 1024 : 4096;
  const endpoint = provider !== "qwen" ? "https://api.deepseek.com/chat/completions"
    : credentials.workspaceId ? `https://${credentials.workspaceId}.${byok.region}.maas.aliyuncs.com/compatible-mode/v1/chat/completions`
    : qwenEndpoints[byok.region];
  const parameters = provider === "deepseek"
    ? { thinking: { type: profile.thinking }, ...(reasoning && { reasoning_effort: testing ? "low" : "high" }),
      max_tokens: options.maxTokens + (reasoning ? reasoningBudget : 0) }
    : {
      max_tokens: options.maxTokens,
      ...(profile.thinking !== "provider-default" && { enable_thinking: reasoning }),
      ...(reasoning && { thinking_budget: reasoningBudget }),
    };
  const qwenThinkingModel = byok.provider === "qwen" && reasoning && profile.output === "json-object" ? `${byok.region}:${model}` : undefined;
  const retryTransient = options.operation === "tutor" || options.operation === "experiment_agent";
  const deadline = retryTransient ? AbortSignal.timeout(62_000) : undefined;
  const signal = deadline ? AbortSignal.any([deadline, credentials.signal]) : credentials.signal;
  let output = qwenThinkingModel && (qwenTextModeUntil.get(qwenThinkingModel) ?? 0) > Date.now() ? "text" : profile.output;
  const attempt = async (repair: boolean) => {
    if (credentials.signal.aborted) throw new AIRequestError("请求已取消。", 499, undefined, "cancelled");
    const release = reserveRequest(provider, credentials.apiKey, operation);
    try {
      return await requestCompletion({ ...credentials, signal }, repair
        ? { ...completion, instructions: repairInstructions(completion.instructions) } : completion, {
        endpoint, model, parameters, output,
        timeoutMs: reasoning ? reasoningTimeoutMs : requestTimeoutMs, region: byok.provider === "qwen" ? byok.region : undefined,
      });
    } catch (error) {
      if (error instanceof AIRequestError && error.status === 401) credentials.onAuthFailure?.();
      throw error;
    } finally {
      release();
    }
  };
  let repair = false;
  for (;;) {
    try {
      return await attempt(repair);
    } catch (error) {
      if (credentials.signal.aborted) throw error;
      if (deadline?.aborted) throw new AIRequestError("AI 响应超时，请重试。", 504, undefined, "timeout");
      if (qwenThinkingModel && output === "json-object" && error instanceof QwenThinkingFormatError) {
        qwenTextModeUntil.set(qwenThinkingModel, Date.now() + qwenTextModeTtlMs);
        output = "text";
        continue;
      }
      if (!repair && completion.retryFormat && error instanceof AICompletionFormatError) {
        repair = true;
        continue;
      }
      const wait = retryTransient && transientRetryDelay(error, operation.retries ?? 0);
      if (wait === false || wait === undefined) throw error;
      operation.retries = (operation.retries ?? 0) + 1;
      await delay(wait, undefined, { signal }).catch(() => {
        if (deadline?.aborted && !credentials.signal.aborted) throw new AIRequestError("AI 响应超时，请重试。", 504, undefined, "timeout");
        throw new AIRequestError("请求已取消。", 499, undefined, "cancelled");
      });
    }
  }
}

function transientRetryDelay(error: unknown, retries: number) {
  if (retries >= 2 || !(error instanceof AIRequestError)
    || (error.code !== "network" && error.code !== "timeout" && error.code !== "upstream" && error.code !== "upstream_rate_limit")) {
    return undefined;
  }
  const upstreamWait = (error.retryAfter ?? 0) * 1000;
  if (upstreamWait > 2000) return undefined;
  return Math.max(upstreamWait, 300 * 2 ** retries + Math.floor(Math.random() * 100));
}

async function requestPlatformAI<T>(credentials: PlatformCredentials, options: RequestOptions<T>) {
  const preferred = credentials.selection.model;
  const keepSelectedModel = credentials.exactModel || options.operation === "connection_test" || options.operation === "experiment_agent";
  const choices: PlatformModel[] = preferred === "primary" && !keepSelectedModel ? ["primary", "backup"] : [preferred];
  let retriedFormat = false;
  for (const choice of choices) {
    try {
      const backupTutor = choice === "backup" && !!options.backupTutorFormat;
      return await retryCompletionFormat(!retriedFormat && (!!options.retryFormat || backupTutor), (retry) => {
        if (retry) retriedFormat = true;
        return requestPlatformCompletion(credentials, options, choice, retry);
      });
    } catch (error) {
      if (!(error instanceof PlatformUpstreamError) || !error.retryable) throw error;
      if (choice === choices.at(-1)) {
        if (error.status === 429) throw new AIRequestError("服务商限流。请稍后重试。", 429, error.retryAfter);
        if (choices.length === 1 && error.status === 504) throw new AIRequestError("AI 响应超时，请重试。", 504);
        const message = choices.length === 2 ? "两个免费模型暂不可用。" : "所选免费模型暂不可用。";
        throw new AIRequestError(message, error.status, error.retryAfter);
      }
    }
  }
  throw new AIRequestError("平台免费 AI 暂不可用。", 503);
}

async function requestPlatformCompletion<T>(credentials: PlatformCredentials, options: RequestOptions<T>, choice: PlatformModel, retryFormat = false) {
  const model = siliconFlowModels[choice];
  const { signal, visitor } = credentials;
  if (signal.aborted) throw new AIRequestError("请求已取消。", 499);
  let limit;
  try { limit = await reservePlatformAttempt(visitor, signal); }
  catch {
    if (signal.aborted) throw new AIRequestError("请求已取消。", 499);
    console.warn("AlgoVerse platform AI quota unavailable.");
    throw new AIUnverifiedError("免费额度校验失败。请联系管理员。", 503);
  }
  if (limit) throw new AIRequestError(limit.blocked === "daily" ? "今日免费额度已用完。" : "免费请求过多。请稍后再试。", 429, limit.retryAfter);
  const price = await confirmZeroSiliconFlowPrice(model.id, signal).catch((error: unknown) => {
    if (signal.aborted) throw new AIRequestError("请求已取消。", 499);
    throw error;
  });
  if (!price.ok) {
    console.warn("AlgoVerse SiliconFlow zero-price check failed.", { model: model.id, reason: price.reason, status: price.status });
    throw new AIUnverifiedError("免费价格未确认。请联系管理员。", 503);
  }
  const tutorFormat = retryFormat && choice === "backup" ? options.backupTutorFormat : undefined;
  const completion = tutorFormat ? { ...options, ...tutorFormat }
    : retryFormat ? { ...options, instructions: repairInstructions(options.instructions) } : options;
  return requestCompletion(credentials, completion, {
    endpoint: siliconFlowEndpoint, model: model.id, output: tutorFormat ? "text" : "json-object", timeoutMs: model.timeoutMs,
    parameters: {
      stream: false, temperature: retryFormat ? 0 : 0.2, max_tokens: Math.min(options.maxTokens, 1_200),
      ...(model.thinking ? { thinking_budget: options.operation === "connection_test" || retryFormat ? 512 : 1_024 } : { enable_thinking: false }),
    },
  });
}

async function requestCompletion<T>({ apiKey, selection: { provider }, signal }: AICredentials, options: RequestOptions<T>,
  { endpoint, model, parameters, output, timeoutMs, region }: CompletionOptions) {
  const started = Date.now();
  const timeout = AbortSignal.timeout(timeoutMs);
  let usage: TokenUsage | null = null;
  let outcome = 500;
  let format: "normalized" | CompletionFormatError | undefined;
  try {
    const body = JSON.stringify({
      model,
      ...parameters,
      messages: [{ role: "system", content: options.instructions }, { role: "user", content: JSON.stringify(options.input) },
        ...(options.dialogue ?? [])],
      ...(output === "json-object" && { response_format: { type: "json_object" } }),
    });
    if (provider !== "siliconflow" && Buffer.byteLength(body) > 192 * 1024) {
      throw new AIRequestError("上下文超长。请缩短输入。", 422, undefined, "context_limit");
    }
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([signal, timeout]),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body,
    });
    signal.throwIfAborted();
    timeout.throwIfAborted();
    const testing = options.operation === "connection_test";
    if (!response.ok) throw await providerError(provider, response);

    const payload = asObject(await response.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) return null;
      throw error;
    }));
    signal.throwIfAborted();
    timeout.throwIfAborted();
    usage = readUsage(payload?.usage);
    const choice = asObject(Array.isArray(payload?.choices) ? payload.choices[0] : null);
    const message = asObject(choice?.message);
    const invalidResult = new AIRequestError("AI 返回格式有误，请重试。", 502);
    if (provider === "siliconflow" && payload?.error) {
      const code = asObject(payload.error)?.code;
      if (code === 50505 || code === "50505") throw new PlatformUpstreamError(503, true);
    }
    if (provider !== "siliconflow") {
      if (choice?.finish_reason === "content_filter" || message?.refusal) throw new AIRequestError("服务商拦截了本次内容。", 400);
      if (choice?.finish_reason === "insufficient_system_resource" || choice?.finish_reason === "aborted") {
        throw new AIRequestError("AI 服务中断。请稍后重试。", 503);
      }
    }
    if (payload?.error || !usage || !message || message.refusal) throw invalidResult;
    if (provider === "siliconflow" && payload?.model !== model) {
      console.warn("AlgoVerse SiliconFlow returned an unexpected model.", { model });
      throw new AIRequestError("免费模型异常。请联系管理员。", 503);
    }
    if (testing && payload?.model !== model) {
      throw new AIRequestError("服务商未确认所选模型。", 502);
    }

    const canRepair = options.retryFormat || (provider === "siliconflow" && model === siliconFlowModels.backup.id && options.backupTutorFormat);
    if (choice?.finish_reason === "length" && (canRepair || provider !== "siliconflow")) throw new AICompletionFormatError("truncated");
    if (choice?.finish_reason !== "stop") throw invalidResult;
    const content = typeof message.content === "string" ? message.content.trim() : message.content;
    if ((content === "" || content == null) && (canRepair || provider !== "siliconflow")) throw new AICompletionFormatError("empty");
    if (typeof content !== "string") throw canRepair ? new AICompletionFormatError("schema") : invalidResult;
    let value: unknown;
    // Accept a single complete JSON fence without extracting tool calls from surrounding prose.
    const fenced = output === "text" || options.retryFormat ? content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i) : null;
    const json = fenced?.[1] ?? content;
    try {
      value = JSON.parse(json);
    } catch {
      const invalidJson = new AICompletionFormatError("json");
      if (!options.normalizeContent) throw invalidJson;
      const normalized = options.normalizeContent(json);
      if (normalized === json) throw invalidJson;
      try { value = JSON.parse(normalized); } catch { throw invalidJson; }
      format = "normalized";
    }
    const result = options.validate(value);
    if (result === null) throw new AICompletionFormatError("schema");
    if (JSON.stringify(result).includes(apiKey)) throw invalidResult;
    outcome = 200;
    return { result, model, usage };
  } catch (error) {
    const failure = signal.aborted ? new AIRequestError("请求已取消。", 499, undefined, "cancelled")
      : error instanceof AIRequestError ? error
      : provider === "siliconflow" ? new PlatformUpstreamError(timeout.aborted ? 504 : 503, true)
      : timeout.aborted ? new AIRequestError("AI 响应超时，请重试。", 504, undefined, "timeout")
      : new AIRequestError(`无法连接${provider === "qwen" ? "百炼" : " DeepSeek"}。请稍后重试。`, 502, undefined, "network");
    outcome = failure.status;
    if (failure instanceof AICompletionFormatError) format = failure.reason;
    throw failure;
  } finally {
    // Log only allowlisted metadata. Never log headers, prompts, or provider bodies.
    console.info("AlgoVerse AI", { operation: options.operation, provider: provider === "siliconflow" ? "SiliconFlow" : aiProviders[provider].label, model,
      ...(region && { region }), ...(format && { format }),
      status: outcome, elapsedMs: Date.now() - started, usage });
  }
}
