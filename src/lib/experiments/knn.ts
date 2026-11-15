import { defineEngine, fields, goalLabel, integer } from "./engine";

export type Sample = { x: number; y: number; label: "A" | "B" };
type KnnConfig = { goalLabel: string; k: number; metric: "euclidean" | "manhattan"; samples: Sample[]; query: Omit<Sample, "label"> };

function coordinates(value: Record<string, unknown> | null) {
  return integer(value?.x, 0, 10) && integer(value?.y, 0, 10) ? { x: value.x, y: value.y } : null;
}

function configure(value: unknown): KnnConfig | null {
  const input = fields(value, ["goalLabel", "k", "metric", "samples", "query"]);
  const goal = goalLabel(input?.goalLabel);
  const { k, metric, samples } = input ?? {};
  const query = coordinates(fields(input?.query, ["x", "y"]));
  if (!goal || !query || (metric !== "euclidean" && metric !== "manhattan") || !Array.isArray(samples)
    || samples.length < 2 || samples.length > 16 || !integer(k, 1, samples.length)) return null;
  const points: Sample[] = [];
  for (const sample of samples) {
    const entry = fields(sample, ["x", "y", "label"]);
    const point = coordinates(entry);
    const label = entry?.label;
    if (!point || (label !== "A" && label !== "B")) return null;
    points.push({ ...point, label });
  }
  return { goalLabel: goal, k, metric, query, samples: points };
}

export const knnEngine = defineEngine({
  id: "knn-classification",
  version: 1,
  domain: "ai",
  route: "/experiments/ai/ml-classification",
  creator: {
    title: "KNN 分类",
    description: "计算二维距离，取最近 K 个样本做等权投票。距离相同按输入顺序，票数相同取最近邻的类别。",
    parameters: { goalLabel: "实验目标", k: "1 至样本数", metric: ["euclidean", "manhattan"],
      samples: "2–16 个 {x,y,label}，坐标为 0–10 的整数，label 为 A 或 B", query: "待分类点 {x,y}，坐标为 0–10 的整数" },
  },
  preset: (): KnnConfig => ({ goalLabel: "观察邻居如何决定类别。", k: 3, metric: "euclidean", query: { x: 5, y: 4 },
    samples: [{ x: 2, y: 2, label: "A" }, { x: 4, y: 3, label: "A" }, { x: 3, y: 6, label: "A" },
      { x: 6, y: 4, label: "B" }, { x: 7, y: 6, label: "B" }, { x: 9, y: 8, label: "B" }] }),
  configure,
  validate: (value): value is KnnConfig => configure(value) !== null,
  run({ k, metric, samples, query }: KnnConfig) {
    const neighbors = samples.map(({ x, y, label }, index) => {
      const dx = x - query.x;
      const dy = y - query.y;
      return { index, label, distance: metric === "euclidean" ? Math.hypot(dx, dy) : Math.abs(dx) + Math.abs(dy) };
    }).sort((left, right) => left.distance - right.distance || left.index - right.index).slice(0, k);
    const votes = { A: 0, B: 0 };
    for (const neighbor of neighbors) votes[neighbor.label] += 1;
    const prediction = votes.A === votes.B ? neighbors[0].label : votes.A > votes.B ? "A" : "B";
    return { kind: "knn-classification" as const, neighbors, votes, prediction };
  },
});
