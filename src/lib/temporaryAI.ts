"use client";

import { useSyncExternalStore } from "react";
import { aiRequestHeaders, modelSelectionMessage, parseAISelection, type AIProvider, type AISelection, type TokenUsage } from "./aiSettings";
import type { AgentTask } from "./experimentAgent";
import type { PlatformModel } from "./platformAI";
import { AIResponseError, fetchAI, readAIResponse } from "./aiHttp";

export type ConnectionVerification = { model: string; usage: TokenUsage };
type Connection = { apiKey: string; selection: AISelection; verification?: ConnectionVerification };
type ActiveConnection = Connection | { platformModel: PlatformModel };
type RetainedKey = { apiKey: string; region?: string };
type TemporaryAI = {
  provider: AIProvider;
  mode: "platform" | "byok";
  platformModel: PlatformModel;
  platformVerification?: ConnectionVerification;
  connections: Partial<Record<AIProvider, Connection>>;
  keys: Partial<Record<AIProvider, RetainedKey>>;
};
const initialState: TemporaryAI = { provider: "deepseek", mode: "platform", platformModel: "primary", connections: {}, keys: {} };
let state = initialState;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function updateState(next: TemporaryAI) {
  state = next;
  for (const listener of listeners) listener();
}

export function selectTemporaryAIProvider(provider: AIProvider) {
  if (provider === state.provider) return;
  const previous = state.connections[state.provider];
  const connections = previous?.verification
    ? { ...state.connections, [state.provider]: { ...previous, verification: undefined } }
    : state.connections;
  updateState({ ...state, provider, connections });
}

export function selectAIMode(mode: TemporaryAI["mode"]) {
  if (mode !== state.mode) updateState({ ...state, mode });
}

export function selectPlatformAIModel(platformModel: PlatformModel) {
  if (platformModel !== state.platformModel) updateState({ ...state, platformModel, platformVerification: undefined });
}

export function setPlatformAIVerification(model: PlatformModel, verification?: ConnectionVerification) {
  if (model === state.platformModel) updateState({ ...state, platformVerification: verification });
}

const platformConnections = { primary: { platformModel: "primary" }, backup: { platformModel: "backup" } } as const;

export function useActiveAI() {
  const { mode, platformModel, provider, connections } = useTemporaryAI();
  return mode === "platform" ? platformConnections[platformModel] : connections[provider];
}

export function containsTemporaryAIKey(text: string) {
  return Object.values(state.keys).some(({ apiKey }) => !!apiKey && text.includes(apiKey));
}

export function setTemporaryAI(connection: Connection) {
  const provider = connection.selection.provider;
  updateState({
    ...state, connections: { ...state.connections, [provider]: connection },
    keys: { ...state.keys, [provider]: { apiKey: connection.apiKey, region: connection.selection.provider === "qwen" ? connection.selection.region : undefined } },
  });
}

export function selectTemporaryAIModel(model: string) {
  const connection = state.connections[state.provider];
  if (!connection || model === connection.selection.model) return;
  const current = connection.selection;
  const selection = parseAISelection(current.provider, model, current.provider === "qwen" ? current.region : undefined);
  if (selection) setTemporaryAI({ apiKey: connection.apiKey, selection });
}

export function retainTemporaryAIKey(provider: AIProvider, key?: RetainedKey) {
  const connections = { ...state.connections };
  const keys = { ...state.keys };
  delete connections[provider];
  if (key) keys[provider] = key;
  else delete keys[provider];
  updateState({ ...state, connections, keys });
}

function getSnapshot(): TemporaryAI {
  for (const [provider, connection] of Object.entries(state.connections)) {
    const { selection } = connection;
    if (!parseAISelection(provider, selection.model, selection.provider === "qwen" ? selection.region : undefined)) {
      const connections = { ...state.connections };
      delete connections[selection.provider];
      const region = selection.provider === "qwen" ? selection.region : undefined;
      state = { ...state, connections, keys: { ...state.keys, [selection.provider]: { apiKey: connection.apiKey, region } } };
    }
  }
  return state;
}

export async function fetchWithTemporaryAI(url: string, connection: ActiveConnection | undefined, body: unknown, signal?: AbortSignal) {
  const byok = connection && "selection" in connection ? connection : undefined;
  const headers = byok ? aiRequestHeaders(byok.selection, byok.apiKey)
    : connection && "platformModel" in connection ? { "X-AI-Provider": "siliconflow", "X-AI-Platform-Model": connection.platformModel } : undefined;
  const response = await fetchAI(url, {
    method: "POST", cache: "no-store", redirect: "error", signal,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (byok && (response.status === 400 || response.status === 404)) {
    const { provider } = byok.selection;
    const result = await response.clone().json().catch(() => null);
    if (result?.message === modelSelectionMessage && state.connections[provider] === byok) {
      retainTemporaryAIKey(provider, state.keys[provider]);
    }
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
  return task;
}

if (typeof window !== "undefined") {
  // Clear credentials when leaving the document, including back/forward cache restores.
  window.addEventListener("pagehide", () => updateState(initialState));
}

export function useTemporaryAI() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState);
}
