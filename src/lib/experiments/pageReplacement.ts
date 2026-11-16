import { defineEngine, fields, goalLabel, integer } from "./engine";

export const pagePolicies = ["FIFO", "LRU", "OPT"] as const;
type Policy = typeof pagePolicies[number];
type PageReplacementConfig = { goalLabel: string; frameCount: number; references: number[] };

function configure(value: unknown): PageReplacementConfig | null {
  const input = fields(value, ["goalLabel", "frameCount", "references"]);
  const goal = goalLabel(input?.goalLabel);
  const { frameCount, references } = input ?? {};
  return goal && integer(frameCount, 1, 8) && Array.isArray(references) && references.length >= 1
    && references.length <= 48 && [...references].every((page) => integer(page, 0, 99))
    ? { goalLabel: goal, frameCount, references: [...references] } : null;
}

export function simulatePageReplacement({ frameCount, references }: PageReplacementConfig, policy: Policy) {
  const frames = Array<number | null>(frameCount).fill(null);
  const loadedAt = Array<number>(frameCount).fill(-1);
  const lastUsedAt = [...loadedAt];
  let faults = 0;
  const steps = references.map((page, index) => {
    let slot = frames.indexOf(page);
    const hit = slot !== -1;
    let evicted: number | null = null;
    if (!hit) {
      faults++;
      slot = frames.indexOf(null);
      if (slot === -1) {
        const scores = frames.map((resident, i) => {
          if (policy === "FIFO") return -loadedAt[i];
          if (policy === "LRU") return -lastUsedAt[i];
          const next = references.indexOf(resident!, index + 1);
          return next === -1 ? Infinity : next;
        });
        slot = scores.indexOf(Math.max(...scores));
        evicted = frames[slot];
      }
      frames[slot] = page;
      loadedAt[slot] = index;
    }
    lastUsedAt[slot] = index;
    return { page, slot, hit, evicted, frames: [...frames], faults, hits: index + 1 - faults };
  });
  return { policy, faults, hits: references.length - faults, steps };
}

export const pageReplacementEngine = defineEngine({
  id: "page-replacement",
  version: 1,
  domain: "operating-systems",
  route: "/experiments/operating-systems/page-replacement",
  creator: {
    title: "页面置换",
    description: "用相同页号序列比较 FIFO、LRU 和 OPT。逐次记录命中、缺页和淘汰。OPT 可查看未来引用，仅作为理论基线。",
    parameters: { goalLabel: "实验目标", frameCount: "1–8 个页框", references: "1–48 个页号，各为 0–99 的整数" },
  },
  preset: (): PageReplacementConfig => ({
    goalLabel: "比较三种置换策略。", frameCount: 3, references: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
  }),
  configure,
  validate: (value): value is PageReplacementConfig => configure(value) !== null,
  run: (config: PageReplacementConfig) => ({ kind: "page-replacement" as const, policies: pagePolicies.map((policy) => simulatePageReplacement(config, policy)) }),
});
