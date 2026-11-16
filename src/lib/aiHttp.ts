import { retryAfterSeconds } from "./aiRateLimit";

export class AIResponseError extends Error {
  readonly status: number;
  readonly retryAfter?: number;
  readonly unverified: boolean;

  constructor(message: string, status: number, retryAfter?: number, unverified = false) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
    this.unverified = unverified;
  }
}

export async function fetchAI(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new AIResponseError("连不上本站。请检查网络。", 0);
  }
}

export async function readAIResponse<T>(response: Response): Promise<T> {
  const value: unknown = await response.json().catch(() => null);
  const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (response.ok) {
    if (!body) throw new AIResponseError("服务响应异常。请重试。", 502);
    return body as T;
  }

  const { status } = response;
  const message = typeof body?.message === "string" && body.message.trim() && body.message.length <= 160 ? body.message : undefined;
  const fallback = status === 429 ? "服务请求过多。请稍后重试。"
    : status === 408 || status === 504 || status === 524 ? "服务响应超时。请重试。"
    : status >= 500 ? "服务暂不可用。请稍后重试。" : "请求失败。请重试。";
  const retryAfter = status === 429 || status === 503 ? retryAfterSeconds(response.headers.get("Retry-After")) : undefined;
  throw new AIResponseError(message ?? fallback, status, retryAfter ?? (status === 429 && !message ? 30 : undefined),
    body?.status === "unverified");
}
