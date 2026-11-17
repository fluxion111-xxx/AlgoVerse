"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  aiProviderIds, aiProviders, aiRequestHeaders, availableAIModels, containsPossibleAIKey, getAIModel, isAIProvider, parseAISelection, qwenRegions, selectableAIProviderIds, workbenchModelMessage,
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
  personalModels: Partial<Record<AIProvider, AISelection>>;
  surfaceSelection: AISelection | null;
};
type TemporaryAI = Preferences & {
  configuration?: AIConfiguration;
  configurationError?: string;
  platformVerification?: ConnectionVerification;
};

const storageKey = "algoverse-ai-model-preferences";
const connectionRoute = "/api/ai/connection";
const defaults: Preferences = {
  provider: "deepseek", mode: "byok", platformModel: "primary", choices: {}, personalModels: {}, surfaceSelection: null,
};
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

function readPreferences(): Preferences | undefined {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return undefined;
    const saved = JSON.parse(stored);
    const choices: Preferences["choices"] = {};
    for (const surface of ["tutor", "workbench"] as const) {
      const item = saved.choices?.[surface];
      const selection = item?.selection && parseAISelection(item.selection.provider, item.selection.model, item.selection.region);
      if (isPlatformModel(item?.platformModel)) choices[surface] = { platformModel: item.platformModel };
      else if (selection) choices[surface] = { selection };
    }
    const personalModels: Preferences["personalModels"] = {};
    for (const provider of aiProviderIds) {
      const entry = saved.personalModels?.[provider];
      const selection = parseAISelection(provider, entry?.model, entry?.region);
      if (selection) personalModels[provider] = selection;
    }
    const shared = saved.surfaceSelection;
    const surfaceSelection = parseAISelection(shared?.provider, shared?.model, shared?.region);
    return {
      mode: saved.mode === "platform" ? "platform" : "byok", provider: isAIProvider(saved.provider) ? saved.provider : "deepseek",
      platformModel: isPlatformModel(saved.platformModel) ? saved.platformModel : "primary", choices, personalModels, surfaceSelection,
    };
  } catch { /* An unavailable or invalid preference does not affect credentials. */ }
}

function updatePreferences(change: Partial<Preferences>) {
  function merge({ provider, mode, platformModel, choices, personalModels, surfaceSelection }: Preferences): Preferences {
    return {
      provider: change.provider ?? provider, mode: change.mode ?? mode, platformModel: change.platformModel ?? platformModel,
      choices: { ...choices, ...change.choices }, personalModels: { ...personalModels, ...change.personalModels },
      surfaceSelection: change.surfaceSelection === undefined ? surfaceSelection : change.surfaceSelection,
    };
  }
  const previous = state;
  updateState({ ...state, ...merge(state) });
  function persist() {
    try {
      const saved = merge(readPreferences() ?? previous);
      window.localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch { /* The selection still applies in this tab. */ }
  }
  // Tabs share preferences, but an edit on one surface must not overwrite another.
  if (navigator.locks) void navigator.locks.request(storageKey, persist).catch(persist);
  else persist();
}

export function setAIConfiguration(configuration: AIConfiguration, verifiedSelection?: AISelection) {
  revision += 1;
  refreshedAt = Date.now();
  window.clearTimeout(expiry);
  const remembered = readPreferences()?.personalModels;
  const personalModels: Preferences["personalModels"] = {};
  for (const provider of aiProviderIds) {
    const selection = state.personalModels[provider] ?? remembered?.[provider] ?? configuration.providers[provider]?.selection;
    if (!state.personalModels[provider] && selection) personalModels[provider] = selection;
  }
  if (verifiedSelection) personalModels[verifiedSelection.provider] = verifiedSelection;
  if (Object.keys(personalModels).length) updatePreferences({ personalModels, ...(verifiedSelection && { surfaceSelection: null }) });
  updateState({ ...state, configuration, configurationError: undefined });
  const expiresInMs = configuration.expiresInMs;
  if (expiresInMs) {
    expiry = window.setTimeout(() => {
      const providers = { ...configuration.providers };
      let nextExpiry: number | undefined;
      for (const provider of aiProviderIds) {
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
  updatePreferences({ provider, surfaceSelection: null });
}

export function selectAIMode(mode: Preferences["mode"]) {
  updatePreferences({ mode, surfaceSelection: null });
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

function defaultChoice(snapshot: TemporaryAI, remembered?: AISelection): ModelChoice {
  if (snapshot.mode === "platform" && snapshot.configuration?.platformConfigured) return { platformModel: snapshot.platformModel };
  const { provider } = snapshot;
  const saved = remembered ?? snapshot.configuration?.providers[provider]?.selection;
  if (saved) return { selection: saved };
  if (provider === "qwen") return { selection: { provider, model: aiProviders[provider].models[0].apiId, region: qwenRegions[0].id } };
  if (provider === "qianwen") return { selection: { provider, model: aiProviders[provider].models[0].apiId } };
  return { selection: { provider, model: aiProviders[provider].models[0].apiId } };
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
  else if (!hasKey) reason ||= "请去 AI 设置验证 Key。";
  else reason = saved?.authenticationFailed ? "认证失败，请检查 Key。" : "";
  const provider = aiProviders[selection.provider].label;
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

export function getAIModelChoices(snapshot: TemporaryAI, surface: Surface) {
  const preferred = snapshot.choices[surface];
  const platformConfigured = snapshot.configuration?.platformConfigured === true;
  const { surfaceSelection } = snapshot;
  const provider = snapshot.provider === "qwen"
    ? (snapshot.personalModels.qianwen || snapshot.configuration?.providers.qianwen) ? "qianwen" : "deepseek"
    : snapshot.provider;
  const usePreferred = preferred && ("platformModel" in preferred ? platformConfigured : preferred.selection.provider !== "qwen");
  const choice = usePreferred
    ? preferred : surfaceSelection && surfaceSelection.provider !== "qwen"
      ? { selection: surfaceSelection }
      : defaultChoice({ ...snapshot, provider }, snapshot.personalModels[provider]);
  const current = modelOption(choice, snapshot, surface);
  const options = platformConfigured
    ? (["primary", "backup"] as const).map((platformModel) => modelOption({ platformModel }, snapshot, surface)) : [];
  for (const provider of selectableAIProviderIds) {
    for (const { apiId } of availableAIModels(provider)) {
      const selection = parseAISelection(provider, apiId, undefined);
      if (selection) options.push(modelOption({ selection }, snapshot, surface));
    }
  }
  return { current, options };
}

export function useAIModelChoices(surface: Surface) {
  const { current, options } = getAIModelChoices(useTemporaryAI(), surface);
  return {
    current, options,
    active: current.reason ? undefined : { ...current.choice, credentialVersion: current.credentialVersion, exactModel: true },
    select(id: string) {
      const picked = options.find((entry) => entry.id === id && !entry.reason);
      if (!picked) return;
      const choices = { [surface]: picked.choice };
      if ("selection" in picked.choice) {
        updatePreferences({ choices, surfaceSelection: picked.choice.selection });
      } else {
        updatePreferences({ choices });
      }
    },
  };
}

export function containsTemporaryAIKey(value: string) {
  return containsPossibleAIKey(value);
}

export async function fetchWithTemporaryAI(url: string, connection: ActiveConnection | undefined, body: unknown, signal?: AbortSignal, accept?: "text/event-stream") {
  const headers = connection && ("selection" in connection ? { ...aiRequestHeaders(connection.selection),
    ...(connection.credentialVersion && { "X-AI-Credential-Version": connection.credentialVersion }) }
    : { "X-AI-Provider": "siliconflow", "X-AI-Platform-Model": connection.platformModel,
      ...(connection.exactModel && { "X-AI-Exact-Model": "1" }) });
  const deadline = AbortSignal.timeout(connection ? 85_000 : 15_000);
  const response = await fetchAI(url, {
    method: "POST", cache: "no-store", redirect: "error", signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
    headers: { "Content-Type": "application/json", ...(accept && { Accept: accept }), ...headers },
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

export async function recoverAgentTask(id: string, matches: (task: AgentTask) => boolean, signal: AbortSignal) {
  let snapshot: AgentTask | undefined;
  for (let attempt = 0; attempt < 3 && !signal.aborted; attempt += 1) {
    if (attempt) await new Promise((resolve) => window.setTimeout(resolve, 350));
    if (signal.aborted) break;
    const latest = await requestAgentTask({ action: "status", id }, undefined,
      AbortSignal.any([signal, AbortSignal.timeout(3_000)])).catch(() => undefined);
    if (latest?.id !== id) continue;
    snapshot = latest;
    if (matches(latest)) break;
  }
  return signal.aborted ? undefined : snapshot;
}

export function useTemporaryAI() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      updateState({ ...state, ...readPreferences() });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - refreshedAt > 15_000) void refreshAIConfiguration();
      });
    }
    if (!state.configuration || Date.now() - refreshedAt > 15_000) void refreshAIConfiguration();
  }, []);
  return snapshot;
}
