import type { AIProvider } from "./aiSettings";

export type AICooldown = { provider: AIProvider | "siliconflow"; until: number; message: string; status?: number };

export function retryAfterSeconds(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - now) / 1000);
  return Number.isSafeInteger(seconds) && seconds >= 0 ? Math.min(86_400, Math.max(1, seconds)) : undefined;
}

export function formatAIRetryTime(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟后重试`;
  return seconds > 60 ? `${minutes} 分钟后重试` : `${seconds} 秒后重试`;
}
