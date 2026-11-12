import assert from "node:assert/strict";
import { test } from "node:test";
import { COLS, ROWS, START, GOAL, initialWalls, search } from "../src/lib/pathfinding.ts";

function assertRoute(result, { start, goal }, walls, length) {
  assert.equal(result.path[0], start);
  assert.equal(result.path.at(-1), goal);
  assert.equal(result.visited[0], start);
  assert.equal(result.visited.at(-1), goal);
  assert.equal(result.visited.length, new Set(result.visited).size);
  assert.ok(result.visited.every((node) => !walls.includes(node)));
  assert.ok(result.path.every((node) => result.visited.includes(node)));
  assert.ok(Number.isFinite(result.elapsedMs) && result.elapsedMs >= 0);

  let cost = 0;
  for (let i = 1; i < result.path.length; i += 1) {
    const from = result.path[i - 1];
    const to = result.path[i];
    const dx = Math.abs(from % COLS - to % COLS);
    const dy = Math.abs(Math.floor(from / COLS) - Math.floor(to / COLS));
    assert.equal(Math.max(dx, dy), 1, "path must stay on adjacent cells");
    cost += dx && dy ? Math.SQRT2 : 1;
  }
  assert.ok(Math.abs(cost - result.pathLength) < 1e-9);
  assert.ok(Math.abs(length - result.pathLength) < 1e-9);
}

for (const algorithm of ["dijkstra", "astar"]) {
  test(`${algorithm}: preserves the default homepage comparison`, () => {
    const result = search(algorithm, initialWalls);
    assertRoute(result, { start: START, goal: GOAL }, initialWalls, 4 + 4 * Math.SQRT2);
    assert.equal(result.visited.length, algorithm === "dijkstra" ? 39 : 21);
  });

  test(`${algorithm}: uses the edited endpoints and takes the optimal detour`, () => {
    const endpoints = { start: 0, goal: 2 };
    const walls = [1];
    assertRoute(search(algorithm, walls, endpoints), endpoints, walls, 2 * Math.SQRT2);
    assert.deepEqual(walls, [1]);
  });

  test(`${algorithm}: accepts a zero-length route`, () => {
    const endpoints = { start: 14, goal: 14 };
    assertRoute(search(algorithm, [], endpoints), endpoints, [], 0);
  });

  test(`${algorithm}: reports an unreachable goal on a split map`, () => {
    const walls = Array.from({ length: ROWS }, (_, row) => row * COLS + 4);
    const result = search(algorithm, walls, { start: 0, goal: 8 });
    assert.deepEqual(result.path, []);
    assert.equal(result.pathLength, null);
    assert.equal(result.visited.length, ROWS * 4);
  });

  test(`${algorithm}: rejects a blocked or out-of-bounds endpoint`, () => {
    for (const endpoints of [{ start: 4, goal: 8 }, { start: 0, goal: COLS * ROWS }]) {
      const result = search(algorithm, [4], endpoints);
      assert.deepEqual(result.path, []);
      assert.deepEqual(result.visited, []);
      assert.equal(result.pathLength, null);
    }
  });
}
