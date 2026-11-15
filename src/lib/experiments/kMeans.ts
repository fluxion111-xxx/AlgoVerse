import { defineEngine, fields, goalLabel, integer } from "./engine";

type Point = { x: number; y: number };
type KMeansConfig = { goalLabel: string; points: Point[]; initialCenters: Point[]; maxIterations: number };

function readPoints(value: unknown, min: number, max: number) {
  if (!Array.isArray(value) || value.length < min || value.length > max) return null;
  const points: Point[] = [];
  for (const item of value) {
    const point = fields(item, ["x", "y"]);
    if (!integer(point?.x, -20, 20) || !integer(point?.y, -20, 20)) return null;
    points.push({ x: point.x, y: point.y });
  }
  return points;
}

function configure(value: unknown): KMeansConfig | null {
  const input = fields(value, ["goalLabel", "points", "initialCenters", "maxIterations"]);
  const goal = goalLabel(input?.goalLabel);
  const points = readPoints(input?.points, 2, 24);
  const initialCenters = readPoints(input?.initialCenters, 2, 5);
  const { maxIterations } = input ?? {};
  return goal && points && initialCenters && initialCenters.length <= points.length
    && new Set(initialCenters.map(({ x, y }) => `${x},${y}`)).size === initialCenters.length && integer(maxIterations, 1, 20)
    ? { goalLabel: goal, points, initialCenters, maxIterations } : null;
}

function squaredDistance(a: Point, b: Point) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function simulate({ points, initialCenters, maxIterations }: KMeansConfig) {
  let centers = initialCenters;
  const steps = [];
  let converged = false;
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const assignments = points.map((point) => {
      const distances = centers.map((center) => squaredDistance(point, center));
      return distances.indexOf(Math.min(...distances));
    });
    const sums = centers.map(() => ({ x: 0, y: 0, count: 0 }));
    for (const [i, { x, y }] of points.entries()) {
      const sum = sums[assignments[i]];
      sum.x += x;
      sum.y += y;
      sum.count++;
    }
    const updated = sums.map(({ x, y, count }, cluster) => count === 0 ? centers[cluster] : { x: x / count, y: y / count });
    converged = updated.every((center, cluster) => squaredDistance(center, centers[cluster]) === 0);
    const loss = points.reduce((total, point, i) => total + squaredDistance(point, updated[assignments[i]]), 0);
    steps.push({ iteration, assignments, previousCenters: centers, centers: updated, loss, sizes: sums.map(({ count }) => count) });
    centers = updated;
    if (converged) break;
  }
  return { kind: "k-means" as const, steps, converged, final: steps.at(-1)! };
}

export const kMeansEngine = defineEngine({
  id: "k-means",
  version: 1,
  domain: "ai",
  route: "/experiments/ai/k-means",
  creator: {
    title: "K-Means 聚类",
    description: "执行二维 Lloyd 迭代。先按欧氏距离分配，再更新均值。平局取靠前的中心，空簇保留中心。记录每轮簇内平方距离和。",
    parameters: { goalLabel: "实验目标", points: "2–24 个 {x,y}，整数坐标 -20 至 20",
      initialCenters: "2–5 个互不相同的 {x,y}，整数坐标 -20 至 20，数量不超过样本数", maxIterations: "1–20 轮" },
  },
  preset: (): KMeansConfig => ({
    goalLabel: "观察分组与中心移动。", points: [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 8, y: 1 }, { x: 10, y: 1 }],
    initialCenters: [{ x: 0, y: 1 }, { x: 10, y: 1 }], maxIterations: 8,
  }),
  configure,
  validate: (value): value is KMeansConfig => configure(value) !== null,
  run: simulate,
});
