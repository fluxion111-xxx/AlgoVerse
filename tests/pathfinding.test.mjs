import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COLS, ROWS, START, GOAL, comparePathfinding, generatePathfindingMap, initialWalls, search, shortestStepCount,
} from "../src/lib/pathfinding.ts";

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
  test(`${algorithm}: preserves the existing fixed-map comparison`, () => {
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

test("BFS rejects a disconnected board and finds diagonal routes", () => {
  const walls = Array.from({ length: ROWS }, (_, row) => row * COLS + 4);
  assert.equal(shortestStepCount({ start: 0, goal: 8, walls }), null);
  assert.equal(shortestStepCount({ start: 0, goal: 4 * COLS + 4, walls: [] }), 4);
});

for (const [difficulty, min, max] of [["easy", 4, 8], ["normal", 10, 14], ["hard", 16, 20]]) {
  test(`${difficulty}: 400 reproducible and reachable boards with fair results`, () => {
    const signatures = new Set();
    const densities = new Set();
    const starts = new Set();
    const goals = new Set();
    for (let index = 0; index < 400; index += 1) {
      const seed = Math.imul(index, 0x9e3779b9) >>> 0;
      const map = generatePathfindingMap(difficulty, seed);
      assert.deepEqual(generatePathfindingMap(difficulty, seed), map);
      assert.equal(map.seed, seed);
      assert.equal(map.difficulty, difficulty);
      assert.notEqual(map.start, map.goal);
      assert.ok(!map.walls.includes(map.start) && !map.walls.includes(map.goal));
      assert.ok(map.walls.length >= min && map.walls.length <= max);
      assert.equal(new Set(map.walls).size, map.walls.length);
      const steps = shortestStepCount(map);
      assert.ok(steps >= 4);
      if (difficulty === "hard") {
        const distance = Math.max(
          Math.abs(map.start % COLS - map.goal % COLS),
          Math.abs(Math.floor(map.start / COLS) - Math.floor(map.goal / COLS)),
        );
        assert.ok(steps > distance);
      }

      const { dijkstra, astar } = comparePathfinding(map);
      assertRoute(dijkstra, map, map.walls, astar.pathLength);
      assertRoute(astar, map, map.walls, dijkstra.pathLength);
      for (const result of [dijkstra, astar]) {
        assert.equal(result.visitElapsedMs.length, result.visited.length);
        assert.ok(result.visitElapsedMs.every((time, i, times) =>
          time >= (times[i - 1] ?? 0) && time <= result.elapsedMs));
      }
      signatures.add(JSON.stringify([map.start, map.goal, map.walls]));
      densities.add(map.walls.length);
      starts.add(map.start);
      goals.add(map.goal);
    }
    assert.equal(signatures.size, 400);
    assert.equal(densities.size, max - min + 1);
    assert.ok(starts.size > 25 && goals.size > 25);
  });
}
