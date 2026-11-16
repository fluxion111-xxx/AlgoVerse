import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { aiProviderIds, type AIProvider, type AISelection, type ConnectionVerification, type SavedAIProvider } from "@/lib/aiSettings";

const lifetimeSeconds = 8 * 60 * 60;
const lifetimeMs = lifetimeSeconds * 1000;
const maxSessions = 512;
const lockLifetimeMs = 30_000;
type SavedCredential = Omit<SavedAIProvider, "expiresInMs"> & { apiKey: string; expiresAt: number; revision: string };
type CredentialSession = { id: string; providers: Partial<Record<AIProvider, SavedCredential>> };

function credentialDirectory() {
  return resolve(process.env.ALGOVERSE_DATA_DIR ?? resolve(process.cwd(), ".algoverse-data"), "ai-credentials");
}

function credentialPath(id: string, provider: AIProvider) {
  // The cookie is the encryption key. Store only its hash in the file name.
  const fingerprint = createHash("sha256").update(id).digest("hex");
  return resolve(credentialDirectory(), `${fingerprint}.${provider}.credential`);
}

function fileModifiedAt(path: string) {
  return statSync(path, { throwIfNoEntry: false })?.mtimeMs;
}

function withLock<T>(path: string, update: () => T): T | undefined {
  const lock = path + ".lock";
  if ((fileModifiedAt(lock) ?? Date.now()) < Date.now() - lockLifetimeMs) rmSync(lock, { force: true });
  let fd: number;
  try {
    fd = openSync(lock, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return undefined;
    throw error;
  }
  try {
    return update();
  } finally {
    closeSync(fd);
    rmSync(lock, { force: true });
  }
}

function readCredential(id: string, provider: AIProvider): SavedCredential | undefined {
  let record: Buffer;
  try {
    record = readFileSync(credentialPath(id, provider));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(id, "hex"), record.subarray(0, 12));
    decipher.setAAD(Buffer.from(provider));
    decipher.setAuthTag(record.subarray(12, 28));
    const decoded = Buffer.concat([decipher.update(record.subarray(28)), decipher.final()]);
    const saved = JSON.parse(decoded.toString("utf8")) as SavedCredential;
    return saved.expiresAt > Date.now() ? saved : undefined;
  } catch {
    return undefined;
  }
}

function writeCredential(path: string, id: string, provider: AIProvider, saved: SavedCredential) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(id, "hex"), iv);
  cipher.setAAD(Buffer.from(provider));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(saved), "utf8"), cipher.final()]);
  const temporary = path + ".tmp";
  try {
    writeFileSync(temporary, Buffer.concat([iv, cipher.getAuthTag(), ciphertext]), { mode: 0o600 });
    const savedAt = (saved.expiresAt - lifetimeMs) / 1000;
    utimesSync(temporary, savedAt, savedAt);
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function activeSessions(directory: string) {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
  const expiredBefore = Date.now() - lifetimeMs;
  const active = new Set<string>();
  for (const name of names) {
    const fingerprint = /^([a-f0-9]{64})\.[a-z]+\.credential$/.exec(name)?.[1];
    if (!fingerprint) continue;
    const path = resolve(directory, name);
    const modifiedAt = fileModifiedAt(path);
    if (modifiedAt === undefined) continue;
    if (modifiedAt > expiredBefore) active.add(fingerprint);
    else withLock(path, () => {
      if ((fileModifiedAt(path) ?? Infinity) <= expiredBefore) rmSync(path, { force: true });
    });
  }
  return active.size;
}

const cleanupState = globalThis as typeof globalThis & { algoVerseCredentialCleanup?: NodeJS.Timeout };
cleanupState.algoVerseCredentialCleanup ??= setInterval(() => {
  try { activeSessions(credentialDirectory()); }
  catch { console.warn("AlgoVerse AI credential cleanup unavailable."); }
}, 60_000).unref();

function credentialSessionId(request: Request) {
  return request.headers.get("cookie")?.match(/(?:^|;\s*)algoverse_ai_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}

export function readCredentialSession(request: Request): CredentialSession | undefined {
  const id = credentialSessionId(request);
  if (!id) return undefined;
  const providers: CredentialSession["providers"] = {};
  for (const provider of aiProviderIds) {
    const saved = readCredential(id, provider);
    if (saved) providers[provider] = saved;
  }
  return Object.keys(providers).length ? { id, providers } : undefined;
}

export function savedAICredential(request: Request, selection: AISelection) {
  const id = credentialSessionId(request);
  const saved = id ? readCredential(id, selection.provider) : undefined;
  if (selection.provider === "qwen" && (saved?.selection.provider !== "qwen" || saved.selection.region !== selection.region)) {
    return undefined;
  }
  return saved;
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
  const id = original?.id ?? randomBytes(32).toString("hex");
  const directory = credentialDirectory();
  const path = credentialPath(id, provider);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  // A new session needs a slot. Existing sessions serialize updates independently per provider.
  return withLock(original ? path : resolve(directory, "new-session"), () => {
    const session = readCredentialSession(request);
    const current = session?.providers[provider];
    if (request.signal.aborted || session?.id !== original?.id || current?.revision !== previous?.revision
      || (!session && activeSessions(directory) >= maxSessions)) return undefined;
    const now = Date.now();
    const sameRegion = selection.provider !== "qwen" || (current?.selection.provider === "qwen" && current.selection.region === selection.region);
    const sameCredential = current?.apiKey === apiKey && sameRegion && current.workspaceId === workspaceId;
    const verifications = sameCredential ? current.verifications.filter(({ model }) => model !== selection.model) : [];
    const saved = {
      selection, apiKey, workspaceId, expiresAt: now + lifetimeMs, revision: randomUUID(),
      credentialVersion: sameCredential ? current.credentialVersion : randomUUID(),
      verifications: [...verifications, verification],
    };
    writeCredential(path, id, provider, saved);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    const cookie = `algoverse_ai_session=${id}; Path=/api; Max-Age=${lifetimeSeconds}; HttpOnly; SameSite=Strict${secure}`;
    return { session: { id, providers: { ...session?.providers, [provider]: saved } }, cookie };
  });
}

export function clearSavedCredential(session: CredentialSession | undefined, provider: AIProvider, version: string | null) {
  if (!session) return version === null;
  const path = credentialPath(session.id, provider);
  return withLock(path, () => {
    const saved = readCredential(session.id, provider);
    if (version !== null && version !== saved?.credentialVersion) return false;
    rmSync(path, { force: true });
    return true;
  }) ?? false;
}

export function credentialAuthFailure(request: Request, saved: SavedCredential) {
  const id = credentialSessionId(request);
  const provider = saved.selection.provider;
  return () => {
    if (!id) return;
    const path = credentialPath(id, provider);
    try {
      withLock(path, () => {
        const current = readCredential(id, provider);
        if (current?.revision === saved.revision && !current.authenticationFailed) {
          writeCredential(path, id, provider, { ...current, verifications: [], authenticationFailed: true });
        }
      });
    } catch {
      console.warn("AlgoVerse AI credential status could not be updated.");
    }
  };
}
