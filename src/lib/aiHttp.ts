import { retryAfterSeconds } from "./aiRateLimit";
import { isAIEventStream, readAIEventStream } from "./aiEventStream";
import type { AIErrorCode } from "./aiSettings";

export class AIResponseError extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  readonly unverified: boolean;
  readonly code?: AIErrorCode;

  constructor(message: string, status: number, retryAfter?: number, unverified = false, code?: AIErrorCode) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
    this.unverified = unverified;
    this.code = code;
  }
}

const responseSignals = new WeakMap<Response, AbortSignal>();

function transportError(error: unknown, signal?: AbortSignal | null) {
  if (signal?.aborted) {
    return signal.reason?.name === "TimeoutError"
      ? new AIResponseError("连接超时。请重试。", 504, undefined, false, "timeout") : signal.reason ?? error;
  }
  return new AIResponseError("连不上本站。请检查网络。", 0, undefined, false, "network");
}

export async function fetchAI(url: string, init: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, init);
    if (init.signal) responseSignals.set(response, init.signal);
    return response;
  } catch (error) {
    throw transportError(error, init.signal);
  }
}

export async function readAIResponse<T>(response: Response): Promise<T> {
  const value: unknown = await response.json().catch((error: unknown) => {
    const signal = responseSignals.get(response);
    if (signal?.aborted) throw transportError(error, signal);
    if (response.ok && !(error instanceof SyntaxError)) {
      throw new AIResponseError("接收回复时断开。请重试。", 0, undefined, false, "network");
    }
    return null;
  });
  const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (response.ok) {
    if (!body) throw new AIResponseError("服务响应异常。请重试。", 502);
    return body as T;
  }

  const { status } = response;
  const message = typeof body?.message === "string" && body.message.trim() && body.message.length <= 160 ? body.message : undefined;
  const fallback = status === 429 ? "服务请求过多。请稍后重试。"
    : status === 408 || status === 504 || status === 524 ? "服务响应超时。请重试。"
    : status === 401 ? "认证失败。请检查 Key。"
    : status === 402 ? "余额不足。请检查账户。"
    : status === 403 ? "访问受限。请检查服务权限。"
    : status === 422 ? "请求参数有误。请检查模型。"
    : status >= 500 ? "服务暂不可用。请稍后重试。" : "请求失败。请重试。";
  const retryAfter = status === 429 || status === 503 ? retryAfterSeconds(response.headers.get("Retry-After")) : undefined;
  throw new AIResponseError(message ?? fallback, status, retryAfter ?? (status === 429 && !message ? 30 : undefined),
    body?.status === "unverified", typeof body?.code === "string" ? body.code as AIErrorCode : undefined);
}

export async function readTutorResponse<T>(response: Response, onDelta: (text: string) => void): Promise<T> {
  if (!response.ok || !response.body || !isAIEventStream(response)) return readAIResponse<T>(response);
  const signal = responseSignals.get(response);
  try {
    for await (const data of readAIEventStream(response.body, signal)) {
      const event = JSON.parse(data);
      if (event?.type === "ready") continue;
      if (event?.type === "delta" && typeof event.text === "string") {
        onDelta(event.text);
        continue;
      }
      if (event?.type === "result" && Number.isInteger(event.status) && event.status >= 200 && event.status <= 599) {
        const headers = typeof event.retryAfter === "string" ? { "Retry-After": event.retryAfter } : undefined;
        return await readAIResponse<T>(Response.json(event.body ?? null, { status: event.status, headers }));
      }
      throw new SyntaxError("Invalid tutor event");
    }
  } catch (error) {
    if (error instanceof AIResponseError) throw error;
    if (signal?.aborted) throw transportError(error, signal);
  }
  throw new AIResponseError("接收回复时断开。", 0, undefined, false, "network");
}
