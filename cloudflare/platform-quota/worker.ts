import { reservePlatformCall, type QuotaState } from "../../src/lib/platformQuota";

type QuotaNamespace = {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
};
type Env = { PLATFORM_AI_QUOTA_SECRET: string; AI_QUOTA: QuotaNamespace };
type QuotaStorage = { kv: { get<T>(key: string): T | undefined; put(key: string, value: QuotaState): void } };

export class PlatformAIQuota {
  private readonly state: { storage: QuotaStorage };

  constructor(state: { storage: QuotaStorage }) {
    this.state = state;
  }

  async fetch(request: Request) {
    const body = await request.json().catch(() => null) as { visitor?: unknown } | null;
    const visitor = body?.visitor;
    if (typeof visitor !== "string" || !/^[a-f0-9]{64}$/.test(visitor)) return new Response(null, { status: 400 });
    // Synchronous storage operations execute together in the same Durable Object turn.
    const kv = this.state.storage.kv;
    const decision = reservePlatformCall(kv.get<QuotaState>("quota"), visitor, Date.now());
    if (decision.blocked) return Response.json({ blocked: decision.blocked, retryAfter: decision.retryAfter }, { status: 429 });
    kv.put("quota", decision.state);
    return new Response(null, { status: 204 });
  }
}

export default {
  fetch(request: Request, env: Env) {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (!env.PLATFORM_AI_QUOTA_SECRET
      || request.headers.get("authorization") !== `Bearer ${env.PLATFORM_AI_QUOTA_SECRET}`) return new Response(null, { status: 401 });
    return env.AI_QUOTA.get(env.AI_QUOTA.idFromName("siliconflow-platform")).fetch(request);
  },
};
