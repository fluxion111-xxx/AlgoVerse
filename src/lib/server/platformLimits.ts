import "server-only";
import { createHmac } from "node:crypto";
import { reservePlatformCall, type QuotaState } from "@/lib/platformQuota";

type Decision = { blocked: "daily" | "minute"; retryAfter: number };
const local = globalThis as typeof globalThis & { algoVersePlatformQuota?: QuotaState };

export function platformQuotaConfigured() {
  return process.env.NODE_ENV !== "production" || Boolean(quotaEndpoint() && process.env.PLATFORM_AI_QUOTA_SECRET?.trim());
}

function quotaEndpoint() {
  try {
    const url = new URL(process.env.PLATFORM_AI_QUOTA_URL ?? "");
    if (url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash) return url;
  } catch { /* An absent or invalid URL leaves production disabled. */ }
}

export function platformVisitor(request: Request) {
  // On production, let the trusted Cloudflare ingress supply this header.
  // Requests without the header share one bucket.
  const ip = request.headers.get("cf-connecting-ip");
  const visitor = ip && /^[\da-f.:]{2,45}$/i.test(ip) ? ip.toLowerCase() : "local";
  return createHmac("sha256", process.env.PLATFORM_AI_QUOTA_SECRET?.trim() ?? "local")
    .update(visitor).digest("hex");
}

export async function reservePlatformAttempt(visitor: string, signal: AbortSignal): Promise<Decision | null> {
  signal.throwIfAborted();
  if (process.env.NODE_ENV !== "production") {
    const decision = reservePlatformCall(local.algoVersePlatformQuota, visitor, Date.now());
    if (decision.blocked) return decision;
    local.algoVersePlatformQuota = decision.state;
    return null;
  }

  const endpoint = quotaEndpoint();
  const secret = process.env.PLATFORM_AI_QUOTA_SECRET?.trim();
  if (!endpoint || !secret) throw new Error("Platform quota is not configured");
  const response = await fetch(endpoint, {
    method: "POST", cache: "no-store", redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(4_000)]),
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ visitor }),
  });
  if (response.status === 204) return null;
  if (response.status === 429) {
    const result = await response.json();
    if ((result.blocked === "daily" || result.blocked === "minute")
      && Number.isSafeInteger(result.retryAfter) && result.retryAfter >= 1 && result.retryAfter <= 86_400) return result;
  }
  throw new Error("Platform quota could not be reserved");
}
