"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  aiProviders, aiRequestHeaders, availableAIModels, getAIModel, parseAISelection, qwenRegions, workbenchModelMessage,
  type AIConfiguration, type AIProvider, type AISelection, type ConnectionVerification,
} from "./aiSettings";
import { AIResponseError, fetchAI, readAIResponse } from "./aiHttp";
import type { AgentTask } from "./experimentAgent";
import { isPlatformModel, platformModelIds, platformModels, type PlatformModel } from "./platformAI";

type Surface = "tutor" | "workbench";
type ModelChoice = { selection: AISelection } | { platformModel: PlatformModel };
type ActiveConnection = ModelChoice & { exactModel?: boolean; credentialVersion?: string };
type Preferences = {
  provider: AIProvider;
  mode: "platform" | "byok";
  platformModel: PlatformModel;
  choices: Partial<Record<Surface, ModelChoice>>;
};
type TemporaryAI = Preferences & {
  configuration?: AIConfiguration;
  configurationError?: string;
  platformVerification?: ConnectionVerification;
};

const storageKey = "algoverse-ai-model-preferences";
const connectionRoute = "/api/ai/connection";
const defaults: Preferences = { provider: "deepseek", mode: "platform", platformModel: "primary", choices: {} };
let state: TemporaryAI = defaults;
let loading: Promise<void> | undefined;
let expiry: number | undefined;
let revision = 0;
let initialized = false;
let refreshedAt = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => state;
const getServerSnapshot = () => defaults as TemporaryAI;

function updateState(next: TemporaryAI) {
  state = next;
  for (const listener of listeners) listener();
}

function restorePreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    const choices: Preferences["choices"] = {};
    for (const surface of ["tutor", "workbench"] as const) {
      const item = saved.choices?.[surface];
      const selection = item?.selection && parseAISelection(item.selection.provider, item.selection.model, item.selection.region);
      if (isPlatformModel(item?.platformModel)) choices[surface] = { platformModel: item.platformModel };
      else if (selection) choices[surface] = { selection };
    }
    updateState({
      ...state, mode: saved.mode === "byok" ? "byok" : "platform", provider: saved.provider === "qwen" ? "qwen" : "deepseek",
      platformModel: isPlatformModel(saved.platformModel) ? saved.platformModel : "primary", choices,
    });
  } catch { /* An unavailable or invalid preference does not affect credentials. */ }
}

function updatePreferences(change: Partial<Preferences>) {
  const { provider, mode, platformModel, choices } = { ...state, ...change };
  updateState({ ...state, provider, mode, platformModel, choices });
  try { window.localStorage.setItem(storageKey, JSON.stringify({ provider, mode, platformModel, choices })); }
  catch { /* The selection still applies in this tab. */ }
}

export function setAIConfiguration(configuration: AIConfiguration) {
  revision += 1;
  refreshedAt = Date.now();
  window.clearTimeout(expiry);
  updateState({ ...state, configuration, configurationError: undefined });
  const expiresInMs = configuration.expiresInMs;
  if (expiresInMs) {
    expiry = window.setTimeout(() => {
      const providers = { ...configuration.providers };
      let nextExpiry: number | undefined;
      for (const provider of ["deepseek", "qwen"] as const) {
        const saved = providers[provider];
        if (!saved) continue;
        if (saved.expiresInMs <= expiresInMs) delete providers[provider];
        else {
          const remaining = saved.expiresInMs - expiresInMs;
          providers[provider] = { ...saved, expiresInMs: remaining };
          nextExpiry = Math.min(nextExpiry ?? remaining, remaining);
        }
      }
      setAIConfiguration({ ...configuration, providers, expiresInMs: nextExpiry });
      void refreshAIConfiguration();
    }, expiresInMs);
  }
}

async function readAIConfiguration(response: Response) {
  const configuration = await readAIResponse<AIConfiguration>(response);
  if (typeof configuration.platformConfigured !== "boolean" || !configuration.providers) {
    throw new AIResponseError("AI 配置响应异常。请重试。", 502);
  }
  return configuration;
}

export function refreshAIConfiguration() {
  if (loading) return loading;
  const requestedRevision = revision;
  loading = (async () => {
    try {
      const response = await fetchAI(connectionRoute, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000) });
      const configuration = await readAIConfiguration(response);
      if (revision === requestedRevision) setAIConfiguration(configuration);
    } catch (error) {
      if (revision === requestedRevision) updateState({
        ...state, configurationError: error instanceof AIResponseError ? error.message : "AI 配置读取失败。请重试。",
      });
    } finally {
      loading = undefined;
    }
  })();
  return loading;
}

export function withCredentialMutation<T>(run: () => Promise<T>, signal?: AbortSignal) {
  // Serialize settings writes in tabs that share the credential cookie.
  return navigator.locks ? navigator.locks.request("algoverse-ai-credentials", { signal }, run) : run();
}

export async function clearAIProvider(provider: AIProvider, credentialVersion: string) {
  const response = await withCredentialMutation(() => fetchAI(connectionRoute, {
    method: "DELETE", cache: "no-store", redirect: "error",
    headers: { "Content-Type": "application/json", "X-AI-Provider": provider, "X-AI-Credential-Version": credentialVersion }, body: "{}",
  }));
  if (response.status === 409) void refreshAIConfiguration();
  setAIConfiguration(await readAIConfiguration(response));
}

export function selectTemporaryAIProvider(provider: AIProvider) {
  updatePreferences({ provider });
}

export function selectAIMode(mode: Preferences["mode"]) {
  updatePreferences({ mode });
}

export function selectPlatformAIModel(platformModel: PlatformModel) {
  if (platformModel !== state.platformModel) {
    updateState({ ...state, platformVerification: undefined });
    updatePreferences({ platformModel });
  }
}

export function setPlatformAIVerification(model: PlatformModel, verification: ConnectionVerification) {
  if (model === state.platformModel) updateState({ ...state, platformVerification: verification });
}

function defaultChoice(snapshot: TemporaryAI): ModelChoice {
  if (snapshot.mode === "platform") return { platformModel: snapshot.platformModel };
  const saved = snapshot.configuration?.providers[snapshot.provider];
  if (saved) return { selection: saved.selection };
  return snapshot.provider === "deepseek" ? { selection: { provider: "deepseek", model: aiProviders.deepseek.models[0].apiId } }
    : { selection: { provider: "qwen", model: aiProviders.qwen.models[0].apiId, region: qwenRegions[0].id } };
}

function choiceId(choice: ModelChoice) {
  if ("platformModel" in choice) return `siliconflow:${choice.platformModel}`;
  const { selection } = choice;
  return [selection.provider, selection.model, ...(selection.provider === "qwen" ? [selection.region] : [])].join(":");
}

function modelOption(choice: ModelChoice, { configuration, configurationError }: TemporaryAI, surface?: Surface) {
  const pending = !configuration && !configurationError;
  let reason = pending ? "正在读取 AI 配置…" : configurationError ?? "";
  const id = choiceId(choice);
  if ("platformModel" in choice) {
    reason = configuration?.platformConfigured ? "" : reason || "平台免费 AI 待配置。";
    return { id, choice, label: `硅基流动 · ${platformModels[choice.platformModel]}`, model: platformModelIds[choice.platformModel], reason, verified: false,
      credentialVersion: undefined };
  }

  const { selection } = choice;
  const profile = getAIModel(selection);
  const saved = configuration?.providers[selection.provider];
  const hasKey = selection.provider === "qwen"
    ? saved?.selection.provider === "qwen" && saved.selection.region === selection.region : !!saved;
  if (surface === "workbench" && !profile.workbench) reason = workbenchModelMessage;
  else if (!hasKey) reason ||= "未配置 Key，或凭据已过期。";
  else reason = saved?.authenticationFailed ? "认证失败，请检查 Key。" : "";
  const provider = selection.provider === "qwen" ? "通义千问" : aiProviders[selection.provider].label;
  return {
    id, choice, label: `${provider} · ${profile.label}`, model: profile.apiId, reason, credentialVersion: saved?.credentialVersion,
    verified: !!(hasKey && saved?.verifications.some(({ model }) => model === selection.model)),
  };
}

export function useActiveAI(): ActiveConnection | undefined {
  const snapshot = useTemporaryAI();
  const current = modelOption(defaultChoice(snapshot), snapshot);
  return current.reason ? undefined : { ...current.choice, credentialVersion: current.credentialVersion };
}

export function useAIModelChoices(surface: Surface) {
  const snapshot = useTemporaryAI();
  const current = modelOption(snapshot.choices[surface] ?? defaultChoice(snapshot), snapshot, surface);
  const options = (["primary", "backup"] as const).map((platformModel) => modelOption({ platformModel }, snapshot, surface));
  for (const provider of ["deepseek", "qwen"] as const) {
    const saved = snapshot.configuration?.providers[provider]?.selection;
    const region = saved?.provider === "qwen" ? saved.region : provider === "qwen" ? qwenRegions[0].id : undefined;
    for (const { apiId } of availableAIModels(provider, region)) {
      const selection = parseAISelection(provider, apiId, region);
      if (selection) options.push(modelOption({ selection }, snapshot, surface));
    }
  }
  if (!options.some(({ id }) => id === current.id)) options.push(current);
  return {
    current, options,
    active: current.reason ? undefined : { ...current.choice, credentialVersion: current.credentialVersion, exactModel: true },
    select(id: string) {
      const picked = options.find((entry) => entry.id === id && !entry.reason);
      if (picked) updatePreferences({ choices: { ...state.choices, [surface]: picked.choice } });
    },
  };
}

export function containsTemporaryAIKey(value: string) {
  return /\bsk-[A-Za-z0-9_-]{16,}\b/i.test(value);
}

export async function fetchWithTemporaryAI(url: string, connection: ActiveConnection | undefined, body: unknown, signal?: AbortSignal) {
  const headers = connection && ("selection" in connection ? { ...aiRequestHeaders(connection.selection),
    ...(connection.credentialVersion && { "X-AI-Credential-Version": connection.credentialVersion }) }
    : { "X-AI-Provider": "siliconflow", "X-AI-Platform-Model": connection.platformModel,
      ...(connection.exactModel && { "X-AI-Exact-Model": "1" }) });
  const deadline = AbortSignal.timeout(connection ? 85_000 : 15_000);
  const response = await fetchAI(url, {
    method: "POST", cache: "no-store", redirect: "error", signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (connection && "selection" in connection && [400, 401, 409].includes(response.status)) {
    const code = (await response.clone().json().catch(() => null))?.code;
    if (response.status === 401 || code === "credential_changed" || code === "credential_missing") void refreshAIConfiguration();
  }
  return response;
}

export async function requestAgentTask(body: object, connection?: ActiveConnection, signal?: AbortSignal): Promise<AgentTask> {
  const response = await fetchWithTemporaryAI("/api/experiments/agent", connection, body, signal);
  const { task } = await readAIResponse<{ task?: AgentTask }>(response);
  if (!task || typeof task.id !== "string" || !Number.isSafeInteger(task.revision)
    || !Array.isArray(task.runs) || !Array.isArray(task.pending) || !Array.isArray(task.decisions)) {
    throw new AIResponseError("未收到会话状态。请重试。", 502);
  }
  if (connection && "selection" in connection && (task.dialogue?.errorCode ?? task.errorCode) === "authentication") {
    void refreshAIConfiguration();
  }
  return task;
}

export function useTemporaryAI() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      restorePreferences();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - refreshedAt > 15_000) void refreshAIConfiguration();
      });
    }
    if (!state.configuration || Date.now() - refreshedAt > 15_000) void refreshAIConfiguration();
  }, []);
  return snapshot;
}
