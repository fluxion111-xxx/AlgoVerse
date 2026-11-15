export const COLS = 9;
export const ROWS = 5;
export const START = 36;
export const GOAL = 8;

export type Algorithm = "dijkstra" | "astar";
export type Difficulty = "easy" | "normal" | "hard";
export type SearchResult = {
  visited: number[];
  path: number[];
  pathLength: number | null;
  elapsedMs: number;
};
export type TimedSearchResult = SearchResult & { visitElapsedMs: number[] };

type Endpoints = { start: number; goal: number };
type Board = Endpoints & { walls: readonly number[] };
export type RandomMap = Readonly<Board & { difficulty: Difficulty; seed: number }>;

export const initialWalls = [
  3, 11, 19, 27, 37, 42,
];

const neighbours = (node: number) => {
  const x = node % COLS;
  const y = Math.floor(node / COLS);
  return [
    [1, 0], [1, -1], [0, -1], [-1, -1],
    [-1, 0], [-1, 1], [0, 1], [1, 1],
  ].map(([dx, dy]) => ({ x: x + dx, y: y + dy, cost: dx && dy ? Math.SQRT2 : 1 }))
    .filter(({ x: nextX, y: nextY }) => nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS)
    .map(({ x: nextX, y: nextY, cost }) => ({ node: nextY * COLS + nextX, cost }));
};

const heuristic = (node: number, goal: number) => {
  const dx = Math.abs((node % COLS) - (goal % COLS));
  const dy = Math.abs(Math.floor(node / COLS) - Math.floor(goal / COLS));
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
};

export function search(
  algorithm: Algorithm,
  walls: readonly number[],
  { start, goal }: Endpoints = { start: START, goal: GOAL },
  onVisit?: (elapsedMs: number) => void,
): SearchResult {
  const started = performance.now();
  const blocked = new Set(walls);
  const valid = (node: number) => Number.isInteger(node) && node >= 0 && node < COLS * ROWS && !blocked.has(node);
  if (!valid(start) || !valid(goal)) {
    return { visited: [], path: [], pathLength: null, elapsedMs: performance.now() - started };
  }

  const open = new Set([start]);
  const closed = new Set<number>();
  const distance = new Map<number, number>([[start, 0]]);
  const previous = new Map<number, number>();
  const visited: number[] = [];

  while (open.size) {
    let current = -1;
    let best = Infinity;
    for (const node of open) {
      const score = (distance.get(node) ?? Infinity) +
        (algorithm === "astar" ? heuristic(node, goal) : 0);
      if (score < best) {
        best = score;
        current = node;
      }
    }

    if (current === -1) break;
    open.delete(current);
    closed.add(current);
    visited.push(current);
    onVisit?.(performance.now() - started);
    if (current === goal) break;

    for (const { node: next, cost } of neighbours(current)) {
      if (blocked.has(next) || closed.has(next)) continue;
      const candidate = (distance.get(current) ?? 0) + cost;
      if (candidate < (distance.get(next) ?? Infinity)) {
        previous.set(next, current);
        distance.set(next, candidate);
        open.add(next);
      }
    }
  }

  const path: number[] = [];
  const pathLength = closed.has(goal) ? distance.get(goal)! : null;
  if (pathLength !== null) {
    let step = goal;
    while (step !== start) {
      path.unshift(step);
      step = previous.get(step)!;
    }
    path.unshift(start);
  }

  return { visited, path, pathLength, elapsedMs: performance.now() - started };
}

const cells = Array.from({ length: COLS * ROWS }, (_, node) => node);
const wallCounts = { easy: [4, 8], normal: [10, 14], hard: [16, 20] } as const;

function gridDistance(a: number, b: number) {
  return Math.max(Math.abs(a % COLS - b % COLS), Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)));
}

// Count moves with BFS using the same legal neighbours as both weighted searches.
export function shortestStepCount({ start, goal, walls }: Board): number | null {
  const seen = new Set(walls);
  const inBounds = (node: number) => Number.isInteger(node) && node >= 0 && node < cells.length;
  if (!inBounds(start) || !inBounds(goal) || seen.has(start) || seen.has(goal)) return null;

  const queue = [{ node: start, steps: 0 }];
  seen.add(start);
  for (let index = 0; index < queue.length; index += 1) {
    const { node, steps } = queue[index];
    if (node === goal) return steps;
    for (const next of neighbours(node)) {
      if (seen.has(next.node)) continue;
      seen.add(next.node);
      queue.push({ node: next.node, steps: steps + 1 });
    }
  }
  return null;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return (limit: number) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return Math.floor(((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000 * limit);
  };
}

export function generatePathfindingMap(difficulty: Difficulty, seed: number): RandomMap {
  const pick = seededRandom(seed);
  const [minWalls, maxWalls] = wallCounts[difficulty];

  function candidate(keepRoute = false): RandomMap {
    const start = pick(cells.length);
    const destinations = cells.filter((node) => gridDistance(start, node) >= 4);
    const goal = destinations[pick(destinations.length)];
    // The bounded fallback reserves a route for these randomly chosen endpoints.
    const reserved = keepRoute ? search("dijkstra", [], { start, goal }).path : [start, goal];
    const available = cells.filter((node) => !reserved.includes(node));
    const count = minWalls + pick(maxWalls - minWalls + 1);
    const walls = Array.from({ length: count }, () => available.splice(pick(available.length), 1)[0]);
    return { difficulty, seed: seed >>> 0, start, goal, walls: walls.sort((a, b) => a - b) };
  }

  let reachable: RandomMap | undefined;
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const map = candidate();
    const steps = shortestStepCount(map);
    if (steps === null) continue;
    if (difficulty !== "hard" || steps > gridDistance(map.start, map.goal)) return map;
    reachable = map;
  }
  return reachable ?? candidate(true);
}

export function comparePathfinding(map: Board) {
  function run(algorithm: Algorithm): TimedSearchResult {
    const visitElapsedMs: number[] = [];
    const result = search(algorithm, map.walls, map, (elapsedMs) => visitElapsedMs.push(elapsedMs));
    return { ...result, visitElapsedMs };
  }
  return {
    dijkstra: run("dijkstra"),
    astar: run("astar"),
  };
}
