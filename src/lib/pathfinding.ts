export const COLS = 9;
export const ROWS = 5;
export const START = 36;
export const GOAL = 8;

export type Algorithm = "dijkstra" | "astar";
export type SearchResult = {
  visited: number[];
  path: number[];
  elapsedMs: number;
};

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

const heuristic = (node: number) => {
  const dx = Math.abs((node % COLS) - (GOAL % COLS));
  const dy = Math.abs(Math.floor(node / COLS) - Math.floor(GOAL / COLS));
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
};

export function search(algorithm: Algorithm, walls: number[]): SearchResult {
  const started = performance.now();
  const blocked = new Set(walls);
  const open = new Set([START]);
  const closed = new Set<number>();
  const distance = new Map<number, number>([[START, 0]]);
  const previous = new Map<number, number>();
  const visited: number[] = [];

  while (open.size) {
    let current = -1;
    let best = Infinity;
    for (const node of open) {
      const score = (distance.get(node) ?? Infinity) +
        (algorithm === "astar" ? heuristic(node) : 0);
      if (score < best) {
        best = score;
        current = node;
      }
    }

    if (current === -1) break;
    open.delete(current);
    closed.add(current);
    visited.push(current);
    if (current === GOAL) break;

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
  if (previous.has(GOAL)) {
    let step = GOAL;
    while (step !== START) {
      path.unshift(step);
      step = previous.get(step)!;
    }
    path.unshift(START);
  }

  return { visited, path, elapsedMs: performance.now() - started };
}
