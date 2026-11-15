import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { aiProviders, getAIModel, isApiKey, modelSelectionMessage, parseAISelection, type AIProvider, type AISelection, type TokenUsage } from "@/lib/aiSettings";
import { isPlatformModel, type PlatformModel } from "@/lib/platformAI";
import { platformQuotaConfigured, platformVisitor, reservePlatformAttempt } from "./platformLimits";
import { confirmZeroSiliconFlowPrice } from "./siliconflowPricing";

// Official DashScope regional domains accept keys from the matching region.
const qwenEndpoints = {
  "cn-beijing": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  "ap-southeast-1": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
} satisfies Record<Extract<AISelection, { provider: "qwen" }>["region"], string>;
const requestTimeoutMs = 25_000;
const reasoningTimeoutMs = 55_000;
const minuteMs = 60_000;
const maxPerKey = 6;
const maxPerProcess = 60;
const maxConcurrent = 8;

type PlatformSelection = { provider: "siliconflow"; model: PlatformModel };
type BYOKCredentials = { apiKey: string; selection: AISelection; signal: AbortSignal; visitor?: undefined };
type PlatformCredentials = { apiKey: string; selection: PlatformSelection; signal: AbortSignal; visitor: string };
export type AICredentials = BYOKCredentials | PlatformCredentials;

const siliconFlowModels = {
  primary: { id: "Qwen/Qwen3.5-4B", thinking: false, timeoutMs: 25_000 },
  backup: { id: "THUDM/GLM-Z1-9B-0414", thinking: true, timeoutMs: 25_000 },
} as const;
const siliconFlowEndpoint = "https://api.siliconflow.cn/v1/chat/completions";
export type PendingAIRequest<T> = { fingerprint: string; task: Promise<T> };
type Operation = "connection_test" | "quick_start_plan" | "experiment_diagnosis" | "experiment_creator" | "experiment_agent" | "tutor" | "learning_advice";
type RequestOptions<T> = {
  operation: Operation;
  instructions: string;
  input: unknown;
  maxTokens: number;
  normalizeContent?: (content: string) => string;
  backupTutorFormat?: { instructions: string; normalizeContent: (content: string) => string };
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

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

type Limits = { secret: Buffer; keys: Map<string, number>; expiresAt: number; count: number; active: number };
const processState = globalThis as typeof globalThis & { algoVerseAILimits?: Limits };
const pendingRequestSecret = randomBytes(32);

export function reusePendingAI<T>(pending: Map<string, PendingAIRequest<T>>, id: string, credentials: AICredentials, generate: () => Promise<T>) {
  const fingerprint = createHmac("sha256", pendingRequestSecret)
    .update(JSON.stringify([credentials.selection, credentials.apiKey, credentials.visitor])).digest("hex");
  const existing = pending.get(id);
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new AIRequestError("本轮正在生成。请稍后重试。", 409);
    return existing.task;
  }
  const task = generate().finally(() => pending.delete(id));
  pending.set(id, { fingerprint, task });
  return task;
}

function reserveRequest(provider: AIProvider, apiKey: string) {
  const now = Date.now();
  const limits = processState.algoVerseAILimits ??= {
    secret: randomBytes(32), keys: new Map(), expiresAt: now + minuteMs, count: 0, active: 0,
  };
  if (now >= limits.expiresAt) {
    limits.keys.clear();
    limits.count = 0;
    limits.expiresAt = now + minuteMs;
  }
  if (limits.active >= maxConcurrent) throw new AIRequestError("请求较多，请稍后再试。", 429, 5);
  const fingerprint = createHmac("sha256", limits.secret).update(`${provider}:${apiKey}`).digest("hex");
  const keyCount = limits.keys.get(fingerprint) ?? 0;
  if (keyCount >= maxPerKey || limits.count >= maxPerProcess) {
    throw new AIRequestError("请求太频繁，请稍后再试。", 429, Math.ceil((limits.expiresAt - now) / 1000));
  }
  limits.keys.set(fingerprint, keyCount + 1);
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

export function readAICredentials(request: Request): AICredentials {
  if (!allowsRequestTransport(request)) {
    throw new AIRequestError("请通过 HTTPS 使用 AI。", 403);
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new AIRequestError("请在本站发起请求。", 403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new AIRequestError("请求格式有误。", 415);
  }
  const provider = request.headers.get("x-ai-provider") ?? "deepseek";
  const mode = request.headers.get("x-ai-mode");
  const model = request.headers.get("x-ai-model");
  const region = request.headers.get("x-ai-region");
  const authorization = request.headers.get("authorization");
  if (provider === "siliconflow") {
    const chosen = request.headers.get("x-ai-platform-model") ?? "primary";
    if (!isPlatformModel(chosen) || model !== null || mode !== null || region !== null || authorization !== null) {
      throw new AIRequestError("请选择平台免费模型。", 400);
    }
    const apiKey = process.env.SILICONFLOW_API_KEY?.trim();
    if (!apiKey || !platformQuotaConfigured()) {
      console.warn("AlgoVerse platform AI configuration is incomplete.");
      throw new AIRequestError("平台免费 AI 待管理员配置。", 503);
    }
    return { apiKey, selection: { provider, model: chosen }, signal: request.signal, visitor: platformVisitor(request) };
  }
  if (request.headers.has("x-ai-platform-model")) throw new AIRequestError(modelSelectionMessage, 400);
  const selection = mode === null ? parseAISelection(provider, model, region) : null;
  if (!selection) throw new AIRequestError(modelSelectionMessage, 400);

  if (!authorization) throw new AIRequestError("请先填写自己的 Key。", 400);
  const apiKey = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!isApiKey(apiKey)) throw new AIRequestError("请检查 Key 格式。", 400);
  return { apiKey, selection, signal: request.signal };
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
    return aiJson({ status: "error", message: error.message }, error.status, error.retryAfter);
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

  constructor(status: number, retryable: boolean) {
    super(retryable ? "平台免费 AI 暂不可用。" : "免费服务异常。请联系管理员。", status);
    this.retryable = retryable;
  }
}

type CompletionFormatError = "json" | "schema" | "empty";

class AICompletionFormatError extends AIRequestError {
  readonly reason: CompletionFormatError;

  constructor(reason: CompletionFormatError) {
    super(reason === "empty" ? "AI 未返回正文，请重试。" : "AI 返回格式有误，请重试。", 502);
    this.reason = reason;
  }
}

async function providerError(provider: AIProvider | "siliconflow", response: Response) {
  const { status } = response;
  if (provider === "siliconflow") {
    void response.body?.cancel().catch(() => {});
    if (status === 429 || status === 408 || status >= 500) {
      return new PlatformUpstreamError(status === 429 ? 429 : status === 408 || status === 504 ? 504 : 503, true);
    }
    console.warn("AlgoVerse SiliconFlow request rejected.", { status });
    return new PlatformUpstreamError(503, false);
  }
  if (provider === "qwen" && [400, 403, 429].includes(status)) {
    const body = asObject(await response.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) return null;
      throw error;
    }));
    const code = asObject(body?.error)?.code ?? body?.code;
    if (code === "Arrearage" || code === "isv.OUT_OF_SERVICE") return new AIRequestError("百炼余额不足。请充值后重试。", 402);
    if (code === "insufficient_quota" || code === "Throttling.AllocationQuota") return new AIRequestError("百炼额度不足。请检查用量。", 429);
    if (code === "model_not_found" || code === "ModelNotFound" || code === "model_not_supported") {
      return new AIRequestError(modelSelectionMessage, 404);
    }
  } else {
    void response.body?.cancel().catch(() => {});
  }
  if (status === 401 || status === 403) {
    return new AIRequestError(provider === "qwen" ? "授权失败。请检查 Key、地域和权限。" : "授权失败，请检查 Key。", status === 403 && provider === "qwen" ? 403 : 401);
  }
  if (status === 402) return new AIRequestError("余额不足，请充值后重试。", 402);
  if (status === 404) return new AIRequestError(modelSelectionMessage, 404);
  if (status === 429) return new AIRequestError("AI 请求过多。请稍后重试。", 429);
  if (status === 503) return new AIRequestError("AI 服务正忙。请稍后重试。", 503);
  return new AIRequestError("AI 请求失败。请稍后重试。", 502);
}

export async function requestAIJson<T>(credentials: AICredentials, options: RequestOptions<T>) {
  if (JSON.stringify(options.input)?.includes(credentials.apiKey)) {
    throw new AIRequestError("请先移除问题里的 Key。", 400);
  }
  if (credentials.visitor !== undefined) return requestPlatformAI(credentials, options);
  const byok = credentials.selection;
  const { provider, model } = byok;
  const profile = getAIModel(byok);
  const reasoning = profile.thinking === "enabled";
  const testing = options.operation === "connection_test";
  const reasoningBudget = testing ? 1024 : 4096;
  const endpoint = provider === "qwen" ? qwenEndpoints[byok.region] : "https://api.deepseek.com/chat/completions";
  const parameters = provider === "deepseek"
    ? { thinking: { type: profile.thinking }, ...(reasoning && { reasoning_effort: testing ? "low" : "high" }),
      max_tokens: options.maxTokens + (reasoning ? reasoningBudget : 0) }
    : {
      max_tokens: options.maxTokens,
      ...(profile.thinking !== "provider-default" && { enable_thinking: reasoning }),
      ...(reasoning && { thinking_budget: reasoningBudget }),
    };
  const release = reserveRequest(provider, credentials.apiKey);
  try {
    return await requestCompletion(credentials, options, { endpoint, model, parameters, output: profile.output,
      timeoutMs: reasoning ? reasoningTimeoutMs : requestTimeoutMs, region: byok.provider === "qwen" ? byok.region : undefined });
  } finally {
    release();
  }
}

async function requestPlatformAI<T>(credentials: PlatformCredentials, options: RequestOptions<T>) {
  const preferred = credentials.selection.model;
  // A connection test checks the selected model itself. Business calls may retry on the backup once.
  const singleAttempt = options.operation === "connection_test" || options.operation === "experiment_agent";
  const choices: PlatformModel[] = preferred === "primary" && !singleAttempt ? ["primary", "backup"] : [preferred];
  for (const choice of choices) {
    try {
      return await requestPlatformCompletion(credentials, options, choice).catch((error: unknown) => {
        if (choice !== "backup" || options.operation !== "tutor" || !options.backupTutorFormat
          || !(error instanceof AICompletionFormatError)) throw error;
        console.info("AlgoVerse SiliconFlow tutor format retry.", { model: siliconFlowModels.backup.id, reason: error.reason });
        return requestPlatformCompletion(credentials, options, choice, true);
      });
    } catch (error) {
      if (!(error instanceof PlatformUpstreamError) || !error.retryable) throw error;
      if (choice === choices.at(-1)) {
        const message = choices.length === 2 ? "两个免费模型暂不可用。" : "所选免费模型暂不可用。";
        throw new AIRequestError(message, error.status);
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
    throw new AIRequestError("免费额度校验失败。请联系管理员。", 503);
  }
  if (limit) throw new AIRequestError(limit.blocked === "daily" ? "今日免费额度已用完。" : "免费请求过多。请稍后再试。", 429, limit.retryAfter);
  const price = await confirmZeroSiliconFlowPrice(model.id, signal).catch((error: unknown) => {
    if (signal.aborted) throw new AIRequestError("请求已取消。", 499);
    throw error;
  });
  if (!price.ok) {
    console.warn("AlgoVerse SiliconFlow zero-price check failed.", { model: model.id, reason: price.reason, status: price.status });
    throw new AIRequestError("免费价格未确认。请联系管理员。", 503);
  }
  const tutorFormat = retryFormat ? options.backupTutorFormat : undefined;
  const completion = tutorFormat ? { ...options, ...tutorFormat } : options;
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
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([signal, timeout]),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        ...parameters,
        messages: [{ role: "system", content: options.instructions }, { role: "user", content: JSON.stringify(options.input) }],
        ...(output === "json-object" && { response_format: { type: "json_object" } }),
      }),
    });
    if (!response.ok) throw await providerError(provider, response);

    const body = asObject(await response.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) return null;
      throw error;
    }));
    usage = readUsage(body?.usage);
    const choice = asObject(Array.isArray(body?.choices) ? body.choices[0] : null);
    const message = asObject(choice?.message);
    const invalidResult = new AIRequestError("AI 返回格式有误，请重试。", 502);
    if (provider === "siliconflow" && body?.error) {
      const code = asObject(body.error)?.code;
      if (code === 50505 || code === "50505") throw new PlatformUpstreamError(503, true);
    }
    if (body?.error || !usage || choice?.finish_reason !== "stop" || !message || message.refusal) throw invalidResult;
    if (provider === "siliconflow" && body?.model !== model) {
      console.warn("AlgoVerse SiliconFlow returned an unexpected model.", { model });
      throw new AIRequestError("免费模型异常。请联系管理员。", 503);
    }

    const content = typeof message.content === "string" ? message.content.trim() : message.content;
    if ((content === "" || content === null) && options.backupTutorFormat && provider === "siliconflow" && model === siliconFlowModels.backup.id) {
      throw new AICompletionFormatError("empty");
    }
    if (typeof content !== "string") throw invalidResult;
    let value: unknown;
    // Text completions can wrap a JSON object in a single code fence.
    const fenced = output === "text" ? content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i) : null;
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
    const failure = error instanceof AIRequestError ? error
      : provider === "siliconflow" && !signal.aborted ? new PlatformUpstreamError(timeout.aborted ? 504 : 503, true)
      : timeout.aborted ? new AIRequestError("AI 响应超时，请重试。", 504)
      : signal.aborted ? new AIRequestError("请求已取消。", 499)
      : new AIRequestError(`无法连接${provider === "qwen" ? "百炼" : " DeepSeek"}。请稍后重试。`, 502);
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
