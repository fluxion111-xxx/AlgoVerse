import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const cookieScope = Symbol.for("algoverse.test.creatorCookies");
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export {}" };
    if (specifier === "next/headers") return { shortCircuit: true,
      url: "data:text/javascript,export const cookies = () => globalThis[Symbol.for('algoverse.test.creatorCookies')]" };
    if (specifier === "next/navigation") return nextResolve("next/navigation.js", context);
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if (specifier.startsWith("./") && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.includes("/src/")) {
      return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { POST } = await import("../src/app/api/experiments/creator/route.ts");
const { runCreatorExperiment, runKnowledgeExperiment } = await import("../src/app/experiments/actions.ts");
const { getComparableExperimentRuns, getExperimentSession, getExperimentWorkflow, getExperimentRun, runExperimentSession } = await import("../src/lib/server/experimentRecords.ts");
const { curriculumLabs } = await import("../src/lib/experiments/curriculumLabs.ts");
const { experimentEvidence, evidenceLabels } = await import("../src/lib/experiments/evidence.ts");
const { experimentReport } = await import("../src/lib/experiments/report.ts");
const { experimentRunComparison } = await import("../src/lib/experiments/runComparison.ts");
const { getCourse } = await import("../src/lib/courses.ts");
const { getExperimentTopic } = await import("../src/lib/knowledge.ts");
hooks.deregister();

async function setup(t, complete) {
  const dir = await mkdtemp(join(tmpdir(), "algoverse-planning-test-"));
  const originalDir = process.env.ALGOVERSE_DATA_DIR;
  process.env.ALGOVERSE_DATA_DIR = dir;
  const cookies = new Map();
  globalThis[cookieScope] = {
    get: (name) => cookies.get(name),
    set: (name, value) => cookies.set(name, { value }),
    get size() { return cookies.size; },
  };
  t.after(async () => {
    delete globalThis[cookieScope];
    if (originalDir === undefined) delete process.env.ALGOVERSE_DATA_DIR;
    else process.env.ALGOVERSE_DATA_DIR = originalDir;
    await rm(dir, { recursive: true, force: true });
  });
  const key = `sk-test-${randomUUID()}`;
  const fetch = t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    assert.equal(init.headers.Authorization, `Bearer ${key}`);
    assert.ok(!init.body.includes(key));
    const { messages } = JSON.parse(init.body);
    const reply = complete(JSON.parse(messages[1].content));
    if (reply instanceof Response) return reply;
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(reply) } }],
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } });
  });
  async function ask(question, context = {}) {
    const response = await POST(new Request("https://algoverse.test/api/experiments/creator", {
      method: "POST",
      headers: { "content-type": "application/json", "X-AI-Model": "deepseek-flash", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ question, ...context }),
    }));
    const body = await response.json();
    assert.ok(!JSON.stringify(body).includes(key));
    return { ...body, httpStatus: response.status };
  }
  return { ask, fetch };
}

async function confirmAndRun({ id, revision }) {
  const runId = randomUUID();
  assert.equal((await getExperimentSession(id, revision)).confirmedAt, null);
  assert.equal(await runExperimentSession(id, runId, revision), null);
  const form = new FormData();
  form.set("sessionId", id);
  form.set("revision", String(revision));
  form.set("runId", runId);
  await assert.rejects(runCreatorExperiment(form), (error) => error.digest?.startsWith("NEXT_REDIRECT;") && error.digest.includes(runId));
  return getExperimentRun(runId);
}

test("real engines run validated plans only after confirmation, including DNS caching", async (t) => {
  const examples = [
    ["比较冒泡排序和快速排序。", { intent: "compare", engine: "sorting", version: 1,
      parameters: { goalLabel: "比较交换次数", values: [7, 2, 9, 4, 3] } }],
    ["模拟 CPU 时间片轮转调度。", { intent: "create", engine: "cpu-scheduling", version: 1,
      parameters: { goalLabel: "观察抢占", policy: "rr", quantum: 2, processes: [{ arrival: 0, burst: 5 }, { arrival: 1, burst: 3 }] } }],
    ["比较 Dijkstra 与 A*。", { intent: "compare", engine: "pathfinding", version: 1,
      parameters: { goalLabel: "对比访问节点", map: { kind: "random", difficulty: "normal" } } }],
    ["比较哈希连接与嵌套循环。", { intent: "compare", engine: "join-strategies", version: 1,
      parameters: { goalLabel: "比较连接候选数", leftRows: [2, 2], rightRows: [2, 2, 3] } }],
    ["用 600 字节的 MTU 观察 IPv4 分片。", { intent: "create", engine: "ipv4-fragmentation", version: 1,
      parameters: { goalLabel: "核对每片长度与偏移", fragmentPayload: 1_480, fragmentMtu: 600, fragmentDf: 0 } }],
    ["比较 DNS 发布后的否定缓存。", { intent: "compare", engine: "dns-negative-cache", version: 1,
      parameters: { goalLabel: "找出新 DNS 记录首次可见时刻", dnsPublishAt: 2, dnsSoaTtl: 10, dnsSoaMinimum: 3,
        dnsPositiveTtl: 5, dnsQueryTicks: [0, 2, 3] } }],
  ];
  let index = 0;
  const { ask } = await setup(t, ({ question, capabilities }) => {
    assert.equal(question, examples[index][0]);
    assert.equal(capabilities.length, 162);
    const join = capabilities.find(({ id }) => id === "join-strategies");
    assert.deepEqual(Object.keys(join.parameters), ["goalLabel", "leftRows", "rightRows"]);
    assert.match(join.comparison, /哈希分组/);
    const pathfinding = capabilities.find(({ id }) => id === "pathfinding");
    assert.deepEqual(Object.keys(pathfinding.parameters), ["goalLabel", "map"]);
    assert.match(pathfinding.description, /地图必须可达/);
    assert.match(capabilities.find(({ id }) => id === "dns-negative-cache").comparison, /否定缓存/);
    return examples[index++][1];
  });
  const runs = [];
  for (const [question, output] of examples) {
    const response = await ask(question);
    assert.equal(response.httpStatus, 201);
    assert.equal(response.status, "ready");
    const workflow = await getExperimentWorkflow(response.sessionId);
    assert.equal(workflow.plan.engineId, output.engine);
    assert.equal(workflow.plan.source.intent, output.intent);
    runs.push(await confirmAndRun(workflow));
  }
  const [sorting, scheduling, pathfinding, join, fragmentation, dns] = runs.map(({ results }) => results);
  assert.deepEqual(sorting.bubble.sorted, [2, 3, 4, 7, 9]);
  assert.deepEqual(sorting.quick.sorted, sorting.bubble.sorted);
  assert.deepEqual(scheduling.timeline[0], { process: 0, start: 0, end: 2 });
  assert.equal(scheduling.switches, 4);
  assert.equal(pathfinding.dijkstra.pathLength, pathfinding.astar.pathLength);
  assert.ok(pathfinding.astar.visited.length > 0 && pathfinding.dijkstra.visited.length > 0);
  assert.deepEqual(join.metrics, { joinMatches: "4", nestedCandidates: "6", hashCandidates: "4", hashBuildRows: "3", hashLookupCount: "2" });
  assert.deepEqual(fragmentation.steps, [
    [1, "0–575", 576, 596, 0, 1],
    [2, "576–1151", 576, 596, 72, 1],
    [3, "1152–1479", 328, 348, 144, 0],
  ]);
  assert.equal(dns.metrics.dnsCachedFirstVisible, "3");
  assert.equal(dns.metrics.dnsUncachedFirstVisible, "2");
  assert.match(dns.steps[1][2], /缓存.*NXDOMAIN/);
});

test("AI Workbench plans WAL recovery with custom page values and runs the confirmed plan", async (t) => {
  const { ask } = await setup(t, ({ capabilities }) => {
    assert.match(capabilities.find(({ id }) => id === "wal-checkpoint").comparison, /从检查点重做/);
    return { intent: "compare", engine: "wal-checkpoint", version: 1,
      parameters: { goalLabel: "核对检查点之后的重做", walInitialPages: [1, 2], walUpdates: [[0, 9], [1, 8], [0, 7]],
        walDurableCount: 2, walCheckpointCount: 1 } };
  });
  const response = await ask("比较有无检查点的断电恢复。");
  assert.equal(response.httpStatus, 201);
  const workflow = await getExperimentWorkflow(response.sessionId);
  assert.equal(workflow.plan.engineId, "wal-checkpoint");
  const { results } = await confirmAndRun(workflow);
  assert.deepEqual(results.metrics, { walScannedAll: "2", walScannedTail: "1", walLostPending: "1", walRecoveredPages: "9、8", walRedoSaved: "1" });
  assert.deepEqual(results.steps.at(-1).slice(-2), ["9、8", "9、8"]);
});

test("AI Workbench can plan a lossy IPv6 MTU comparison with custom inputs", async (t) => {
  const { ask } = await setup(t, ({ capabilities }) => {
    const tool = capabilities.find(({ id }) => id === "ipv6-path-mtu");
    assert.match(tool.comparison, /Packet Too Big/);
    assert.deepEqual(Object.keys(tool.parameters), ["goalLabel", "pmtuLinkSizes", "pmtuStartingSize", "pmtuPayloadBytes"]);
    return { intent: "compare", engine: "ipv6-path-mtu", version: 1,
      parameters: { goalLabel: "核对两次 MTU 反馈后的送达量", pmtuLinkSizes: [1600, 1400], pmtuStartingSize: 1800, pmtuPayloadBytes: 2400 } };
  });
  const response = await ask("对比收到反馈和反馈被过滤时的 IPv6 送达量。");
  assert.equal(response.httpStatus, 201);
  const workflow = await getExperimentWorkflow(response.sessionId);
  assert.equal(workflow.plan.engineId, "ipv6-path-mtu");
  const { results } = await confirmAndRun(workflow);
  assert.equal(results.metrics.pmtuFeedbackBytes, "2400");
  assert.equal(results.metrics.pmtuFilteredBytes, "0");
  assert.equal(results.metrics.pmtuFeedbackDrops, "2");
  assert.match(results.steps[0][1], /链路 1 丢弃/);
  assert.match(results.steps[1][1], /链路 2 丢弃/);
});

test("the AI Workbench configures a custom TCP handshake and executes after confirmation", async (t) => {
  const { ask } = await setup(t, ({ capabilities }) => {
    const tool = capabilities.find(({ id }) => id === "tcp-handshake");
    assert.deepEqual(Object.keys(tool.parameters), ["goalLabel", "handshakeClientIsn", "handshakeServerIsn", "handshakeDrop"]);
    return { intent: "create", engine: "tcp-handshake", version: 1,
      parameters: { goalLabel: "观察首个 SYN 丢包后的重发", handshakeClientIsn: 4294967295, handshakeServerIsn: 30, handshakeDrop: 1 } };
  });
  const response = await ask("用最后一个 32 位序号做 TCP 握手，丢掉第一次 SYN。");
  assert.equal(response.httpStatus, 201);
  const workflow = await getExperimentWorkflow(response.sessionId);
  assert.equal(workflow.plan.engineId, "tcp-handshake");
  const { results } = await confirmAndRun(workflow);
  assert.equal(results.metrics.handshakeTransmissions, "4");
  assert.equal(results.metrics.handshakeClientNext, "0");
  assert.equal(results.metrics.handshakeBothEstablished, "是");
  assert.deepEqual(results.steps[0].slice(-3), ["丢失", "SYN-SENT", "LISTEN"]);
});

test("the AI Workbench configures length-bounded TCP framing and confirms its run", async (t) => {
  const { ask } = await setup(t, ({ capabilities }) => {
    const tool = capabilities.find(({ id }) => id === "tcp-framing");
    assert.deepEqual(Object.keys(tool.parameters), ["goalLabel", "framingLengths", "framingReadSizes", "framingMaxAllowed"]);
    return { intent: "create", engine: "tcp-framing", version: 1,
      parameters: { goalLabel: "短消息通过后拒绝超长正文", framingLengths: [2, 6, 2], framingReadSizes: [3], framingMaxAllowed: 4 } };
  });
  const response = await ask("模拟分批读取 TCP 消息，收到 6 字节正文的头后停止解析。");
  assert.equal(response.httpStatus, 201);
  const workflow = await getExperimentWorkflow(response.sessionId);
  assert.equal(workflow.plan.engineId, "tcp-framing");
  const { results } = await confirmAndRun(workflow);
  assert.equal(results.metrics.framingDecodedCount, "1");
  assert.equal(results.metrics.framingBlocked, "1");
  assert.equal(results.metrics.framingBodyBytes, "2");
  assert.deepEqual(results.steps[0], [1, "2、1、1", "2", 0, "无残留"]);
});

test("the AI Workbench can configure and confirm a custom lazy segment tree run", async (t) => {
  const { ask } = await setup(t, ({ capabilities }) => {
    const tool = capabilities.find(({ id }) => id === "lazy-segment-tree");
    assert.deepEqual(Object.keys(tool.parameters), ["goalLabel", "lazySegmentValues", "lazySegmentOperations"]);
    return { intent: "create", engine: "lazy-segment-tree", version: 1, parameters: {
      goalLabel: "先加整段，再查询右侧", lazySegmentValues: [2, 4, 6], lazySegmentOperations: [[0, 0, 3, 1], [1, 1, 3, 0]],
    } };
  });
  const response = await ask("给 2、4、6 全部加一，然后查后两项的和。");
  assert.equal(response.httpStatus, 201);
  const workflow = await getExperimentWorkflow(response.sessionId);
  assert.equal(workflow.plan.engineId, "lazy-segment-tree");
  const { results } = await confirmAndRun(workflow);
  assert.equal(results.metrics.lazySegmentLastSum, "12");
  assert.deepEqual(results.steps.at(-1).slice(0, 4), ["求和", "[1, 3)", 12, 12]);
});

test("all 144 curriculum labs run and retest from their learning-path entries", async (t) => {
  await setup(t, () => assert.fail("Local runs should not call an AI service"));
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
  const cases = {
    "stack-queue": ["takeAfter", [0, 1, 2, 3, 4], { takeDifferences: "3", emptyTakes: "0" }, { takeDifferences: "0", emptyTakes: "1" }, /栈从刚放入的一端取/],
    "binary-search": ["searchValue", 22, { searchIndex: "4", binaryReads: "5" }, { searchIndex: "未找到", insertionIndex: "11", binaryReads: "3" }, /遇到相等仍往左收窄/],
    "disk-scheduling": ["diskHead", 0, { fcfsSeek: "640", sstfSeek: "236" }, { sstfSeek: "183" }, /SSTF 就近选下一站/],
    "tlb-translation": ["tlbEntries", 3, { tlbHits: "3", tlbMisses: "5" }, { tlbHits: "5", tlbMisses: "3", tlbEvictions: "0" }, /满时换走最久未用项/],
    "ipv4-subnet": ["subnetBits", 24, { subnetStart: "192.168.1.64", subnetEnd: "192.168.1.127", subnetMember: "不同子网" }, { subnetSize: "256", subnetMember: "同一子网" }, /比较前缀即可判断/],
    "longest-prefix": ["packetIp", "10.1.3.9", { selectedHop: "D", bestPrefixBits: "24" }, { selectedHop: "C", bestPrefixBits: "16" }, /默认路由匹配所有地址/],
    "pointer-write": ["pointerOffset", 3, { changedCells: "1", pointerReadback: "42" }, { changedCells: "0", pointerReadback: "未读取", pointerArray: "8、12、19、23" }, /尾后指针可当结束标记/],
    "variable-scope": ["reassignedValue", 7, { scopeResultGap: "7" }, { scopeResultGap: "0", scopedOuterWith: "7", scopedOuterWithout: "7" }, /内层同名声明遮住外层/],
    "sql-grouping": ["minSubtotal", 121, { whereRows: "4", havingGroups: "2" }, { whereRows: "4", havingGroups: "0" }, /HAVING 按总和筛组/],
    "join-strategies": ["rightRows", [2, 2, 2], { joinMatches: "5", nestedCandidates: "20" }, { joinMatches: "6", nestedCandidates: "12", hashCandidates: "6" }, /重复键可匹配多行/],
    "classification-threshold": ["thresholdAfter", 50, { falseAlarmB: "0", missesB: "2" }, { falseAlarmB: "2", missesB: "1", recallB: "75.0%" }, /漏报是没找出真实正例/],
    "epsilon-greedy": ["explorationRate", 0, {}, { randomChoices: "0", epsilonBChoices: "0" }, /两种策略共用奖励序列/],
    "topological-sort": ["taskDependencies", [[0, 2], [1, 2], [2, 3], [1, 4], [4, 5], [5, 1]], { topoCycle: "无环", topoScheduled: "6" }, { topoCycle: "有环", topoBlocked: "5", topoOrder: "0" }, /环也会卡住下游任务/],
    "union-find": ["setLookups", [4, 4, 4], { setComponents: "2", plainRootHops: "15", compressedRootHops: "7", parentRewrites: "3" }, { plainRootHops: "0", compressedRootHops: "0", parentRewrites: "0" }, /两边返回同一个根/],
    "clock-replacement": ["clockFrames", 1, { clockFaults: "6", clockFifoFaults: "7", clockResets: "7" }, { clockFaults: "9", clockFifoFaults: "9" }, /扫到一就清零并跳过/],
    "counter-mutex": ["counterSchedule", [0, 0, 0, 1, 1, 1], { interleavedCounter: "12", mutexCounter: "13", lostCounterUnits: "1" }, { interleavedCounter: "13", staleCounterWrites: "0", lostCounterUnits: "0" }, /锁保护完整的读改写/],
    "crc-detection": ["crcFlips", [], { sentCrc: "0b100", crcFlippedBits: "1", crcOutcome: "检出误码" }, { receivedCrcRemainder: "0b000", crcOutcome: "校验通过" }, /接收端对整帧再算余数/],
    "send-window": ["sendWindowSize", 1, { stopWaitTicks: "40", slidingWindowTicks: "16", peakWindowPackets: "3" }, { slidingWindowTicks: "40", windowSavedTicks: "0", peakWindowPackets: "1" }, /收到确认就腾出一格/],
    "short-circuit": ["guardCases", [[1, 9], [1, 7], [1, -2], [1, 0]], { forcedInvalidReads: "2", guardSkips: "2", guardsPassed: "1" }, { forcedInvalidReads: "0", guardedReads: "4", guardsPassed: "2" }, /左边为假就跳过右边/],
    "unsigned-wrap": ["unsignedBits", 9, { wrappedFinal: "238", wrapEventCount: "4", backwardWraps: "2" }, { wrappedFinal: "238", wrapEventCount: "0" }, /负数也映射到非负余数/],
    "sql-null": ["nullableColumn", "5, 5, 3, NULL, 5, -1", { sqlEqualRows: "2", sqlIsNullRows: "2", sqlEqualNullRows: "0" }, { sqlEqualRows: "3", sqlIsNullRows: "1", sqlUnknownRows: "1" }, /WHERE 只保留结果为真的行/],
    "composite-index": ["indexUpper", 17, { compositeMatches: "3", fullScanKeys: "8", compositeRange: "3" }, { compositeMatches: "0", compositeRange: "0" }, /固定 A 后，范围连续/],
    "tree-split": ["giniCutB", 4, { giniDropA: "0.5000", giniDropB: "0.2500", giniWinner: "A" }, { giniDropA: "0.5000", giniDropB: "0.5000", giniWinner: "打平" }, /再按样本数加权/],
    "knn-scaling": ["scaleQueryY", 0, { unscaledClass: "A", scaledClass: "B", changedScaleNeighbors: "1" }, { unscaledClass: "A", scaledClass: "A", changedScaleNeighbors: "0" }, /各维距离按训练跨度缩放/],
    "kmp-search": ["kmpPattern", "abab", { kmpMatches: "4", kmpStarts: "0、2、4、6", kmpBodyChecks: "9", kmpTableChecks: "2", naiveStringChecks: "15" }, { kmpMatches: "3", kmpStarts: "0、2、4", kmpTableChecks: "3" }, /匹配后保留可复用前缀/],
    "kruskal-mst": ["mstEdges", [[0, 1, 1], [1, 2, 2], [0, 2, 3], [2, 3, 4]], { mstWeight: "12", mstAccepted: "4", mstSkipped: "2", mstComponents: "1" }, { mstWeight: "7", mstAccepted: "3", mstSkipped: "1", mstComponents: "2" }, /同一分量内加边会成环/],
    "cache-mapping": ["cacheAccesses", [1, 2, 1, 2, 1, 2], { directMisses: "6", twoWayMisses: "2", directEvictions: "5", twoWayEvictions: "0" }, { directMisses: "2", twoWayMisses: "2", directEvictions: "0" }, /满组先淘汰最久没用的块/],
    "bounded-buffer": ["bufferCapacity", 3, { blockedPuts: "1", blockedTakes: "1", donePuts: "4", doneTakes: "4", peakBuffer: "2", pendingRequests: "0" }, { blockedPuts: "0", blockedTakes: "1", peakBuffer: "3" }, /空槽数等于容量减去占用量/],
    "arp-resolution": ["arpTtl", 5, { arpNextHop: "192.168.1.1", arpDestination: "192.168.2.20", arpLookups: "3", arpCacheHits: "2" }, { arpLookups: "1", arpCacheHits: "4" }, /ARP 查询本链路的下一跳/],
    "ipv4-fragmentation": ["fragmentDf", 1, { outputPackets: "3", sentPayload: "1480", sentBytes: "1540", extraHeaders: "40" }, { outputPackets: "0", sentPayload: "0", sentBytes: "0" }, /偏移是起点除以 8/],
    "python-copy": ["copyNewInner", 2, { aliasChangedParts: "2", shallowChangedParts: "1", deepChangedParts: "0" }, { aliasChangedParts: "1", shallowChangedParts: "0", deepChangedParts: "0" }, /浅拷贝只共享内层/],
    "gc-cycles": ["gcRootRefs", [], { rcCollected: "0", markCollected: "3", unreachableRetained: "3", reachableCount: "2" }, { rcCollected: "2", markCollected: "5", unreachableRetained: "3", reachableCount: "0" }, /环引用的对象也会滞留/],
    "sql-window-frame": ["windowRows", [[1, 1, 10], [1, 2, 20], [1, 3, 5], [2, 1, 8], [2, 2, 2]], { windowGroups: "2", differingRows: "2", maxFrameGap: "20" }, { windowGroups: "2", differingRows: "0", maxFrameGap: "0" }, /包含同区同时间的所有行/],
    "foreign-key-delete": ["fkDeleteKey", 2, { referencingRows: "3", restrictParentRows: "3", cascadeChildDeletes: "3", setNullWrites: "3", cascadeChildRows: "2", setNullChildRows: "5" }, { referencingRows: "1", cascadeChildDeletes: "1", setNullWrites: "1", cascadeChildRows: "4" }, /子表外键允许 NULL/],
    "linear-regression": ["regressionQuery", 5, { regSlope: "2", regIntercept: "1", regMse: "0", regBaselineMse: "5", regPrediction: "9" }, { regMse: "0", regPrediction: "11" }, /只换待测点不影响拟合/],
    "pca-projection": ["pcaAngle", 45, { manualVariance: "1.25", principalVariance: "2.5", principalAngle: "45°", principalRetained: "100.0%", manualRetained: "50.0%" }, { manualVariance: "2.5", manualRetained: "100.0%" }, /主轴使这个值最大/],
    "monotonic-stack": ["greaterNumbers", [1, 2, 3, 4, 5, 6], { greaterScanChecks: "15", greaterStackChecks: "5", greaterFound: "0", greaterStackPeak: "6" }, { greaterScanChecks: "5", greaterStackChecks: "5", greaterFound: "5", greaterPositions: "1、2、3、4、5、无" }, /值相等时继续等待/],
    "bellman-ford": ["bellmanEdges", [[0, 1, 4], [0, 2, 5], [1, 2, -2], [2, 3, 3], [3, 1, 0]], { bellmanAffected: "3", bellmanDistance: "无有限下界", bellmanUnreachable: "1" }, { bellmanAffected: "0", bellmanDistance: "5" }, /沿有向边继续标记下游/],
    "working-set": ["workingFrames", 3, { workingFaults: "9", workingExtraFaults: "3", workingOverflow: "7", workingFaultStreak: "9" }, { workingFaults: "3", workingExtraFaults: "3", workingOverflow: "0", workingFaultStreak: "3" }, /不同页号组成工作集/],
    "priority-inheritance": ["mediumWork", 0, { fixedHighWait: "6", inheritedHighWait: "2", prioritySaved: "4" }, { fixedHighWait: "2", inheritedHighWait: "2", prioritySaved: "0" }, /继承让持锁者临时提级/],
    "tcp-timeout": ["rtoAckAt", 5, { fixedRetries: "5", backoffRetries: "2", fixedStopTick: "12", backoffStopTick: "13", fixedAck: "超时结束", backoffAck: "收到确认" }, { fixedRetries: "2", backoffRetries: "1", fixedStopTick: "5", backoffStopTick: "5", fixedAck: "收到确认" }, /超时后倍增等待/],
    "dns-negative-cache": ["dnsSoaMinimum", 0, { dnsCachedLookups: "3", dnsUncachedLookups: "6", dnsStaleNegative: "2", dnsCachedFirstVisible: "8", dnsUncachedFirstVisible: "5" }, { dnsCachedLookups: "6", dnsStaleNegative: "0", dnsCachedFirstVisible: "5" }, /发布记录不会清空旧缓存/],
    "loop-closure": ["closureCount", 5, { loopVarEnd: "4", loopVarReturns: "4、4、4、4", loopLetReturns: "2、0、3、2", loopDifferentCalls: "4" }, { loopVarEnd: "5", loopVarReturns: "5、5、5、5", loopLetReturns: "2、0、3、2" }, /let 每轮都有独立绑定/],
    "raii-cleanup": ["raiiFailAt", 0, { raiiAcquired: "2", raiiManualLeaks: "2", raiiManagedLeaks: "0", raiiManagedReleased: "20、10" }, { raiiAcquired: "3", raiiManualLeaks: "0", raiiManagedLeaks: "0", raiiManualReleased: "30、20、10", raiiManagedReleased: "30、20、10" }, /已构造对象按逆序清理/],
    "sql-union": ["unionRightRows", [[1, 12], [1, 15], [3, 30]], { unionUniqueCount: "4", unionAllCount: "6", unionDeduplicated: "2", unionSharedRows: "1" }, { unionUniqueCount: "5", unionAllCount: "6", unionDeduplicated: "1", unionSharedRows: "0" }, /去重会检查整行/],
    "candidate-keys": ["closureSeed", "AD", { closureSize: "3", closureMembers: "ABC", closureKeyCount: "3", closureKeyNames: "AD、BD、CD", closureSeedType: "未覆盖全表" }, { closureSize: "4", closureMembers: "ABCD", closureSeedType: "候选键" }, /反复检查直到无法扩展/],
    "ridge-regression": ["ridgePenalty", 2, { ordinaryRidgeSlope: "3", penalizedRidgeSlope: "1", ridgeTrainingMse: "4", ordinaryHoldoutMse: "16", ridgeHoldoutMse: "0" }, { penalizedRidgeSlope: "1.5", ridgeTrainingMse: "2.25", ridgeHoldoutMse: "1" }, /留出点只参与评分/],
    "stratified-validation": ["validationFolds", 2, { plainMissingFolds: "2", stratifiedMissingFolds: "0", plainValidationAccuracy: "100.0%", stratifiedValidationAccuracy: "91.7%" }, { plainMissingFolds: "2", stratifiedMissingFolds: "0", plainValidationAccuracy: "0.0%", stratifiedValidationAccuracy: "91.7%" }, /只用其他折找最近邻/],
    "fenwick-prefix": ["fenwickOps", [[1, 8, 0], [0, 3, -2], [1, 6, 0], [1, 8, 0]], { fenwickLastSum: "24", fenwickScanReads: "22", fenwickTreeReads: "4", fenwickTreeWrites: "3" }, { fenwickLastSum: "18", fenwickScanReads: "22", fenwickTreeReads: "4" }, /最低位决定区间长度/],
    "longest-subsequence": ["subsequenceRight", "XYZ", { subsequenceLength: "4", subsequenceExample: "BCBA", subsequenceCells: "42" }, { subsequenceLength: "0", subsequenceExample: "空", subsequenceCells: "21", subsequenceMatchCells: "0" }, /回溯遇平局先向上/],
    "copy-on-write": ["cowOperations", [[1, 0, 0, 0], [1, 1, 1, 99], [0, 1, 1, 77], [0, 1, 1, 20], [1, 0, 1, 0]], { eagerPageCopies: "4", cowPageCopies: "2", cowSharedPages: "2", cowFinalChild: "10、99、30、40" }, { cowPageCopies: "1", cowSharedPages: "3", cowFinalParent: "10、20、30、40", cowFinalChild: "10、99、30、40" }, /再写私有页无需再复制/],
    "reader-writer": ["rwJobs", [[0, 0, 3], [1, 1, 2], [7, 0, 3], [8, 0, 2]], { rwReaderPolicyWriteWait: "6", rwWriterPolicyWriteWait: "2", rwReaderPolicyReadWait: "0", rwWriterPolicyReadWait: "3" }, { rwReaderPolicyWriteWait: "2", rwWriterPolicyWriteWait: "2", rwWriterPolicyReadWait: "0" }, /多个读者能同时持锁/],
    "ethernet-learning": ["switchVlans", [10, 20, 10, 20], { switchFloods: "2", switchUnicasts: "4", switchMoves: "1", switchCopies: "6" }, { switchFloods: "3", switchUnicasts: "3", switchMoves: "0", switchEntries: "4" }, /泛洪只发给同组其他口/],
    "link-aggregation": ["aggregationMembers", 4, { aggregationFrames: "12", aggregationRoundRobinSplit: "3", aggregationRoundRobinLoads: "4、4、4", aggregationHashLoads: "10、2、0", aggregationHashGap: "10", aggregationHashCollisions: "1" }, { aggregationHashLoads: "6、2、0、4", aggregationRoundRobinLoads: "3、3、3、3", aggregationHashGap: "6", aggregationHashCollisions: "0" }, /同一流固定在同一成员/],
    "microtask-queue": ["eventNestedDepth", 0, { eventFirstTimerStep: "7", eventBeforeFirstTimer: "5", eventMicroCount: "7", eventTimerRan: "2" }, { eventFirstTimerStep: "4", eventBeforeFirstTimer: "2", eventMicroCount: "4", eventTimerRan: "2" }, /新微任务进队尾/],
    "vector-iterator": ["vectorReserveCapacity", 3, { vectorBaselineReallocations: "1", vectorReservedReallocations: "0", vectorBaselineFirstLoss: "1", vectorReservedFirstLoss: "仍有效", vectorEndLoss: "1" }, { vectorReservedReallocations: "1", vectorReservedFirstLoss: "1", vectorEndLoss: "1" }, /原地追加只让旧尾失效/],
    "not-in-null": ["exclusionInner", "2", { notInKept: "0", notExistsKept: "3", notInUnknown: "3", exclusionDelta: "3" }, { notInKept: "3", notExistsKept: "3", notInUnknown: "0", exclusionDelta: "0" }, /等值 NOT EXISTS 只找真匹配/],
    "wal-checkpoint": ["walCheckpointCount", 3, { walScannedAll: "4", walScannedTail: "2", walLostPending: "1", walRecoveredPages: "12、20、30" }, { walScannedTail: "1", walRedoSaved: "3", walRecoveredPages: "12、20、30" }, /检查点刷出已提交页/],
    "silhouette-score": ["silhouetteLabels", [0, 0, 1, 1, 1, 1], { silhouetteMean: "0.8505", silhouetteNegative: "0", silhouetteWorstPoint: "3", silhouetteWorstScore: "0.8125" }, { silhouetteNegative: "1", silhouetteWorstPoint: "3", silhouetteWorstScore: "-0.8125" }, /组内均距排除自己/],
    "probability-calibration": ["calibrationBins", 3, { calibrationAccuracyA: "50.0%", calibrationAccuracyB: "50.0%", calibrationBrierA: "0.41", calibrationBrierB: "0.26", calibrationGapA: "40", calibrationGapB: "10" }, { calibrationBrierA: "0.41", calibrationBrierB: "0.26", calibrationGapB: "0" }, /只改分箱不改 Brier/],
    "interval-scheduling": ["intervalJobs", [[0, 1], [1, 3], [3, 5], [5, 7], [7, 9]], { intervalsStartCount: "1", intervalsEndCount: "4", intervalsExtra: "3", intervalsEndChoices: "2、3、4、5" }, { intervalsStartCount: "5", intervalsEndCount: "5", intervalsExtra: "0" }, /结束拍可接下个预约/],
    "bloom-membership": ["bloomBitCount", 17, { bloomBitsSet: "3", bloomMaybe: "5", bloomFalsePositives: "2", bloomFalseNegatives: "0" }, { bloomBitsSet: "6", bloomMaybe: "3", bloomFalsePositives: "0", bloomFalseNegatives: "0" }, /全一时还需核对集合/],
    "feedback-queue": ["feedbackBoostEvery", 0, { feedbackPlainFinish: "9", feedbackBoostFinish: "8", feedbackPlainWait: "6", feedbackBoostWait: "3", feedbackBoostShortWait: "2" }, { feedbackBoostFinish: "9", feedbackBoostWait: "6", feedbackBoostShortWait: "0", feedbackPromotions: "0" }, /到期先提级，再接新任务/],
    "file-links": ["linkFileOps", [[0, 2], [1, 1], [0, 1], [0, 2], [2, 42], [0, 2]], { linkReadMisses: "1", linkDanglingReads: "1", linkReplacementReads: "1", linkOriginalRefs: "1", linkLastRead: "42" }, { linkReadMisses: "1", linkDanglingReads: "0", linkReplacementReads: "0", linkOriginalRefs: "1", linkLastRead: "7" }, /符号链接保存路径 A/],
    "spanning-bridge": ["bridgeLinks", [[0, 1], [1, 2]], { bridgeBlocked: "1", bridgePlainFrames: "10", bridgeTreeFrames: "2", bridgePlainExtra: "8", bridgeTreeReached: "2" }, { bridgeBlocked: "0", bridgePlainFrames: "2", bridgeTreeFrames: "2", bridgePlainExtra: "0" }, /广播会避开来口/],
    "ipv6-path-mtu": ["pmtuStartingSize", 1280, { pmtuActualLimit: "1280", pmtuFeedbackBytes: "3000", pmtuFilteredBytes: "0", pmtuFeedbackDrops: "1", pmtuFilteredDrops: "3" }, { pmtuFeedbackBytes: "3000", pmtuFilteredBytes: "3000", pmtuFeedbackDrops: "0", pmtuFilteredDrops: "0" }, /源端改小后重试/],
    "generator-exhaustion": ["generatorTakeCounts", [1, 1, 1], { generatorReusedProduced: "4", generatorFreshProduced: "8", generatorReusedStops: "2", generatorFreshStops: "0" }, { generatorReusedProduced: "3", generatorFreshProduced: "3", generatorReusedStops: "0", generatorReusedLast: "6" }, /取完后再请求才遇耗尽/],
    "mutable-hash-key": ["hashKeyAfter", 3, { hashKeyUnsafeFound: "否", hashKeySafeFound: "是", hashKeySameBucket: "是", hashKeyOriginalBucket: "3", hashKeyUpdatedBucket: "3" }, { hashKeyUnsafeFound: "是", hashKeySafeFound: "是" }, /同桶还要核对哈希和键/],
    "buffer-pool": ["bufferFrameLimit", 3, { bufferDiskReads: "4", bufferDirtyWrites: "1", bufferAllPinned: "1", bufferEvictions: "2", bufferDiskResult: "99、20、30" }, { bufferDiskReads: "3", bufferDirtyWrites: "0", bufferAllPinned: "0", bufferPendingDirty: "1", bufferDiskResult: "10、20、30" }, /固定数大于零就不能换出/],
    "mvcc-versions": ["mvccTrace", [[0, 0], [1, 20], [0, 1], [1, 30], [2, 0], [2, 1], [4, 0], [3, 0], [4, 0], [3, 1]], { mvccHistoricalReads: "2", mvccReclaimed: "2", mvccRetained: "1", mvccLatestValue: "30", mvccPeak: "3" }, { mvccHistoricalReads: "2", mvccReclaimed: "1", mvccRetained: "2", mvccLatestValue: "30" }, /最新版本始终保留/],
    "imputation-leakage": ["imputationValidRows", [[2, 0, 4], [0, 1, 4]], { imputationTrainMean: "2", imputationMixedMean: "4.6667", imputationTrainMse: "8", imputationMixedMse: "0", imputationChangedPredictions: "1" }, { imputationTrainMean: "2", imputationMixedMean: "2", imputationTrainMse: "16", imputationMixedMse: "16", imputationChangedPredictions: "0" }, /混合组让验证特征参加拟合/],
    "early-stopping": ["stopPatience", 1, { stopAtEpoch: "3", stopBestEpoch: "1", stopBestMse: "0", stopFullMse: "23.4619", stopBestWeight: "5" }, { stopAtEpoch: "2", stopBestEpoch: "1", stopBestMse: "0", stopFullMse: "23.4619" }, /连续无改善达到耐心值就停/],
    "difference-array": ["differenceUpdates", [[0, 2, 2], [1, 4, -1], [2, 5, 3]],
      { differenceDirectWrites: "11", differenceBoundaryWrites: "6", differenceRestoreReads: "5", differenceFinalSum: "31", differenceOutput: "3、3、7、8、10" },
      { differenceDirectWrites: "8", differenceBoundaryWrites: "6", differenceFinalSum: "25", differenceOutput: "3、3、5、6、8" }, /重叠段的贡献会相加/],
    "zero-one-knapsack": ["sackCapacity", 5,
      { sackCorrect: "4", sackForward: "6", sackExcess: "2", sackVisited: "5" }, { sackCorrect: "7", sackForward: "7", sackExcess: "0" }, /正序可能读本轮的新值/],
    "sliding-maximum": ["slidingWidth", 5,
      { slidingResults: "3、3、5、5、6、7", slidingScans: "18", slidingTailChecks: "9" }, { slidingResults: "5、5、6、7", slidingScans: "20" }, /队首就是当前最大值/],
    "rolling-hash": ["rollingModulus", 97,
      { rollingCandidates: "4", rollingCollisions: "2", rollingMatches: "0、2", rollingChecks: "6" },
      { rollingCandidates: "2", rollingCollisions: "0", rollingMatches: "0、2", rollingChecks: "4" }, /哈希相等才逐字核对/],
    "lock-ordering": ["lockReverseSecond", 0,
      { lockOriginalDone: "0", lockOrderedDone: "2", lockOriginalCycle: "有" }, { lockOriginalDone: "2", lockOrderedDone: "2", lockOriginalCycle: "无" }, /互相持有对方的锁会卡住/],
    "file-offset": ["offsetReadOps", [[0, 1], [1, 2], [0, 1]],
      { offsetSharedBytes: "4", offsetIndependentBytes: "5", offsetSharedEmpty: "1", offsetSharedFinal: "4" },
      { offsetSharedBytes: "4", offsetIndependentBytes: "4", offsetSharedEmpty: "0" }, /重新打开各有偏移/],
    "cache-write-policy": ["writePolicyFlush", 0,
      { writePolicyThroughCount: "4", writePolicyBackCount: "2", writePolicyFinalDirty: "0", writePolicyVisibleDiff: "0" },
      { writePolicyBackCount: "1", writePolicyFinalDirty: "1", writePolicyVisibleDiff: "1" }, /换出脏行时先更新下层/],
    "condition-recheck": ["conditionProduced", 4,
      { conditionIfInvalid: "2", conditionWhileWait: "2", conditionSuccessful: "1", conditionBeforeWake: "1" },
      { conditionIfInvalid: "0", conditionWhileWait: "0", conditionSuccessful: "3" }, /拿锁前资源可能已变化/],
    "tcp-handshake": ["handshakeDrop", 0,
      { handshakeTransmissions: "5", handshakeRetries: "2", handshakeFinalAck: "901", handshakeClientNext: "101", handshakeBothEstablished: "是" },
      { handshakeTransmissions: "3", handshakeRetries: "0", handshakeFinalAck: "901" }, /纯 ACK 不占额外序号/],
    "tcp-sack": ["sackArrivals", [[100, 20], [120, 20], [140, 20], [160, 20]],
      { tcpSackFinalAck: "180", tcpSackStalls: "2", tcpSackMaxBlocks: "1", tcpSackRemaining: "0" },
      { tcpSackFinalAck: "180", tcpSackStalls: "0", tcpSackMaxBlocks: "0" }, /相邻块或重叠块会合并/],
    "hop-limit": ["hopNextRouters", [1, 2, 3],
      { hopOutcome: "跳数用尽", hopForwards: "4", hopRemaining: "0", hopRevisits: "2" },
      { hopOutcome: "送达", hopForwards: "3", hopRemaining: "2", hopRevisits: "0" }, /环路会反复消耗限制/],
    "dns-referral": ["referralQueries", [[1, 1], [3, 2], [2, 1], [4, 1]],
      { referralColdLookups: "12", referralCachedLookups: "7", referralTldAsks: "2", referralFound: "3" },
      { referralColdLookups: "12", referralCachedLookups: "9", referralTldAsks: "4", referralFound: "2" }, /根和顶级域给下一站/],
    "mutable-default": ["defaultExplicitCalls", [2],
      { defaultSharedCalls: "3", defaultSharedFinal: "1、2、3", defaultDifferentCalls: "2" },
      { defaultSharedCalls: "2", defaultSharedFinal: "1、3", defaultDifferentCalls: "1" }, /函数定义时创建默认列表/],
    "exception-guarantee": ["guaranteeFailAt", 0,
      { guaranteePartialFields: "1", guaranteePublishedFields: "0", guaranteeOriginalResult: "8、20、30", guaranteeStagedResult: "10、20、30" },
      { guaranteePartialFields: "3", guaranteePublishedFields: "3", guaranteeStagedResult: "8、22、9" }, /准备成功才发布/],
    "copy-move": ["moveBufferValues", [4],
      { moveCopiedCells: "3", moveTransferredCells: "3", moveCopySource: "4、8、15", moveSourceOwns: "否" },
      { moveCopiedCells: "1", moveTransferredCells: "1", moveCopySource: "4", moveReceiver: "7" }, /实际转移来自移动构造/],
    "c-string-terminator": ["cStringCapacity", 5,
      { cStringSafeLength: "3", cStringLostBytes: "1", cStringRawContainsNull: "否" },
      { cStringSafeLength: "4", cStringLostBytes: "0", cStringRawContainsNull: "否" }, /内容和结尾都占容量/],
    "outer-join-filter": ["outerJoinStatus", 0,
      { outerJoinOnRows: "3", outerJoinWhereRows: "1", outerJoinLostKeys: "2" },
      { outerJoinOnRows: "3", outerJoinWhereRows: "2", outerJoinLostKeys: "1" }, /补出的 NULL 比较结果是未知/],
    "lsm-compaction": ["compactIncludeBase", 1,
      { compactSafeVisible: "3", compactUnsafeVisible: "4", compactResurrected: "1", compactTombstones: "1" },
      { compactSafeVisible: "3", compactUnsafeVisible: "3", compactResurrected: "0", compactTombstones: "0" }, /墓碑挡住更旧的值/],
    "consistent-ring": ["ringAddedSlot", 80,
      { ringModuloMoved: "6", ringConsistentMoved: "2", ringMovedToAdded: "2" },
      { ringModuloMoved: "6", ringConsistentMoved: "1", ringMovedToAdded: "1" }, /加节点只截走相邻区段/],
    "covering-index": ["coveringVisiblePages", [0, 1, 2],
      { coveringMatches: "3", coveringPlainFetches: "3", coveringIndexFetches: "1", coveringValues: "50、70、80" },
      { coveringMatches: "3", coveringIndexFetches: "0", coveringSavedFetches: "3", coveringValues: "50、70、80" }, /页全可见时可跳过堆/],
    "stable-softmax": ["softmaxCommonShift", 0,
      { softmaxNaiveStatus: "求和溢出", softmaxStableTop: "3", softmaxStablePeak: "0.6652", softmaxStableDrift: "0" },
      { softmaxNaiveStatus: "可归一化", softmaxStablePeak: "0.6652", softmaxStableDrift: "0" }, /最大指数为一/],
    "causal-mask": ["attentionVisible", 3,
      { attentionUnmaskedOutput: "77.0835", attentionMaskedOutput: "7.3106", attentionFutureWeight: "0.8438" },
      { attentionMaskedOutput: "77.0835", attentionFutureWeight: "0", attentionVisibleCount: "3" }, /只在可见位置归一化/],
    "dropout-mode": ["dropoutRatePct", 0,
      { dropoutMaskedCount: "12", dropoutTrainMeanSum: "18.6667", dropoutInferSum: "20" },
      { dropoutMaskedCount: "0", dropoutTrainMeanSum: "20", dropoutMeanDelta: "0" }, /保留值除以保留概率/],
    "ranking-metrics": ["rankingCutoff", 2,
      { rankingRecallA: "66.7%", rankingRecallB: "66.7%", rankingNdcgA: "0.9468", rankingNdcgB: "0.6299" },
      { rankingRecallA: "66.7%", rankingRecallB: "33.3%", rankingNdcgA: "1" }, /靠后位置增益会折损/],
    "stable-merge": ["stableMergeKeys", [2, 1, 2, 3],
      { mergeStableIds: "2、4、1、3", mergeRightIds: "4、2、3、1", mergeRightReversed: "2", mergeStableReversed: "0" },
      { mergeStableIds: "2、1、3、4", mergeRightReversed: "1" }, /平局先取左/],
    "counting-sort": ["countingKeys", [3, 1, 3, 2, 1, 10],
      { countingSpan: "3", countingEmpty: "0", countingIdsOut: "2、5、4、1、3" },
      { countingSpan: "10", countingEmpty: "6", countingKeysOut: "1、1、2、3、3、10" }, /原序列从后往前放/],
    "heap-build": ["heapBuildKeys", [4, 5, 6, 7, 8, 9],
      { heapDownChecks: "6", heapUpChecks: "8", heapDownSwaps: "4", heapUpSwaps: "8", heapBuiltRoot: "4" },
      { heapDownSwaps: "0", heapUpSwaps: "0", heapBuiltRoot: "4" }, /先选更小的子节点/],
    "matrix-chain": ["chainDimensions", [10, 30, 5, 2],
      { chainOptimalCost: "4500", chainLeftCost: "4500", chainParentheses: "((A1×A2)×A3)", chainCandidates: "4" },
      { chainOptimalCost: "900", chainLeftCost: "1600", chainSaved: "700", chainParentheses: "(A1×(A2×A3))" }, /枚举最后一次合并/],
    "compare-swap": ["compareSwapOverlap", 0,
      { compareSwapPlain: "5", compareSwapAtomic: "8", compareSwapRetries: "1", compareSwapLost: "3" },
      { compareSwapPlain: "8", compareSwapAtomic: "8", compareSwapRetries: "0" }, /失败时读取新值再算/],
    "segment-address": ["segmentDescriptors", [[100, 5], [400, 4]],
      { segmentAllowed: "2", segmentBlocked: "2", segmentAddresses: "100、402" },
      { segmentAllowed: "4", segmentBlocked: "0", segmentAddresses: "100、104、402、403" }, /等于段长也越界/],
    "false-sharing": ["falseShareDistance", 4,
      { falseShareTransfers: "5", falseSharePaddedTransfers: "0", falseShareLineB: "0" },
      { falseShareTransfers: "0", falseSharePaddedTransfers: "0", falseShareLineB: "1" }, /写权限仍按缓存行跟踪/],
    "journal-replay": ["journalReplayCount", 1,
      { journalImageResult: "13、15", journalDeltaResult: "16、10", journalMismatches: "2", journalSkipped: "1" },
      { journalImageResult: "13、15", journalDeltaResult: "13、15", journalMismatches: "0" }, /重复写同值不会累加/],
    "napt-mapping": ["naptPortCapacity", 3,
      { naptAllocated: "2", naptReused: "1", naptBlocked: "1", naptReplies: "3" },
      { naptAllocated: "3", naptBlocked: "0", naptReplies: "4" }, /公网端口区分回包/],
    "tcp-framing": ["framingReadSizes", [20],
      { framingReadCount: "6", framingDecodedCount: "3", framingBodyBytes: "7", framingPeakPending: "2" },
      { framingReadCount: "1", framingDecodedCount: "3", framingBodyBytes: "7", framingPeakPending: "0" }, /先看长度，再等正文收齐/],
    "tcp-half-close": ["halfCloseEvents", [[0, 0, 3], [0, 1, 0], [1, 0, 5], [1, 0, 2], [1, 1, 0]],
      { halfCloseBytesZero: "3", halfCloseBytesOne: "5", halfCloseBlockedSends: "1", halfCloseRemainingBytes: "5" },
      { halfCloseBytesOne: "7", halfCloseBlockedSends: "0", halfCloseRemainingBytes: "7" }, /反向仍可发送/],
    "cors-read": ["corsCredentialsMode", 0,
      { corsOriginMatch: "否", corsServerStatus: "200", corsReadable: "否", corsOriginHeader: "*" },
      { corsReadable: "是", corsServerStatus: "200" }, /include 要求显式允许来源/],
    "nullish-default": ["nullishCodes", [0, 1, 5],
      { nullishDefaulted: "2", nullishOrDefaulted: "5", nullishDifferences: "3" },
      { nullishDefaulted: "2", nullishOrDefaulted: "2", nullishDifferences: "0" }, /零、假和空串都是假值/],
    "context-exit": ["contextSuppress", 1,
      { contextExitCalls: "1", contextManualOpen: "1", contextWithOpen: "0", contextPropagated: "是" },
      { contextExitCalls: "1", contextWithOpen: "0", contextPropagated: "否" }, /返回真可抑制正文异常/],
    "utf8-stream": ["textStreamChunkSize", 4,
      { textStreamBytes: "5", textStreamChunks: "3", textStreamReplacement: "3", textStreamMatched: "是" },
      { textStreamChunks: "2", textStreamReplacement: "0", textStreamMatched: "是" }, /流式解码保留未凑齐的字节/],
    "event-delegation": ["delegatedBubbles", 0,
      { delegatedReached: "是", delegatedDirectMatch: "否", delegatedClosest: "1", delegatedPathLength: "3" },
      { delegatedReached: "否", delegatedClosest: "无", delegatedPathLength: "1" }, /委托从目标找最近按钮/],
    "partial-index": ["partialQueryStatus", 0,
      { partialIndexEntries: "3", partialIndexUsable: "是", partialRowsScanned: "3", partialMatches: "2", partialWouldMiss: "0" },
      { partialIndexUsable: "否", partialRowsScanned: "5", partialMatches: "4", partialWouldMiss: "2" }, /查询必须推出索引条件/],
    "bitmap-filters": ["bitmapUnion", 1,
      { bitmapMatchedA: "3", bitmapMatchedB: "3", bitmapHeapRows: "2", bitmapOutputIds: "3、5" },
      { bitmapHeapRows: "4", bitmapSavedRows: "1", bitmapOutputIds: "1、2、3、5" }, /同一行并集后只读一次/],
    "merge-join": ["mergeJoinRight", [2, 3],
      { mergeJoinPairs: "6", mergeJoinGroups: "1", mergeJoinHeadChecks: "3", mergeJoinNestedCandidates: "16" },
      { mergeJoinPairs: "2", mergeJoinGroups: "1", mergeJoinNestedCandidates: "8" }, /组内每行都能互配/],
    "two-phase-lock": ["phaseLockOperations", [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]],
      { phaseLockFreeAcquired: "3", phaseLockStrictAcquired: "2", phaseLockDenied: "1", phaseLockFinal: "空" },
      { phaseLockStrictAcquired: "3", phaseLockDenied: "0", phaseLockFinal: "2" }, /成功释放一把后进入收缩/],
    "gradient-clip": ["clipGradientLimit", 10,
      { clipGradientRawNorm: "10", clipGradientNorm: "5", clipGradientScale: "0.5", clipGradientChanged: "2" },
      { clipGradientNorm: "10", clipGradientScale: "1", clipGradientChanged: "0" }, /超限才乘统一因子/],
    "convolution-window": ["convolutionStride", 2,
      { convolutionOutputSize: "5", convolutionOutputValues: "-2、-2、-2、-2、4", convolutionOperations: "15" },
      { convolutionOutputSize: "3", convolutionOutputValues: "-2、-2、4", convolutionOperations: "9" }, /只处理一个完整窗口/],
    "backward-branches": ["backwardInput", 0,
      { backwardOutput: "37", backwardBranchOne: "20", backwardBranchTwo: "12", backwardTotalGradient: "32", backwardNumericGradient: "32" },
      { backwardOutput: "1", backwardBranchOne: "4", backwardBranchTwo: "0", backwardTotalGradient: "4", backwardNumericGradient: "4" }, /对同一输入的贡献要相加/],
    "momentum-update": ["momentumHistoryPct", 0,
      { momentumPlainPos: "1.8984", momentumFinalPos: "-0.0234", momentumPlainLoss: "1.802", momentumFinalLoss: "0.0003", momentumCrossings: "1" },
      { momentumFinalPos: "1.8984", momentumFinalLoss: "1.802", momentumCrossings: "0" }, /动量组还带着旧方向/],
    "huffman-coding": ["huffmanWeights", [3, 3, 3, 3],
      { huffmanBits: "18", huffmanFixedBits: "24", huffmanSavedBits: "6", huffmanMaxLength: "3" },
      { huffmanBits: "24", huffmanSavedBits: "0", huffmanMaxLength: "2" }, /每次取权重最小的两项/],
    "lazy-segment-tree": ["lazySegmentOperations", [[0, 0, 4, 3], [1, 0, 4, 0], [0, 1, 3, -1], [1, 1, 3, 0]],
      { lazySegmentLastSum: "7", lazySegmentNaiveTouches: "12", lazySegmentTreeTouches: "12", lazySegmentPushes: "3" },
      { lazySegmentLastSum: "9", lazySegmentPushes: "3" }, /只看部分区间时先下推/],
    "hash-stride": ["strideHashStep", 3,
      { strideLinearFailures: "0", strideCustomFailures: "1", strideCustomUsed: "4", strideReachable: "4" },
      { strideCustomFailures: "0", strideCustomUsed: "5", strideReachable: "8" }, /步长和槽数互素才可遍历/],
    "suffix-lookup": ["suffixLookupPattern", "ban",
      { suffixLookupLeft: "1", suffixLookupRight: "3", suffixLookupCount: "2", suffixLookupPositions: "1、3" },
      { suffixLookupLeft: "3", suffixLookupRight: "4", suffixLookupCount: "1", suffixLookupPositions: "0" }, /相同前缀形成一段/],
    "asid-tags": ["asidSlots", 1,
      { asidFlushHits: "0", asidTaggedHits: "3", asidSwitches: "4", asidTaggedEvictions: "0" },
      { asidTaggedHits: "0", asidTaggedEvictions: "5" }, /ASID 把它们区分/],
    "sparse-page-table": ["sparsePageReferences", [0, 8, 16, 24, 32, 40, 48, 56],
      { sparsePageLeaves: "3", sparsePageSlots: "32", sparsePageFlatSlots: "64", sparsePageMapped: "4" },
      { sparsePageLeaves: "8", sparsePageSlots: "72", sparsePageMapped: "8" }, /空区域不用分配二级表/],
    "wait-cycle": ["waitGraphEdges", [[0, 1], [1, 2], [3, 0], [4, 5]],
      { waitCycleCount: "3", waitCycleMembers: "0、1、2", waitCycleDependent: "1" },
      { waitCycleCount: "0", waitCycleDependent: "0", waitCycleEdges: "4" }, /沿边能回到自己即在环上/],
    "coherence-writes": ["coherenceOperations", [[0, 0, 0], [0, 1, 9], [1, 0, 0], [1, 0, 0], [1, 0, 0]],
      { coherenceInvalidations: "1", coherenceRefills: "3", coherenceStaleReads: "2", coherenceLatest: "9" },
      { coherenceInvalidations: "0", coherenceRefills: "2", coherenceStaleReads: "0" }, /另一核丢掉有效副本/],
    "etag-request": ["etagServerVersions", [[1, 80], [1, 80], [1, 80], [1, 80]],
      { etagConditionalBytes: "176", etagFullBytes: "352", etagSavedBytes: "176", etagNotModified: "2" },
      { etagConditionalBytes: "80", etagFullBytes: "320", etagSavedBytes: "240", etagNotModified: "3" }, /返回 304 并复用正文/],
    "retry-key": ["retryWriteAttempts", [[1, 5, 0], [3, 5, 1], [2, 3, 1]],
      { retryKeyDirectValue: "13", retryKeySafeValue: "8", retryKeyReused: "1", retryKeyLostResponses: "1" },
      { retryKeySafeValue: "13", retryKeyReused: "0" }, /没收到应答不代表没执行/],
    "output-backpressure": ["backpressureCeiling", 8,
      { backpressureUnlimitedPeak: "9", backpressureLimitedPeak: "4", backpressureDeferredTicks: "3", backpressureLimitedSent: "10", backpressureLimitedPending: "0" },
      { backpressureLimitedPeak: "8", backpressureDeferredTicks: "1", backpressureLimitedSent: "10", backpressureLimitedPending: "0" }, /未入队数据留在上游/],
    "next-header": ["nextHeaderFields", [60],
      { nextHeaderParsed: "2", nextHeaderDestination: "UDP", nextHeaderRemaining: "0" },
      { nextHeaderParsed: "1", nextHeaderDestination: "扩展头字段缺失" }, /到传输协议后停止追链/],
    "git-snapshot": ["gitSnapshotActions", [[0, 1], [1, 0], [0, 2], [1, 0], [2, 0]],
      { gitSnapshotWork: "2", gitSnapshotIndex: "1", gitSnapshotHead: "1", gitSnapshotUnstaged: "是" },
      { gitSnapshotIndex: "2", gitSnapshotHead: "2", gitSnapshotUnstaged: "否" }, /提交只取暂存快照/],
    "mutation-threshold": ["mutationProbeValues", [2, 8, 5],
      { mutationKilledCount: "2", mutationSurvivorCount: "1", mutationSurvivorNames: "严格大于" },
      { mutationKilledCount: "3", mutationSurvivorCount: "0", mutationSurvivorNames: "无" }, /只测两侧可能漏掉等号/],
    "promise-rejection": ["promiseFinishTimes", [[1, 0], [2, 0], [4, 0], [5, 0]],
      { promiseAggregateAt: "2", promiseAggregateStatus: "拒绝", promiseContinued: "2", promiseCanceled: "2" },
      { promiseAggregateAt: "5", promiseAggregateStatus: "成功", promiseCanceled: "0" }, /额外通知才会触发取消/],
    "defensive-list": ["defensiveOutputEdit", 12,
      { defensiveBadLanes: "2", defensiveSharedState: "99、8、-7", defensiveInputCopyState: "4、8、-7", defensiveBothCopyState: "4、8、12" },
      { defensiveBadLanes: "1", defensiveInputCopyState: "4、8、12" }, /返回副本能隔离导出修改/],
    "partition-pruning": ["partitionQueryBounds", [0, 55],
      { partitionRangeReads: "1", partitionHashReads: "4", partitionMatchCount: "6", partitionRangePeak: "6", partitionHashPeak: "4" },
      { partitionRangeReads: "3", partitionHashReads: "4", partitionMatchCount: "8" }, /区间只访问重叠分区/],
    "watermark-windows": ["watermarkAllowedLag", 4,
      { watermarkAccepted: "3", watermarkDropped: "2", watermarkTotal: "10", watermarkFinalMark: "10", watermarkFinalized: "2" },
      { watermarkAccepted: "5", watermarkDropped: "0", watermarkTotal: "22", watermarkFinalMark: "8", watermarkFinalized: "1" }, /用旧水位判断/],
    "skew-salting": ["skewSaltTarget", 0,
      { skewPlainPeak: "6", skewSaltingPeak: "3", skewSaltingLoads: "1、2、3、2", skewResultMatched: "是" },
      { skewSaltingPeak: "6", skewSaltingLoads: "0、6、1、1", skewResultMatched: "是" }, /再按原键加总/],
    "transaction-outbox": ["outboxRelayEnabled", 0,
      { outboxCommitted: "2", outboxDirectPublished: "1", outboxRelayPublished: "2", outboxPending: "0", outboxBusinessValue: "8" },
      { outboxRelayPublished: "0", outboxPending: "2", outboxBusinessValue: "8" }, /发件箱与业务一起提交/],
    "top-p-draw": ["topPCutoffPct", 90,
      { topPCandidateCount: "2", topPCoverage: "75", topPChosenIds: "1、2" },
      { topPCandidateCount: "3", topPCoverage: "90", topPChosenIds: "1、2、3" }, /按保留权重再归一化/],
    "binary-confidence": ["binaryConfidenceRows", [[90, 1], [60, 0], [60, 0], [10, 0]],
      { binaryConfidenceErrors: "2", binaryConfidenceMeanLoss: "0.8574", binaryConfidenceWorst: "2.3026" },
      { binaryConfidenceErrors: "2", binaryConfidenceMeanLoss: "0.5108", binaryConfidenceWorst: "0.9163" }, /对数损失取真类概率/],
    "kv-projection-cache": ["kvToyTokens", [1, 2, 3, 4, 5],
      { kvProjectionPlain: "20", kvProjectionCached: "8", kvProjectionDotProducts: "10", kvProjectionSame: "是" },
      { kvProjectionPlain: "30", kvProjectionCached: "10", kvProjectionDotProducts: "15", kvProjectionSame: "是" }, /当前查询仍看历史键/],
    "relu-zero-gradient": ["reluInitialWeight", 1,
      { reluZeroUpdates: "6", reluFinalWeight: "-1", reluFinalLoss: "2", reluLeakyFinalWeight: "1.5183" },
      { reluZeroUpdates: "0", reluFinalWeight: "1.9844", reluLeakyFinalWeight: "1.9844", reluFinalLoss: "0.0001" }, /Leaky 负区仍有斜率/],
  };
  assert.deepEqual(curriculumLabs.map(({ id }) => id), Object.keys(cases));
  const counts = {};
  for (const lab of curriculumLabs) {
    counts[lab.domain] = (counts[lab.domain] ?? 0) + 1;
    await t.test(lab.id, async () => {
      const [field, nextValue, expectedFirst, expectedNext, diagnosis] = cases[lab.id];
      const label = lab.curriculum.fields.find(([name]) => name === field)[1].label;
      const [topic] = lab.curriculum.topics;
      assert.ok(getCourse(lab.domain).experiments.some(({ href }) => href === lab.route));
      for (const linkedTopic of lab.curriculum.topics) assert.equal(getExperimentTopic(linkedTopic, lab.id).domain.id, lab.domain);
      const run = async (parameters, previous) => {
        t.mock.timers.tick(1000);
        const runId = randomUUID();
        const form = new FormData();
        form.set("engineId", lab.id);
        form.set("runId", runId);
        form.set("parameters", JSON.stringify(parameters));
        if (previous) {
          form.set("sessionId", previous.session.id);
          form.set("revision", String(previous.session.revision ?? 0));
        }
        let route;
        await assert.rejects(runKnowledgeExperiment(topic, form), (error) => {
          if (!error.digest?.startsWith("NEXT_REDIRECT;")) return false;
          route = new URL(error.digest.split(";")[2], "https://algoverse.test");
          return true;
        });
        assert.equal(route.pathname, lab.route);
        assert.equal(route.hash, "#knowledge-lab");
        assert.equal(route.searchParams.get("runId"), runId);
        const saved = await getExperimentRun(runId);
        assert.equal(saved.topicId, topic);
        assert.equal(saved.session.id, route.searchParams.get("sessionId"));
        assert.equal(saved.results.kind, lab.id);
        assert.ok(saved.results.steps.length > 0);
        assert.ok(saved.results.steps.every((step) => step.length === lab.curriculum.columns.length));
        return saved;
      };
      const preset = lab.preset();
      const first = await run(preset);
      const second = await run({ ...preset, [field]: nextValue }, first);
      assert.equal(first.session.id, second.session.id);
      assert.equal(second.session.revision, 1);
      assert.deepEqual(first.session.config, preset);
      assert.deepEqual(second.session.config[field], nextValue);
      for (const [saved, expected] of [[first, expectedFirst], [second, expectedNext]]) {
        const evidence = experimentEvidence(saved.results);
        for (const [metric, value] of Object.entries(expected)) assert.equal(evidence[metric], value, metric);
        assert.ok(Object.entries(evidence).every(([metric, value]) => evidenceLabels[metric] && value));
        const report = experimentReport(saved.session.config, saved.results);
        assert.ok(report.conclusion && report.detail.split("。").length >= 4 && report.suggestion);
        assert.doesNotMatch(JSON.stringify(saved.results), /NaN|undefined/);
      }
      assert.match(experimentReport(second.session.config, second.results).explanation, diagnosis);
      const history = await getComparableExperimentRuns(second);
      const comparison = experimentRunComparison(history, lab.id, lab.version);
      assert.deepEqual(comparison.rounds.map(({ id }) => id), [first.id, second.id]);
      assert.deepEqual(comparison.changes[0].parameters, [{ label, previous: preset[field], value: nextValue }]);
      assert.ok(comparison.changes[0].metrics.length > 0);
      assert.ok(comparison.changes[0].detail.includes(label));
      if (lab.id === "ridge-regression") {
        const third = await run({ ...preset, ridgePenalty: 0 }, second);
        const compared = experimentRunComparison(await getComparableExperimentRuns(third), lab.id, lab.version);
        assert.deepEqual(compared.rounds.map(({ id }) => id), [first.id, second.id, third.id]);
        assert.deepEqual(compared.changes.map(({ metrics }) => metrics.find(({ key }) => key === "ridgeHoldoutMse").deltas), [["+1"], ["+15"]]);
        assert.match(compared.conclusion, /共对照 3 轮/);
      }
      if (lab.id === "wal-checkpoint") {
        const third = await run({ ...preset, walCheckpointCount: 4 }, second);
        const compared = experimentRunComparison(await getComparableExperimentRuns(third), lab.id, lab.version);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.walScannedTail), ["2", "1", "0"]);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.walRecoveredPages), Array(3).fill("12、20、30"));
        assert.deepEqual(compared.changes.map(({ metrics }) => metrics.find(({ key }) => key === "walScannedTail").deltas), [["−1"], ["−1"]]);
      }
      if (lab.id === "early-stopping") {
        const third = await run({ ...preset, stopPatience: 6 }, second);
        const compared = experimentRunComparison(await getComparableExperimentRuns(third), lab.id, lab.version);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.stopAtEpoch), ["3", "2", "6"]);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.stopBestMse), ["0", "0", "0"]);
        assert.deepEqual(compared.changes.map(({ metrics }) => metrics.find(({ key }) => key === "stopAtEpoch").deltas), [["−1"], ["+4"]]);
      }
      if (lab.id === "tcp-handshake") {
        const third = await run({ ...preset, handshakeDrop: 1 }, second);
        const compared = experimentRunComparison(await getComparableExperimentRuns(third), lab.id, lab.version);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.handshakeTransmissions), ["5", "3", "4"]);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.handshakeFinalAck), ["901", "901", "901"]);
        assert.deepEqual(compared.changes.map(({ metrics }) => metrics.find(({ key }) => key === "handshakeTransmissions").deltas), [["−2"], ["+1"]]);
      }
      if (lab.id === "tcp-framing") {
        const third = await run({ ...preset, framingReadSizes: [2] }, second);
        const compared = experimentRunComparison(await getComparableExperimentRuns(third), lab.id, lab.version);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.framingReadCount), ["6", "1", "5"]);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.framingDecodedCount), ["3", "3", "3"]);
        assert.deepEqual(compared.changes.map(({ metrics }) => metrics.find(({ key }) => key === "framingReadCount").deltas), [["−5"], ["+4"]]);
      }
      if (lab.id === "hash-stride") {
        const third = await run({ ...preset, strideHashStep: 4 }, second);
        const compared = experimentRunComparison(await getComparableExperimentRuns(third), lab.id, lab.version);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.strideReachable), ["4", "8", "2"]);
        assert.deepEqual(compared.rounds.map(({ metrics }) => metrics.strideCustomFailures), ["1", "0", "3"]);
        assert.deepEqual(compared.changes.map(({ metrics }) => metrics.find(({ key }) => key === "strideCustomFailures").deltas), [["−1"], ["+3"]]);
      }
    });
  }
  assert.deepEqual(Object.values(counts), [24, 24, 24, 24, 24, 24]);
});

test("knowledge, network recommendations, unsupported requests and clarification do not create plans", async (t) => {
  const replies = [
    { intent: "knowledge", answer: "指针保存地址。", recommend: null },
    { intent: "knowledge", answer: "链路故障会丢包。", recommend: "network-transmission" },
    { intent: "unsupported", answer: "平台没有真实显卡。", recommend: "gradient-descent" },
    { intent: "clarify", question: "你想验证什么现象？" },
    { intent: "create", engine: "sorting", version: 1, parameters: { goalLabel: "观察排序", values: [4, 3, 2, 1] } },
  ];
  const { ask } = await setup(t, ({ conversation }) => {
    if (replies.length === 1) assert.deepEqual(conversation, [{ question: "帮我做一个实验。", answer: "你想验证什么现象？" }]);
    return replies.shift();
  });
  const cases = [
    ["解释什么是指针。", "knowledge", undefined],
    ["为什么数据包会丢失？", "knowledge", "/experiments/networks/network-transmission"],
    ["用真实显卡训练 Transformer。", "unsupported", "/experiments/ai/gradient-descent"],
    ["帮我做一个实验。", "clarify", undefined],
  ];
  for (const [question, intent, href] of cases) {
    const response = await ask(question);
    assert.equal(response.httpStatus, 200);
    assert.equal(response.status, "answer");
    assert.equal(response.intent, intent);
    assert.equal(response.alternatives?.[0].href, href);
    assert.ok(!response.sessionId);
    assert.equal(globalThis[cookieScope].size, 0);
  }
  const response = await ask("我想观察倒序数组怎么排序。", {
    history: [{ question: "帮我做一个实验。", answer: "你想验证什么现象？" }],
  });
  assert.equal(response.httpStatus, 201);
  assert.equal((await getExperimentWorkflow(response.sessionId)).plan.engineId, "sorting");
});

test("follow-ups use the selected run and save only validated edits without rewriting completed results", async (t) => {
  const initial = { goalLabel: "观察抢占", policy: "rr", quantum: 2, processes: [{ arrival: 0, burst: 5 }, { arrival: 1, burst: 3 }] };
  let reply = { intent: "create", engine: "cpu-scheduling", version: 1, parameters: initial };
  let input;
  const { ask } = await setup(t, (value) => { input = value; return reply; });
  const { sessionId } = await ask("模拟 CPU 时间片轮转调度。");
  const original = await getExperimentWorkflow(sessionId);
  const run = await confirmAndRun(original);
  const context = { sessionId, runId: run.id, revision: original.revision };

  reply = { intent: "analyze", answer: "本轮平均等待 3 个刻度。" };
  assert.equal((await ask("解释本轮结果。", context)).intent, "analyze");
  assert.equal(input.currentExperiment.metrics.waiting, "3.00");
  assert.deepEqual((await getExperimentWorkflow(sessionId)).plan, original.plan);

  reply = { intent: "modify", engine: "cpu-scheduling", version: 1, parameters: { quantum: 0 } };
  assert.equal((await ask("时间片改成 0。", context)).httpStatus, 502);
  assert.deepEqual((await getExperimentWorkflow(sessionId)).plan, original.plan);

  reply = { ...reply, parameters: { quantum: 1 } };
  assert.equal((await ask("时间片改成 1。", context)).httpStatus, 201);
  const updated = await getExperimentWorkflow(sessionId);
  assert.equal(updated.revision, original.revision + 1);
  assert.equal(updated.plan.source.intent, "modify");
  assert.deepEqual(updated.plan.config, { ...initial, quantum: 1 });
  assert.deepEqual(await getExperimentRun(run.id), run);
  assert.equal((await getExperimentSession(sessionId)).confirmedAt, null);
  assert.equal((await ask("覆盖已有配置。", context)).httpStatus, 409);
  assert.equal((await ask("读别人的轮次。", { sessionId, runId: randomUUID() })).httpStatus, 404);
});

test("provider errors and invalid engine output never create a runnable plan", async (t) => {
  const sorting = { intent: "compare", engine: "sorting", version: 1, parameters: { goalLabel: "观察排序", values: [4, 2] } };
  const invalid = [
    new Response(null, { status: 503 }),
    { ...sorting, engine: "transformer" },
    { ...sorting, version: 2 },
    { ...sorting, parameters: { ...sorting.parameters, code: "console.log(1)" } },
    { ...sorting, engine: "cpu-scheduling", parameters: { goalLabel: "对比 CPU 策略", policy: "rr", quantum: 2,
      processes: [{ arrival: 0, burst: 4 }, { arrival: 1, burst: 2 }] } },
    { intent: "analyze", answer: "我没有运行记录。" },
  ];
  const { ask, fetch } = await setup(t, () => invalid.shift());
  const failed = await ask("比较冒泡排序和快速排序。");
  assert.equal(failed.httpStatus, 503);
  assert.equal(failed.status, "error");
  while (invalid.length) assert.equal((await ask("请创建实验。")).httpStatus, 502);
  assert.equal(globalThis[cookieScope].size, 0);
  assert.equal(fetch.mock.callCount(), 6);
});
