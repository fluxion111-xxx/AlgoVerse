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

test("Bellman–Ford traces a reachable negative self-loop without marking an unrelated target", () => {
  const engine = getExperimentEngine("bellman-ford");
  const config = { ...engine.preset(), bellmanNodes: 6, bellmanTarget: 3,
    bellmanEdges: [[0, 1, 1], [1, 1, -1], [1, 2, 1], [0, 2, -10], [0, 3, 5], [4, 5, -3], [5, 4, 1]] };
  const { metrics, steps } = engine.execute(config);
  assert.equal(metrics.bellmanAffected, "2");
  assert.equal(metrics.bellmanDistance, "5");
  assert.equal(metrics.bellmanUnreachable, "2");
  assert.ok(steps.some((row) => row[0] === "沿边传播" && row[1] === "1→2"));
  assert.equal(engine.execute({ ...config, bellmanTarget: 2 }).metrics.bellmanDistance, "无有限下界");
  assert.equal(engine.execute({ ...config, bellmanTarget: 4 }).metrics.bellmanDistance, "不可达");
});

test("TCP timeout handles an ACK on the deadline and runs both retry timelines to completion", () => {
  const engine = getExperimentEngine("tcp-timeout");
  const config = engine.preset();
  const atDeadline = engine.execute({ ...config, rtoAckAt: 2, rtoRetryLimit: 0 });
  assert.equal(atDeadline.metrics.fixedAck, "收到确认");
  assert.deepEqual(atDeadline.steps.at(-1), [2, "收到 ACK，停表", "收到 ACK，停表"]);
  const noAck = engine.execute({ ...config, rtoAckAt: -1, rtoRetryLimit: 2 });
  assert.equal(noAck.metrics.fixedStopTick, "6");
  assert.equal(noAck.metrics.backoffStopTick, "14");
  assert.deepEqual(noAck.steps.at(-1), [14, "—", "超时 · 重试用尽"]);
});

test("DNS negative cache expires at the smaller SOA value and publication is visible after expiry", () => {
  const engine = getExperimentEngine("dns-negative-cache");
  const config = { ...engine.preset(), dnsSoaTtl: 2, dnsSoaMinimum: 4, dnsPublishAt: 1, dnsQueryTicks: [0, 0, 1, 2, 2] };
  const { metrics, steps } = engine.execute(config);
  assert.equal(metrics.dnsCachedFirstVisible, "2");
  assert.equal(metrics.dnsStaleNegative, "1");
  assert.match(steps[2][2], /缓存.*第 2 拍到期/);
  assert.match(steps[3][2], /上游.*查到记录/);
  assert.match(steps[4][2], /缓存.*查到记录/);
  assert.equal(engine.execute({ ...config, dnsQueryTicks: [1, 0] }), null);
});

test("stratification holds out every row once and reports scarce labels", () => {
  const engine = getExperimentEngine("stratified-validation");
  const config = { ...engine.preset(), validationFolds: 3, validationSamples: [[6, 0], [0, 0], [2, 1], [1, 0], [3, 0]] };
  const { steps, metrics, report } = engine.execute(config);
  assert.equal(metrics.stratifiedMissingFolds, "2");
  assert.match(report.explanation, /少数类样本不够每折一份/);
  for (const method of ["顺序分块", "按标签分层"]) {
    const heldOut = steps.filter((row) => row[0] === method).flatMap((row) => row[2].split("、").map(Number));
    assert.deepEqual(heldOut.sort((left, right) => left - right), [1, 2, 3, 4, 5]);
  }
});

test("IPv4 fragments conserve payload and honor MTU, DF and empty payloads", () => {
  const engine = getExperimentEngine("ipv4-fragmentation");
  const preset = engine.preset();
  const maximum = engine.execute({ ...preset, fragmentPayload: 65_515, fragmentMtu: 68 });
  assert.ok(maximum.steps.every(([, , data, size, , more]) => size <= 68 && (!more || data % 8 === 0)));
  assert.equal(maximum.steps.reduce((sum, row) => sum + row[2], 0), 65_515);
  assert.deepEqual(maximum.steps.at(-1), [1365, "65472–65514", 43, 63, 8184, 0]);
  const exact = engine.execute({ ...preset, fragmentMtu: 1_500, fragmentDf: 1 });
  assert.deepEqual(exact.steps, [[1, "0–1479", 1480, 1500, 0, 0]]);
  const empty = engine.execute({ ...preset, fragmentPayload: 0 });
  assert.deepEqual(empty.steps, [[1, "空", 0, 20, 0, 0]]);
});

test("removing the unreachable cycle lets both collectors reclaim its downstream object", () => {
  const engine = getExperimentEngine("gc-cycles");
  const result = engine.execute({ ...engine.preset(), gcLinks: [[0, 1], [1, 2], [3, 4]] });
  assert.deepEqual(result.metrics, { rcCollected: "3", markCollected: "3", unreachableRetained: "0", reachableCount: "2" });
  assert.deepEqual(result.steps.filter((step) => step[1] === "计数为零，回收").map((step) => step[2]), [0, 1, 2]);
});

test("linear regression and PCA report degenerate samples without inventing a unique direction", () => {
  const regression = getExperimentEngine("linear-regression");
  const line = regression.execute({ ...regression.preset(), regressionPoints: [[1, 10], [1, 20]] });
  assert.match(line.report.explanation, /斜率不唯一/);
  assert.deepEqual(line.metrics, { regSlope: "0", regIntercept: "15", regMse: "25", regBaselineMse: "25", regPrediction: "15" });
  const pca = getExperimentEngine("pca-projection");
  const point = pca.execute({ ...pca.preset(), pcaSamples: [[1, 2], [1, 2]] });
  assert.deepEqual(point.metrics, { manualVariance: "0", principalVariance: "0", principalAngle: "任意方向",
    principalRetained: "无定义", manualRetained: "无定义" });
  const circle = pca.execute({ ...pca.preset(), pcaSamples: [[1, 0], [-1, 0], [0, 1], [0, -1]], pcaAngle: 37 });
  assert.equal(circle.metrics.manualRetained, "50.0%");
  assert.equal(circle.metrics.principalRetained, "50.0%");
});

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
  assert.equal(new Set(registeredEngines.map(({ id }) => id)).size, 66);
  assert.equal(new Set(registeredEngines.map(({ route }) => route)).size, 66);
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

test("new simulations preserve IPv4 boundaries, empty outcomes, and seeded replay prefixes", () => {
  const subnet = getExperimentEngine("ipv4-subnet");
  const config = subnet.preset();
  assert.equal(subnet.execute({ ...config, subnetBits: 0 }).metrics.subnetSize, "4294967296");
  assert.equal(subnet.execute({ ...config, subnetBits: 32 }).metrics.subnetMask, "255.255.255.255");
  assert.equal(subnet.execute({ ...config, hostIp: "10.0.0.256" }), null);

  const prefixes = getExperimentEngine("longest-prefix");
  const packet = { ...prefixes.preset(), packetIp: "192.0.2.2" };
  assert.equal(prefixes.execute(packet).metrics.bestPrefix, "0.0.0.0/0");
  assert.equal(prefixes.execute({ ...packet, routeTable: "10.0.0.0/8 B" }).metrics.selectedHop, "无");
  assert.equal(prefixes.execute({ ...packet, routeTable: "10.0.0.1/8 B" }), null);
  assert.equal(prefixes.execute({ ...packet, routeTable: "10.0.0.0/8 B\n10.0.0.0/8 C" }), null);

  const scores = getExperimentEngine("classification-threshold");
  assert.equal(scores.execute({ ...scores.preset(), scoredLabels: [[10, 0]] }).metrics.precisionA, "无定义");
  assert.equal(scores.execute({ ...scores.preset(), scoredLabels: [[10, 2]] }), null);

  const bandit = getExperimentEngine("epsilon-greedy");
  const initial = bandit.preset();
  const first = bandit.execute(initial);
  assert.deepEqual(bandit.execute(initial), first);
  assert.deepEqual(bandit.execute({ ...initial, banditTurns: 40 }).steps.slice(0, initial.banditTurns), first.steps);
});

test("curriculum edge cases preserve cycle, CRC, index, and constant-feature behavior", () => {
  const topo = getExperimentEngine("topological-sort");
  assert.equal(topo.execute({ ...topo.preset(), taskNodes: 1, taskDependencies: [[0, 0]] }).metrics.topoCycle, "有环");
  assert.equal(topo.execute({ ...topo.preset(), taskDependencies: [[0, 1], [0, 1]] }), null);

  const crc = getExperimentEngine("crc-detection");
  const frame = crc.preset();
  assert.equal(crc.execute({ ...frame, crcFlips: [13, 15, 16] }).metrics.crcOutcome, "未检出翻转");
  assert.equal(crc.execute({ ...frame, crcFlips: [17] }), null);

  const index = getExperimentEngine("composite-index");
  const data = index.preset();
  for (const lead of [0, 1, 2, 3, 4]) {
    for (const bound of [10, 22, 25, 30]) {
      const report = index.execute({ ...data, indexLeading: lead, indexLower: bound, indexUpper: bound });
      assert.equal(report.metrics.compositeRange, report.metrics.compositeMatches);
    }
  }

  const split = getExperimentEngine("tree-split");
  assert.equal(split.execute({ ...split.preset(), giniCutA: -1, giniCutB: 99 }).metrics.giniWinner, "均无有效切分");
  const scaling = getExperimentEngine("knn-scaling");
  const constant = scaling.execute({ ...scaling.preset(), scaleSamples: [[1, 4, 0], [1, 4, 1]] });
  assert.equal(constant.metrics.scaledClass, "A");
  assert.match(constant.report.explanation, /跨度为零的维度忽略/);
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
