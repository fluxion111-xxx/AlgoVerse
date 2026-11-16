import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { aiProviderIds, type AIProvider, type AISelection, type ConnectionVerification, type SavedAIProvider } from "@/lib/aiSettings";

const cookieName = "algoverse_ai_session";
const lifetimeSeconds = 8 * 60 * 60;
const maxSessions = 512;
type SavedCredential = Omit<SavedAIProvider, "expiresInMs"> & { apiKey: string; expiresAt: number };
type CredentialSession = {
  id: string;
  expiresAt: number;
  timer?: NodeJS.Timeout;
  providers: Partial<Record<AIProvider, SavedCredential>>;
};
const processState = globalThis as typeof globalThis & { algoVerseAISessions?: Map<string, CredentialSession> };
const sessions = processState.algoVerseAISessions ??= new Map<string, CredentialSession>();

function expireCredentials(session: CredentialSession) {
  const now = Date.now();
  const remaining = Object.entries(session.providers).flatMap(([provider, saved]) => {
    if (saved.expiresAt > now) return [saved.expiresAt];
    delete session.providers[provider as AIProvider];
    return [];
  });
  if (!remaining.length) {
    sessions.delete(session.id);
    return;
  }
  session.timer = setTimeout(() => expireCredentials(session), Math.min(...remaining) - now).unref();
}

export function readCredentialSession(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)algoverse_ai_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const session = cookie ? sessions.get(cookie) : undefined;
  return session && session.expiresAt > Date.now() ? session : undefined;
}

export function savedAICredential(request: Request, selection: AISelection) {
  const saved = readCredentialSession(request)?.providers[selection.provider];
  if (selection.provider === "qwen" && (saved?.selection.provider !== "qwen" || saved.selection.region !== selection.region)) {
    return undefined;
  }
  return saved && saved.expiresAt > Date.now() ? saved : undefined;
}

export function containsSavedAIKey(request: Request, value: string) {
  const session = readCredentialSession(request);
  return !!session && Object.values(session.providers).some(({ apiKey }) => value.includes(apiKey));
}

export function credentialMetadata(session: CredentialSession | undefined) {
  const providers: Partial<Record<AIProvider, SavedAIProvider>> = {};
  const now = Date.now();
  let expiresInMs: number | undefined;
  for (const provider of aiProviderIds) {
    const saved = session?.providers[provider];
    if (!saved || saved.expiresAt <= now) continue;
    const remaining = saved.expiresAt - now;
    providers[provider] = {
      selection: saved.selection, verifications: saved.verifications, authenticationFailed: saved.authenticationFailed,
      credentialVersion: saved.credentialVersion, workspaceId: saved.workspaceId, expiresInMs: remaining,
    };
    expiresInMs = Math.min(expiresInMs ?? remaining, remaining);
  }
  return { providers, expiresInMs };
}

export function saveVerifiedCredential(request: Request, selection: AISelection, apiKey: string, verification: ConnectionVerification,
  original: CredentialSession | undefined, previous: SavedCredential | undefined, workspaceId?: string) {
  const provider = selection.provider;
  let session = readCredentialSession(request);
  if (request.signal.aborted || session !== original || session?.providers[provider] !== previous) return null;

  if (!session) {
    if (sessions.size >= maxSessions) return null;
    const id = randomBytes(32).toString("hex");
    session = { id, expiresAt: 0, providers: {} };
    sessions.set(id, session);
  }
  const lifetime = lifetimeSeconds * 1000;
  const expiresAt = Date.now() + lifetime;
  const sameRegion = selection.provider !== "qwen" || (previous?.selection.provider === "qwen" && previous.selection.region === selection.region);
  const sameCredential = previous?.apiKey === apiKey && sameRegion && previous.workspaceId === workspaceId && previous.expiresAt > Date.now();
  const verifications = sameCredential ? previous.verifications.filter(({ model }) => model !== selection.model) : [];
  session.providers[provider] = {
    selection, apiKey, workspaceId, expiresAt,
    credentialVersion: sameCredential ? previous.credentialVersion : randomUUID(),
    verifications: [...verifications, verification],
  };
  session.expiresAt = expiresAt;
  clearTimeout(session.timer);
  const { id } = session;
  expireCredentials(session);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const cookie = `${cookieName}=${id}; Path=/api; Max-Age=${lifetimeSeconds}; HttpOnly; SameSite=Strict${secure}`;
  return { session, cookie };
}

export function clearSavedCredential(session: CredentialSession | undefined, provider: AIProvider) {
  if (!session) return;
  delete session.providers[provider];
  clearTimeout(session.timer);
  expireCredentials(session);
}

export function credentialAuthFailure(request: Request, provider: AIProvider) {
  const session = readCredentialSession(request);
  const saved = session?.providers[provider];
  return () => {
    if (session && saved && session.providers[provider] === saved) {
      saved.verifications = [];
      saved.authenticationFailed = true;
    }
  };
}
