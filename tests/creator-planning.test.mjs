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
    assert.equal(capabilities.length, 66);
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

test("all 48 curriculum labs run and retest from their learning-path entries", async (t) => {
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
    });
  }
  assert.deepEqual(Object.values(counts), [8, 8, 8, 8, 8, 8]);
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
