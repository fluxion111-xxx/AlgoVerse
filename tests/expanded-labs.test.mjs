import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if (specifier.startsWith("./") && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.includes("/src/")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { registeredEngines, getExperimentEngine } = await import("../src/lib/experimentEngines.ts");
const { getCourse } = await import("../src/lib/courses.ts");
const { getExperimentTopic, knowledgeTopicRoute } = await import("../src/lib/knowledge.ts");
const { experimentEvidence, evidenceLabels } = await import("../src/lib/experiments/evidence.ts");

test("page replacement reproduces Belady's anomaly and records hits and evictions", () => {
  const engine = getExperimentEngine("page-replacement");
  const preset = engine.preset(0);
  const three = engine.execute(preset);
  const four = engine.execute({ ...preset, frameCount: 4 });
  assert.deepEqual(three.policies.map(({ faults }) => faults), [9, 10, 7]);
  assert.deepEqual(four.policies.map(({ faults }) => faults), [10, 8, 6]);
  assert.deepEqual(three.policies[0].steps[3], { page: 4, slot: 0, hit: false, evicted: 1, frames: [4, 2, 3], faults: 4, hits: 0 });
  const short = engine.execute({ ...preset, frameCount: 2, references: [1, 2, 1, 3, 1] });
  assert.deepEqual(short.policies.map(({ faults }) => faults), [4, 3, 3]);
  assert.deepEqual(short.policies.slice(0, 2).map(({ steps }) => steps[3].evicted), [1, 2]);
  assert.equal(engine.execute({ ...preset, references: [0, 0] }).policies[1].steps[1].hit, true);
  for (const cfg of [{ frameCount: 0 }, { references: [100] }, { references: Array(1) }]) {
    assert.equal(engine.execute({ ...preset, ...cfg }), null);
  }
});

test("hash tables preserve the probe chain after deletion and refuse duplicate keys", () => {
  const engine = getExperimentEngine("hash-collisions");
  const config = engine.preset(0);
  const { steps, chainingChecks, probingChecks } = engine.execute(config);
  assert.equal(steps[3].probing.slots[0], "deleted");
  assert.deepEqual(steps[4].probing.visits.map(({ slot }) => slot), [4, 0, 1]);
  assert.equal(steps[4].probing.outcome, "found");
  assert.equal(steps[5].probing.slots[0], 19);
  assert.equal(steps[6].probing.outcome, "missing");
  assert.deepEqual([chainingChecks, probingChecks], [13, 19]);
  const { steps: extra, fullInsertions } = engine.execute({ ...config, capacity: 2,
    operations: [1, -1, 3, 1].map((key) => ({ key, action: "insert" })),
  });
  assert.deepEqual(extra.map(({ home, probing }) => [home, probing.outcome]), [[1, "inserted"], [1, "inserted"], [1, "full"], [1, "exists"]]);
  assert.equal(fullInsertions, 1);
  assert.equal(engine.execute({ ...config, operations: [{ action: "eval", key: 1 }] }), null);
});

test("K-Means computes means and squared error and preserves an empty center", () => {
  const engine = getExperimentEngine("k-means");
  const config = engine.preset(0);
  const actual = engine.execute(config);
  assert.deepEqual(actual.steps[0].assignments, [0, 0, 1, 1]);
  assert.deepEqual(actual.final.centers, [{ x: 1, y: 1 }, { x: 9, y: 1 }]);
  assert.equal(actual.final.loss, 4);
  assert.equal(actual.converged, true);
  assert.equal(engine.execute({ ...config, maxIterations: 1 }).converged, false);
  const withEmpty = engine.execute({ ...config, initialCenters: [{ x: 0, y: 1 }, { x: 20, y: 20 }] });
  assert.deepEqual(withEmpty.steps[0].sizes, [4, 0]);
  assert.deepEqual(withEmpty.steps[0].centers[1], { x: 20, y: 20 });
  const tied = engine.execute({ ...config, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }], initialCenters: [{ x: -1, y: 0 }, { x: 1, y: 0 }] });
  assert.equal(tied.steps[0].assignments[0], 0);
  assert.equal(engine.execute({ ...config, initialCenters: [config.initialCenters[0], config.initialCenters[0]] }), null);
});

test("gradient descent computes each update, including divergence and an already optimal start", () => {
  const engine = getExperimentEngine("gradient-descent");
  const preset = engine.preset(0);
  const actual = engine.execute(preset);
  assert.deepEqual(actual.steps[0], { position: 2, gradient: 4, loss: 4, iteration: 1, previousPosition: 4 });
  assert.equal(actual.final.loss, 0.000244140625);
  const unstable = engine.execute({ ...preset, learningRate: 1.25, maxSteps: 2 });
  assert.deepEqual(unstable.steps.map(({ loss }) => loss), [36, 81]);
  const oscillating = engine.execute({ ...preset, learningRate: 0.75, maxSteps: 2 });
  assert.deepEqual(oscillating.steps.map(({ position, loss }) => [position, loss]), [[-2, 4], [1, 1]]);
  const stationary = engine.execute({ ...preset, start: preset.target });
  assert.equal(stationary.converged, true);
  assert.equal(stationary.steps.length, 0);
  assert.equal(engine.execute({ ...preset, learningRate: Infinity }), null);
});

test("tree traversal replays four distinct orders and rejects orphaned children", () => {
  const engine = getExperimentEngine("tree-traversal");
  const config = engine.preset(0);
  const result = engine.execute(config);
  assert.deepEqual(result.traversals.map(({ values }) => values), [
    [4, 2, 1, 3, 7, 9], [1, 2, 3, 4, 7, 9], [1, 3, 2, 9, 7, 4], [4, 2, 7, 1, 3, 9],
  ]);
  assert.deepEqual(result.traversals[2].steps[0], { node: 3, pending: [0, 1, 3] });
  assert.deepEqual(result.traversals[3].steps[0], { node: 0, pending: [1, 2] });
  const changed = engine.execute({ ...config, nodes: [4, 9, 2] });
  assert.deepEqual(changed.traversals[1].values, [9, 4, 2]);
  assert.deepEqual(changed.traversals[3].values, [4, 9, 2]);
  assert.equal(engine.execute({ ...config, nodes: [4, null, 1, 5] }), null);
  assert.equal(engine.execute({ ...config, nodes: [0] }).traversals[0].values[0], 0);
});

test("graph traversal handles direction, cycles, BFS distance and unreachable nodes", () => {
  const engine = getExperimentEngine("graph-traversal");
  const config = engine.preset(0);
  const result = engine.execute(config);
  assert.deepEqual(result.bfs.map(({ vertex, depth }) => [vertex, depth]), [[0, 0], [1, 1], [2, 1], [3, 2], [4, 2]]);
  assert.deepEqual(result.dfs.map(({ vertex }) => vertex), [0, 1, 3, 4, 2]);
  assert.equal(result.dfs.find(({ vertex }) => vertex === 2).depth, 3);
  assert.deepEqual(result.unreachable, [5]);
  assert.equal(engine.execute({ ...config, directed: true, startVertex: 4 }).bfs.length, 1);
  const oneWay = engine.execute({ ...config, directed: true, startVertex: 4, edges: [...config.edges, [4, 5]] });
  assert.deepEqual(oneWay.bfs.map(({ vertex, depth }) => [vertex, depth]), [[4, 0], [5, 1]]);
  assert.deepEqual(oneWay.dfs.map(({ vertex }) => vertex), [4, 5]);
  assert.equal(engine.execute({ ...config, edges: [[0, 0], [0, 1]] }).bfs.length, 2);
  assert.equal(engine.execute({ ...config, edges: [[0, 1], [1, 0]] }), null);
});

test("Banker's algorithm releases resources and rolls back an unsafe request", () => {
  const engine = getExperimentEngine("deadlock-avoidance");
  const config = engine.preset(0);
  const approved = engine.execute(config);
  assert.equal(approved.decision, "grant");
  assert.deepEqual(approved.trial.sequence, [1, 3, 0, 2, 4]);
  assert.deepEqual(approved.trial.steps[0], { process: 1, before: [2, 3, 0], released: [3, 0, 2], after: [5, 3, 2] });
  const unsafe = engine.execute({ ...config, process: 4, request: [3, 3, 0] });
  assert.equal(unsafe.initial.safe, true);
  assert.equal(unsafe.decision, "unsafe");
  assert.deepEqual(unsafe.trial.blocked, [0, 1, 2, 3, 4]);
  assert.equal(engine.execute({ ...config, process: 0, request: [6, 0, 0] }).decision, "wait");
  assert.equal(engine.execute({ ...config, request: [2, 0, 0] }).decision, "exceeds-need");
  assert.deepEqual(config.allocation[1], [2, 0, 0]);
  assert.equal(engine.execute({ ...config, request: [1, 2] }), null);
});

test("Reno signals progress through growth, fast retransmit, recovery and timeout", () => {
  const engine = getExperimentEngine("tcp-congestion");
  const config = engine.preset(0);
  const result = engine.execute(config);
  assert.deepEqual(result.steps.slice(0, 5).map(({ cwnd }) => cwnd), [5, 6, 7, 8, 8.125]);
  assert.deepEqual(result.steps.slice(5).map(({ cwnd, threshold, retransmit }) => [cwnd, threshold, retransmit]), [
    [8.125, 8, null], [8.125, 8, null], [7, 4, "fast"], [8, 4, null], [4, 4, null], [1, 2, "timeout"], [2, 2, null],
  ]);
  assert.equal(result.steps[9].phase, "avoidance");
  assert.equal(result.steps[10].phase, "slow-start");
  assert.equal(result.fastRetransmits, 1);
  assert.equal(result.timeouts, 1);
  const recovery = engine.execute({ ...config, initialWindow: 8, signals: ["dup", "dup", "dup"] });
  const timeout = engine.execute({ ...config, initialWindow: 8, signals: ["timeout"] });
  assert.deepEqual([recovery.final.cwnd, recovery.final.threshold, timeout.final.cwnd, timeout.final.threshold], [7, 4, 1, 4]);
  assert.equal(engine.execute({ ...config, signals: ["dup", "ack", "dup", "dup"] }).fastRetransmits, 0);
  assert.equal(engine.execute({ ...config, signals: ["drop"] }), null);
});

test("expanded engines resolve through their catalog, knowledge links and diagnosis metrics", () => {
  const topics = {
    "page-replacement": "page-replacement-lru", "hash-collisions": "open-addressing",
    "k-means": "kmeans-assignment-update", "gradient-descent": "gradient-descent-step",
    "tree-traversal": "binary-tree-traversal", "graph-traversal": "bfs-unweighted-distance",
    "deadlock-avoidance": "banker-safe-sequence", "tcp-congestion": "tcp-cwnd-rwnd",
    "dynamic-routing": "link-state-routing", "memory-allocation": "heap-fit-fragmentation", "transaction-concurrency": "mvcc-row-versions",
  };
  assert.equal(new Set(registeredEngines.map(({ id }) => id)).size, 18);
  assert.equal(new Set(registeredEngines.map(({ route }) => route)).size, 18);
  for (const [id, topic] of Object.entries(topics)) {
    const engine = getExperimentEngine(id, 1);
    assert.ok(getCourse(engine.domain).experiments.some(({ href }) => href === engine.route));
    const entry = getExperimentTopic(topic, id);
    assert.match(knowledgeTopicRoute(entry), new RegExp(topic + "#knowledge-topic$"));
    const result = engine.execute(engine.preset(0));
    const evidence = Object.entries(experimentEvidence(result));
    assert.ok(evidence.length > 1);
    assert.ok(evidence.every(([key, value]) => evidenceLabels[key] && value));
  }
});

test("link-state recalculation selects a detour and detects a partition", () => {
  const engine = getExperimentEngine("dynamic-routing");
  const preset = engine.preset(0);
  const result = engine.execute(preset);
  assert.deepEqual(result.before.destination, { cost: 4, path: [0, 1, 4] });
  assert.deepEqual(result.after.destination, { cost: 7, path: [0, 2, 3, 4] });
  assert.deepEqual(result.before.steps[0].distances, [0, 2, 3, null, null]);
  assert.deepEqual(engine.execute({ ...preset, newCost: 3 }).after.destination, { cost: 5, path: [0, 1, 4] });
  assert.deepEqual(engine.execute({ ...preset, topology: [preset.topology[1]], changedLink: 0, source: 1 }).after.destination, { cost: null, path: [] });
  assert.equal(engine.execute({ ...preset, topology: [...preset.topology, { from: 1, to: 0, cost: 2 }] }), null);
});

test("heap strategies split and coalesce blocks and identify external fragmentation", () => {
  const engine = getExperimentEngine("memory-allocation");
  const config = engine.preset(0);
  const result = engine.execute(config);
  assert.equal(result.first.steps[6].address, 0);
  assert.equal(result.best.steps[6].address, 12);
  assert.equal(result.first.steps[7].outcome, "fragmented");
  assert.deepEqual(result.first.final, { freeUnits: 8, largest: 5, fragmentedUnits: 3, holes: 2 });
  assert.equal(result.best.steps[7].outcome, "allocated");
  assert.deepEqual(result.best.final, { freeUnits: 1, largest: 1, fragmentedUnits: 0, holes: 1 });
  const commands = [{ action: "alloc", id: "A", size: 4 }, { action: "alloc", id: "B", size: 4 },
    { action: "alloc", id: "A", size: 2 }, { action: "free", id: "A" }, { action: "free", id: "B" }, { action: "free", id: "B" }];
  const freed = engine.execute({ ...config, commands }).first;
  assert.equal(freed.steps[2].outcome, "duplicate");
  assert.equal(freed.steps[5].outcome, "unknown");
  assert.deepEqual(freed.steps[5].blocks, [{ start: 0, size: 24, owner: null }]);
  for (const step of [...result.first.steps, ...result.best.steps]) {
    assert.equal(step.blocks.reduce((sum, block) => sum + block.size, 0), config.heapSize);
    assert.equal(step.blocks.every((block, i) => block.start === (i ? step.blocks[i - 1].start + step.blocks[i - 1].size : 0)), true);
  }
});

test("transaction visibility differs across modes and a conflicting commit aborts atomically", () => {
  const engine = getExperimentEngine("transaction-concurrency");
  const config = engine.preset(0);
  const result = engine.execute(config);
  assert.deepEqual(result.readCommitted.steps[5].read, { value: 30, version: 1 });
  assert.deepEqual(result.snapshot.steps[5].read, { value: 10, version: 0 });
  assert.deepEqual(result.readCommitted.committed.map(({ value }) => value), [40, 20]);
  assert.deepEqual(result.snapshot.committed.map(({ value }) => value), [30, 20]);
  const rollback = engine.execute({ ...config, schedule: config.schedule.map((op, index) => index === 4 ? { ...op, action: "rollback" } : op) });
  for (const mode of [rollback.readCommitted, rollback.snapshot]) {
    assert.deepEqual(mode.steps[5].read, { value: 10, version: 0 });
    assert.equal(mode.steps[7].outcome, "commit");
    assert.deepEqual(mode.committed[0], { value: 40, version: 1 });
  }
  const schedule = [...config.schedule.slice(0, -1), { tx: "A", action: "write", row: 1, value: 50 }, config.schedule.at(-1)];
  assert.deepEqual(engine.execute({ ...config, schedule }).snapshot.committed.map(({ value }) => value), [30, 20]);
  assert.equal(engine.execute({ ...config, schedule: config.schedule.slice(0, -1) }), null);
});

test("guarded writes reproduce a cross-row skew and read-your-own-writes", () => {
  const engine = getExperimentEngine("transaction-concurrency");
  const schedule = [
    { tx: "A", action: "begin" }, { tx: "B", action: "begin" },
    { tx: "A", action: "write", row: 0, value: 0, guard: { row: 1, equals: 1 } },
    { tx: "A", action: "read", row: 0 }, { tx: "A", action: "commit" },
    { tx: "B", action: "write", row: 1, value: 0, guard: { row: 0, equals: 1 } }, { tx: "B", action: "commit" },
  ];
  const result = engine.execute({ goalLabel: "对比值班写偏斜", initialRows: [1, 1], schedule });
  assert.deepEqual(result.snapshot.steps[3].read, { value: 0, version: null });
  assert.equal(result.readCommitted.steps[5].outcome, "skipped");
  assert.deepEqual(result.readCommitted.committed.map(({ value }) => value), [0, 1]);
  assert.deepEqual(result.snapshot.committed.map(({ value }) => value), [0, 0]);
  const rollback = engine.execute({ goalLabel: "回滚后值不变", initialRows: [1], schedule: [
    { tx: "A", action: "begin" }, { tx: "A", action: "write", row: 0, value: 9 }, { tx: "A", action: "rollback" },
  ] });
  assert.deepEqual(rollback.snapshot.committed, [{ value: 1, version: 0 }]);
});
