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

test("lazy segment tree keeps nested and overlapping updates correct for a non-power-of-two length", () => {
  const lab = getExperimentEngine("lazy-segment-tree");
  const { steps, metrics } = lab.execute({ ...lab.preset(), lazySegmentValues: [2, -1, 4, 0, 7],
    lazySegmentOperations: [[0, 0, 5, 2], [1, 1, 4, 0], [0, 2, 5, -3], [1, 1, 5, 0], [1, 0, 2, 0], [1, 2, 3, 0]] });
  assert.deepEqual(steps.filter(([operation]) => operation === "求和").map((step) => step.slice(2, 4)), [[9, 9], [9, 9], [5, 5], [3, 3]]);
  assert.ok(Number(metrics.lazySegmentPushes) > 0);
});

test("wait-for reachability detects self-cycles and counts upstream dependents only once", () => {
  const lab = getExperimentEngine("wait-cycle");
  const { metrics, steps } = lab.execute({ ...lab.preset(), waitGraphEdges: [[0, 0], [1, 2], [2, 1], [3, 2], [4, 3], [4, 3]] });
  assert.deepEqual(metrics, { waitCycleCount: "3", waitCycleMembers: "0、1、2", waitCycleDependent: "2", waitCycleEdges: "5" });
  assert.equal(steps[4][3], "受环牵连");
  assert.equal(steps[5][3], "未发现环相关等待");
});

test("conditional GET revalidates only the cached entity tag and checks version consistency", () => {
  const lab = getExperimentEngine("etag-request");
  const config = { ...lab.preset(), etagServerVersions: [[1, 20], [2, 30], [1, 20], [1, 20]] };
  const { metrics, steps } = lab.execute(config);
  assert.deepEqual(steps.map((step) => step.slice(3, 5)), [[200, 20], [200, 30], [200, 20], [304, 0]]);
  assert.equal(metrics.etagConditionalBytes, "70");
  assert.equal(lab.execute({ ...config, etagServerVersions: [[1, 20], [1, 25]] }), null);
});

test("bounded output queue retains unsent bytes and never exceeds the configured high-water mark", () => {
  const lab = getExperimentEngine("output-backpressure");
  const { metrics, steps } = lab.execute({ ...lab.preset(), backpressureSchedule: [[5, 0], [2, 1]], backpressureCeiling: 3 });
  assert.equal(metrics.backpressureLimitedPeak, "3");
  assert.equal(metrics.backpressureLimitedSent, "1");
  assert.equal(metrics.backpressureLimitedPending, "6");
  assert.deepEqual(steps.at(-1), [2, 1, 6, 1, 2, 4]);
});

test("Promise aggregate observes the first rejection and keeps later completions visible", () => {
  const lab = getExperimentEngine("promise-rejection");
  const { metrics, steps } = lab.execute({ ...lab.preset(), promiseFinishTimes: [[4, 0], [2, 1], [2, 1], [1, 0]] });
  assert.equal(metrics.promiseAggregateAt, "2");
  assert.equal(metrics.promiseCanceled, "2");
  assert.deepEqual(steps.map((step) => step.slice(0, 4)), [
    [1, 4, "成功", "成功"], [2, 2, "拒绝", "拒绝"], [2, 3, "拒绝", "收到通知 · 取消"], [4, 1, "成功", "收到通知 · 取消"],
  ]);
});

test("a watermark exactly on a window boundary closes only the preceding window", () => {
  const lab = getExperimentEngine("watermark-windows");
  const { steps, metrics } = lab.execute({ ...lab.preset(), watermarkAllowedLag: 3, watermarkEvents: [[8, 1], [4, 3], [5, 5]] });
  assert.equal(metrics.watermarkFinalMark, "5");
  assert.equal(metrics.watermarkTotal, "6");
  assert.deepEqual(steps.slice(1).map((step) => step.slice(1, 5)), [
    ["[0, 5)", 5, 5, "窗口已关 · 丢弃"], ["[5, 10)", 5, 5, "加入"],
  ]);
});

test("top-p stops at an exact cutoff and samples reproducibly only from selected tokens", () => {
  const lab = getExperimentEngine("top-p-draw");
  const config = { ...lab.preset(), topPTokenWeights: [2, 2, 1], topPCutoffPct: 40, topPDrawTimes: 12 };
  const first = lab.execute(config);
  assert.equal(first.metrics.topPChosenIds, "1");
  assert.equal(first.metrics.topPCoverage, "40");
  assert.deepEqual(first.steps.filter(([phase]) => phase === "采样").map((step) => step[3]), Array(12).fill(1));
  assert.deepEqual(lab.execute(config), first);
});

test("binary log loss reports bounded values for predictions at zero and one", () => {
  const lab = getExperimentEngine("binary-confidence");
  const { steps, metrics } = lab.execute({ ...lab.preset(), binaryConfidenceRows: [[100, 0], [0, 0]] });
  assert.equal(metrics.binaryConfidenceErrors, "1");
  assert.equal(metrics.binaryConfidenceMeanLoss, "4.6052");
  assert.deepEqual(steps.map((step) => step.slice(4)), [[0, 9.2103], [1, 0]]);
});

test("stable merge preserves all equal-key records across an uneven final merge", () => {
  const lab = getExperimentEngine("stable-merge");
  const { metrics } = lab.execute({ ...lab.preset(), stableMergeKeys: [4, 4, 4, 4, 4] });
  assert.equal(metrics.mergeStableIds, "1、2、3、4、5");
  assert.equal(metrics.mergeStableReversed, "0");
  assert.equal(metrics.mergeRightReversed, "10");
});

test("matrix-chain plans every split in a four-matrix chain", () => {
  const lab = getExperimentEngine("matrix-chain");
  const { metrics, steps } = lab.execute({ ...lab.preset(), chainDimensions: [5, 10, 3, 12, 5] });
  assert.equal(metrics.chainCandidates, "10");
  assert.equal(metrics.chainOptimalCost, "405");
  assert.equal(metrics.chainLeftCost, "630");
  assert.equal(metrics.chainParentheses, "((A1×A2)×(A3×A4))");
  assert.equal(steps.filter(([range]) => range === "1–4").length, 3);
});

test("journal replay applies committed after-images twice without reviving an uncommitted update", () => {
  const lab = getExperimentEngine("journal-replay");
  const { metrics, steps } = lab.execute({ ...lab.preset(), journalBlockValues: [7], journalOperations: [[0, 3], [0, -1], [0, 20]] });
  assert.equal(metrics.journalImageResult, "9");
  assert.equal(metrics.journalDeltaResult, "11");
  assert.deepEqual(steps.map((step) => step[3]), ["10", "9", "10", "9", "9"]);
  assert.match(steps.at(-1)[2], /1 条未提交/);
});

test("CORS checks both headers in credentials mode and accepts a same-origin response without them", () => {
  const lab = getExperimentEngine("cors-read");
  const base = { ...lab.preset(), corsOriginRule: 1, corsCredentialsHeader: 0 };
  assert.equal(lab.execute(base).metrics.corsReadable, "否");
  assert.equal(lab.execute({ ...base, corsCredentialsHeader: 1 }).metrics.corsReadable, "是");
  const same = lab.execute({ ...base, corsSourcePort: 443, corsTargetPort: 443, corsOriginRule: 0 });
  assert.equal(same.metrics.corsReadable, "是");
  assert.equal(same.steps[0][1], "https://lab.test → https://lab.test");
});

test("streamed UTF-8 preserves a four-byte character across single-byte reads", () => {
  const lab = getExperimentEngine("utf8-stream");
  const { metrics, steps } = lab.execute({ ...lab.preset(), textStreamSource: "🙂", textStreamChunkSize: 1 });
  assert.equal(metrics.textStreamBytes, "4");
  assert.equal(metrics.textStreamReplacement, "4");
  assert.equal(metrics.textStreamMatched, "是");
  assert.deepEqual(steps.map((step) => JSON.parse(step[3])), ["", "", "", "🙂"]);
  assert.equal(lab.execute({ ...lab.preset(), textStreamSource: "\ud800" }), null);
});

test("merge join multiplies duplicates independently for each matching key", () => {
  const lab = getExperimentEngine("merge-join");
  const left = [4, 4, 2, 2, 2, 7];
  const right = [2, 2, 4, 4, 4, 5, 8];
  const { metrics, steps } = lab.execute({ ...lab.preset(), mergeJoinLeft: left, mergeJoinRight: right });
  assert.equal(metrics.mergeJoinPairs, "12");
  assert.deepEqual(steps.filter((step) => step[2] === "同键成组").map((step) => step.slice(-3)), [[3, 2, 6], [2, 3, 6]]);
});

test("convolution has no complete window if the kernel is wider than the padded input", () => {
  const lab = getExperimentEngine("convolution-window");
  const config = { ...lab.preset(), convolutionSamples: [2], convolutionPadding: 0 };
  const blank = lab.execute(config);
  assert.equal(blank.metrics.convolutionOutputSize, "0");
  assert.equal(blank.metrics.convolutionOperations, "0");
  assert.equal(blank.steps[0][0], "无输出");
  const padded = lab.execute({ ...config, convolutionPadding: 1 });
  assert.equal(padded.metrics.convolutionOutputSize, "1");
  assert.deepEqual(padded.steps[0], [0, "[-1, 2)", "0、2、0", "0、0、0", 0]);
});

test("gradient clipping leaves a zero vector unchanged", () => {
  const lab = getExperimentEngine("gradient-clip");
  const { metrics, steps } = lab.execute({ ...lab.preset(), clipGradientVector: [0, 0, 0], clipGradientLimit: 1 });
  assert.deepEqual(metrics, { clipGradientRawNorm: "0", clipGradientNorm: "0", clipGradientScale: "1", clipGradientChanged: "0" });
  assert.deepEqual(steps[2], [3, 0, 1, 0]);
});

test("zero-one knapsack matches an exhaustive subset search even with an overweight item", () => {
  const lab = getExperimentEngine("zero-one-knapsack");
  const items = [[8, 60], [3, 4], [2, 5], [4, 8], [2, 2]];
  const capacity = 7;
  let best = 0;
  for (let mask = 0; mask < 2 ** items.length; mask++) {
    const included = items.filter((_, index) => mask & (1 << index));
    const weight = included.reduce((sum, [size]) => sum + size, 0);
    const value = included.reduce((sum, [, gain]) => sum + gain, 0);
    if (weight <= capacity) best = Math.max(best, value);
  }
  const { metrics, steps } = lab.execute({ ...lab.preset(), sackCapacity: capacity, sackItems: items });
  assert.equal(Number(metrics.sackCorrect), best);
  assert.ok(Number(metrics.sackForward) > best);
  assert.deepEqual(steps[0], [1, "倒序", capacity, 0, "过重", 0]);
});

test("monotonic deque handles equal maxima expiring and a one-item window", () => {
  const lab = getExperimentEngine("sliding-maximum");
  const config = { ...lab.preset(), slidingNumbers: [5, 5, 0, -1, 4] };
  const wide = lab.execute({ ...config, slidingWidth: 2 });
  const single = lab.execute({ ...config, slidingWidth: 1 });
  assert.equal(wide.metrics.slidingResults, "5、5、0、4");
  assert.equal(single.metrics.slidingResults, "5、5、0、-1、4");
  assert.ok(wide.steps.at(-1).includes("4 / 4"));
});

test("an empty notification makes while recheck every waiter without consuming resources", () => {
  const lab = getExperimentEngine("condition-recheck");
  const result = lab.execute({ ...lab.preset(), conditionProduced: 0, conditionBargers: 0, conditionWaiters: 2 });
  assert.deepEqual(result.metrics, { conditionIfInvalid: "2", conditionWhileWait: "2", conditionSuccessful: "0", conditionBeforeWake: "0" });
  assert.deepEqual(result.steps.at(-1), ["等待者 2", "空取失败", 0, "重查后继续等", 0]);
});

test("TCP handshake wraps both initial sequence numbers and retries a lost SYN-ACK", () => {
  const lab = getExperimentEngine("tcp-handshake");
  const maxSequence = 4294967295;
  const result = lab.execute({ ...lab.preset(), handshakeClientIsn: maxSequence, handshakeServerIsn: maxSequence, handshakeDrop: 2 });
  assert.equal(result.metrics.handshakeFinalAck, "0");
  assert.equal(result.metrics.handshakeClientNext, "0");
  assert.equal(result.metrics.handshakeTransmissions, "4");
  assert.deepEqual(result.steps[1].slice(1), [maxSequence, 0, "丢失", "SYN-SENT", "SYN-RECEIVED"]);
  assert.deepEqual(result.steps.at(-1), ["ACK →", 0, 0, "送达", "ESTABLISHED", "ESTABLISHED"]);
});

test("TCP merges overlapping and adjacent out-of-order blocks without acknowledging gaps", () => {
  const lab = getExperimentEngine("tcp-sack");
  const { steps, metrics } = lab.execute({ ...lab.preset(), sackArrivals: [[130, 20], [140, 20], [150, 20], [90, 40], [90, 15]] });
  assert.deepEqual(steps.map((step) => step.slice(2, 4)), [[100, "[130, 150)"], [100, "[130, 160)"], [100, "[130, 170)"], [170, "空"], [170, "空"]]);
  assert.equal(metrics.tcpSackStalls, "4");
});

test("C string with one allocated byte stores its terminator without writing data", () => {
  const lab = getExperimentEngine("c-string-terminator");
  const result = lab.execute({ ...lab.preset(), cStringCapacity: 1 });
  assert.equal(result.metrics.cStringSafeLength, "0");
  assert.equal(result.metrics.cStringLostBytes, "4");
  assert.deepEqual(result.steps, [[0, 0, 65, "遇到结尾", "缓冲区内无结尾"]]);
});

test("LSM keeps a later zero value and drops a tombstone when no older value can reappear", () => {
  const lab = getExperimentEngine("lsm-compaction");
  const result = lab.execute({ ...lab.preset(), compactBaseRows: [[1, 90]], compactOperations: [[1, 1, 0], [0, 1, 0], [1, 2, 0]] });
  assert.equal(result.metrics.compactTombstones, "0");
  assert.equal(result.metrics.compactResurrected, "0");
  assert.deepEqual(result.steps.map((step) => step.slice(2)),
    [[0, 0, 0, "保留最新值"], ["删除", "不存在", "不存在", "清理删除标记"]]);
});

test("stable softmax preserves a tied distribution when direct exponentials all underflow", () => {
  const lab = getExperimentEngine("stable-softmax");
  const result = lab.execute({ ...lab.preset(), softmaxLogits: [1, 1], softmaxCommonShift: -1000 });
  assert.equal(result.metrics.softmaxNaiveStatus, "全部下溢");
  assert.equal(result.metrics.softmaxStablePeak, "0.5");
  assert.equal(result.metrics.softmaxStableDrift, "0");
  assert.deepEqual(result.steps.map((step) => step.slice(3)), Array(2).fill(["不可用", 0.5, 0.5]));
});

test("causal output cannot depend on a future value", () => {
  const lab = getExperimentEngine("causal-mask");
  const preset = lab.preset();
  const ordinary = lab.execute(preset);
  const altered = lab.execute({ ...preset, attentionKeyValues: [[1, 10], [0, 0], [3, -90]] });
  assert.equal(altered.metrics.attentionMaskedOutput, ordinary.metrics.attentionMaskedOutput);
  assert.notEqual(altered.metrics.attentionUnmaskedOutput, ordinary.metrics.attentionUnmaskedOutput);
  assert.deepEqual(altered.steps.at(-1).slice(-2), [0, 0]);
});

test("interval scheduling matches exhaustive selection with touching endpoints and ties", () => {
  const lab = getExperimentEngine("interval-scheduling");
  const jobs = [[1, 5], [2, 3], [3, 4], [4, 6], [6, 8], [5, 8]];
  const { metrics } = lab.execute({ ...lab.preset(), intervalJobs: jobs });
  const candidates = Array.from({ length: 2 ** jobs.length }, (_, mask) =>
    jobs.filter((_, index) => mask & (1 << index)).sort(([left], [right]) => left - right));
  const best = Math.max(...candidates.filter((rows) => rows.every(([start], index) => index === 0 || start >= rows[index - 1][1]))
    .map((rows) => rows.length));
  assert.equal(Number(metrics.intervalsEndCount), best);
  assert.equal(metrics.intervalsStartCount, "2");
  assert.equal(lab.execute({ ...lab.preset(), intervalJobs: [[5, 5]] }), null);
});

test("spanning-bridge suppresses return traffic from a non-root source", () => {
  const lab = getExperimentEngine("spanning-bridge");
  const result = lab.execute({ ...lab.preset(), bridgeCount: 4, bridgeRoot: 2, bridgeSource: 3, bridgeLinks: [[0, 1], [1, 2], [2, 3], [3, 0]] });
  assert.equal(result.metrics.bridgePlainExtra, "7");
  assert.equal(result.metrics.bridgeBlocked, "1");
  assert.equal(result.metrics.bridgeTreeReached, "3");
  assert.deepEqual(result.steps.slice(0, 3).map((step) => step.slice(-2)), [[1, "2"], [1, "1"], [1, "0"]]);
  assert.equal(lab.execute({ ...lab.preset(), bridgeCount: 4 }), null);
});

test("IPv6 probes that fit the narrowest hop succeed without feedback", () => {
  const lab = getExperimentEngine("ipv6-path-mtu");
  const { metrics, steps } = lab.execute({ ...lab.preset(), pmtuPayloadBytes: 1220 });
  assert.equal(metrics.pmtuFilteredBytes, "1220");
  assert.equal(metrics.pmtuFeedbackDrops, "0");
  assert.equal(metrics.pmtuLearnedLimit, "1500");
  assert.deepEqual(steps, [[1, "1280 字节 · 送达", 1220, "1280 字节 · 送达", 1220]]);
});

test("buffer replacement respects repeated pins and writes back before discarding a dirty page", () => {
  const lab = getExperimentEngine("buffer-pool");
  const result = lab.execute({ ...lab.preset(), bufferFrameLimit: 1, bufferPageValues: [1, 2],
    bufferPageOps: [[0, 0, 0], [0, 0, 0], [2, 0, 9], [1, 0, 0], [0, 1, 0], [1, 0, 0], [0, 1, 0]] });
  assert.equal(result.metrics.bufferAllPinned, "1");
  assert.equal(result.metrics.bufferDirtyWrites, "1");
  assert.equal(result.metrics.bufferDiskReads, "2");
  assert.deepEqual(result.steps.at(-1).slice(-3), ["先写盘再换出 0 · 读盘 · 值 2", "1:2 / 固定 1", "9、2"]);
});

test("MVCC collection keeps versions visible to old snapshots and the latest commit", () => {
  const lab = getExperimentEngine("mvcc-versions");
  const { steps, metrics } = lab.execute({ ...lab.preset(), mvccTrace: [[0, 0], [1, 20], [1, 30], [4, 0], [2, 0], [3, 0], [4, 0]] });
  assert.match(steps[3][1], /移走 v1/);
  assert.match(steps[4][1], /读 v0 · 值 10/);
  assert.equal(steps[4][4], 30);
  assert.equal(metrics.mvccReclaimed, "2");
  assert.equal(metrics.mvccRetained, "1");
});

test("early stopping can restore the initial checkpoint and still compare a full run", () => {
  const lab = getExperimentEngine("early-stopping");
  const { steps, metrics } = lab.execute({ ...lab.preset(), stopValidTargets: [0], stopPatience: 1 });
  assert.equal(metrics.stopBestEpoch, "0");
  assert.equal(metrics.stopBestWeight, "0");
  assert.equal(metrics.stopAtEpoch, "1");
  assert.equal(metrics.stopBestMse, "0");
  assert.equal(steps.at(-1)[0], 6);
  assert.equal(steps.at(-1)[4], "早停组已结束");
});

test("Fenwick updates preserve every one-based prefix across negative and repeated additions", () => {
  const lab = getExperimentEngine("fenwick-prefix");
  const config = { ...lab.preset(), fenwickNumbers: [3, -1, 0, 2, 5],
    fenwickOps: [[0, 5, -8], [0, 2, 7], [0, 2, -3], [1, 1, 0], [1, 2, 0], [1, 3, 0], [1, 4, 0], [1, 5, 0]] };
  const { steps } = lab.execute(config);
  assert.deepEqual(steps.filter(([action]) => action === "查询").map((step) => step.slice(-2)),
    [[3, 3], [6, 6], [6, 6], [8, 8], [5, 5]]);
  assert.equal(lab.execute({ ...config, fenwickOps: [[0, 1, 0]] }), null);
});

test("Ethernet floods within a VLAN and filters a destination learned on the ingress port", () => {
  const lab = getExperimentEngine("ethernet-learning");
  const { steps, metrics } = lab.execute({ ...lab.preset(), switchFrames: [[0, 1, 0], [0, 2, 1], [3, 3, 1]] });
  assert.deepEqual(steps.map((step) => step.slice(-2)), [["广播泛洪", "1、2"], ["同口过滤", "空"], ["未知目的泛洪", "空"]]);
  assert.equal(metrics.switchCopies, "2");
});

test("NOT IN implements empty-subquery and null outer-key semantics", () => {
  const lab = getExperimentEngine("not-in-null");
  const config = { ...lab.preset(), exclusionOuter: "NULL, 2, 3" };
  const empty = lab.execute({ ...config, exclusionInner: "-" });
  assert.deepEqual(empty.steps.map((step) => step.slice(-2)), Array(3).fill(["真 · 保留", "真 · 保留"]));
  const nonempty = lab.execute({ ...config, exclusionInner: "2, NULL" });
  assert.deepEqual(nonempty.steps.map((step) => step.slice(-2)),
    [["未知 · 筛掉", "真 · 保留"], ["假 · 筛掉", "假 · 筛掉"], ["未知 · 筛掉", "真 · 保留"]]);
});

test("WAL recovery rejects a checkpoint beyond durable log and restores the original pages if no log survived", () => {
  const lab = getExperimentEngine("wal-checkpoint");
  const config = { ...lab.preset(), walDurableCount: 0 };
  assert.equal(lab.execute(config), null);
  const empty = lab.execute({ ...config, walCheckpointCount: 0 });
  assert.deepEqual(empty.metrics, { walScannedAll: "0", walScannedTail: "0", walLostPending: "5", walRecoveredPages: "0、0、0", walRedoSaved: "0" });
  assert.equal(empty.steps.at(-1)[0], "断电");
});

test("probability bins count both endpoints without changing either Brier score", () => {
  const lab = getExperimentEngine("probability-calibration");
  const config = { ...lab.preset(), calibrationRows: [[0, 100, 0], [100, 0, 1], [50, 50, 1]], calibrationBins: 2 };
  const result = lab.execute(config);
  const finer = lab.execute({ ...config, calibrationBins: 10 });
  assert.deepEqual(result.steps.map((step) => step[2]), [1, 2, 1, 2]);
  assert.equal(finer.steps[0][2], 1);
  assert.equal(finer.steps[9][2], 1);
  assert.equal(finer.steps[5][2], 1);
  for (const key of ["calibrationBrierA", "calibrationBrierB"]) assert.equal(result.metrics[key], finer.metrics[key]);
  assert.equal(finer.metrics.calibrationBrierA, "0.0833");
  assert.equal(finer.metrics.calibrationBrierB, "0.75");
});

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
  assert.equal(new Set(registeredEngines.map(({ id }) => id)).size, 162);
  assert.equal(new Set(registeredEngines.map(({ route }) => route)).size, 162);
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
