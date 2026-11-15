import "server-only";

export const siliconFlowPricingUrl = "https://www.siliconflow.cn/pricing";
const maxPricingBytes = 2 * 1024 * 1024;
const priceRequestTimeout = 8_000;

type PriceCheck = { ok: true } | { ok: false; reason: "timeout" | "network" | "http" | "invalid-document" | "unconfirmed"; status?: number };

function canRetry(check: Extract<PriceCheck, { ok: false }>) {
  return check.reason === "timeout" || check.reason === "network"
    || (check.reason === "http" && check.status !== undefined
      && (check.status === 408 || check.status === 502 || check.status === 503 || check.status === 504));
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function zero(value: unknown) {
  return value === 0 || (typeof value === "string" && /^0+(?:\.0+)?$/.test(value));
}

// /v1/models has no price fields. Read the public pricing page's structured data.
// A different page format, incomplete prices or conflicting rows fail closed.
export function hasZeroSiliconFlowPrice(html: string, id: string): boolean {
  const chunks = Array.from(html.matchAll(/<script(?:\s[^>]*)?>\s*self\.__next_f\.push\((\[1,"(?:[^"\\]|\\.)*"\])\)\s*;?\s*<\/script>/g), ([, entry]) => JSON.parse(entry)[1] as string);
  const records = chunks.join("").split("\n").filter((line) => line.includes('"pricingApiItems":[') && line.includes('"chats":['));
  if (records.length !== 1) return false;
  const line = records[0];
  const tree: unknown = JSON.parse(line.slice(line.indexOf(":") + 1));
  if (!Array.isArray(tree)) return false;
  const dataSets = tree.flatMap((node: unknown) => {
    const data = Array.isArray(node) ? object(object(node[3])?.data) : undefined;
    return Array.isArray(data?.chats) && Array.isArray(data.pricingApiItems) ? [data] : [];
  });
  if (dataSets.length !== 1) return false;
  const { chats, pricingApiItems } = dataSets[0];
  const rows = (chats as unknown[]).map(object).filter((item) => item?.modelName === id);
  const model = rows[0];
  if (rows.length !== 1 || !model || model.status !== "normal" || model.targetModelName !== id
    || model.currency !== "¥" || !Array.isArray(model.pricing) || !zero(model.inputPrice) || !zero(model.price)) return false;
  const prices = model.pricing.map(object);
  const live = (pricingApiItems as unknown[]).map(object).filter((item) => item?.playgroundName === id);
  return prices.some((price) => price?.specification === "prompt")
    && prices.some((price) => price?.specification === "completion")
    && prices.every((price) => zero(price?.price))
    && live.some((price) => price?.componentCode === "input-tokens")
    && live.some((price) => price?.componentCode === "output-tokens")
    && live.every((price) => zero(price?.realTimePriceCnyUnit));
}

async function checkPrice(id: string, signal: AbortSignal): Promise<PriceCheck> {
  signal.throwIfAborted();
  const timeout = AbortSignal.timeout(priceRequestTimeout);
  let html = "";
  try {
    const response = await fetch(siliconFlowPricingUrl, {
      redirect: "manual", cache: "no-store", signal: AbortSignal.any([signal, timeout]),
      headers: { "Cache-Control": "no-cache", Accept: "text/html" },
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      return { ok: false, reason: "http", status: response.status };
    }
    if (!response.body) return { ok: false, reason: "invalid-document" };
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxPricingBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, reason: "invalid-document" };
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
  } catch (error) {
    signal.throwIfAborted();
    return { ok: false, reason: timeout.aborted || (error instanceof DOMException && error.name === "TimeoutError") ? "timeout" : "network" };
  }
  try {
    return hasZeroSiliconFlowPrice(html, id) ? { ok: true } : { ok: false, reason: "unconfirmed" };
  } catch {
    return { ok: false, reason: "invalid-document" };
  }
}

export async function confirmZeroSiliconFlowPrice(id: string, signal: AbortSignal): Promise<PriceCheck> {
  const first = await checkPrice(id, signal);
  if (first.ok || !canRetry(first)) return first;
  const second = await checkPrice(id, signal);
  console.info("AlgoVerse SiliconFlow pricing retry.", {
    model: id, first: first.reason, status: first.status, result: second.ok ? "confirmed" : second.reason,
  });
  return second;
}
