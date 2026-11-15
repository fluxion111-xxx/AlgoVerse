import { pathfindingRoute } from "./courses";
import { COLS, ROWS, comparePathfinding, generatePathfindingMap, shortestStepCount, type Difficulty } from "./pathfinding";
import { defineEngine } from "./experiments/engine";
import { sortingEngine } from "./experiments/sorting";
import { schedulingEngine } from "./experiments/scheduling";
import { networkEngine } from "./experiments/network";
import { memoryEngine } from "./experiments/memory";
import { bPlusTreeEngine } from "./experiments/bPlusTree";
import { knnEngine } from "./experiments/knn";
import { pageReplacementEngine } from "./experiments/pageReplacement";
import { hashCollisionsEngine } from "./experiments/hashCollisions";
import { kMeansEngine } from "./experiments/kMeans";
import { gradientDescentEngine } from "./experiments/gradientDescent";
import { treeTraversalEngine } from "./experiments/treeTraversal";
import { graphTraversalEngine } from "./experiments/graphTraversal";
import { deadlockAvoidanceEngine } from "./experiments/deadlockAvoidance";
import { tcpCongestionEngine } from "./experiments/tcpCongestion";
import { dynamicRoutingEngine } from "./experiments/dynamicRouting";
import { memoryAllocationEngine } from "./experiments/memoryAllocation";
import { transactionConcurrencyEngine } from "./experiments/transactionConcurrency";

const algorithms = ["dijkstra", "astar"] as const;
const difficulties = ["easy", "normal", "hard"] as const;

export type PathfindingConfig = {
  algorithms: typeof algorithms;
  goalLabel: string;
  seed: number;
  start: number;
  goal: number;
  walls: readonly number[];
  difficulty?: Difficulty;
};

function validCell(node: unknown): node is number {
  return typeof node === "number" && Number.isInteger(node) && node >= 0 && node < COLS * ROWS;
}

function isPathfindingConfig(value: unknown): value is PathfindingConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<PathfindingConfig>;
  const { start, goal, walls, seed } = config;
  return validCell(start) && validCell(goal) && start !== goal
    && Array.isArray(walls) && walls.length <= COLS * ROWS - 2
    && walls.every(validCell) && new Set(walls).size === walls.length
    && !walls.includes(start) && !walls.includes(goal)
    && typeof seed === "number" && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff
    && Array.isArray(config.algorithms) && config.algorithms.length === algorithms.length
    && algorithms.every((algorithm, index) => config.algorithms?.[index] === algorithm)
    && typeof config.goalLabel === "string" && config.goalLabel.trim().length > 0
    && (config.difficulty === undefined || difficulties.includes(config.difficulty))
    && shortestStepCount({ start, goal, walls }) !== null;
}

export const pathfindingEngine = defineEngine({
  id: "pathfinding",
  version: 1,
  domain: "algorithms",
  route: pathfindingRoute,
  creator: {
    title: "Dijkstra 与 A* 寻路对比",
    description: "在同一张地图比较访问顺序、节点数、路径和耗时。直走成本 1，斜走成本 √2。",
    parameters: {
      goalLabel: "1–100 字的实验目标",
      map: [
        { kind: "random", difficulty: difficulties },
        { kind: "custom", start: `0–${COLS * ROWS - 1} 的整数`, goal: "不同于起点的整数", walls: "不重复的障碍格编号" },
      ],
      rules: `地图固定 ${COLS} 列 × ${ROWS} 行。编号从左上角 0 起逐行递增。障碍不能占起点或终点，地图必须可达。`,
    },
  },
  configure(value: unknown, seed: number): PathfindingConfig | null {
    if (!value || typeof value !== "object" || Object.keys(value).length !== 2) return null;
    const { goalLabel, map } = value as { goalLabel?: unknown; map?: unknown };
    if (typeof goalLabel !== "string" || !goalLabel.trim() || goalLabel.length > 100
      || !map || typeof map !== "object" || Array.isArray(map)) return null;
    const { kind, difficulty, start, goal, walls } = map as Record<string, unknown>;
    if (kind === "random" && Object.keys(map).length === 2) {
      const selected = difficulties.find((option) => option === difficulty);
      return selected ? createPathfindingConfig(seed, selected, goalLabel.trim()) : null;
    }
    if (kind !== "custom" || Object.keys(map).length !== 4) return null;
    const config = { algorithms, seed, goalLabel: goalLabel.trim(), start, goal, walls };
    return isPathfindingConfig(config) ? config : null;
  },
  preset: (seed) => createPathfindingConfig(seed, "normal", "比较两种算法的搜索过程。"),
  validate: isPathfindingConfig,
  run: (config: PathfindingConfig) => comparePathfinding(config),
});

export function createPathfindingConfig(seed: number, difficulty: Difficulty, goalLabel: string): PathfindingConfig {
  const { start, goal, walls } = generatePathfindingMap(difficulty, seed);
  return { algorithms, goalLabel, seed, start, goal, walls, difficulty };
}

export const registeredEngines = [
  pathfindingEngine, sortingEngine, schedulingEngine, networkEngine, memoryEngine, bPlusTreeEngine, knnEngine,
  pageReplacementEngine, hashCollisionsEngine, kMeansEngine, gradientDescentEngine,
  treeTraversalEngine, graphTraversalEngine, deadlockAvoidanceEngine, tcpCongestionEngine,
  dynamicRoutingEngine, memoryAllocationEngine, transactionConcurrencyEngine,
] as const;
export type ExperimentEngine = typeof registeredEngines[number];
export type EngineId = ExperimentEngine["id"];
export type ExperimentConfig = NonNullable<ReturnType<ExperimentEngine["configure"]>>;
export type ExperimentResults = ReturnType<ExperimentEngine["run"]>;

export function getExperimentEngine(id: unknown, version?: number) {
  return registeredEngines.find((engine) => engine.id === id && (version === undefined || engine.version === version));
}
