export const platformModels = {
  primary: "Qwen3.5-4B",
  backup: "GLM-Z1-9B-0414",
} as const;

export type PlatformModel = keyof typeof platformModels;
export const platformModelIds: Record<PlatformModel, string> = {
  primary: "Qwen/Qwen3.5-4B",
  backup: "THUDM/GLM-Z1-9B-0414",
};

export function isPlatformModel(value: unknown): value is PlatformModel {
  return value === "primary" || value === "backup";
}

export const platformQuota = { visitorPerMinute: 6, totalPerMinute: 20, totalPerDay: 120 } as const;
