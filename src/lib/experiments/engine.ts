export const experimentDomains = {
  algorithms: "数据结构与算法",
  "operating-systems": "操作系统",
  networks: "计算机网络",
  programming: "程序设计与内存",
  databases: "数据库原理",
  ai: "人工智能基础",
} as const;

type Engine<Id extends string, Config, Result> = {
  id: Id;
  version: number;
  domain: keyof typeof experimentDomains;
  route: string;
  creator: { title: string; description: string; parameters: object };
  preset: (seed: number) => Config;
  configure: (value: unknown, seed: number) => Config | null;
  validate: (value: unknown) => value is Config;
  run: (config: Config) => Result;
};

export function defineEngine<Id extends string, Config, Result>(engine: Engine<Id, Config, Result>) {
  return {
    ...engine,
    execute(value: unknown): Result | null {
      return engine.validate(value) ? engine.run(value) : null;
    },
  };
}

export function fields(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length) return null;
  return keys.every((key) => Object.hasOwn(value, key)) ? value as Record<string, unknown> : null;
}

export function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function goalLabel(value: unknown): string | null {
  return typeof value === "string" && value.trim() && value.length <= 100 ? value.trim() : null;
}
