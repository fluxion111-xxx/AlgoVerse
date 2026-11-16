export const qwenRegions = [
  { id: "cn-beijing", label: "华北 2（北京）" },
  { id: "ap-southeast-1", label: "新加坡" },
] as const;

type QwenRegion = typeof qwenRegions[number]["id"];

type AIModel = {
  apiId: string;
  label: string;
  capability: string;
  billing: "token";
  thinking: "enabled" | "disabled" | "provider-default";
  output: "json-object" | "text";
  workbench: boolean;
};

const qwenModels = [
  { apiId: "qwen3.8-flash", label: "Qwen3.8 Flash", capability: "快速问答", billing: "token", thinking: "disabled", output: "json-object", workbench: true },
  { apiId: "qwen3.7-plus", label: "Qwen3.7 Plus", capability: "综合问答与实验设计", billing: "token", thinking: "enabled", output: "json-object", workbench: true },
  { apiId: "qwen3.8-max", label: "Qwen3.8 Max", capability: "复杂推理", billing: "token", thinking: "enabled", output: "json-object", workbench: true },
  { apiId: "qwen3-coder-flash", label: "Qwen3 Coder Flash", capability: "编程与代码分析", billing: "token", thinking: "provider-default", output: "text", workbench: false },
] as const satisfies readonly AIModel[];

export const aiProviders = {
  deepseek: {
    label: "DeepSeek",
    models: [
      { apiId: "deepseek-flash", label: "DeepSeek V4.1 Flash", capability: "快速问答与实验设计", billing: "token", thinking: "disabled", output: "json-object", workbench: true },
      { apiId: "deepseek-v4-pro", label: "DeepSeek V4 Pro", capability: "复杂推理与代码分析", billing: "token", thinking: "enabled", output: "json-object", workbench: true },
    ],
  },
  qwen: {
    label: "通义千问（阿里云百炼）",
    models: qwenModels,
  },
  qianwen: {
    label: "千问 AI 平台",
    models: qwenModels,
  },
} as const satisfies Record<string, { label: string; models: readonly AIModel[] }>;

export type AIProvider = keyof typeof aiProviders;
export const aiProviderIds = Object.keys(aiProviders) as AIProvider[];
export const selectableAIProviderIds = ["deepseek", "qianwen"] as const satisfies readonly AIProvider[];

export function isAIProvider(value: unknown): value is AIProvider {
  return typeof value === "string" && Object.hasOwn(aiProviders, value);
}

export type AISelection = { provider: "deepseek"; model: typeof aiProviders.deepseek.models[number]["apiId"] }
  | { provider: "qwen"; model: typeof qwenModels[number]["apiId"]; region: QwenRegion }
  | { provider: "qianwen"; model: typeof qwenModels[number]["apiId"] };

export const aiSettingsRoute = "/ai-settings";
export const maxApiKeyLength = 256;
export const modelSelectionMessage = "请选择当前可用模型，再测试连接。";
export const qwenPlanKeyMessage = "套餐 Key 限交互式开发工具。请用所选平台的按量 Key。";
export const billingLabels = { token: "按 Token 计费" } as const;

export function canUseAITransport({ protocol, hostname }: Pick<URL, "protocol" | "hostname">): boolean {
  return protocol === "https:" || (process.env.NODE_ENV === "development" && protocol === "http:"
    && ["localhost", "127.0.0.1", "[::1]"].includes(hostname));
}

export function availableAIModels(provider: AIProvider, region?: string): readonly AIModel[] {
  return provider === "qwen" && !qwenRegions.some(({ id }) => id === region) ? [] : aiProviders[provider].models;
}

export function parseAISelection(provider: unknown, model: unknown, region: unknown): AISelection | null {
  if (provider === "deepseek" && region == null) {
    const selected = aiProviders.deepseek.models.find(({ apiId }) => apiId === model);
    return selected ? { provider, model: selected.apiId } : null;
  }
  if (provider === "qwen") {
    const location = qwenRegions.find(({ id }) => id === region);
    const selected = qwenModels.find(({ apiId }) => apiId === model);
    return selected && location ? { provider, model: selected.apiId, region: location.id } : null;
  }
  if (provider === "qianwen" && region == null) {
    const selected = qwenModels.find(({ apiId }) => apiId === model);
    return selected ? { provider, model: selected.apiId } : null;
  }
  return null;
}

export function getAIModel(selection: AISelection): AIModel {
  const model = availableAIModels(selection.provider, selection.provider === "qwen" ? selection.region : undefined)
    .find(({ apiId }) => apiId === selection.model);
  if (!model) throw new Error("Invalid AI model selection");
  return model;
}

export function aiRequestHeaders(selection: AISelection, apiKey?: string): Record<string, string> {
  return {
    ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
    "X-AI-Provider": selection.provider,
    "X-AI-Model": selection.model,
    ...(selection.provider === "qwen" && { "X-AI-Region": selection.region }),
  };
}

export function isApiKey(value: string, provider: AIProvider = value.startsWith("sk-ws-") ? "qianwen" : "deepseek"): boolean {
  if (provider === "qianwen") return value !== "sk-ws-" && /^sk-[A-Za-z0-9_.-]+$/.test(value);
  return value.length <= maxApiKeyLength && /^sk-[A-Za-z0-9_-]+$/.test(value);
}

export function containsPossibleAIKey(value: string): boolean {
  return /\b(?:sk-ws-[A-Za-z0-9_.-]{13,}|sk-[A-Za-z0-9_-]{16,}\b)/i.test(value);
}

export function isMaskedApiKey(value: string): boolean {
  return /[*＊•●◦·⋅…⋯]/u.test(value);
}

export function normalizeApiKeyDraft(value: string): string {
  const unwrap = (key: string) => {
    const quote = key[0];
    return key.length > 1 && (quote === '"' || quote === "'" || quote === "\x60") && key.endsWith(quote)
      ? key.slice(1, -1).trim() : key;
  };
  const key = unwrap(value.replace(/\p{Cf}/gu, "").trim());
  return unwrap(key.replace(/^Bearer\s+/i, "").trim()).replace(/[^\S\r\n]*(?:\r\n|\r|\n)\s*/g, "");
}

export function isQwenWorkspaceId(value: string) {
  return /^llm-[a-z0-9](?:[a-z0-9-]{0,57}[a-z0-9])?$/.test(value);
}

export function parseQwenWorkspace(value: string, region: string): string | null {
  const input = value.trim();
  if (!input || isQwenWorkspaceId(input)) return input;
  const match = /^(?:https:\/\/)?([a-z0-9-]+)\.([a-z0-9-]+)\.maas\.aliyuncs\.com(?:\/compatible-mode\/v1(?:\/chat\/completions)?)?\/?$/.exec(input);
  return match && match[2] === region && isQwenWorkspaceId(match[1]) ? match[1] : null;
}

export function isQwenPlanKey(value: string) {
  return value.startsWith("sk-sp-");
}

export function aiKeyProviderMessage(provider: AIProvider, key: string) {
  if (provider !== "qianwen" && key.startsWith("sk-ws-")) return "请选择千问 AI 平台。";
  if (provider !== "deepseek" && isQwenPlanKey(key)) return qwenPlanKeyMessage;
}

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export const workbenchModelMessage = "此模型暂不支持工作台实验方案。";
export type ConnectionVerification = { model: string; usage: TokenUsage };
export type SavedAIProvider = {
  selection: AISelection;
  credentialVersion: string;
  workspaceId?: string;
  verifications: ConnectionVerification[];
  authenticationFailed?: boolean;
  expiresInMs: number;
};
export type AIConfiguration = {
  platformConfigured: boolean;
  providers: Partial<Record<AIProvider, SavedAIProvider>>;
  expiresInMs?: number;
};

export type AIErrorCode = "credential_changed" | "credential_missing" | "authentication" | "model_unavailable"
  | "balance" | "invalid_parameters" | "upstream_rate_limit" | "network" | "timeout" | "upstream" | "cancelled" | "context_limit";
