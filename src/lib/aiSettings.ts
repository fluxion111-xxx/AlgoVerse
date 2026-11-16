export const qwenRegions = [
  { id: "cn-beijing", label: "华北 2（北京）" },
  { id: "ap-southeast-1", label: "新加坡" },
] as const;

type QwenRegion = typeof qwenRegions[number]["id"];
const supportedQwenRegions = qwenRegions.map(({ id }) => id);

type AIModel = {
  apiId: string;
  label: string;
  capability: string;
  billing: "token";
  thinking: "enabled" | "disabled" | "provider-default";
  output: "json-object" | "text";
  workbench: boolean;
  regions?: readonly QwenRegion[];
};

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
    models: [
      { apiId: "qwen3.8-flash", label: "Qwen3.8 Flash", capability: "快速问答", billing: "token", thinking: "disabled", output: "json-object", workbench: true, regions: supportedQwenRegions },
      { apiId: "qwen3.7-plus", label: "Qwen3.7 Plus", capability: "综合问答与实验设计", billing: "token", thinking: "enabled", output: "json-object", workbench: true, regions: supportedQwenRegions },
      { apiId: "qwen3.8-max", label: "Qwen3.8 Max", capability: "复杂推理", billing: "token", thinking: "enabled", output: "json-object", workbench: true, regions: supportedQwenRegions },
      { apiId: "qwen3-coder-flash", label: "Qwen3 Coder Flash", capability: "编程与代码分析", billing: "token", thinking: "provider-default", output: "text", workbench: false, regions: supportedQwenRegions },
    ],
  },
} as const satisfies Record<string, { label: string; models: readonly AIModel[] }>;

export type AIProvider = keyof typeof aiProviders;
export type AISelection = { provider: "deepseek"; model: typeof aiProviders.deepseek.models[number]["apiId"] }
  | { provider: "qwen"; model: typeof aiProviders.qwen.models[number]["apiId"]; region: QwenRegion };

export const aiSettingsRoute = "/ai-settings";
export const maxApiKeyLength = 256;
export const modelSelectionMessage = "请选择当前可用模型，再测试连接。";
export const billingLabels = { token: "按 Token 计费" } as const;

export function canUseAITransport({ protocol, hostname }: Pick<URL, "protocol" | "hostname">): boolean {
  return protocol === "https:" || (process.env.NODE_ENV === "development" && protocol === "http:"
    && ["localhost", "127.0.0.1", "[::1]"].includes(hostname));
}

export function availableAIModels(provider: AIProvider, region?: string): readonly AIModel[] {
  return (aiProviders[provider].models as readonly AIModel[]).filter((model) => !model.regions
    || model.regions.some((id) => id === region));
}

export function parseAISelection(provider: unknown, model: unknown, region: unknown): AISelection | null {
  if (provider === "deepseek" && region == null) {
    const selected = aiProviders.deepseek.models.find(({ apiId }) => apiId === model);
    return selected ? { provider, model: selected.apiId } : null;
  }
  if (provider === "qwen") {
    const location = qwenRegions.find(({ id }) => id === region);
    const selected = aiProviders.qwen.models.find(({ apiId, regions }) => apiId === model
      && location && regions.includes(location.id));
    return selected && location ? { provider, model: selected.apiId, region: location.id } : null;
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

export function isApiKey(value: string): boolean {
  return value.length <= maxApiKeyLength && /^sk-[A-Za-z0-9_-]+$/.test(value);
}

export function isQwenWorkspaceId(value: string) {
  return /^llm-[a-z0-9](?:[a-z0-9-]{0,57}[a-z0-9])?$/.test(value);
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
