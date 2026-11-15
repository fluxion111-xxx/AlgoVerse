"use client";

import { useSyncExternalStore } from "react";
import { aiRequestHeaders, modelSelectionMessage, parseAISelection, type AIProvider, type AISelection, type TokenUsage } from "./aiSettings";
import type { PlatformModel } from "./platformAI";

type Connection = { apiKey: string; selection: AISelection; usage: TokenUsage };
type ActiveConnection = Connection | { platformModel: PlatformModel };
type RetainedKey = { apiKey: string; region?: string };
type TemporaryAI = {
  provider: AIProvider;
  mode: "platform" | "byok";
  platformModel: PlatformModel;
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
  if (provider !== state.provider) updateState({ ...state, provider });
}

export function selectAIMode(mode: TemporaryAI["mode"]) {
  if (mode !== state.mode) updateState({ ...state, mode });
}

export function selectPlatformAIModel(platformModel: PlatformModel) {
  if (platformModel !== state.platformModel) updateState({ ...state, platformModel });
}

const platformConnections = { primary: { platformModel: "primary" }, backup: { platformModel: "backup" } } as const;

export function useActiveAI() {
  const { mode, platformModel, provider, connections } = useTemporaryAI();
  return mode === "platform" ? platformConnections[platformModel] : connections[provider];
}

export function setTemporaryAI(connection: Connection) {
  const provider = connection.selection.provider;
  updateState({
    ...state, connections: { ...state.connections, [provider]: connection },
    keys: { ...state.keys, [provider]: { apiKey: connection.apiKey, region: connection.selection.provider === "qwen" ? connection.selection.region : undefined } },
  });
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
  const response = await fetch(url, {
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

if (typeof window !== "undefined") {
  // Clear credentials when leaving the document, including back/forward cache restores.
  window.addEventListener("pagehide", () => updateState(initialState));
}

export function useTemporaryAI() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState);
}
