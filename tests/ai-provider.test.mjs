import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Load the same TypeScript route as Next.js, with its alias and server-only marker.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export {}" };
    if (specifier === "next/headers") return nextResolve("next/headers.js", context);
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    if (specifier.startsWith("./") && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.includes("/src/")) {
      return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { POST } = await import("../src/app/api/ai/connection/route.ts");
const { POST: tutorPOST } = await import("../src/app/api/ai/tutor/route.ts");
const { readAICredentials, requestAIJson, reusePendingAI } = await import("../src/lib/server/aiProvider.ts");
const { confirmZeroSiliconFlowPrice, hasZeroSiliconFlowPrice } = await import("../src/lib/server/siliconflowPricing.ts");
const { reservePlatformCall } = await import("../src/lib/platformQuota.ts");
const { platformQuota } = await import("../src/lib/platformAI.ts");
const { aiProviders, aiRequestHeaders, availableAIModels, modelSelectionMessage, parseAISelection, qwenRegions } = await import("../src/lib/aiSettings.ts");
const { interpretCreatorRequest } = await import("../src/lib/server/creatorAI.ts");
const { diagnoseExperimentRun } = await import("../src/lib/server/experimentAI.ts");
const { getExperimentEngine, registeredEngines } = await import("../src/lib/experimentEngines.ts");
const { diagnosisChoices } = await import("../src/lib/experiments/diagnosis.ts");
const { experimentReport, pathfindingReport } = await import("../src/lib/experiments/report.ts");
const { experimentRunComparison } = await import("../src/lib/experiments/runComparison.ts");
const { experimentEvidence } = await import("../src/lib/experiments/evidence.ts");
const { courses } = await import("../src/lib/courses.ts");
const { experimentReviewTopics, getDefaultKnowledgeTopic, getExperimentTopic, getKnowledgeTopic, hasCompleteTeaching, knowledgeDomains, knowledgeEntries, knowledgeTopicRoute } = await import("../src/lib/knowledge.ts");
const { reviewedPrincipleIds } = await import("../src/content/knowledge/quality/index.ts");
const { researchExercises } = await import("../src/content/knowledge/quality/research-cases.ts");
const { workedExercises } = await import("../src/content/knowledge/quality/worked-exercises.ts");
const { gradeKnowledgeExercise, practiceSummary } = await import("../src/lib/knowledgePractice.ts");
const { deepLessons, getDeepLesson } = await import("../src/content/lessons/index.ts");
const { evaluateTeachingModel, isTeachingModel } = await import("../src/lib/lessons/teachingModels.ts");
const { countWork, growthAt, verifyLinearUpperBound } = await import("../src/lib/lessons/growth.ts");
const { chapterPreparation, curriculumChapters, curriculumGroups, curriculumRoute, learningTopicRoute, resolveCurriculumScope, searchCurriculum, validateCurriculum } = await import("../src/lib/curriculum.ts");
const { coverageTopics } = await import("../src/content/knowledge/coverage/index.ts");
const { undergraduateTopics } = await import("../src/content/knowledge/undergraduate/index.ts");
const { coreDepthTopics } = await import("../src/content/knowledge/core-depth/index.ts");
const { appliedCoreTopics } = await import("../src/content/knowledge/applied-core/index.ts");
const { systemsPracticeTopics } = await import("../src/content/knowledge/systems-practice/index.ts");
const { advancedReasoningTopics } = await import("../src/content/knowledge/advanced-reasoning/index.ts");
const { measurementPracticeTopics } = await import("../src/content/knowledge/measurement-practice/index.ts");
const { evidencePracticeTopics } = await import("../src/content/knowledge/evidence-practice/index.ts");
const { fieldValidationTopics } = await import("../src/content/knowledge/field-validation/index.ts");
const { benchmarkValidationTopics } = await import("../src/content/knowledge/benchmark-validation/index.ts");
const { comparativeLabTopics } = await import("../src/content/knowledge/comparative-labs/index.ts");
const { diagnosticLabTopics } = await import("../src/content/knowledge/diagnostic-labs/index.ts");
const { verificationLabTopics } = await import("../src/content/knowledge/verification-labs/index.ts");
const { validationFollowupTopics } = await import("../src/content/knowledge/validation-followup/index.ts");
const { prospectiveValidationTopics } = await import("../src/content/knowledge/prospective-validation/index.ts");
const { evidenceCompletionTopics } = await import("../src/content/knowledge/evidence-completion/index.ts");
const { reproducibilityTopics } = await import("../src/content/knowledge/reproducibility/index.ts");
const { fieldEvaluationTopics } = await import("../src/content/knowledge/field-evaluation/index.ts");
const { depthTopics } = await import("../src/content/knowledge/depth/index.ts");
const { advancedTopics } = await import("../src/content/knowledge/advanced/index.ts");
const { specializedTopics } = await import("../src/content/knowledge/specialized/index.ts");
const { coverage700Topics } = await import("../src/content/knowledge/coverage-700/index.ts");
const { coverage700Teaching } = await import("../src/content/knowledge/teaching/coverage-700/index.ts");
const { searchKnowledge } = await import("../src/lib/knowledgeSearch.ts");
const { learningSuggestion, topicTouched } = await import("../src/lib/learningPath.ts");
hooks.deregister();

test("recursive memory trace allocates distinct frames and unwinds with computed results", () => {
  const engine = getExperimentEngine("memory-visualization");
  const run = (factorialInput) => engine.execute({ goalLabel: "调用栈", factorialInput });
  const result = run(4);
  assert.deepEqual(result.steps.map((step) => step.stack.length), [1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0]);
  assert.deepEqual(result.steps.filter((step) => step.kind === "return").map((step) => step.value), [1, 1, 2, 6, 24]);
  assert.deepEqual(experimentEvidence(result), { factorial: "24", stackDepth: "5", calls: "5" });
  assert.equal(run(0).value, 1);
  assert.deepEqual([run(0).maxDepth, run(0).calls], [1, 1]);
  assert.equal(run(10).value, 3628800);
  assert.equal(run(11), null);
  assert.equal(run("4"), null);
});

test("B+ tree balances cascading splits and scans its linked leaves", () => {
  const engine = getExperimentEngine("b-plus-tree");
  const keys = Array.from({ length: 32 }, (_, index) => (index * 13) % 32 - 12);
  const config = { goalLabel: "索引", keys, lower: -3, upper: 12 };
  for (const order of [1, 2, 3]) {
    const result = engine.execute({ ...config, order });
    const frame = result.steps.at(-1);
    const leaves = [];
    const depths = new Set();
    const walk = (id, depth) => {
      const node = frame.nodes[id];
      assert.ok(node.keys.length <= order * 2);
      if (id !== frame.root) assert.ok(node.keys.length >= order);
      if (node.kind === "leaf") {
        leaves.push(node);
        depths.add(depth);
        return node.keys[0];
      }
      assert.equal(node.children.length, node.keys.length + 1);
      const minima = node.children.map((child) => walk(child, depth + 1));
      assert.deepEqual(node.keys, minima.slice(1));
      return minima[0];
    };
    walk(frame.root, 1);
    assert.deepEqual([...depths], [result.height]);
    assert.deepEqual(leaves.map(({ next }) => next), [...leaves.slice(1).map(({ id }) => id), null]);
    assert.deepEqual(leaves.flatMap((node) => node.keys), keys.toSorted((a, b) => a - b));
    assert.deepEqual(result.matches, keys.filter((key) => key >= -3 && key <= 12).toSorted((a, b) => a - b));
    assert.equal(result.visitedCount, new Set(frame.visited).size);
  }
  assert.deepEqual(engine.execute({ ...config, order: 1, lower: 0, upper: 0 }).matches, [0]);
  assert.deepEqual(engine.execute({ ...config, order: 1, lower: 80, upper: 82 }).matches, []);
  assert.equal(engine.execute({ ...config, order: 1, keys: [1, 1] }), null);
  assert.equal(engine.execute({ ...config, order: 1, upper: -4 }), null);
});

test("KNN ranks real distances and resolves ties consistently", () => {
  const engine = getExperimentEngine("knn-classification");
  const preset = engine.preset(0);
  const defaultRun = engine.execute(preset);
  assert.deepEqual(defaultRun.neighbors.map(({ index }) => index + 1), [4, 2, 3]);
  assert.deepEqual(defaultRun.votes, { A: 2, B: 1 });
  assert.equal(defaultRun.prediction, "A");
  assert.equal(engine.execute({ ...preset, k: 1 }).prediction, "B");
  assert.equal(engine.execute({ ...preset, k: 2 }).prediction, "B");
  const config = { goalLabel: "最近邻", query: { x: 0, y: 0 }, k: 1, metric: "euclidean",
    samples: [{ x: 2, y: 2, label: "A" }, { x: 3, y: 0, label: "B" }] };
  assert.equal(engine.execute(config).prediction, "A");
  assert.equal(engine.execute({ ...config, metric: "manhattan" }).prediction, "B");
  const tied = engine.execute({ ...config, k: 2, samples: [{ x: 0, y: 1, label: "B" }, { x: 1, y: 0, label: "A" }] });
  assert.deepEqual(tied.neighbors.map(({ index, distance }) => [index, distance]), [[0, 1], [1, 1]]);
  assert.deepEqual(tied.votes, { A: 1, B: 1 });
  assert.equal(tied.prediction, "B");
  assert.equal(engine.execute({ ...config, k: 3 }), null);
  assert.equal(engine.execute({ ...config, query: { x: 0, y: -1 } }), null);
});

test("the sorting lesson resolves only its registered engine and round-trips its knowledge URL", () => {
  const entry = getExperimentTopic("sorting-comparisons", "sorting");
  assert.equal(entry?.domain.id, "algorithms");
  assert.equal(entry?.course.id, "algorithm-basics");
  assert.equal(entry?.chapter.id, "comparison-sorting");
  assert.equal(getExperimentTopic(entry.topic.id, "pathfinding"), undefined);
  assert.equal(getKnowledgeTopic(["sorting-comparisons"]), undefined);
  assert.equal(knowledgeTopicRoute(entry, "run-id"), "/experiments/algorithms?view=knowledge&topic=sorting-comparisons&runId=run-id#knowledge-topic");
  const result = getExperimentEngine("sorting").execute({ goalLabel: "Compare", values: [3, 1, 2] });
  assert.deepEqual(result.bubble.sorted, [1, 2, 3]);
  assert.deepEqual(result.quick.sorted, [1, 2, 3]);
  assert.deepEqual([result.bubble.comparisons, result.bubble.swaps], [3, 2]);
  assert.deepEqual([result.quick.comparisons, result.quick.swaps], [2, 2]);
});

test("knowledge hierarchy covers every module and links only to registered engines and existing topics", () => {
  assert.deepEqual(knowledgeDomains.map(({ id }) => id), courses.map(({ slug }) => slug));
  const topicIds = new Set();
  const engineIds = new Set();
  const crossDomainLinks = new Set();
  for (const domain of knowledgeDomains) {
    assert.equal(getDefaultKnowledgeTopic(domain.id)?.domain, domain);
    for (const course of domain.courses) {
      for (const chapter of course.chapters) {
        for (const topic of chapter.topics) {
          assert.ok(!topicIds.has(topic.id), topic.id);
          topicIds.add(topic.id);
          const entry = getKnowledgeTopic(topic.id);
          assert.deepEqual(entry, { domain, course, chapter, topic });
          assert.ok(topic.sections.length && topic.sections.every(({ paragraphs }) => paragraphs.length));
          assert.ok(topic.sources.length && topic.sources.every(({ href }) => new URL(href).protocol === "https:"));
          const route = new URL(knowledgeTopicRoute(entry), "https://algoverse.test");
          assert.equal(route.pathname, `/experiments/${domain.id}`);
          assert.equal(route.searchParams.get("topic"), topic.id);
          const links = [...(topic.prerequisiteIds ?? []), ...(topic.relatedTopicIds ?? [])];
          for (const id of links) {
            const target = getKnowledgeTopic(id);
            assert.ok(target && id !== topic.id, `${topic.id} → ${id}`);
            if (target.domain !== domain) crossDomainLinks.add(domain.id);
          }
          for (const { engineId, label } of topic.experiments) {
            assert.ok(label);
            assert.equal(getExperimentEngine(engineId)?.domain, domain.id);
            assert.equal(getExperimentTopic(topic.id, engineId), entry);
            engineIds.add(engineId);
          }
        }
      }
    }
  }
  assert.deepEqual(engineIds, new Set(registeredEngines.map(({ id }) => id)));
  assert.ok(crossDomainLinks.size >= 2);

  const checked = new Set();
  const active = new Set();
  function visit(id) {
    assert.ok(!active.has(id), `Prerequisite cycle at ${id}`);
    if (checked.has(id)) return;
    active.add(id);
    for (const parent of getKnowledgeTopic(id).topic.prerequisiteIds ?? []) visit(parent);
    active.delete(id);
    checked.add(id);
  }
  for (const id of topicIds) visit(id);
});

test("shared knowledge search handles Chinese questions, model names, domain filters and misses", () => {
  assert.equal(searchKnowledge("TCP 和 UDP 有何区别？")[0]?.topic.id, "tcp-udp");
  assert.equal(searchKnowledge("Ｂ＋ 树怎样查范围？")[0]?.topic.id, "b-plus-index");
  assert.equal(searchKnowledge("Dijkstra")[0]?.topic.id, "weighted-paths");
  assert.equal(searchKnowledge("TLS 握手")[0]?.topic.id, "tls-handshake");
  assert.equal(searchKnowledge("BRIN 与物理顺序相关性", "databases")[0]?.topic.id, "brin-physical-clustering");
  assert.equal(searchKnowledge("分组交叉验证与实体重叠", "ai")[0]?.topic.id, "grouped-cv-entity-overlap");
  assert.equal(searchKnowledge("怎样算 Bootstrap 区间？")[0]?.topic.id, "bootstrap-resampling-interval");
  assert.deepEqual(searchKnowledge("TCP", "databases"), []);
  assert.deepEqual(searchKnowledge("请解释一下"), []);
  for (const entry of knowledgeEntries) assert.equal(searchKnowledge(entry.topic.title)[0], entry);
});

test("curriculum chapter outlines preserve the teaching hierarchy and shared foundations", () => {
  assert.deepEqual(validateCurriculum(), []);
  assert.deepEqual(curriculumGroups.map(({ id }) => id), [...courses.map(({ slug }) => slug), "foundations"]);
  assert.deepEqual(new Set(curriculumChapters.flatMap(({ lessons }) => lessons)), new Set(knowledgeEntries));
  assert.ok(curriculumChapters.every(({ lessons }) => lessons.length >= 2));
  const { chapter } = resolveCurriculumScope({ module: "ai", course: "deep-learning", chapter: "backpropagation" });
  assert.equal(chapterPreparation(chapter.key)[0].key, "foundations/calculus/differentiation");
  assert.equal(curriculumRoute({ module: "foundations", course: "calculus", chapter: "differentiation" }),
    "/learning-path?module=foundations&course=calculus&chapter=differentiation#knowledge-map");
  assert.equal(resolveCurriculumScope({ module: "networks", course: "calculus" }).course, undefined);
});

test("catalog search distinguishes outlines, teaching and registered labs", () => {
  assert.equal(searchCurriculum("Transformer")[0].key, "ai/nlp-transformer/transformer");
  assert.equal(searchCurriculum("C++", { module: "programming" })[0].course.id, "cpp");
  assert.equal(searchCurriculum("编译原理", { module: "programming" })[0].course.id, "compiler-basics");
  assert.deepEqual(searchCurriculum("Transformer", { module: "networks" }), []);
  assert.equal(searchCurriculum("Transformer", {}, "readable")[0].id, "transformer");
  assert.deepEqual(searchCurriculum("Transformer", {}, "outline"), []);
  assert.equal(searchCurriculum("B+ 树", {}, "lab")[0].id, "index-structures");
  const cppLabs = searchCurriculum("C++", {}, "lab").map(({ id }) => id);
  for (const chapter of ["classes-and-raii", "value-semantics", "errors-and-build"]) assert.ok(cppLabs.includes(chapter), chapter);
  assert.ok(searchCurriculum("Transformer", {}, "lab").some(({ id }) => id === "transformer"));
  const typeChecking = { module: "programming", course: "compiler-basics", chapter: "type-checking" };
  assert.equal(searchCurriculum("类型检查", typeChecking, "readable")[0].id, "type-checking");
  assert.equal(searchCurriculum("类型检查", typeChecking, "lab").length, 0);
  assert.equal(searchCurriculum("切块", { module: "ai", course: "large-language-models", chapter: "rag" })[0].id, "rag");
  assert.ok(searchKnowledge("Transformer").some(({ topic }) => topic.id === "causal-attention-mask"));
  const { teaching, ...topic } = getKnowledgeTopic("segment-tree").topic;
  assert.equal(hasCompleteTeaching({ ...topic, teaching }), true);
  assert.equal(hasCompleteTeaching(topic), false);
  assert.equal(hasCompleteTeaching({ ...topic, teaching: {
    difficulty: "基础", objectives: ["数出比较次数"], examples: ["用 3、1、2 排序"],
    misconceptions: ["相邻交换不一定要执行"], exercises: [{ id: "comparisons", prompt: "第一趟比较几次？", options: ["1", "2"], answer: 1, explanation: "依次比较两对相邻项，共两次。" }],
  } }), true);
});

for (const [batch, groups, count] of [
  ["coverage", coverageTopics, 104], ["depth", depthTopics, 108],
  ["advanced", advancedTopics, 100], ["specialized", specializedTopics, 101],
  ["coverage 700", coverage700Topics, 103], ["undergraduate", undergraduateTopics, 100],
  ["core depth", coreDepthTopics, 103], ["applied core", appliedCoreTopics, 100],
  ["systems practice", systemsPracticeTopics, 100],
  ["advanced reasoning", advancedReasoningTopics, 100],
  ["measurement practice", measurementPracticeTopics, 100],
  ["evidence practice", evidencePracticeTopics, 100],
  ["field validation", fieldValidationTopics, 100],
  ["benchmark validation", benchmarkValidationTopics, 100],
  ["comparative labs", comparativeLabTopics, 100],
  ["diagnostic labs", diagnosticLabTopics, 100],
  ["verification labs", verificationLabTopics, 100],
  ["validation followup", validationFollowupTopics, 100],
  ["prospective validation", prospectiveValidationTopics, 100],
  ["evidence completion", evidenceCompletionTopics, 100],
  ["reproducibility", reproducibilityTopics, 100],
  ["field evaluation", fieldEvaluationTopics, 100],
]) {
  test(`${batch} topics have real prerequisites and gradable exercises`, () => {
    const topics = Object.entries(groups).flatMap(([domain, entries]) => entries.map((entry) => ({ domain, ...entry })));
    assert.equal(topics.length, count);
    for (const { domain, courseId, chapterId, topic } of topics) {
      const entry = getKnowledgeTopic(topic.id);
      assert.equal(entry.domain.id, domain);
      assert.equal(entry.course.id, courseId);
      assert.equal(entry.chapter.id, chapterId);
      assert.equal(hasCompleteTeaching(entry.topic), true, topic.id);
      assert.ok(topic.prerequisiteIds.length > 0 && topic.prerequisiteIds.every((id) => getKnowledgeTopic(id)), topic.id);
      for (const { id, answer, options } of topic.teaching.exercises) {
        options.forEach((_, index) => assert.equal(gradeKnowledgeExercise(topic.id, id, String(index))?.correct, index === answer, topic.id));
      }
    }
  });
}

test("the evidence chapters are searchable without introducing unsupported experiment links", () => {
  const cases = [
    ["相关与重尾", "foundations", "probability-and-statistics", "dependent-heavy-tail-inference", "dependent-heavy-tail-coverage-replay"],
    ["定点滤波", "foundations", "signals-and-systems", "fixed-point-filtering", "fixed-fir-bit-exact-test-vectors"],
    ["透视校正", "programming", "computer-graphics", "perspective-rasterization", "raster-uv-equal-w-regression"],
    ["视频码率", "ai", "computer-vision", "video-rate-distortion", "rate-video-jpeg-frames-byte-sweep"],
    ["跨节点性能", "operating-systems", "parallel-computing", "mpi-cross-node", "mpi-cross-node-boot-to-pingpong-recipe"],
    ["真实服务权限", "networks", "web-security", "service-authorization-regression", "service-auth-permission-regression-script"],
    ["长序列粒子", "ai", "ai-foundations", "particle-path-degeneracy", "long-pf-horizon-seed-sweep"],
    ["非平稳重尾", "foundations", "probability-and-statistics", "nonstationary-heavy-tails", "drift-contaminated-replay-comparison"],
    ["目标板定点", "foundations", "signals-and-systems", "embedded-iir-validation", "board-iir-host-versus-target-contract"],
    ["GPU 光栅化", "programming", "computer-graphics", "gpu-raster-materials", "gpu-readback-fbo-diagnostic"],
    ["实拍视频", "ai", "computer-vision", "real-video-codec-comparison", "codec-real-avc-vp9-replay"],
    ["角色撤权", "networks", "web-security", "role-revocation-cache-isolation", "revoke-local-http-cache-lab"],
    ["传感器长序列", "ai", "ai-foundations", "recorded-sensor-smoothing", "sensor-replay-air-quality-long-series"],
    ["真实重尾", "foundations", "probability-and-statistics", "real-heavy-tail-backtesting", "quake-rolling-real-replay"],
    ["周期测量", "foundations", "signals-and-systems", "target-iir-cycle-measurement", "target-iir-arch-harness"],
    ["PBR 场景", "programming", "computer-graphics", "pbr-scene-device-comparison", "pbr-scene-full-surface-replay"],
    ["原始视频", "ai", "computer-vision", "raw-video-codec-benchmark", "raw-encode-multi-source-replay"],
    ["CDN 隔离", "networks", "web-security", "online-revocation-cdn-verification", "edge-isolation-https-replay"],
    ["轨迹平滑", "ai", "ai-foundations", "nonlinear-trajectory-smoothing", "trajectory-mrclam-ekf-rts-replay"],
    ["区间覆盖", "foundations", "probability-and-statistics", "heavy-tail-interval-replay", "cover-real-three-series-replay"],
    ["glTF 场景", "programming", "computer-graphics", "gltf-cross-host-comparison", "gltf-asset-standalone-replay"],
    ["长视频", "ai", "computer-vision", "long-hd-codec-comparison", "hd-full-clip-replay-two-encoders"],
    ["固定滞后", "ai", "ai-foundations", "multisite-fixed-lag-smoothing", "lag-cross-site-vio-replay"],
    ["非金融重尾", "foundations", "probability-and-statistics", "nonfinancial-tail-coverage", "water-flow-rolling-replay"],
    ["像素差异", "programming", "computer-graphics", "gltf-pixel-attribution", "pixel-glb-ablation-workflow"],
    ["4K 多档", "ai", "computer-vision", "native-hd-uhd-encoding", "uhd-native-4k-window-sweep"],
    ["视惯融合", "ai", "ai-foundations", "raw-vio-lag-latency", "vio-real-rotation-fusion-replay"],
    ["跨域条件覆盖", "foundations", "probability-and-statistics", "cross-domain-conditional-coverage", "cross-tail-three-domain-replay"],
    ["主机复测", "programming", "computer-graphics", "gltf-host-reproduction", "hostlab-compare-exported-pixels"],
    ["整片等码率", "ai", "computer-vision", "uhd-equal-rate-perception", "uhd-match-rate-full-run"],
    ["六自由度", "ai", "ai-foundations", "six-dof-fixed-lag-delivery", "sixinertial-davis-replay"],
    ["多站点条件覆盖", "foundations", "probability-and-statistics", "station-forward-coverage", "station-six-source-replay"],
    ["独立主机", "programming", "computer-graphics", "gltf-independent-host-validation", "gfxhost-independent-pair-workflow"],
    ["多片源", "ai", "computer-vision", "multi-title-4k-rate-quality", "filmgrid-execute-two-titles"],
    ["三维视惯", "ai", "ai-foundations", "spatial-vio-fixed-lag", "spatial-vio-boxes-replay"],
    ["前瞻预测", "foundations", "probability-and-statistics", "auditable-station-forecasting", "precast-usgs-commit"],
    ["独立复测", "programming", "computer-graphics", "gltf-replication-evidence", "replica-glb-reference-replay"],
    ["HDR 全片", "ai", "computer-vision", "natural-hdr-full-rate", "hdrscope-replay-sdr-pq"],
    ["增量地图", "ai", "ai-foundations", "vio-map-recovery-delivery", "mapwalk-boxes-sequential-replay"],
    ["公开前瞻", "foundations", "probability-and-statistics", "public-forecast-revision", "pubflow-audit"],
    ["物理主机", "programming", "computer-graphics", "gltf-host-evidence-audit", "hostproof-matrix"],
    ["HDR10+", "ai", "computer-vision", "hdr10plus-frame-audit", "dynaudio-probe"],
    ["跨场景闭环", "ai", "ai-foundations", "cross-scene-loop-timing", "looplab-run"],
  ];
  for (const [query, module, course, chapter, topic] of cases) {
    const scope = { module, course, chapter };
    const [result] = searchCurriculum(query, scope, "complete");
    assert.equal(result?.id, chapter);
    const entry = getKnowledgeTopic(topic);
    assert.equal(entry.topic.teaching.reference.kind, "code");
    assert.equal(searchKnowledge(entry.topic.title, module)[0]?.topic.id, topic);
    assert.ok(entry.topic.sources.some(({ href }) => href.startsWith("https://")));
    assert.ok(result.lessons.every(({ topic }) => topic.experiments.length === 0));
    assert.deepEqual(searchCurriculum(query, scope, "lab"), []);
  }
});

test("the reproducibility lessons resolve through the current course search and prerequisites", () => {
  for (const [query, module, course, chapter, id, prior] of [
    ["跨日高水", "foundations", "probability-and-statistics", "cross-day-approved-coverage", "hydroday-realrun", "pubflow-audit"],
    ["双主机热点", "programming", "computer-graphics", "gltf-physical-host-matching", "hostpair-accept", "hostproof-matrix"],
    ["显示盲评", "ai", "computer-vision", "hdr10plus-multisource-display", "hdrbatch-evidence", "dynaudio-probe"],
    ["曝光交付", "ai", "ai-foundations", "long-loop-exposure-benchmark", "longloop-proof", "looplab-run"],
    ["跨日高水实时", "foundations", "probability-and-statistics", "live-high-flow-verification", "waterlive-audit", "hydroday-realrun"],
    ["实机复测证据", "programming", "computer-graphics", "gltf-retest-evidence", "retest-closeout", "hostpair-accept"],
    ["校准显示盲评", "ai", "computer-vision", "hdr10plus-observer-validation", "hdrfield-audit", "hdrbatch-evidence"],
    ["室外视惯重定位", "ai", "ai-foundations", "outdoor-vio-loop-screening", "viotrace-evidence", "longloop-proof"],
  ]) {
    const scope = { module, course, chapter };
    const [result] = searchCurriculum(query, scope, "complete");
    assert.equal(result?.id, chapter);
    assert.equal(result.lessons.length, 25);
    const entry = getKnowledgeTopic(id);
    assert.ok(result.lessons.includes(entry));
    assert.equal(searchKnowledge(entry.topic.title, module)[0]?.topic.id, id);
    assert.notEqual(getKnowledgeTopic(prior).chapter.id, chapter);
    if (fieldEvaluationTopics[module]?.some(({ topic }) => topic.id === id)) {
      assert.equal(entry.topic.teaching.reference?.kind, "code");
    }
    assert.ok(result.lessons.every(({ topic }) => topic.experiments.length === 0));
    assert.deepEqual(searchCurriculum(query, scope, "lab"), []);
  }
});

test("the undergraduate expansion follows chapter scope and uses shared topic links", () => {
  const scope = { module: "programming", course: "computer-graphics", chapter: "rasterization" };
  const { chapter } = resolveCurriculumScope(scope);
  const depthBuffer = getKnowledgeTopic("depth-buffer-visibility");
  assert.ok(chapter.lessons.includes(depthBuffer));
  assert.equal(searchCurriculum("深度缓冲", scope, "readable")[0].key, chapter.key);
  assert.ok(searchKnowledge("Lamport")[0].topic.prerequisiteIds.includes("happens-before-causal-order"));
  const signal = getKnowledgeTopic("discrete-impulse-convolution");
  assert.equal(signal?.domain.id, "foundations");
  const consistency = getKnowledgeTopic("linearizability-real-time");
  assert.ok(consistency.topic.prerequisiteIds.includes("replica-read-lag"));
  assert.equal(getKnowledgeTopic("replica-read-lag").domain.id, "databases");
});

test("published titles are distinct and lab links describe supported experiments", () => {
  const titles = knowledgeEntries.map(({ topic }) => topic.title.normalize("NFKC").toLowerCase().replace(/\s/g, ""));
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(getExperimentTopic("per-hop-delivery-probability", "network-transmission")?.topic.id, "per-hop-delivery-probability");
  assert.equal(getExperimentTopic("traceroute-ttl-probes", "network-transmission"), undefined);
  assert.equal(getExperimentTopic("astar-admissible-consistent", "pathfinding")?.topic.id, "astar-admissible-consistent");
  assert.equal(getExperimentTopic("cpu-turnaround-response", "cpu-scheduling")?.topic.id, "cpu-turnaround-response");
  assert.equal(getExperimentTopic("round-robin-preemption-overhead", "cpu-scheduling"), undefined);
  assert.equal(getExperimentTopic("sjf-average-wait", "cpu-scheduling"), undefined);
  assert.equal(getExperimentTopic("knn-distance-weighted-vote", "knn-classification"), undefined);
  const engine = getExperimentEngine("cpu-scheduling");
  const result = engine.execute(engine.preset(42));
  assert.deepEqual(result.processes.map(({ turnaround, response }) => [turnaround, response]), [[13, 0], [9, 1], [9, 2]]);
});

test("core depth stays searchable and the compiler return exercise matches the real lab trace", () => {
  assert.equal(searchCurriculum("两阶段提交", { module: "databases", course: "transaction-management" }, "complete")[0]?.key,
    "databases/transaction-management/distributed-atomic-commit");
  assert.equal(searchKnowledge("目录同步与文件名持久化", "operating-systems")[0]?.topic.id, "directory-sync-name-durability");
  assert.equal(searchCurriculum("马尔可夫链的长期行为", { module: "foundations", course: "stochastic-processes" }, "complete")[0]?.id, "markov-long-run");
  assert.equal(searchCurriculum("KKT", { module: "foundations", course: "optimization-methods" }, "complete")[0]?.id, "constrained-methods");
  const engine = getExperimentEngine("memory-visualization");
  const entry = getExperimentTopic("runtime-factorial-return-stack-trace", engine.id);
  assert.equal(entry?.chapter.id, "runtime-representation");
  assert.equal(knowledgeTopicRoute(entry), "/experiments/programming?view=knowledge&topic=runtime-factorial-return-stack-trace#knowledge-topic");
  const result = engine.execute({ goalLabel: "观察阶乘的逐层返回", factorialInput: 3 });
  const returns = result.steps.filter(({ kind }) => kind === "return").map(({ stack, value }) => [stack.at(-1).n, value]);
  assert.deepEqual(returns, [[0, 1], [1, 1], [2, 2], [3, 6]]);
  assert.equal(getExperimentTopic("gc-copying-forwarding-pointer", engine.id), undefined);
});

test("applied core chapters use real lab capabilities and preserve their topic context", () => {
  const capture = getExperimentTopic("capture-model-hop-event-crosscheck", "network-transmission");
  const range = getExperimentTopic("index-range-width-visited-nodes", "b-plus-tree");
  assert.equal(knowledgeTopicRoute(capture), "/experiments/networks?view=knowledge&topic=capture-model-hop-event-crosscheck#knowledge-topic");
  assert.equal(knowledgeTopicRoute(range), "/experiments/databases?view=knowledge&topic=index-range-width-visited-nodes#knowledge-topic");
  assert.equal(getExperimentTopic("tcp-trace-reorder-closure", "network-transmission"), undefined);
  assert.equal(getExperimentTopic("aries-case-wal-to-final-pages", "b-plus-tree"), undefined);

  const network = getExperimentEngine("network-transmission");
  const simulation = network.execute({ goalLabel: "只让第二跳丢包", seed: 1, packets: 3,
    links: { AB: { delay: 10, loss: 0 }, BD: { delay: 15, loss: 100 }, AC: { delay: 20, loss: 0 }, CD: { delay: 15, loss: 0 } } });
  assert.equal(simulation.delivered, 0);
  assert.deepEqual(simulation.events.filter(({ state }) => state === "dropped").map(({ packet, link }) => [packet, link]),
    [[1, "BD"], [2, "BD"], [3, "BD"]]);

  const index = getExperimentEngine("b-plus-tree");
  const config = { goalLabel: "比较点查与范围查", order: 1, keys: [5, 10, 15, 20], lower: 10, upper: 10 };
  const point = index.execute(config);
  const interval = index.execute({ ...config, upper: 20 });
  assert.deepEqual(point.matches, [10]);
  assert.deepEqual(interval.matches, [10, 15, 20]);
  assert.ok(interval.visitedCount > point.visitedCount);
  assert.equal(searchCurriculum("ARIES", { module: "databases" }, "complete")[0]?.id, "aries-recovery-trace");
  assert.equal(searchCurriculum("ARIES", { module: "databases" }, "lab").length, 0);
});

test("systems practice chapters are discoverable without borrowing unrelated experiment labels", () => {
  for (const [query, module, course, key] of [
    ["缓存一致性", "operating-systems", "computer-architecture", "mesi-coherence"],
    ["设备 I/O 路径", "operating-systems", "file-systems", "linux-device-io"],
    ["IPv6 过渡", "networks", "routing-and-switching", "ipv6-transition"],
    ["模糊检查点", "databases", "transaction-management", "aries-fuzzy-checkpoints"],
    ["生成目标代码", "programming", "compiler-basics", "native-codegen-lab"],
  ]) {
    const scope = { module, course, chapter: key };
    assert.equal(searchCurriculum(query, scope, "complete")[0]?.id, key);
    assert.deepEqual(searchCurriculum(query, scope, "lab"), []);
  }
  assert.equal(getKnowledgeTopic("native-translated-source-full-lab").topic.teaching.reference.kind, "code");
  assert.equal(getKnowledgeTopic("dual-capture-exercise-native-v6-pair").topic.teaching.reference.kind, "code");
  assert.ok(getExperimentTopic("capture-model-hop-event-crosscheck", "network-transmission"));
  assert.ok(getExperimentTopic("index-range-width-visited-nodes", "b-plus-tree"));
});

test("advanced reasoning lessons can be found without advertising unrelated labs", () => {
  for (const [query, module, course, chapter] of [
    ["目录式缓存一致性", "operating-systems", "computer-architecture", "directory-coherence"],
    ["循环 SSA", "programming", "compiler-basics", "loop-ssa"],
    ["通用寄存器分配", "programming", "compiler-basics", "register-allocation"],
    ["近似算法", "algorithms", "algorithm-design", "approximation-guarantees"],
    ["连续时间马尔可夫链", "foundations", "stochastic-processes", "continuous-time-chains"],
    ["数值优化误差", "foundations", "optimization-methods", "numerical-error-and-stopping"],
    ["概率图模型推断", "ai", "ai-foundations", "graphical-model-inference"],
  ]) {
    const scope = { module, course, chapter };
    assert.equal(searchCurriculum(query, scope, "complete")[0]?.id, chapter);
    assert.deepEqual(searchCurriculum(query, scope, "lab"), []);
  }
  assert.equal(searchKnowledge("似然加权固定证据", "ai")[0]?.topic.id, "pgm-likelihood-weighting-clamp");
  assert.equal(knowledgeTopicRoute(getKnowledgeTopic("ctmc-two-state-transient-closed-form")),
    "/learning-path?module=foundations&course=stochastic-processes&chapter=continuous-time-chains&topic=ctmc-two-state-transient-closed-form#knowledge-topic");
});

test("measurement practice is indexed and distinguishes local exercises from platform labs", () => {
  for (const [query, module, course, chapter] of [
    ["置信区间覆盖率", "foundations", "probability-and-statistics", "interval-coverage"],
    ["傅里叶变换", "foundations", "signals-and-systems", "fourier-computation"],
    ["数字图像处理", "ai", "computer-vision", "digital-image-processing"],
    ["MPI 集合操作", "operating-systems", "parallel-computing", "mpi-collectives"],
    ["权限审计", "networks", "web-security", "authorization-audit"],
    ["粒子滤波", "ai", "ai-foundations", "particle-filtering"],
  ]) {
    const scope = { module, course, chapter };
    assert.equal(searchCurriculum(query, scope, "complete")[0]?.id, chapter);
    assert.deepEqual(searchCurriculum(query, scope, "lab"), []);
  }
  assert.match(getKnowledgeTopic("mpi-compare-sum-serial-baseline").topic.teaching.reference.text, /MPI_Allreduce/);
  assert.ok(getExperimentTopic("capture-model-hop-event-crosscheck", "network-transmission"));
  assert.ok(getExperimentTopic("index-range-width-visited-nodes", "b-plus-tree"));
});

test("learning advice uses the target and exact topic activity without inferring mastery", () => {
  const empty = { readTopics: new Set(), byTopic: {} };
  assert.equal(learningSuggestion(empty, "networks")?.entry.topic.id, "network-encapsulation");
  assert.notEqual(learningSuggestion(empty, "networks", 1)?.entry.topic.id, "network-encapsulation");
  assert.notEqual(learningSuggestion(empty, "networks", 1)?.practice, learningSuggestion(empty, "networks")?.practice);
  assert.equal(learningSuggestion({ ...empty, readTopics: new Set(["network-encapsulation"]) }, "networks")?.entry.topic.id, "packet-routing");
  const practiced = { ...empty, byTopic: { "packet-routing": { count: 1 } } };
  assert.equal(topicTouched("tcp-udp", practiced), false);
  assert.equal(learningSuggestion(practiced, "networks")?.entry.topic.id, "network-encapsulation");
  const read = { ...empty, readTopics: new Set(knowledgeEntries.filter(({ domain }) => domain.id === "networks").map(({ topic }) => topic.id)) };
  const orderedPractices = [
    "packet-routing", "ipv6-hop-limit", "per-hop-delivery-probability", "ipv6-packet-too-big", "ipv4-napt-port-mapping", "ipv4-df-fragment-needed",
    "tcp-sequence-ack", "tcp-three-way-sequence", "tcp-rto-backoff", "tcp-half-close-fin", "tcp-sack-out-of-order-blocks",
    "ipv6-next-header-demux", "ethernet-crc-detection", "arp-next-hop-resolution", "http-method-idempotency", "http-cache-validation",
    "dns-recursive-iterative", "dns-negative-cache",
    "cidr-prefix-match", "cidr-aggregate-alignment", "ipv4-subnet-network-host", "link-state-routing",
    "ethernet-source-learning", "vlan-trunk-tag", "stp-block-redundant-path", "link-aggregation-flow-hash",
    "capture-model-hop-event-crosscheck", "tcp-trace-gap-dupacks-sack", "pmtu-size-dependent-stall", "tcp-message-framing",
    "frame-length-resource-limit", "retry-idempotency", "tcp-receive-window", "tcp-cwnd-rwnd", "socket-recv-zero-eof",
    "nonblocking-partial-write", "output-queue-high-watermark", "cors-origin-boundary",
  ];
  const byTopic = {};
  for (const id of orderedPractices) {
    assert.equal(learningSuggestion({ ...read, byTopic }, "networks")?.entry.topic.id, id);
    byTopic[id] = { count: 1 };
  }
  assert.equal(learningSuggestion({ ...read, byTopic }, "networks"), null);
});

test("new core topics link across modules and open shared math through the learning map", () => {
  const backpropagation = getKnowledgeTopic("reverse-mode-gradients");
  const calculus = getKnowledgeTopic("chain-rule");
  assert.ok(backpropagation.topic.prerequisiteIds.includes(calculus.topic.id));
  assert.equal(calculus.domain.id, "foundations");
  assert.equal(knowledgeTopicRoute(calculus), "/learning-path?module=foundations&course=calculus&chapter=differentiation&topic=chain-rule#knowledge-topic");
  assert.equal(getKnowledgeTopic("cpp-raii").course.id, "cpp");
  assert.ok(knowledgeEntries.length > 150);
  assert.ok(knowledgeEntries.every(({ topic }) => topic.sections.some(({ paragraphs }) => paragraphs.join("").length >= 15)));
});

test("complete teaching includes an exercise, worked example and cited core explanation", () => {
  const complete = knowledgeEntries.filter(({ topic }) => hasCompleteTeaching(topic));
  assert.ok(knowledgeEntries.length >= 700);
  assert.equal(complete.length, knowledgeEntries.length);
  assert.deepEqual(new Set(complete.map(({ domain }) => domain.id)), new Set([...courses.map(({ slug }) => slug), "foundations"]));
  for (const id of ["sorting-comparisons", "chain-rule", "b-plus-index", "scaled-dot-product-attention"]) {
    assert.equal(hasCompleteTeaching(getKnowledgeTopic(id).topic), true);
  }
});

test("all 85 restored lessons retain their IDs and grade their new exercises", () => {
  const restored = Object.entries(coverage700Teaching);
  assert.equal(restored.length, 85);
  for (const [topicId, teaching] of restored) {
    const actual = getKnowledgeTopic(topicId)?.topic.teaching;
    assert.deepEqual(actual && { ...actual, exercises: actual.exercises.slice(0, teaching.exercises.length) }, teaching, topicId);
    for (const { id, answer, options } of teaching.exercises) {
      options.forEach((_, index) => assert.equal(gradeKnowledgeExercise(topicId, id, String(index))?.correct, index === answer, topicId));
    }
  }
});

test("reviewed lessons have substantive searchable principles and preserve exercise grading", () => {
  const normalize = (value) => value.normalize("NFKC").toLowerCase().replace(/[^\p{Letter}\p{Number}+*]+/gu, "");
  for (const topicId of reviewedPrincipleIds) {
    const { topic } = getKnowledgeTopic(topicId);
    const { paragraphs } = topic.sections[0];
    assert.ok(paragraphs.length >= 3, topicId);
    assert.ok(normalize(paragraphs.join(" ")).length >= 35, topicId);
  }
  const prompts = new Set();
  for (const topicId of Object.keys(researchExercises)) {
    const exercise = getKnowledgeTopic(topicId)?.topic.teaching?.exercises.find(({ id }) => id === "apply");
    assert.ok(exercise, topicId);
    assert.ok(!prompts.has(normalize(exercise.prompt)), topicId);
    prompts.add(normalize(exercise.prompt));
    assert.equal(gradeKnowledgeExercise(topicId, "apply", String(exercise.answer))?.explanation, exercise.explanation);
  }
  for (const [topicId, exercise] of Object.entries(workedExercises)) {
    for (const index of exercise.options.keys()) {
      const result = gradeKnowledgeExercise(topicId, exercise.id, String(index));
      assert.deepEqual(result, { correct: index === exercise.answer, explanation: exercise.explanation }, topicId);
    }
  }
  for (const [query, topicId] of [
    ["并列行一起纳入", "sql-window-partitions"],
    ["重新加载会产生新的短活跃范围", "reg-lab-two-colors-correctness"],
    ["注入恢复率的分母", "looplab-lost"],
  ]) {
    assert.ok(searchKnowledge(query).some(({ topic }) => topic.id === topicId), query);
  }
});

test("exercise grading uses the server answer and retries replace the result for that question", () => {
  assert.equal(gradeKnowledgeExercise("chain-rule", "chain-at-one", "1")?.correct, true);
  assert.equal(gradeKnowledgeExercise("chain-rule", "chain-at-one", "0")?.correct, false);
  assert.equal(gradeKnowledgeExercise("chain-rule", "chain-at-one", "3"), null);
  assert.equal(gradeKnowledgeExercise("chain-rule", "chain-at-one", "1.0"), null);
  assert.equal(gradeKnowledgeExercise("chain-rule", "../answer", "1"), null);
  assert.deepEqual(practiceSummary({ "chain-at-one": false }), { answered: 1, correct: 0 });
  assert.deepEqual(practiceSummary({ "chain-at-one": true }), { answered: 1, correct: 1 });
});

test("practice performance adjusts the goal's next step and preserves prerequisite priority", () => {
  const empty = { readTopics: new Set(), byTopic: {} };
  const review = { ...empty, practice: { "precision-recall": { "recall-count": false } } };
  assert.equal(learningSuggestion(review, "ai")?.entry.topic.id, "train-test-split");
  const completedPrerequisite = { ...review, readTopics: new Set(["train-test-split"]) };
  assert.equal(learningSuggestion(completedPrerequisite, "ai")?.entry.topic.id, "precision-recall");
  assert.notEqual(learningSuggestion(review, "networks")?.entry.topic.id, "precision-recall");
  const corrected = { ...completedPrerequisite, practice: { "precision-recall": { "recall-count": true } } };
  assert.notEqual(learningSuggestion(corrected, "ai")?.entry.topic.id, "precision-recall");
});

test("diagnosis reviews come from registered links, with the run's own topic first", () => {
  assert.equal(experimentReviewTopics("sorting")[0].topic.id, "sorting-comparisons");
  assert.equal(experimentReviewTopics("knn-classification", "distance-metrics")[0].topic.id, "distance-metrics");
  assert.deepEqual(experimentReviewTopics("sorting", "knn-voting").map(({ topic }) => topic.id),
    ["sorting-comparisons", "bubble-early-stop-sorted", "comparison-sort-decision-tree"]);
  assert.equal(experimentReviewTopics("sorting", "comparison-sort-decision-tree")[0].topic.id, "comparison-sort-decision-tree");
  assert.equal(experimentReviewTopics("page-replacement", "fifo-belady-anomaly")[0].topic.id, "fifo-belady-anomaly");
  assert.equal(experimentReviewTopics("sorting", "bubble-early-stop-sorted")[0].topic.id, "bubble-early-stop-sorted");
  const result = getExperimentEngine("sorting").execute({ goalLabel: "Check early stop", values: [1, 2, 3, 4] });
  assert.deepEqual([result.bubble.comparisons, result.bubble.swaps, result.quick.comparisons], [3, 0, 6]);
  assert.deepEqual(experimentReviewTopics("imaginary"), []);
});

function request(headers, key = "sk-fixture") {
  return new Request("https://algoverse.test/api/ai/connection", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key && { Authorization: `Bearer ${key}` }), ...headers },
    body: "{}",
  });
}

function deepseek(model = "deepseek-flash") {
  return { "X-AI-Provider": "deepseek", "X-AI-Model": model };
}

function qwen(model, region) {
  return { "X-AI-Provider": "qwen", "X-AI-Model": model, "X-AI-Region": region };
}

function completion(content = '{"ok":true}', model) {
  return Response.json({
    ...(model && { model }),
    choices: [{ finish_reason: "stop", message: { role: "assistant", content } }],
    usage: { prompt_tokens: 14, completion_tokens: 5, total_tokens: 19 },
  });
}

function isolatePersonalLimits(t) {
  const previous = globalThis.algoVerseAILimits;
  delete globalThis.algoVerseAILimits;
  t.after(() => { globalThis.algoVerseAILimits = previous; });
}

test("deep lessons keep real topic links and validate each published answer", () => {
  const fixtures = {
    "asymptotic-bounds": ["0", ["1", "0"], "1", "７", ["3", "1"], "n²"],
    "sorting-comparisons": ["3", "0", ["0", "2"]],
    "b-plus-index": [["1", "2", "3"], "1", "1"],
    "cpu-time-slices": ["0", "5", ["0", "2", "3"]],
    "heap-fit-fragmentation": ["1", "17", ["0", "2", "3"]],
    "packet-routing": ["0", "60", ["0", "1", "3"]],
    "kmeans-assignment-update": ["0", "4", ["0", "1"]],
    "page-replacement-lru": ["0", "4", ["0", "1", "3"]],
    "tcp-cwnd-rwnd": ["0", "7", ["0", "1", "3"]],
    "mvcc-row-versions": ["0", "10", ["0", "2", "3"]],
    "gradient-descent-step": ["0", "2", ["0", "1", "3"]],
    "open-addressing": ["1", "3", ["0", "1", "2"]],
    "binary-tree-traversal": ["2", "3", ["0", "1", "3"]],
    "bfs-unweighted-distance": ["0", "1", ["0", "2", "3"]],
    "banker-safe-sequence": ["0", "5", ["0", "1", "3"]],
    "weighted-paths": ["2", "3", ["0", "1", "3"]],
    "link-state-routing": ["0", "7", ["0", "1", "3"]],
    "recursion-stack": ["1", "5", ["0", "2", "3"]],
    "knn-voting": ["0", "2", ["0", "2", "3"]],
    "array-indexing": ["1", "1016", ["0", "2", "3"]],
    "virtual-pages": ["1", "12293", ["0", "2", "3"]],
    "cidr-prefix-match": ["2", "64", ["0", "2", "3"]],
    "c-pointer-lifetime": ["1", "7", ["0", "2", "3"]],
    "relational-selection-projection": ["0", "3", ["0", "1", "3"]],
    "precision-recall": ["0", "60", ["0", "2", "3"]],
    "bayes-rule": ["0", "108", ["0", "2", "3"]],
    "dynamic-array-amortization": ["0", "15", ["0", "2", "3"]],
    "translation-cache": ["0", "3", ["0", "2", "3"]],
    "per-hop-delivery-probability": ["1", "64", ["0", "2", "3"]],
    "c-allocation-ownership": ["1", "12", ["0", "2", "3"]],
    "sql-inner-left-join": ["2", "3", ["0", "2", "3"]],
    "confusion-matrix-miss-types": ["0", "10", ["0", "2", "3"]],
    "total-probability-partition": ["0", "350", ["0", "2", "3"]],
    "conditional-independence-groups": ["0", "68", ["0", "2", "3"]],
    "comparison-sort-decision-tree": ["1", "7", ["0", "2", "3"]],
    "fifo-belady-anomaly": ["0", "9", ["0", "2", "3"]],
    "tcp-rto-backoff": ["1", "8400", ["0", "2", "3"]],
    "c-realloc-temporary-pointer": ["0", "2", ["0", "2", "3"]],
    "outer-join-on-where-predicate": ["0", "6", ["0", "2", "3"]],
    "kmeans-plus-plus-distance": ["0", "104", ["0", "2", "3"]],
    "counting-sort": ["1", "3", ["0", "2", "3"]],
    "lru-stack-distance": ["0", "3", ["0", "2", "3"]],
    "tcpdump-one-sided-capture": ["0", "1100", ["0", "2", "3"]],
    "c-allocation-size-overflow": ["0", "2730", ["0", "2", "3"]],
    "aggregate-distinct-fanout": ["0", "180", ["0", "2", "3"]],
    "silhouette-cluster-score": ["0", "−2/5", ["0", "2", "3"]],
    "joint-table-marginalize": ["0", "60", ["0", "2", "3"]],
    "radix-lsd-stable-pass": ["1", "13", ["0", "2", "3"]],
    "working-set-thrashing": ["0", "8", ["0", "2", "3"]],
    "capture-select-loopback-or-egress": ["0", "10", ["0", "2", "3"]],
    "c-unsigned-modular-arithmetic": ["1", "4", ["0", "2", "3"]],
    "sql-having-group-filter": ["0", "110", ["0", "2", "3"]],
    "adjusted-rand-label-permutation": ["0", "0", ["0", "2", "3"]],
    "conditional-expectation-tower": ["0", "8", ["0", "2", "3"]],
    "sorting-stability-records": ["0", "3", ["0", "2", "3"]],
    "linux-reclaim-refault-working-set": ["0", "2", ["0", "2", "3"]],
    "capture-filter-versus-display-filter": ["0", "1", ["0", "2", "3"]],
    "type-check-implicit-conversion": ["0", "260", ["0", "2", "3"]],
    "sql-rollup-subtotals": ["0", "30", ["0", "2", "3"]],
    "dbscan-core-border-noise": ["0", "2", ["0", "2", "3"]],
    "stratified-sampling-weighted-mean": ["0", "13", ["0", "2", "3"]],
    "stable-merge-sort": ["0", "3", ["0", "2", "3"]],
    "linux-mglru-generation-aging": ["0", "4", ["0", "2", "3"]],
    "capture-snaplen-truncated-bytes": ["0", "10", ["0", "2", "3"]],
    "constant-folding-language-rules": ["0", "−2", ["0", "2", "3"]],
    "olap-ratio-of-sums": ["0", "14", ["0", "2", "3"]],
    "hierarchical-linkage-distance": ["0", "5", ["0", "2", "3"]],
    "standard-error-mean-sqrt": ["0", "2", ["0", "2", "3"]],
    "divide-merge-recurrence": ["0", "120", ["0", "2", "3"]],
    "linux-reclaim-case-across-three-metrics": ["0", "12", ["0", "2", "3"]],
    "capture-kernel-drops-visibility": ["0", "1", ["0", "2", "3"]],
    "dead-code-side-effects": ["0", "5", ["0", "2", "3"]],
    "columnar-analytical-scan": ["0", "12000", ["0", "2", "3"]],
    "distance-metrics": ["0", "4", ["0", "2", "3"]],
    "ci-z-known-sigma-halfwidth": ["0", "1.96", ["0", "2", "3"]],
    "master-theorem-balanced-case": ["0", "2916", ["0", "2", "3"]],
    "cgroup-memory-high-reclaim-throttle": ["0", "820", ["0", "2", "3"]],
    "capture-model-hop-event-crosscheck": ["0", "25", ["0", "2", "3"]],
    "dataflow-live-variable": ["0", "2", ["0", "2", "3"]],
    "buffer-pool-pages": ["0", "4", ["0", "2", "3"]],
    "knn-feature-scaling": ["0", "6", ["0", "2", "3"]],
    "ci-t-unknown-sigma-df": ["0", "9", ["0", "2", "3"]],
  };
  assert.deepEqual(new Set(Object.keys(fixtures)), new Set(deepLessons.keys()));
  for (const [topicId, answers] of Object.entries(fixtures)) {
    const lesson = getDeepLesson(topicId);
    assert.ok(getKnowledgeTopic(topicId));
    assert.ok(getKnowledgeTopic(lesson.next));
    assert.equal(lesson.exercises.length, answers.length);
    assert.deepEqual(new Set(lesson.exercises.map(({ level }) => level)), new Set(["基础", "应用", "挑战"]));
    assert.equal(new Set(lesson.exercises.map(({ id }) => id)).size, answers.length);
    lesson.exercises.forEach((exercise, index) => {
      assert.ok(lesson.blocks.some(({ id }) => id === exercise.review));
      assert.equal(gradeKnowledgeExercise(topicId, exercise.id, answers[index])?.correct, true);
    });
  }
  const wrong = gradeKnowledgeExercise("asymptotic-bounds", "deep-threshold", "6");
  assert.equal(wrong.correct, false);
  assert.equal(wrong.review, "proof");
  assert.equal(gradeKnowledgeExercise("asymptotic-bounds", "deep-theta", ["0", "0"]), null);
  assert.equal(gradeKnowledgeExercise("asymptotic-bounds", "deep-theta", ["0"])?.correct, false);
  assert.equal(gradeKnowledgeExercise("asymptotic-bounds", "tight-bound", "1")?.correct, true);
});

test("each experiment engine is reachable from its matching learning-path topic", () => {
  const aliases = { index: "b-plus-tree", scheduling: "cpu-scheduling", memory: "memory-allocation",
    network: "network-transmission", "recursion-stack": "memory-visualization" };
  const exposed = new Set();
  const inline = new Set();
  for (const entry of knowledgeEntries) {
    const lesson = getDeepLesson(entry.topic.id);
    const curriculumLinks = entry.topic.experiments.filter(({ engineId }) => "curriculum" in getExperimentEngine(engineId));
    if (!lesson && !curriculumLinks.length) continue;
    const url = new URL(learningTopicRoute(entry, "algorithms"), "https://example.test");
    assert.equal(url.pathname, "/learning-path");
    assert.equal(url.hash, "#knowledge-topic");
    assert.deepEqual(Object.fromEntries(url.searchParams), { goal: "algorithms", module: entry.domain.id,
      course: entry.course.id, chapter: entry.chapter.id, topic: entry.topic.id });
    const scope = resolveCurriculumScope(Object.fromEntries(url.searchParams));
    assert.ok(scope.chapter.lessons.some(({ topic }) => topic.id === entry.topic.id), url.href);
    for (const { engineId } of curriculumLinks) {
      assert.equal(getExperimentTopic(entry.topic.id, engineId), entry);
      exposed.add(engineId);
    }
    if (!lesson || lesson.demo === "growth" || isTeachingModel(lesson.demo)) continue;
    const engine = getExperimentEngine(aliases[lesson.demo] ?? lesson.demo);
    assert.equal(engine?.domain, entry.domain.id, entry.topic.id);
    assert.ok(getExperimentTopic(entry.topic.id, engine.id), entry.topic.id);
    exposed.add(engine.id);
    inline.add(engine.id);
  }
  assert.deepEqual(inline, new Set(registeredEngines.filter((engine) => !("curriculum" in engine)).map(({ id }) => id)));
  assert.deepEqual(exposed, new Set(registeredEngines.map(({ id }) => id)));
});

test("new teaching models recompute results when inputs and boundary cases change", () => {
  assert.deepEqual(evaluateTeachingModel("sql-join", [1, 70]).rows, [[1, 80, "匹配"], [2, "NULL", "补空"], [3, "NULL", "补空"]]);
  assert.deepEqual(evaluateTeachingModel("sql-join", [0, 70]).rows, [[1, 80, "匹配"]]);
  assert.equal(evaluateTeachingModel("sql-join", [2, 70]), null);
  assert.equal(evaluateTeachingModel("sql-join", [1, 70.5]), null);
  assert.match(evaluateTeachingModel("confusion-counts", [60]).caption, /误报 1 次，漏报 1 次/);
  assert.match(evaluateTeachingModel("confusion-counts", [86]).caption, /误报 0 次，漏报 2 次/);
  assert.match(evaluateTeachingModel("weighted-groups", [50, 1, 6]).caption, /3\.5%/);
  assert.match(evaluateTeachingModel("weighted-groups", [0, 1, 6]).caption, /6%/);
  const mixture = evaluateTeachingModel("conditional-group-mixture", [50, 80, 80, 20, 20]);
  assert.match(mixture.caption, /总体正关联/);
  assert.deepEqual(mixture.rows[2], ["全部", "50%", "50%", "34%", "25%"]);
  assert.match(evaluateTeachingModel("conditional-group-mixture", [50, 80, 20, 20, 80]).caption, /总体负关联/);
  assert.deepEqual(evaluateTeachingModel("conditional-group-mixture", [0, 80, 80, 20, 20]).rows[0], ["旧设备", "—", "—", "—", "—"]);
  assert.match(evaluateTeachingModel("conditional-group-mixture", [50, 80, 20, 20, 20]).caption, /总体独立/);
  assert.match(evaluateTeachingModel("bayes-counts", [10, 90, 10]).caption, /8\.33%/);
  assert.match(evaluateTeachingModel("bayes-counts", [10, 0, 0]).caption, /未定义/);
  assert.match(evaluateTeachingModel("tlb-trace", [1, 0]).caption, /命中 1 次/);
  assert.match(evaluateTeachingModel("tlb-trace", [2, 0]).caption, /命中 3 次/);
});

test("continued lessons reproduce the actual sort and page-replacement traces", () => {
  const sorter = getExperimentEngine("sorting");
  const orders = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]];
  for (const [index, values] of orders.entries()) {
    const result = sorter.run({ ...sorter.preset(0), values });
    assert.deepEqual(result.quick.sorted, [1, 2, 3]);
    assert.equal(result.quick.comparisons, [3, 2, 3, 3, 3, 2][index]);
  }

  const paging = getExperimentEngine("page-replacement");
  const preset = paging.preset(0);
  const three = paging.run({ ...preset, frameCount: 3 });
  const four = paging.run({ ...preset, frameCount: 4 });
  assert.deepEqual(three.policies.map(({ faults }) => faults).slice(0, 2), [9, 10]);
  assert.deepEqual(four.policies.map(({ faults }) => faults).slice(0, 2), [10, 8]);
  assert.equal(three.policies[0].steps.at(-2).faults, four.policies[0].steps.at(-2).faults);
});

test("continued lessons calculate TCP backoff and preserve realloc state", () => {
  assert.deepEqual(evaluateTeachingModel("rto-backoff", [400, 3]).rows,
    [[1, 1200, 1200, 2400], [2, 2400, 3600, 4800], [3, 4800, 8400, 9600]]);
  const capped = evaluateTeachingModel("rto-backoff", [100, 8]).rows;
  assert.deepEqual(capped[0], [1, 1000, 1000, 2000]);
  assert.deepEqual(capped.at(-1), [8, 60000, 183000, 60000]);
  assert.deepEqual(evaluateTeachingModel("realloc-preserve", [5, 0]).rows, [[0, 11], [1, 22], [2, 33]]);
  assert.deepEqual(evaluateTeachingModel("realloc-preserve", [5, 1]).rows.at(-1), [4, "未初始化"]);
  assert.deepEqual(evaluateTeachingModel("realloc-preserve", [2, 2]).rows, [[0, 11], [1, 22]]);
});

test("continued lessons compare SQL filter phases and apply squared-distance sampling", () => {
  const matchingMembers = (mode, status = 0) =>
    evaluateTeachingModel("outer-join-predicate", [mode, status]).rows.map(([member]) => member);
  assert.deepEqual(matchingMembers(0), [1, 2, 3, 4, 5, 5]);
  assert.deepEqual(matchingMembers(1), [1, 5, 5]);
  assert.deepEqual(matchingMembers(2), [1, 3, 5, 5]);
  assert.deepEqual(matchingMembers(2, 1), [1, 2, 3]);

  const initial = evaluateTeachingModel("kmeans-plus-plus-seeding", [0, 60]);
  assert.deepEqual(initial.rows.map(([, weight]) => weight), [0, 4, 36, 64]);
  assert.match(initial.caption, /选中 8。.*损失 4。/);
  assert.match(evaluateTeachingModel("kmeans-plus-plus-seeding", [0, 3]).caption, /选中 2。.*损失 18\.67。/);
  assert.match(evaluateTeachingModel("kmeans-plus-plus-seeding", [1, 50]).caption, /选中 6。.*损失 2。/);
  assert.deepEqual(evaluateTeachingModel("kmeans-plus-plus-seeding", [2, 0]).rows[0], [0, 4, "[0, 4)", "选中"]);
});

test("counting sort preserves equal-key order and real LRU meets the reuse threshold", () => {
  const keys = evaluateTeachingModel("counting-sort-stability", [2, 0, 2, 1]);
  assert.match(keys.caption, /B → D → A → C/);
  assert.deepEqual(keys.rows[2], [2, 2, "[2, 4)", "A、C"]);
  assert.deepEqual(evaluateTeachingModel("counting-sort-stability", [-2, -2, -2, -2]).rows, [[-2, 4, "[0, 4)", "A、B、C、D"]]);
  assert.deepEqual(evaluateTeachingModel("counting-sort-stability", [-2, 1, -2, 1]).rows[1], [-1, 0, "—", "—"]);

  const engine = getExperimentEngine("page-replacement");
  for (const references of [[1, 2, 2, 3, 1], [1, 2, 2, 3, 4, 1], [1, 1, 2, 1]]) {
    for (const frameCount of [1, 2, 3, 4]) {
      const lru = engine.run({ ...engine.preset(0), references, frameCount }).policies.find(({ policy }) => policy === "LRU");
      const predicted = references.map((page, index) => {
        const prefix = references.slice(0, index);
        const previous = prefix.lastIndexOf(page);
        return previous !== -1 && new Set(prefix.slice(previous + 1)).size < frameCount;
      });
      assert.deepEqual(lru.steps.map(({ hit }) => hit), predicted);
    }
  }
});

test("capture windows can hide early evidence and byte bounds guard multiplication", () => {
  assert.deepEqual(evaluateTeachingModel("capture-vantage", [0, 0, 0]).rows,
    evaluateTeachingModel("capture-vantage", [1, 0, 0]).rows);
  assert.notDeepEqual(evaluateTeachingModel("capture-vantage", [0, 1, 0]).rows,
    evaluateTeachingModel("capture-vantage", [1, 1, 0]).rows);
  assert.deepEqual(evaluateTeachingModel("capture-vantage", [0, 1, 50]).rows,
    evaluateTeachingModel("capture-vantage", [1, 1, 50]).rows);
  assert.deepEqual(evaluateTeachingModel("capture-vantage", [1, 2, 1100]).rows, []);

  assert.deepEqual(evaluateTeachingModel("checked-allocation-size", [16, 2730, 24]).rows.at(-1), ["交给分配器的大小", 65520]);
  assert.match(evaluateTeachingModel("checked-allocation-size", [16, 2731, 24]).caption, /拒绝乘法/);
  assert.match(evaluateTeachingModel("checked-allocation-size", [32, 3000, 24]).caption, /72000/);
  assert.match(evaluateTeachingModel("checked-allocation-size", [32, 0, 24]).caption, /拒绝空请求/);
  assert.equal(evaluateTeachingModel("checked-allocation-size", [32, 10, 0]), null);
});

test("fanout, silhouette, and marginalization recalculate from the current inputs", () => {
  assert.match(evaluateTeachingModel("join-aggregate-fanout", [2, 3, 30]).caption, /6 行.*60 元/);
  assert.deepEqual(evaluateTeachingModel("join-aggregate-fanout", [2, 3, 30]).rows[1], ["付款总额（元）", 180, 60]);
  assert.deepEqual(evaluateTeachingModel("join-aggregate-fanout", [2, 0, 30]).rows[1], ["付款总额（元）", 60, 60]);
  assert.deepEqual(evaluateTeachingModel("join-aggregate-fanout", [0, 0, 30]).rows[1], ["付款总额（元）", "NULL", 0]);
  assert.deepEqual(evaluateTeachingModel("silhouette-point", [6, 0]).rows[2], ["边界点 6", "左", 5, 3, -0.4]);
  assert.deepEqual(evaluateTeachingModel("silhouette-point", [6, 1]).rows[2], ["边界点 6", "右", 3, 5, 0.4]);
  assert.equal(evaluateTeachingModel("silhouette-point", [5, 0]).rows[2].at(-1), 0);
  assert.match(evaluateTeachingModel("marginal-count-table", [15, 5, 10, 20]).caption, /总体超时率 50%.*66\.67%/);
  assert.match(evaluateTeachingModel("marginal-count-table", [15, 5, 0, 0]).caption, /总体超时率 25%.*未定义/);
  assert.match(evaluateTeachingModel("marginal-count-table", [0, 0, 0, 0]).caption, /未定义.*未定义/);
});

test("radix demonstrates stable passes and worksets use the real LRU trace", () => {
  const stable = evaluateTeachingModel("radix-stable-passes", [21, 13, 12, 11, 0]);
  assert.deepEqual(stable.rows[1], ["个位收桶", "A(21) → D(11) → C(12) → B(13)"]);
  assert.deepEqual(stable.rows[2], ["十位收桶", "D(11) → C(12) → B(13) → A(21)"]);
  assert.deepEqual(evaluateTeachingModel("radix-stable-passes", [21, 13, 12, 11, 1]).rows[2],
    ["十位收桶", "B(13) → C(12) → D(11) → A(21)"]);
  assert.match(evaluateTeachingModel("radix-stable-passes", [10, 0, 10, 2, 0]).rows[2][1], /B\(0\).*D\(2\).*A\(10\).*C\(10\)/);

  const phased = evaluateTeachingModel("lru-working-set", [0, 4, 2]);
  assert.match(phased.caption, /缺页 4 次/);
  assert.deepEqual(phased.rows[5], [6, 4, "1、2、3、4", 4, "缺页"]);
  assert.deepEqual(phased.rows[7], [8, 4, "3、4", 2, "命中"]);
  assert.match(evaluateTeachingModel("lru-working-set", [1, 4, 2]).caption, /缺页 8 次/);
  assert.equal(evaluateTeachingModel("lru-working-set", [1, 1, 2]).rows.filter((row) => row[4] === "缺页").length, 8);
  assert.match(evaluateTeachingModel("lru-working-set", [1, 4, 4]).caption, /缺页 4 次/);
  assert.ok(getExperimentTopic("working-set-thrashing", "page-replacement"));
});

test("capture interface selection, C residues and SQL groups use the selected parameters", () => {
  assert.deepEqual(evaluateTeachingModel("capture-interface-path", [0, 1]).rows, []);
  assert.deepEqual(evaluateTeachingModel("capture-interface-path", [0, 0]).rows, [["主机 lo", "127.0.0.1", "127.0.0.1:8080", "SYN"]]);
  assert.equal(evaluateTeachingModel("capture-interface-path", [2, 2]).rows[0][1], "172.18.0.2");
  assert.equal(evaluateTeachingModel("capture-interface-path", [2, 1]).rows[0][1], "192.0.2.10");
  assert.deepEqual(evaluateTeachingModel("unsigned-result-modulus", [8, 250, 10, 0]).rows.slice(-2), [["数学结果", 260], ["目标余数", 4]]);
  assert.deepEqual(evaluateTeachingModel("unsigned-result-modulus", [8, 0, 1, 1]).rows.at(-1), ["目标余数", 255]);
  assert.deepEqual(evaluateTeachingModel("unsigned-result-modulus", [32, 4294967295, 1, 0]).rows.at(-1), ["目标余数", 0]);
  assert.deepEqual(evaluateTeachingModel("sql-row-group-filter", [50, 100]).rows, [["东", 110, "保留"], ["西", 80, "排除"]]);
  assert.deepEqual(evaluateTeachingModel("sql-row-group-filter", [0, 100]).rows, [["东", 110, "保留"], ["西", 100, "保留"]]);
  assert.deepEqual(evaluateTeachingModel("sql-row-group-filter", [90, 0]).rows, []);
});

test("adjusted Rand depends on pairs, and conditional expectation uses group weights", () => {
  assert.match(evaluateTeachingModel("adjusted-rand-pairs", [1, 1, 0, 0]).caption, /同簇 2 对.*ARI = 1/);
  assert.match(evaluateTeachingModel("adjusted-rand-pairs", [0, 1, 0, 1]).caption, /同簇 0 对.*ARI = -0\.5/);
  assert.match(evaluateTeachingModel("adjusted-rand-pairs", [0, 0, 0, 1]).caption, /ARI = 0/);
  for (let i = 0; i < 16; i++) {
    const labels = Array.from({ length: 4 }, (_, j) => (i >> j) & 1);
    assert.equal(evaluateTeachingModel("adjusted-rand-pairs", labels).caption,
      evaluateTeachingModel("adjusted-rand-pairs", labels.map((label) => 1 - label)).caption);
  }
  assert.match(evaluateTeachingModel("conditional-mean-weights", [2, 6, 2, 10]).caption, /总用时 64.*总体均值 8/);
  assert.match(evaluateTeachingModel("conditional-mean-weights", [6, 6, 2, 10]).caption, /总体均值 6/);
  assert.deepEqual(evaluateTeachingModel("conditional-mean-weights", [0, 6, 2, 10]).rows[0], ["轻任务", 0, "0%", "—", 0]);
  assert.match(evaluateTeachingModel("conditional-mean-weights", [0, 0, 2, 10]).caption, /总体均值未定义/);
});

test("record insertion reveals tie order and refault rows follow actual evictions", () => {
  assert.deepEqual(evaluateTeachingModel("record-sort-ties", [2, 1, 2, 0]).rows.at(-1),
    ["插入 C", "B(1) → A(2) → C(2)"]);
  assert.deepEqual(evaluateTeachingModel("record-sort-ties", [2, 1, 2, 1]).rows.at(-1),
    ["插入 C", "B(1) → C(2) → A(2)"]);
  assert.match(evaluateTeachingModel("record-sort-ties", [2, 2, 2, 1]).caption, /换了顺序/);

  const two = evaluateTeachingModel("lru-refault-trace", [2]);
  assert.deepEqual(two.rows[3], [4, 3, "冷缺页", 2, 0]);
  assert.deepEqual(two.rows.filter((row) => row[2] === "复访缺页").map((row) => row[0]), [6, 7]);
  assert.match(two.caption, /缺页 6 次.*复访缺页 2 次/);
  assert.match(evaluateTeachingModel("lru-refault-trace", [3]).caption, /缺页 5 次.*复访缺页 1 次/);
  assert.match(evaluateTeachingModel("lru-refault-trace", [4]).caption, /缺页 4 次.*复访缺页 0 次/);
  assert.ok(getExperimentTopic("linux-reclaim-refault-working-set", "page-replacement"));
});

test("display filtering cannot recover uncaptured packets and C evaluates conversion stages separately", () => {
  assert.match(evaluateTeachingModel("capture-display-stages", [1, 1]).caption, /写入 2 条.*显示 0 条/);
  assert.match(evaluateTeachingModel("capture-display-stages", [1, 0]).caption, /写入 2 条.*显示 2 条/);
  assert.match(evaluateTeachingModel("capture-display-stages", [2, 1]).caption, /写入 3 条.*显示 1 条/);
  assert.match(evaluateTeachingModel("capture-display-stages", [0, 1]).caption, /写入 4 条.*显示 2 条/);

  assert.deepEqual(evaluateTeachingModel("c-conversion-stages", [0, 250, 0]).rows, [
    ["表达式", "int", 260], ["赋值", "unsigned char", 4],
  ]);
  assert.deepEqual(evaluateTeachingModel("c-conversion-stages", [1, 250, 1]).rows, [
    ["表达式", "double", 260.5], ["赋值", "int", 260],
  ]);
  assert.deepEqual(evaluateTeachingModel("c-conversion-stages", [1, 245, 0]).rows.at(-1), ["赋值", "unsigned char", 255]);
  assert.match(evaluateTeachingModel("c-conversion-stages", [1, 250, 0]).caption, /运行时越界/);
  assert.match(evaluateTeachingModel("c-conversion-stages", [2, 0, 1]).caption, /类型约束/);
});

test("rollup flags genuine NULL separately, DBSCAN counts itself, and stratified means use known weights", () => {
  const rollup = evaluateTeachingModel("rollup-group-levels", [10, 20, 30, 1]);
  assert.deepEqual(rollup.rows[1], ["北", "NULL", 0, 0, 20]);
  assert.deepEqual(rollup.rows[3], ["北", "NULL", 0, 1, 30]);
  assert.deepEqual(rollup.rows.at(-1), ["NULL", "NULL", 1, 1, 60]);
  assert.equal(evaluateTeachingModel("rollup-group-levels", [10, 20, 30, 0]).rows.length, 3);

  assert.deepEqual(evaluateTeachingModel("dbscan-neighborhood", [1, 3]).rows.map((row) => row[3]),
    ["边界", "核心", "核心", "边界", "噪声"]);
  assert.match(evaluateTeachingModel("dbscan-neighborhood", [1, 4]).caption, /噪声 5 个/);
  assert.match(evaluateTeachingModel("dbscan-neighborhood", [2, 3]).caption, /核心 4 个.*边界 0 个.*噪声 1 个/);

  assert.match(evaluateTeachingModel("stratified-population-mean", [90, 10, 10, 10, 40]).caption, /平均 25.*估计 13/);
  assert.match(evaluateTeachingModel("stratified-population-mean", [90, 18, 2, 10, 40]).caption, /平均 13.*估计 13/);
  assert.match(evaluateTeachingModel("stratified-population-mean", [90, 10, 0, 10, 40]).caption, /缺层/);
  assert.match(evaluateTeachingModel("stratified-population-mean", [100, 10, 0, 10, 40]).caption, /估计 10/);
});

test("merge preserves cross-half ties and the MGLRU model keeps exact LRU separate", () => {
  assert.deepEqual(evaluateTeachingModel("merge-record-halves", [2, 4, 2, 3, 0]).rows.map((row) => row[1]),
    ["A(2)", "C(2)", "D(3)", "B(4)"]);
  assert.deepEqual(evaluateTeachingModel("merge-record-halves", [2, 4, 2, 3, 1]).rows.map((row) => row[1]),
    ["C(2)", "A(2)", "D(3)", "B(4)"]);
  assert.deepEqual(evaluateTeachingModel("merge-record-halves", [4, 2, 2, 3, 0]).rows, []);

  assert.match(evaluateTeachingModel("mglru-age-generations", [0]).caption, /有页代为 3.*对照换出 A、B/);
  const one = evaluateTeachingModel("mglru-age-generations", [1]);
  assert.deepEqual(one.rows, [["A", 3, 5, "较年轻"], ["B", 4, 4, "同类最老"], ["C", 5, 5, "较年轻"]]);
  assert.match(one.caption, /有页代为 4.*对照换出 B、C/);
  assert.match(evaluateTeachingModel("mglru-age-generations", [2]).caption, /有页代为 5.*对照换出 C、A/);
  assert.ok(getExperimentTopic("linux-mglru-generation-aging", "page-replacement"));
});

test("snaplen bounds and constant folding respect header sizes and integer semantics", () => {
  assert.deepEqual(evaluateTeachingModel("snaplen-frame-budget", [96, 64]).rows.slice(-2),
    [["可见 TCP 负载", 10], ["未保存尾部", 32]]);
  assert.match(evaluateTeachingModel("snaplen-frame-budget", [96, 53]).caption, /TCP 头不完整/);
  assert.match(evaluateTeachingModel("snaplen-frame-budget", [96, 54]).caption, /TCP 头完整/);
  assert.deepEqual(evaluateTeachingModel("snaplen-frame-budget", [96, 128]).rows.at(-1), ["未保存尾部", 0]);

  assert.match(evaluateTeachingModel("constant-folding-integer", [0, 2147483647, 1]).caption, /结果不可表示/);
  assert.match(evaluateTeachingModel("constant-folding-integer", [1, 4294967295, 1]).caption, /可折为 0/);
  assert.deepEqual(evaluateTeachingModel("constant-folding-integer", [2, -7, 3]).rows.at(-1), ["目标语义", -2]);
  assert.deepEqual(evaluateTeachingModel("constant-folding-integer", [2, -1, 3]).rows.at(-1), ["目标语义", 0]);
  assert.match(evaluateTeachingModel("constant-folding-integer", [2, -2147483648, -1]).caption, /结果不可表示/);
  assert.match(evaluateTeachingModel("constant-folding-integer", [2, 1, 0]).caption, /除数为零/);
  for (const answer of ["-2", "−2", "－２"]) {
    assert.equal(gradeKnowledgeExercise("constant-folding-language-rules", "deep-fold-division", answer)?.correct, true);
  }
});

test("ratio, linkage and standard error recompute their distinct assumptions", () => {
  assert.match(evaluateTeachingModel("ratio-of-aggregates", [10, 5, 90, 9]).caption, /合并 14%.*平均 30%/);
  assert.match(evaluateTeachingModel("ratio-of-aggregates", [0, 0, 90, 9]).caption, /合并 10%.*平均 10%/);
  assert.match(evaluateTeachingModel("ratio-of-aggregates", [0, 0, 0, 0]).caption, /未定义.*未定义/);
  assert.match(evaluateTeachingModel("ratio-of-aggregates", [1, 2, 3, 1]).caption, /不能超过/);
  const heights = (method, position = 9) => evaluateTeachingModel("hierarchical-merge-trace", [method, position]).rows.map((row) => row[3]);
  assert.deepEqual(heights(0), [2, 3, 4]);
  assert.deepEqual(heights(1), [2, 4, 9]);
  assert.deepEqual(heights(2), [2, 4, 6.667]);
  assert.equal(heights(0, 6)[0], 1);
  assert.deepEqual(evaluateTeachingModel("sample-mean-uncertainty", [12, 9, 0]).rows.at(-1), ["样本均值标准误", 4]);
  assert.deepEqual(evaluateTeachingModel("sample-mean-uncertainty", [12, 36, 0]).rows.slice(-2),
    [["样本均值方差", 4], ["样本均值标准误", 2]]);
  assert.deepEqual(evaluateTeachingModel("sample-mean-uncertainty", [12, 36, 1]).rows.at(-1), ["样本均值标准误", 12]);
});

test("recurrence totals and reclaim metrics use complete levels and matching time units", () => {
  for (let depth = 0; depth <= 8; depth++) {
    const n = 2 ** depth;
    const total = (quadratic) => evaluateTeachingModel("divide-recurrence-levels", [depth, quadratic]).rows
      .reduce((sum, row) => sum + row[4], 0);
    assert.equal(total(0), n * (depth + 1));
    assert.equal(total(1), 2 * n ** 2 - n);
  }
  const sample = evaluateTeachingModel("reclaim-evidence-window", [10, 400, 100, 60, 1200]);
  assert.deepEqual(sample.rows, [["每秒扫描页", 40, 40], ["每秒回收页", 10, 10], ["回收/扫描", "25%", "25%"],
    ["每秒复访页", 2, 6], ["some 停顿占比", "2%", "12%"]]);
  assert.deepEqual(evaluateTeachingModel("reclaim-evidence-window", [20, 800, 200, 120, 2400]).rows, sample.rows);
  assert.deepEqual(evaluateTeachingModel("reclaim-evidence-window", [10, 0, 0, 0, 0]).rows[2], ["回收/扫描", "25%", "未定义"]);
  assert.match(evaluateTeachingModel("reclaim-evidence-window", [1, 4, 2, 1, 1200]).caption, /不能超过/);
  assert.ok(getExperimentTopic("linux-reclaim-case-across-three-metrics", "page-replacement"));
});

test("capture evidence stays ambiguous at one vantage and dead code preserves observable effects", () => {
  assert.deepEqual(evaluateTeachingModel("capture-drop-vantage", [0, 0]), evaluateTeachingModel("capture-drop-vantage", [1, 0]));
  assert.deepEqual(evaluateTeachingModel("capture-drop-vantage", [0, 1]).rows.slice(-2),
    [["下游 ps_drop 增量", 0], ["下游采集前独立观察点是否见 2", "未见到"]]);
  assert.deepEqual(evaluateTeachingModel("capture-drop-vantage", [1, 1]).rows.slice(-2),
    [["下游 ps_drop 增量", 1], ["下游采集前独立观察点是否见 2", "见到"]]);
  const cases = (branch, write, used) => evaluateTeachingModel("dead-code-observations", [branch, write, used]);
  assert.deepEqual(cases(0, 1, 0).rows.map((row) => row[1]), ["可删", "可删", "保留访问", "保留输出"]);
  assert.deepEqual(cases(1, 0, 1).rows.map((row) => row[1]), ["返回值依赖它，可直接折为 5", "保留输出", "可删", "保留输出"]);
  assert.match(cases(1, 0, 1).caption, /输出 extra、ready。返回 5/);
});

test("columnar projections, KNN metric changes and z intervals match their worked examples", () => {
  assert.deepEqual(evaluateTeachingModel("columnar-scan-budget", [1000, 120, 0]).rows.at(-1), ["扫描合计", 136000, 12000]);
  assert.deepEqual(evaluateTeachingModel("columnar-scan-budget", [1000, 120, 1]).rows.at(-1), ["扫描合计", 136000, 136000]);
  assert.deepEqual(evaluateTeachingModel("columnar-scan-budget", [1, 0, 0]).rows.at(-1), ["扫描合计", 16, 12]);

  assert.deepEqual(evaluateTeachingModel("knn-metric-neighbor", [0, 0, 0]).rows, [[1, "B", "(2, 2)", 2.828], [2, "A", "(3, 0)", 3]]);
  assert.deepEqual(evaluateTeachingModel("knn-metric-neighbor", [1, 0, 0]).rows, [[1, "A", "(3, 0)", 3], [2, "B", "(2, 2)", 4]]);
  assert.deepEqual(evaluateTeachingModel("knn-metric-neighbor", [1, 2, 2]).rows[0], [1, "B", "(2, 2)", 0]);

  assert.match(evaluateTeachingModel("known-sigma-z-interval", [50, 10, 25, 95]).caption, /\[46\.08, 53\.92\].*半宽 3\.92/);
  assert.match(evaluateTeachingModel("known-sigma-z-interval", [50, 10, 100, 95]).caption, /半宽 1\.96/);
  assert.match(evaluateTeachingModel("known-sigma-z-interval", [50, 10, 25, 99]).caption, /半宽 5\.15/);
  assert.equal(evaluateTeachingModel("known-sigma-z-interval", [50, 10, 25, 97]), null);
});

test("balanced recurrences and cgroup threshold scenarios account for the changing inputs", () => {
  for (const divisor of [2, 3]) {
    for (const power of [1, 2]) {
      for (let depth = 0; depth <= 5; depth++) {
        const model = evaluateTeachingModel("master-balanced-levels", [divisor, power, depth, 0]);
        assert.equal(model.rows.length, depth + 1);
        assert.ok(model.rows.every((row) => row[4] === divisor ** (depth * power)));
      }
    }
  }
  const layers = (mode) => evaluateTeachingModel("master-balanced-levels", [3, 2, 3, mode]).rows.map((row) => row[4]);
  assert.deepEqual(layers(0), [729, 729, 729, 729]);
  assert.deepEqual(layers(1), [729, 648, 576, 512]);
  assert.deepEqual(layers(2), [729, 810, 900, 1000]);

  assert.deepEqual(evaluateTeachingModel("cgroup-high-thresholds", [900, 800, 1000, 80]).rows.at(-1), ["回收后估算", 820, "仅超过 high"]);
  assert.deepEqual(evaluateTeachingModel("cgroup-high-thresholds", [900, 800, 1000, 100]).rows.at(-1), ["回收后估算", 800, "未超过 high"]);
  assert.deepEqual(evaluateTeachingModel("cgroup-high-thresholds", [1060, 800, 1000, 20]).rows.at(-1), ["回收后估算", 1040, "超过 max"]);
  assert.match(evaluateTeachingModel("cgroup-high-thresholds", [900, 1000, 800, 80]).caption, /high 不高于 max/);
});

test("network crosschecks distinguish drop from non-arrival and liveness uses successor unions", () => {
  const lastHop = evaluateTeachingModel("network-hop-crosscheck", [3, 0, 100, 10]);
  assert.deepEqual(lastHop.columns, ["包号", "AB", "BD"]);
  assert.deepEqual(lastHop.rows, [1, 2, 3].map((packet) => [packet, "转发 · 10 ms", "丢弃 · 25 ms"]));
  assert.deepEqual(evaluateTeachingModel("network-hop-crosscheck", [1, 100, 100, 10]).rows, [[1, "丢弃 · 10 ms", "未到达本跳"]]);
  assert.deepEqual(evaluateTeachingModel("network-hop-crosscheck", [1, 100, 100, 20]).columns, ["包号", "AB", "BD"]);
  const rerouted = evaluateTeachingModel("network-hop-crosscheck", [1, 100, 100, 21]);
  assert.deepEqual(rerouted.columns, ["包号", "AC", "CD"]);
  assert.deepEqual(rerouted.rows, [[1, "转发 · 20 ms", "送达 · 35 ms"]]);
  assert.ok(getExperimentTopic("capture-model-hop-event-crosscheck", "network-transmission"));

  const sets = (terminal) => evaluateTeachingModel("liveness-diamond", [terminal]).rows.map((row) => row.slice(2));
  assert.deepEqual(sets(0), [["∅", "{x, y}"], ["{y}", "{x}"], ["{x}", "{x}"], ["{x}", "∅"]]);
  assert.deepEqual(sets(1), [["∅", "{x, y}"], ["{y}", "{y}"], ["{x}", "{y}"], ["{y}", "∅"]]);
  assert.deepEqual(sets(2), [["∅", "{x, y}"], ["{y}", "{x, y}"], ["{x}", "{x, y}"], ["{x, y}", "∅"]]);
});

test("buffer-pool traces, ranked scaling and t intervals match worked results and boundaries", () => {
  const two = evaluateTeachingModel("database-buffer-pool", [2, 0]);
  assert.match(two.caption, /命中 2 次.*读入 4 页次/);
  assert.deepEqual(two.rows[3], [4, 9, "读入", 8, "7、9"]);
  assert.deepEqual(two.rows[5], [6, 8, "读入", 9, "7、8"]);
  assert.match(evaluateTeachingModel("database-buffer-pool", [3, 0]).caption, /读入 3 页次/);
  assert.match(evaluateTeachingModel("database-buffer-pool", [4, 1]).caption, /命中 0 次.*读入 6 页次/);

  assert.match(evaluateTeachingModel("knn-axis-scale", [1, 1]).caption, /最近样本为 A/);
  assert.match(evaluateTeachingModel("knn-axis-scale", [3, 1]).caption, /最近样本为 B/);
  assert.deepEqual(evaluateTeachingModel("knn-axis-scale", [2, 1]).rows, [[1, "A", "(4, 0)", 4], [2, "B", "(0, 4)", 4]]);
  assert.match(evaluateTeachingModel("knn-axis-scale", [2, 2]).caption, /最近样本为 A/);
  assert.ok(getExperimentTopic("knn-feature-scaling", "knn-classification"));

  assert.match(evaluateTeachingModel("unknown-sigma-t-interval", [50, 10, 5]).caption, /\[37\.58, 62\.42\].*半宽 12\.42/);
  assert.deepEqual(evaluateTeachingModel("unknown-sigma-t-interval", [50, 10, 25]).rows,
    [["自由度", 24], ["估计标准误", 2], ["t 临界值", 2.0639], ["半宽", 4.13]]);
  assert.equal(evaluateTeachingModel("unknown-sigma-t-interval", [50, 10, 1]), null);
  assert.equal(evaluateTeachingModel("unknown-sigma-t-interval", [50, 10, 12]), null);
});

test("the four new lessons explain observations from their linked engines", () => {
  const cases = {
    "cpu-time-slices": "cpu-scheduling",
    "heap-fit-fragmentation": "memory-allocation",
    "packet-routing": "network-transmission",
    "kmeans-assignment-update": "k-means",
  };
  for (const [id, engineId] of Object.entries(cases)) {
    assert.ok(getKnowledgeTopic(id).topic.experiments.some((example) => example.engineId === engineId));
  }
  const cpu = getExperimentEngine(cases["cpu-time-slices"]);
  const jobs = cpu.preset(0);
  const rr = cpu.run(jobs);
  assert.deepEqual(rr.timeline.map(({ process, end }) => [process + 1, end]), [[1, 2], [2, 4], [3, 6], [1, 8], [2, 10], [3, 11], [1, 13]]);
  assert.equal(rr.processes[1].waiting, 5);
  const fcfs = cpu.run({ ...jobs, policy: "fcfs" });
  assert.deepEqual(fcfs.processes.map(({ finished }) => finished), [6, 10, 13]);
  assert.equal(fcfs.processes[2].response, 8);

  const heap = getExperimentEngine(cases["heap-fit-fragmentation"]);
  const requests = heap.preset(0);
  const { first, best } = heap.run(requests);
  assert.deepEqual(first.steps[6].blocks.filter(({ owner }) => owner === null).map(({ size }) => size), [3, 5]);
  assert.equal(first.steps[7].outcome, "fragmented");
  assert.equal(best.steps[7].address, 0);
  const merged = heap.run({ ...requests, commands: [...requests.commands.slice(0, 6), { action: "free", id: "B" }] });
  assert.equal(merged.first.final.largest, 17);

  const network = getExperimentEngine(cases["packet-routing"]);
  const topology = network.preset(101);
  const links = { ...topology.links, AB: { delay: 10, loss: 0 }, BD: { delay: 15, loss: 100 } };
  const lost = network.run({ ...topology, links, packets: 6 });
  assert.deepEqual(lost.events.slice(0, 2).map(({ link, at, state }) => [link, at, state]),
    [["AB", 10, "forwarded"], ["BD", 25, "dropped"]]);
  assert.equal(lost.averageLatency, null);
  const rerouted = network.run({ ...topology, links: { ...links, AB: { delay: 40, loss: 0 } }, packets: 6 });
  assert.deepEqual(rerouted.route, ["AC", "CD"]);
  assert.equal(rerouted.averageLatency, 35);
  assert.equal(rerouted.delivered, 6);

  const kMeans = getExperimentEngine(cases["kmeans-assignment-update"]);
  const points = kMeans.preset(0);
  assert.deepEqual(kMeans.run(points).steps.map(({ loss }) => loss), [4, 4]);
  const moved = kMeans.run({ ...points, initialCenters: [{ x: 0, y: 1 }, { x: 2, y: 1 }], maxIterations: 1 });
  assert.deepEqual(moved.final.sizes, [1, 3]);
  assert.deepEqual(moved.final.centers, [{ x: 0, y: 1 }, { x: 20 / 3, y: 1 }]);
  assert.ok(!moved.converged);
});

test("growth demo counts operations and certifies every integer after the threshold", () => {
  assert.equal(countWork(8), 23);
  assert.equal(countWork(16), 39);
  assert.equal(growthAt(16).quadratic, 256);
  assert.equal(verifyLinearUpperBound(2, 1000).earliest, null);
  assert.deepEqual(verifyLinearUpperBound(3, 6), { earliest: 7, valid: false, cost: 19, upper: 18 });
  assert.equal(verifyLinearUpperBound(3, 7).valid, true);
  assert.equal(verifyLinearUpperBound(4, 3).valid, false);
  for (let n = 4; n <= 1000; n++) assert.equal(verifyLinearUpperBound(4, n).valid, true);
});

test("tutor receives the selected deep lesson and does not receive practice without consent", async (t) => {
  const limits = globalThis.algoVerseAILimits;
  t.after(() => { globalThis.algoVerseAILimits = limits; });
  const captured = [];
  t.mock.method(globalThis, "fetch", async (_endpoint, init) => {
    const input = JSON.parse(JSON.parse(init.body).messages[1].content);
    captured.push(input);
    return completion(JSON.stringify({ answer: "请看本节案例。", citations: [input.knowledge[0].id] }));
  });
  const call = (body) => {
    // Each topic is a separate scenario. The rate-limit tests cover consecutive requests.
    delete globalThis.algoVerseAILimits;
    return tutorPOST(new Request("https://example.test/api/ai/tutor", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer sk-lesson-test-${body.topicId ?? "missing"}`, "X-AI-Model": "deepseek-flash" },
      body: JSON.stringify({ question: "怎么理解渐近上界？", ...body }),
    }));
  };
  const result = await call({ topicId: "asymptotic-bounds", includePractice: false });
  assert.equal(result.status, 200);
  assert.equal(captured[0].lesson.title, "渐近上界与紧确界");
  assert.ok(!Object.hasOwn(captured[0], "practice"));
  const others = knowledgeEntries.filter(({ topic }) => topic.id !== "asymptotic-bounds" && getDeepLesson(topic.id));
  for (const { topic: { id: topicId } } of others) {
    const courseResult = await call({ topicId, includePractice: false });
    assert.equal(courseResult.status, 200);
    assert.equal(captured.at(-1).lesson.title, getDeepLesson(topicId).title);
    assert.equal(captured.at(-1).knowledge[0].id, topicId);
    assert.ok(!Object.hasOwn(captured.at(-1), "practice"));
  }
  const summaryResult = await call({ topicId: "chain-rule", includePractice: false });
  assert.equal(summaryResult.status, 200);
  const summaryContext = captured.at(-1);
  assert.ok(!Object.hasOwn(summaryContext, "lesson"));
  assert.ok(!Object.hasOwn(summaryContext, "practice"));
  assert.equal(summaryContext.knowledge[0].id, "chain-rule");
  assert.deepEqual(summaryContext.knowledge[0].reference, { kind: "formula", text: "(f∘g)'(x) = f'(g(x)) g'(x)" });
  const missing = await call({ includePractice: true });
  assert.equal(missing.status, 400);
  assert.equal(captured.length, others.length + 2);
});

test("every registered engine offers only observations backed by its recorded result", () => {
  for (const engine of registeredEngines) {
    const config = engine.preset(101);
    const results = engine.run(config);
    const { observations, steps } = diagnosisChoices(engine.id, config, results);
    assert.deepEqual(Object.fromEntries(observations.map(({ id, value }) => [id, value])), experimentEvidence(results), engine.id);
    assert.ok(steps.length, engine.id);
    assert.ok(observations.every(({ value, conclusion }) => conclusion.includes(value)), engine.id);
  }
});

test("all runnable labs explain a domain-specific observation and a controlled retest", () => {
  const diagnosticEvidence = {
    pathfinding: /剩余路程。.*耗时/, sorting: /首个基准.*两侧又比较/, "cpu-scheduling": /P1 等待.*P3 等待/,
    "network-transmission": /经 B 总延迟 25 ms。经 C 总延迟 35 ms/, "memory-visualization": /0! 先返回 1/, "b-plus-tree": /节点最多存 2 个键/,
    "knn-classification": /用欧氏距离。.*各投一票/, "page-replacement": /第 \d+ 次访问出现分歧/, "hash-collisions": /第 \d+ 项检查数先分开/,
    "k-means": /用组内均值更新中心/, "gradient-descent": /第一步走到 2。.*末步梯度/, "tree-traversal": /层序最后访问 9/,
    "graph-traversal": /BFS 一层层取队列。DFS 沿一条分支向下/, "deadlock-avoidance": /试算先完成 P1/,
    "tcp-congestion": /第 8 步首次快重传。.*第 11 步首次超时/, "dynamic-routing": /调整链路 1↔4。.*重算后下一跳为 2/,
    "memory-allocation": /第 7 步先出现差异。首次碎片失败 1 次。最佳碎片失败 0 次/, "transaction-concurrency": /冲突出现在第 0 号行/,
  };
  const existing = registeredEngines.filter((engine) => !("curriculum" in engine));
  assert.deepEqual(Object.keys(diagnosticEvidence), existing.map(({ id }) => id));
  for (const engine of existing) {
    const config = engine.preset(101);
    const { conclusion, detail, explanation, suggestion } = experimentReport(config, engine.run(config));
    assert.match(explanation, diagnosticEvidence[engine.id], engine.id);
    assert.ok(conclusion.length > 0 && detail.split("。").length >= 4 && suggestion.length > 0, engine.id);
    assert.doesNotMatch(conclusion + detail + explanation, /undefined|NaN/, engine.id);
  }
});

test("lab reports handle failed, tied and worsening outcomes", () => {
  const noPath = { pathLength: null, elapsedMs: 0, visited: [0], path: [] };
  assert.match(pathfindingReport(2, { dijkstra: noPath, astar: noPath }).conclusion, /两种算法都未找到路/);
  assert.match(pathfindingReport(2, { astar: noPath }).conclusion, /A\* 未找到路/);

  const network = getExperimentEngine("network-transmission");
  const net = network.preset(101);
  net.links.AB.loss = 100;
  const networkReport = experimentReport(net, network.run(net));
  assert.match(networkReport.conclusion, /送达 0 个，丢包 10 个/);
  assert.match(networkReport.detail, /没有包送达。AB 丢包 10 个。BD 丢包 0 个/);

  const pageReplacement = getExperimentEngine("page-replacement");
  const pages = { ...pageReplacement.preset(), references: [1, 1] };
  assert.match(experimentReport(pages, pageReplacement.run(pages)).conclusion, /三种策略均缺页 1 次/);

  const banker = getExperimentEngine("deadlock-avoidance");
  const unsafe = { ...banker.preset(), process: 4, request: [3, 3, 0] };
  const unsafeReport = experimentReport(unsafe, banker.run(unsafe));
  assert.match(unsafeReport.conclusion, /撤回试分配/);
  assert.match(unsafeReport.detail, /原状态存在安全序列/);

  const gradient = getExperimentEngine("gradient-descent");
  const tooLarge = { ...gradient.preset(), learningRate: 2 };
  assert.match(experimentReport(tooLarge, gradient.run(tooLarge)).conclusion, /损失上升。达到步数上限/);
});

test("CPU diagnosis uses the edited quantum and actual waits, including equal burst length", () => {
  const engine = getExperimentEngine("cpu-scheduling");
  const config = { ...engine.preset(), quantum: 3 };
  const { observations, steps } = diagnosisChoices(engine.id, config, engine.run(config));
  const waiting = observations.find(({ id }) => id === "waiting");
  assert.equal(waiting.value, "6.00");
  assert.match(waiting.explanation, /P1 等待 6，P2 等待 8，P3 等待 4/);
  assert.match(waiting.explanation, /时间片为 3。运行时长超过它的进程有 2 个/);
  assert.ok(steps.some(({ id }) => id === "quantum"));
  const fcfs = { ...config, policy: "fcfs" };
  const other = diagnosisChoices(engine.id, fcfs, engine.run(fcfs));
  assert.ok(other.observations.every(({ explanation }) => explanation.includes("本轮使用先来先服务")));
  assert.ok(other.steps.every(({ id }) => id !== "quantum"));
});

test("sorting reports use measured differences and retain the actual round numbers", () => {
  const engine = getExperimentEngine("sorting");
  const saved = (values) => {
    const config = { ...engine.preset(), values };
    const results = engine.run(config);
    return { tool: engine.id, version: engine.version, config, results, metrics: experimentEvidence(results) };
  };
  const first = saved([7, 2, 9, 4, 3, 8, 1]);
  const second = saved([9, 8, 3, 7, 2, 6]);
  const report = experimentReport(second.config, second.results);
  assert.equal(report.conclusion, "快排少比较 6 次。快排少交换 8 次。");
  assert.match(report.detail, /冒泡比较 15 次。快排比较 9 次。.*两种升序结果一致/);
  assert.match(report.explanation, /首个基准是 6。.*左侧有 2 项。右侧有 3 项/);
  const comparison = experimentRunComparison([first, { ...first, version: 2 }, second], engine.id, engine.version);
  assert.equal(comparison.conclusion, "各轮快排比较都更少。各轮快排交换都更少。");
  assert.deepEqual(comparison.rounds.map(({ round }) => round), [1, 3]);
  assert.match(comparison.changes[0].detail, /7 项变为 6 项。输入规模和内容都变了/);
  assert.match(comparison.changes[0].detail, /冒泡比较少 6 次。快排比较少 5 次。冒泡交换少 1 次。快排交换少 1 次/);

  const ascending = saved([1, 2, 3, 4]);
  const descending = saved([4, 3, 2, 1]);
  const reordered = experimentRunComparison([ascending, descending], engine.id, engine.version);
  assert.match(reordered.changes[0].detail, /只调整了输入顺序/);
  assert.match(reordered.conclusion, /冒泡较少 1 轮。打平 1 轮/);
  assert.equal(experimentReport(ascending.config, ascending.results).conclusion, "冒泡少比较 3 次。交换次数相同。");
});

test("round comparison shows edited parameters and labeled numeric differences", () => {
  const engine = getExperimentEngine("page-replacement");
  const first = engine.preset();
  const after = { ...first, goalLabel: "另一段说明", frameCount: 4 };
  const rounds = [first, after].map((config) => ({ tool: engine.id, version: engine.version, config,
    metrics: experimentEvidence(engine.run(config)) }));
  const comparison = experimentRunComparison(rounds, engine.id, engine.version);
  const [change] = comparison.changes;
  assert.deepEqual(change.parameters, [{ label: "页框数", previous: 3, value: 4 }]);
  assert.deepEqual(change.metrics.find(({ key }) => key === "pageFaults").deltas, ["FIFO +1", "LRU −2", "OPT −1"]);
  assert.match(comparison.conclusion, /缺页次数有变化/);
});

test("diagnosis accepts a model's selection and rejects injected claims or unsupported IDs", async (t) => {
  const engine = getExperimentEngine("sorting");
  const config = { ...engine.preset(), values: [9, 7, 5, 3, 1] };
  const run = { id: "grounded-test-run", session: { engineId: engine.id, config, question: "原始输入是 [7,2,9,1,5]" }, results: engine.run(config) };
  const credentials = { apiKey: "sk-grounded-diagnosis-test", selection: { provider: "deepseek", model: "deepseek-flash" }, signal: new AbortController().signal };
  let reply = { metric: "comparisons", next: "order" };
  t.mock.method(globalThis, "fetch", async (_endpoint, init) => {
    const payload = JSON.parse(init.body);
    assert.ok(!init.body.includes("原始输入"));
    assert.match(payload.messages[0].content, /observations/);
    return completion(JSON.stringify(reply), payload.model);
  });
  const report = await diagnoseExperimentRun(run, credentials);
  assert.deepEqual(report.evidence, ["comparisons", "swaps", "sorted"]);
  assert.match(report.conclusion, /比较次数相同。快排少交换/);
  assert.match(report.explanation, /首个基准是 1。首轮划分比较 4 次。.*两侧又比较 6 次/);
  assert.match(report.suggestion, /改输入顺序/);
  reply = { metric: "comparisons", next: "order", conclusion: "快排比较更少" };
  await assert.rejects(diagnoseExperimentRun(run, credentials), /返回格式有误/);
  reply = { metric: "not-recorded", next: "order" };
  await assert.rejects(diagnoseExperimentRun(run, credentials), /返回格式有误/);
});

const primaryModel = "Qwen/Qwen3.5-4B";
const backupModel = "THUDM/GLM-Z1-9B-0414";
const pricingUrl = "https://www.siliconflow.cn/pricing";
const siliconFlowUrl = "https://api.siliconflow.cn/v1/chat/completions";
const platformHeaders = (choice) => ({ "X-AI-Provider": "siliconflow", ...(choice && { "X-AI-Platform-Model": choice }) });

function setTestEnv(t, key, value) {
  const previous = process.env[key];
  process.env[key] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
}

test("tutor accepts multiline code and null recommendations while preserving verified citations and history", async (t) => {
  const codeBlocks = [{ language: "python", lines: ["for i in range(3):", "    print(i)"] }];
  let upstreamOutput = { answer: "逐个打印。", codeBlocks, recommend: null, citations: ["tcp-udp"] };
  const upstream = t.mock.method(globalThis, "fetch", async () => completion(JSON.stringify(upstreamOutput)));
  const ask = (history = []) => tutorPOST(new Request("https://algoverse.test/api/ai/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer sk-tutor-test", ...deepseek() },
    body: JSON.stringify({ question: "请用代码块举例。", topicId: "tcp-udp", history }),
  }));

  const response = await ask();
  assert.equal(response.status, 200);
  const reply = await response.json();
  assert.deepEqual(reply, { status: "answer", answer: "逐个打印。", codeBlocks,
    sources: [{ title: "TCP 与 UDP", href: "/experiments/networks?view=knowledge&topic=tcp-udp#knowledge-topic" }] });

  const history = [{ question: "上一段代码呢？", answer: reply.answer, codeBlocks: reply.codeBlocks }];
  upstreamOutput = { answer: "它运行三次。", citations: null };
  assert.equal((await ask(history)).status, 200);
  const payload = JSON.parse(upstream.mock.calls[1].arguments[1].body);
  assert.deepEqual(JSON.parse(payload.messages[1].content).history, history);

  for (const invalid of [
    { answer: "代码", codeBlocks: [{ language: "python", lines: ["first\nsecond"] }] },
    { answer: "代码", codeBlocks: [{ language: "python", lines: ["A".repeat(1800)] }] },
    { answer: "引用", citations: ["unknown-topic"] },
  ]) {
    upstreamOutput = invalid;
    assert.equal((await ask()).status, 502);
  }
  const calls = upstream.mock.callCount();
  assert.equal((await ask([{ ...history[0], codeBlocks: "bad" }])).status, 400);
  assert.equal(upstream.mock.callCount(), calls);
});

test("tutor keeps verified citations and omits unregistered recommendations", async (t) => {
  let citations = [{ id: "sorting-comparisons", title: "模型提供的标题", href: "https://example.com/wrong" }];
  let recommend = { href: "https://example.com/wrong" };
  t.mock.method(globalThis, "fetch", async () => completion(JSON.stringify({ answer: "有序输入会让末项基准产生不平衡的分区。", citations, recommend })));
  const ask = () => tutorPOST(new Request("https://algoverse.test/api/ai/tutor", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer sk-object-citation-test", ...deepseek() },
    body: JSON.stringify({ question: "为什么用末项作基准时会退化？", topicId: "sorting-comparisons" }),
  }));

  const response = await ask();
  assert.equal(response.status, 200);
  const reply = await response.json();
  assert.deepEqual(reply.sources, [{ title: "冒泡排序与快速排序",
    href: "/experiments/algorithms?view=knowledge&topic=sorting-comparisons#knowledge-topic" }]);
  assert.equal(reply.recommendation, undefined);
  recommend = "sorting";
  const registered = await ask();
  assert.match((await registered.json()).recommendation.href, /^\/experiments\/algorithms\/sorting\?/);
  for (const invalid of [[{ id: "unknown-topic" }], [{ id: "sorting-comparisons", topicId: "tcp-udp" }]]) {
    citations = invalid;
    assert.equal((await ask()).status, 502);
  }
});

test("tutor repairs literal line breaks inside complete JSON without bypassing validation", async (t) => {
  const answer = '先看代码。\n```python\nprint("hi")\n```';
  const valid = JSON.stringify({ answer, recommend: null });
  let content = valid.replaceAll("\\n", "\n");
  t.mock.method(globalThis, "fetch", async () => completion(content));
  const ask = () => tutorPOST(new Request("https://algoverse.test/api/ai/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer sk-tutor-format-test", ...deepseek() },
    body: JSON.stringify({ question: "请用代码块举例。" }),
  }));

  const repaired = await ask();
  assert.equal(repaired.status, 200);
  assert.equal((await repaired.json()).answer, answer);
  content = "```json\n" + valid + "\n```";
  assert.equal((await ask()).status, 200);
  content = valid.slice(0, -1);
  assert.equal((await ask()).status, 502);
  content = JSON.stringify({ answer, citations: ["unknown-topic"] }).replaceAll("\\n", "\n");
  assert.equal((await ask()).status, 502);
  const codeBlocks = [{ language: "javascript", lines: ['console.log("}");'] }];
  content = JSON.stringify({ answer: "打印一个右括号。", codeBlocks }) + ', "citations": [], "recommend": null}';
  const recovered = await ask();
  assert.equal(recovered.status, 200);
  assert.deepEqual((await recovered.json()).codeBlocks, codeBlocks);
  content = JSON.stringify({ answer: "代码。", codeBlocks, recommend: null }) + ', "recommend": "sorting"}';
  assert.equal((await ask()).status, 502);
});

test("tutor repairs GLM's swapped terminal code delimiters while preserving exact code", async (t) => {
  const codeBlocks = [{ language: "python", lines: ['for token in ["}", "]"]:', '    print(token, "ok")'] }];
  const valid = JSON.stringify({ answer: "保留两行代码。", codeBlocks });
  let content = "";
  let finishReason = "stop";
  t.mock.method(globalThis, "fetch", async () => Response.json({
    choices: [{ finish_reason: finishReason, message: { content } }],
    usage: { prompt_tokens: 14, completion_tokens: 5, total_tokens: 19 },
  }));
  const ask = () => tutorPOST(new Request("https://algoverse.test/api/ai/tutor", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer sk-tutor-delimiter-test", ...deepseek() },
    body: JSON.stringify({ question: "请重复上轮的两行。" }),
  }));

  for (const suffix of ["}]}]", "}]}]}"]) {
    content = valid.slice(0, -4) + suffix;
    const response = await ask();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).codeBlocks, codeBlocks);
  }

  content = valid.slice(0, -5) + "}]}]";
  assert.equal((await ask()).status, 502);
  content = '{"answer":"不完整的对象","unknown":[{"lines":["a","b"}]}]';
  assert.equal((await ask()).status, 502);
  content = valid.slice(0, -4) + "}]}]";
  finishReason = "length";
  assert.equal((await ask()).status, 502);
});

test("tutor preserves literal regex shorthands without rewriting ordinary JSON escapes", async (t) => {
  const line = String.raw`const matches = /\d+\s\w/.test("42 x");`;
  const answer = String.raw`\d 匹配数字。`;
  const valid = JSON.stringify({ answer, codeBlocks: [{ language: "javascript", lines: [line, "\tconsole.log(matches);"] }] });
  let content = valid.replaceAll(String.raw`\\d`, String.raw`\d`).replaceAll(String.raw`\\s`, String.raw`\s`);
  t.mock.method(globalThis, "fetch", async () => Response.json({
    choices: [{ finish_reason: "stop", message: { content } }],
    usage: { prompt_tokens: 14, completion_tokens: 5, total_tokens: 19 },
  }));
  const ask = () => tutorPOST(new Request("https://algoverse.test/api/ai/tutor", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer sk-tutor-regex-test", ...deepseek() },
    body: JSON.stringify({ question: "请给我 JavaScript 正则代码。" }),
  }));

  const recovered = await ask();
  assert.equal(recovered.status, 200);
  const result = await recovered.json();
  assert.equal(result.answer, answer);
  assert.deepEqual(result.codeBlocks[0].lines, [line, "\tconsole.log(matches);"]);

  content = valid.replace(String.raw`\\d`, String.raw`\u12`);
  assert.equal((await ask()).status, 502);
});

function pricePage({ paid, missing, conflict } = {}) {
  const ids = [primaryModel, backupModel];
  const chats = ids.map((id) => ({
    modelName: id, targetModelName: id, status: "normal", currency: "¥", inputPrice: "0", price: "0",
    pricing: [{ specification: "prompt", price: "0" }, { specification: "completion", price: "0" }],
  }));
  const pricingApiItems = ids.flatMap((id) => ["input-tokens", "output-tokens"].map((componentCode) => ({
    playgroundName: id, componentCode, realTimePriceCnyUnit: id === paid ? "0.01" : "0.000000",
  }))).filter(({ playgroundName, componentCode }) => playgroundName !== missing || componentCode !== "output-tokens");
  if (conflict) pricingApiItems.push({ playgroundName: conflict, componentCode: "output-tokens", realTimePriceCnyUnit: "1.00" });
  const row = JSON.stringify([["$", "$L11", null, { data: { chats, pricingApiItems } }]]);
  return `<script>self.__next_f.push(${JSON.stringify([1, "4:" + row + "\n"])})</script>`;
}

test("SiliconFlow prices must independently confirm zero input and output cost", () => {
  assert.ok(hasZeroSiliconFlowPrice(pricePage(), primaryModel));
  assert.ok(hasZeroSiliconFlowPrice(pricePage(), backupModel));
  assert.ok(!hasZeroSiliconFlowPrice(pricePage({ paid: backupModel }), backupModel));
  assert.ok(!hasZeroSiliconFlowPrice(pricePage({ missing: primaryModel }), primaryModel));
  assert.ok(!hasZeroSiliconFlowPrice(pricePage({ conflict: primaryModel }), primaryModel));
  assert.ok(!hasZeroSiliconFlowPrice("<p>免费</p>", primaryModel));
});

test("price verification retries transient failures and refuses newly confirmed nonzero prices", async (t) => {
  let responses = [];
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, pricingUrl);
    assert.equal(options.redirect, "manual");
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers.Authorization, undefined);
    const reply = responses.shift();
    if (reply instanceof Error) throw reply;
    return reply;
  });
  const signal = new AbortController().signal;

  responses = [new DOMException("timeout", "TimeoutError"), new Response(pricePage())];
  assert.deepEqual(await confirmZeroSiliconFlowPrice(backupModel, signal), { ok: true });
  assert.equal(fetch.mock.callCount(), 2);

  responses = [new Response(null, { status: 503 }), new Response(pricePage({ paid: backupModel }))];
  assert.deepEqual(await confirmZeroSiliconFlowPrice(backupModel, signal), { ok: false, reason: "unconfirmed" });
  assert.equal(fetch.mock.callCount(), 4);

  responses = [new Response(null, { status: 302, headers: { Location: "https://unexpected.example/" } })];
  assert.deepEqual(await confirmZeroSiliconFlowPrice(backupModel, signal), { ok: false, reason: "http", status: 302 });
  assert.equal(fetch.mock.callCount(), 5);

  responses = [new TypeError("fetch failed"), new TypeError("fetch failed")];
  assert.deepEqual(await confirmZeroSiliconFlowPrice(backupModel, signal), { ok: false, reason: "network" });
  assert.equal(fetch.mock.callCount(), 7);

  const aborted = new AbortController();
  fetch.mock.mockImplementation(async () => {
    aborted.abort();
    throw aborted.signal.reason;
  });
  await assert.rejects(confirmZeroSiliconFlowPrice(backupModel, aborted.signal), { name: "AbortError" });
  assert.equal(fetch.mock.callCount(), 8);
});

test("production quota counts attempts across visitors and resets at UTC midnight", () => {
  const origin = Date.UTC(2026, 10, 13);
  let state;
  for (let n = 0; n < platformQuota.totalPerDay; n++) {
    const decision = reservePlatformCall(state, String(n), origin + Math.floor(n / 20) * 60_000);
    assert.equal(decision.blocked, undefined);
    state = decision.state;
    if (n === 19) assert.equal(reservePlatformCall(state, "new", origin).blocked, "minute");
  }
  assert.equal(reservePlatformCall(state, "new", origin + 360_000).blocked, "daily");
  assert.equal(reservePlatformCall(state, "new", origin + 86_400_000).state.dailyCount, 1);
  state = undefined;
  for (let n = 0; n < platformQuota.visitorPerMinute; n++) state = reservePlatformCall(state, "same", origin).state;
  assert.equal(reservePlatformCall(state, "same", origin).blocked, "minute");
});

test("free connection tests check each selected model and reject injected selections and BYOK keys", async (t) => {
  setTestEnv(t, "SILICONFLOW_API_KEY", "sk-platform-test");
  const fetch = t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url === pricingUrl) {
      assert.ok(!init.headers.Authorization);
      return new Response(pricePage());
    }
    assert.equal(url, siliconFlowUrl);
    assert.equal(init.headers.Authorization, "Bearer sk-platform-test");
    const payload = JSON.parse(init.body);
    assert.equal(payload.max_tokens, 32);
    assert.deepEqual(payload.response_format, { type: "json_object" });
    return completion(undefined, payload.model);
  });
  for (const [choice, model] of [[undefined, primaryModel], ["backup", backupModel]]) {
    const response = await POST(request(platformHeaders(choice), ""));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).model, model);
  }
  const before = fetch.mock.callCount();
  assert.equal((await POST(request(platformHeaders("primary"), "sk-not-platform"))).status, 400);
  assert.equal((await POST(request(platformHeaders("Pro/model"), ""))).status, 400);
  assert.equal((await POST(request({ ...platformHeaders("primary"), "X-AI-Model": primaryModel }, ""))).status, 400);
  assert.equal(fetch.mock.callCount(), before);
});

test("platform requests fail closed without production quota or confirmed prices", async (t) => {
  setTestEnv(t, "SILICONFLOW_API_KEY", "sk-platform-test");
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(pricePage({ paid: primaryModel })));
  const response = await POST(request({ ...platformHeaders("primary"), "CF-Connecting-IP": "192.0.2.1" }, ""));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "unverified", message: "免费价格未确认。请联系管理员。" });
  assert.deepEqual(fetch.mock.calls.map(({ arguments: args }) => args[0]), [pricingUrl]);

  setTestEnv(t, "NODE_ENV", "production");
  setTestEnv(t, "PLATFORM_AI_QUOTA_URL", "");
  const unconfigured = await POST(request(platformHeaders("primary"), ""));
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).status, "unverified");
  assert.equal(fetch.mock.callCount(), 1);
});

test("the production quota gate is consulted before each attempted model", async (t) => {
  const quotaUrl = "https://quota.algoverse.test";
  setTestEnv(t, "NODE_ENV", "production");
  setTestEnv(t, "SILICONFLOW_API_KEY", "sk-platform-test");
  setTestEnv(t, "PLATFORM_AI_QUOTA_URL", quotaUrl);
  setTestEnv(t, "PLATFORM_AI_QUOTA_SECRET", "quota-test-secret");
  let quotaCalls = 0;
  const fetch = t.mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url) === quotaUrl + "/") {
      assert.equal(init.headers.Authorization, "Bearer quota-test-secret");
      assert.match(JSON.parse(init.body).visitor, /^[a-f0-9]{64}$/);
      quotaCalls += 1;
      return quotaCalls === 1 ? new Response(null, { status: 204 })
        : Response.json({ blocked: "daily", retryAfter: 60 }, { status: 429 });
    }
    if (url === pricingUrl) return new Response(pricePage());
    assert.equal(JSON.parse(init.body).model, primaryModel);
    return new Response(null, { status: 503 });
  });
  const credentials = readAICredentials(request(platformHeaders("primary"), ""));
  await assert.rejects(interpretCreatorRequest({ question: "比较排序。" }, null, credentials),
    { status: 429, retryAfter: 60, message: "今日免费额度已用完。" });
  assert.equal(quotaCalls, 2);
  assert.equal(fetch.mock.callCount(), 4);
});

test("backup tutor retries bad formats once with fresh quota and price, and never after a model mismatch", async (t) => {
  const quotaUrl = "https://quota.algoverse.test";
  setTestEnv(t, "NODE_ENV", "production");
  setTestEnv(t, "SILICONFLOW_API_KEY", "sk-platform-test");
  setTestEnv(t, "PLATFORM_AI_QUOTA_URL", quotaUrl);
  setTestEnv(t, "PLATFORM_AI_QUOTA_SECRET", "quota-test-secret");
  const calls = [];
  let replies = [];
  let prices = [];
  const previousLine = String.raw`const items = ["]", "}", /\d/];`;
  const history = [{ question: "先展示数组。", answer: "这是数组。", codeBlocks: [{ language: "javascript", lines: [previousLine] }] }];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url) === quotaUrl + "/") {
      calls.push("quota");
      return new Response(null, { status: 204 });
    }
    if (url === pricingUrl) {
      calls.push("price");
      return new Response(pricePage(prices.shift()));
    }
    assert.equal(url, siliconFlowUrl);
    const payload = JSON.parse(init.body);
    calls.push(`${payload.model}:${payload.temperature}`);
    const instructions = payload.messages[0].content;
    if (!instructions.includes("平台会")) assert.match(instructions, /逐字保留/);
    assert.deepEqual(JSON.parse(payload.messages[1].content).history, history);
    if (payload.temperature === 0) {
      assert.match(instructions, /第一行写单行 JSON|固定以「说明：」开头/);
      assert.equal(payload.response_format, undefined);
    } else {
      assert.deepEqual(payload.response_format, { type: "json_object" });
    }
    return replies.shift();
  });
  const ask = (question = "保留上轮代码，加一行打印。") => tutorPOST(new Request("https://algoverse.test/api/ai/tutor", {
    method: "POST", headers: { "Content-Type": "application/json", ...platformHeaders("backup") },
    body: JSON.stringify({ question, history }),
  }));
  const schedule = ["quota", "price", `${backupModel}:0.2`, "quota", "price"];
  const output = JSON.stringify({ answer: "打印。", codeBlocks: [{ language: "python", lines: ["print(1)"] }] });
  replies = [completion(output.slice(0, -4) + "}]}]}", backupModel)];
  assert.equal((await ask()).status, 200);
  assert.deepEqual(calls.splice(0), schedule.slice(0, 3));

  replies = [completion('{"answer":"代码。"} 多余内容', backupModel), completion(output, backupModel)];
  assert.equal((await ask()).status, 200);
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  const lines = [previousLine, '  console.log(items);  '];
  const fenced = ['{"answer":"打印。","citations":[]}', "```javascript", ...lines, "```"].join("\r\n");
  const regexAnswer = String.raw`用 \d 匹配数字。`;
  replies = [completion("bad json", backupModel), completion(fenced.replace("打印。", () => regexAnswer), backupModel)];
  const escapedHeader = await ask();
  assert.equal(escapedHeader.status, 200);
  assert.equal((await escapedHeader.json()).answer, regexAnswer);
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  replies = [completion('{"answer":"代码。","codeBlocks":[{"language":"javascript","lines":["const items = ["]", "}"];"]}]}', backupModel),
    completion(fenced, backupModel)];
  const recovered = await ask();
  assert.equal(recovered.status, 200);
  assert.deepEqual((await recovered.json()).codeBlocks, [{ language: "javascript", lines }]);
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  const reasoningOnly = await completion(null, backupModel).json();
  reasoningOnly.choices[0].message.reasoning_content = "内部推理示例";
  replies = [Response.json(reasoningOnly), completion(fenced, backupModel)];
  assert.equal((await ask()).status, 200);
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  replies = [completion("bad json", backupModel), Response.json(reasoningOnly)];
  const empty = await ask();
  assert.equal(empty.status, 502);
  assert.equal((await empty.json()).message, "AI 未返回正文，请重试。");
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  for (const invalid of [fenced.slice(0, -3), fenced + "\n多余内容", fenced.replace("[]", '["unknown-citation"]')]) {
    replies = [completion("bad json", backupModel), completion(invalid, backupModel)];
    assert.equal((await ask()).status, 502);
    assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);
  }

  const list = 'items = ["]", "}"]';
  const literal = `text = '"a", "]"'`;
  const escapedLiteral = String.raw`text = '\"a\"'`;
  const linesToCopy = [
    { line: list, question: `请用 Python 代码块原样展示这行：${list}，解释列表内容。`, layers: 1 },
    { line: literal, question: `请用 Python 代码块原样展示 ${literal} 这一行，并说明外层引号。`, layers: 2 },
    { line: escapedLiteral, question: `请用 Python 代码块逐字输出 ${escapedLiteral} 这一行。`, layers: 1 },
  ];
  const { question: literalQuestion } = linesToCopy[1];
  const explanation = '双引号只是字符串里的字符。';
  replies = [completion(JSON.stringify({ answer: explanation }), backupModel)];
  const quoted = await ask(literalQuestion);
  assert.equal(quoted.status, 200);
  assert.deepEqual(await quoted.json(), { status: "answer", answer: explanation,
    codeBlocks: [{ language: "python", lines: [literal] }], sources: [] });
  assert.deepEqual(calls.splice(0), schedule.slice(0, 3));

  replies = [completion("bad json", backupModel), completion("说明：" + explanation, backupModel)];
  const textOnly = await ask(literalQuestion);
  assert.equal(textOnly.status, 200);
  assert.deepEqual(await textOnly.json(), { status: "answer", answer: explanation,
    codeBlocks: [{ language: "python", lines: [literal] }], sources: [] });
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  replies = [completion(JSON.stringify({ answer: " ", codeBlocks: [{ language: "python", lines: [literal] }] }), backupModel),
    completion("bad json", backupModel)];
  assert.equal((await ask(literalQuestion)).status, 502);
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  const pythonNote = "外层引号包住字符串。";
  const pythonReply = (line) => ['{"answer":"原文如下。","citations":[]}', "", "```python", line, "```", "", pythonNote].join("\r\n");
  const escapeLine = (line) => JSON.stringify(line).slice(1, -1);
  for (const { line, question, layers } of linesToCopy) {
    const escaped = layers === 2 ? escapeLine(escapeLine(line)) : escapeLine(line);
    replies = [completion("bad json", backupModel), completion(pythonReply(escaped), backupModel)];
    const result = await ask(question);
    assert.equal(result.status, 200);
    const answer = await result.json();
    assert.deepEqual(answer.codeBlocks, [{ language: "python", lines: [line] }]);
    assert.equal(answer.answer, "原文如下。\n\n" + pythonNote);
    assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);
  }

  const listQuestion = linesToCopy[0].question;
  for (const [question, reply] of [
    [listQuestion, pythonReply(escapeLine(list.slice(0, -1)))],
    [listQuestion.replace("这行：", "这行： "), pythonReply(escapeLine(list))],
    [listQuestion, pythonReply(escapeLine(list)) + "\n```python\nitems = []\n```"],
    [listQuestion, pythonReply(escapeLine(list)).replace("[]", '["unknown-citation"]')],
    [`请解释 ${list}。`, pythonReply(escapeLine(list))],
  ]) {
    replies = [completion("bad json", backupModel), completion(reply, backupModel)];
    assert.equal((await ask(question)).status, 502);
    assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);
  }

  replies = [completion("bad json", backupModel), completion("bad json", backupModel)];
  assert.equal((await ask()).status, 502);
  assert.deepEqual(calls.splice(0), [...schedule, `${backupModel}:0`]);

  replies = [completion("bad json", backupModel)];
  prices = [{}, { paid: backupModel }];
  assert.equal((await ask()).status, 503);
  assert.deepEqual(calls.splice(0), schedule);

  replies = [completion(null, primaryModel)];
  assert.equal((await ask()).status, 503);
  assert.deepEqual(calls, schedule.slice(0, 3));
});

test("platform retries only the free backup on upstream failure and validates its experiment", async (t) => {
  setTestEnv(t, "SILICONFLOW_API_KEY", "sk-platform-test");
  const sent = [];
  let fail = 429;
  let backupFails = false;
  const plan = { intent: "create", engine: "sorting", version: 1, parameters: { goalLabel: "比较排序", values: [3, 1, 2] } };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url === pricingUrl) return new Response(pricePage());
    assert.equal(url, siliconFlowUrl);
    assert.equal(init.headers.Authorization, "Bearer sk-platform-test");
    const body = JSON.parse(init.body);
    sent.push(body.model);
    assert.equal(body.max_tokens, 1200);
    if (body.model === primaryModel) {
      if (fail === "timeout") throw new DOMException("Timeout", "TimeoutError");
      return new Response(null, { status: fail });
    }
    assert.equal(body.model, backupModel);
    assert.equal(body.thinking_budget, 1_024);
    return backupFails ? new Response(null, { status: 503 }) : completion(JSON.stringify(plan), backupModel);
  });
  const credentials = (ip) => readAICredentials(request({ ...platformHeaders("primary"), "CF-Connecting-IP": ip }, ""));
  const question = { question: "比较冒泡排序和快速排序。" };
  const run = () => interpretCreatorRequest(question, null, credentials("192.0.2.2"));
  for (const status of [429, 503, "timeout"]) {
    fail = status;
    const result = await run();
    assert.equal(result.model, backupModel);
    assert.deepEqual(result.result.config.values, [3, 1, 2]);
  }
  assert.deepEqual(sent, [primaryModel, backupModel, primaryModel, backupModel, primaryModel, backupModel]);
  await assert.rejects(run(), { status: 429, message: "免费请求过多。请稍后再试。" });
  backupFails = true;
  fail = 503;
  await assert.rejects(interpretCreatorRequest(question, null, credentials("192.0.2.3")), { status: 503, message: "两个免费模型暂不可用。" });
  fail = 401;
  const count = sent.length;
  await assert.rejects(interpretCreatorRequest(question, null, credentials("192.0.2.3")), { status: 503 });
  assert.deepEqual(sent.slice(count), [primaryModel]);
});

test("connection tests route each model and regional key to its official endpoint", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (_url, init) => completion(undefined, JSON.parse(init.body).model));
  const beijing = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  const singapore = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
  const deepseekEndpoint = "https://api.deepseek.com/chat/completions";
  const cases = [
    [deepseek(), deepseekEndpoint, { thinking: { type: "disabled" }, max_tokens: 32 }],
    [deepseek("deepseek-v4-pro"), deepseekEndpoint, { thinking: { type: "enabled" }, reasoning_effort: "low", max_tokens: 1056 }],
    [qwen("qwen3.8-flash", "cn-beijing"), beijing, { enable_thinking: false, max_tokens: 32 }],
    [qwen("qwen3.7-plus", "cn-beijing"), beijing, { enable_thinking: false, max_tokens: 32 }],
    [qwen("qwen3.8-max", "cn-beijing"), beijing, { enable_thinking: true, thinking_budget: 1024, max_tokens: 32 }],
    [qwen("qwen3-coder-flash", "cn-beijing"), beijing, { max_tokens: 32 }],
    [qwen("qwen3.8-flash", "ap-southeast-1"), singapore, { enable_thinking: false, max_tokens: 32 }],
    [qwen("qwen3.7-plus", "ap-southeast-1"), singapore, { enable_thinking: false, max_tokens: 32 }],
    [qwen("qwen3.8-max", "ap-southeast-1"), singapore, { enable_thinking: true, thinking_budget: 1024, max_tokens: 32 }],
    [qwen("qwen3-coder-flash", "ap-southeast-1"), singapore, { max_tokens: 32 }],
  ];

  for (const [index, [headers, endpoint, parameters]] of cases.entries()) {
    const model = headers["X-AI-Model"];
    const key = `sk-fixture-provider-${index}`;
    const selection = parseAISelection(headers["X-AI-Provider"], model, headers["X-AI-Region"]);
    assert.deepEqual(aiRequestHeaders(selection, key), { ...headers, Authorization: `Bearer ${key}` });
    const response = await POST(request(headers, key));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "connected", model, usage: { inputTokens: 14, outputTokens: 5, totalTokens: 19 } });
    assert.match(response.headers.get("cache-control"), /no-store/);
    const [url, init] = fetch.mock.calls[index].arguments;
    assert.equal(url, endpoint);
    assert.equal(init.headers.Authorization, `Bearer ${key}`);
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.ok(!init.body.includes(key));
    const { messages, response_format, model: sentModel, ...sentParameters } = JSON.parse(init.body);
    assert.equal(sentModel, model);
    assert.deepEqual(response_format, model === "qwen3-coder-flash" ? undefined : { type: "json_object" });
    assert.match(messages[0].content, /JSON/);
    assert.deepEqual(sentParameters, parameters);
  }
});

test("the public catalog is stable, region-scoped and uses the actual model IDs", () => {
  assert.deepEqual(aiProviders.deepseek.models.map(({ apiId }) => apiId), ["deepseek-flash", "deepseek-v4-pro"]);
  for (const { id } of qwenRegions) {
    assert.deepEqual(availableAIModels("qwen", id).map(({ apiId }) => apiId),
      ["qwen3.8-flash", "qwen3.7-plus", "qwen3.8-max", "qwen3-coder-flash"]);
  }
  assert.deepEqual(availableAIModels("qwen", "us-east-1"), []);
});

test("invalid, mixed, and missing credentials never reach a provider", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => completion());
  for (const headers of [
    qwen("qwen3.7-plus", "https://untrusted.test"),
    qwen("qwen3.7-plus", ""),
    qwen("deepseek-flash", "cn-beijing"),
    { ...qwen("qwen3.8-max", "cn-beijing"), "X-AI-Mode": "chat" },
    { ...qwen("qwen3.8-max", "cn-beijing"), "X-AI-Provider": "deepseek" },
    qwen("qwen-plus", "cn-beijing"), qwen("qwen-max", "cn-beijing"), qwen("qwen4-max-preview", "ap-southeast-1"),
    deepseek("deepseek-chat"), deepseek("deepseek-reasoner"), { "X-AI-Mode": "reasoning" }, {},
  ]) {
    const response = await POST(request(headers));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, modelSelectionMessage);
  }
  assert.equal((await POST(request(qwen("qwen3.8-max", "cn-beijing"), ""))).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});

test("Qwen failures and malformed completions never show connected or echo provider errors", async (t) => {
  isolatePersonalLimits(t);
  const fetch = t.mock.method(globalThis, "fetch", async () => completion());
  const cases = [
    [(key) => Response.json({ error: { code: "invalid_api_key", message: key } }, { status: 401 }), 401, /地域/],
    [(key) => Response.json({ error: { code: "Arrearage", message: key } }, { status: 403 }), 402, /余额不足/],
    [() => Response.json({ error: { code: "ModelNotFound" } }, { status: 400 }), 404, /所选模型不可用/],
    [() => Response.json({ error: { code: "insufficient_quota" } }, { status: 429 }), 429, /额度不足/],
    [() => completion('{"ok":false}', "qwen3.7-plus"), 502, /格式有误/],
    [() => completion(undefined, "qwen3.8-flash"), 502, /未确认所选模型/],
    [() => completion(), 502, /未确认所选模型/],
    [() => Response.json({ choices: [] }), 502, /格式有误/],
  ];
  for (const [index, [reply, status, message]] of cases.entries()) {
    const key = `sk-fixture-private-${index}`;
    fetch.mock.mockImplementation(async () => reply(key));
    const response = await POST(request(qwen("qwen3.7-plus", "cn-beijing"), key));
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.status, "error");
    assert.match(body.message, message);
    assert.ok(!JSON.stringify(body).includes(key));
  }
  assert.equal(fetch.mock.callCount(), cases.length);
});

test("connection tests reject custom URLs without reaching a provider", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => completion());
  const headers = { ...deepseek(), Authorization: "Bearer sk-fixture", "Content-Type": "application/json" };
  const url = "https://algoverse.test/api/ai/connection";
  const target = "http://169.254.169.254/latest/meta-data";
  const attempts = [
    new Request(url, { method: "POST", headers, body: JSON.stringify({ baseUrl: target }) }),
    new Request(url, { method: "POST", headers: { ...headers, "X-AI-Base-URL": target }, body: "{}" }),
    new Request(url + "?base_url=" + encodeURIComponent(target), { method: "POST", headers, body: "{}" }),
    new Request(url, { method: "POST", headers, body: " ".repeat(600) + "{}" }),
  ];
  for (const attempt of attempts) {
    const response = await POST(attempt);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { status: "unverified", message: "请使用预设服务地址。" });
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("connection tests report provider outages and enforce the existing per-key limit", async (t) => {
  isolatePersonalLimits(t);
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ error: "private upstream details" }, { status: 503 }));
  const key = "sk-connection-limit-fixture";
  for (let count = 0; count < 6; count++) {
    const response = await POST(request(deepseek(), key));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "error", message: "AI 服务正忙。请稍后重试。" });
  }
  const limited = await POST(request(deepseek(), key));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(fetch.mock.callCount(), 6);
});

test("timeouts use the same safe response for both providers", async (t) => {
  const timeout = t.mock.method(AbortSignal, "timeout", () => AbortSignal.abort());
  t.mock.method(globalThis, "fetch", async (_url, { signal }) => signal.throwIfAborted());
  for (const headers of [qwen("qwen3.8-max", "cn-beijing"), deepseek()]) {
    const response = await POST(request(headers));
    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), { status: "error", message: "AI 响应超时，请重试。" });
  }
  assert.equal(timeout.mock.callCount(), 2);
  assert.deepEqual(timeout.mock.calls.map(({ arguments: args }) => args[0]), [55_000, 25_000]);
});

test("workbench with a personal key retries empty output once and keeps authorization errors separate", async (t) => {
  const credentials = readAICredentials(request(deepseek(), "sk-agent-format-personal"));
  const options = {
    operation: "experiment_agent", instructions: "返回 JSON 对象。", input: {}, maxTokens: 100,
    validate: (value) => value?.action === "answer" ? value : null,
  };
  let attempts = 0;
  const upstream = t.mock.method(globalThis, "fetch", async (_url, init) => {
    if (++attempts === 1) return completion(null);
    assert.match(JSON.parse(init.body).messages[0].content, /请重新作答/);
    return completion('{"action":"answer","observation":"可以。"}');
  });
  const repaired = await requestAIJson(credentials, options);
  assert.equal(repaired.result.observation, "可以。");
  assert.equal(upstream.mock.callCount(), 2);
  upstream.mock.mockImplementation(async () => new Response(null, { status: 401 }));
  await assert.rejects(() => requestAIJson(credentials, options), { status: 401 });
  assert.equal(upstream.mock.callCount(), 3);
});

test("pending generation is shared only by the same selection and key", async () => {
  const first = readAICredentials(request(deepseek(), "sk-first"));
  const otherKey = readAICredentials(request(deepseek(), "sk-second"));
  const otherModel = readAICredentials(request(deepseek("deepseek-v4-pro"), "sk-first"));
  const otherProvider = readAICredentials(request(qwen("qwen3.7-plus", "cn-beijing"), "sk-first"));
  const pending = new Map();
  const { promise, resolve } = Promise.withResolvers();
  const begin = () => promise;
  const task = reusePendingAI(pending, "run", first, begin);
  assert.equal(reusePendingAI(pending, "run", first, begin), task);
  assert.throws(() => reusePendingAI(pending, "run", otherKey, begin), { status: 409 });
  assert.throws(() => reusePendingAI(pending, "run", otherModel, begin), { status: 409 });
  assert.throws(() => reusePendingAI(pending, "run", otherProvider, begin), { status: 409 });
  resolve();
  await task;
  assert.equal(pending.size, 0);
});

test("creator passes model answers through and builds only validated engine configurations", async (t) => {
  let decision = { intent: "knowledge", answer: "你好，很高兴见到你。" };
  const fetch = t.mock.method(globalThis, "fetch", async () => completion(JSON.stringify(decision)));
  const credentials = readAICredentials(request(qwen("qwen3.7-plus", "cn-beijing")));
  const question = { question: "你今天好吗？", history: [{ question: "你好", answer: "你好。" }] };
  assert.deepEqual((await interpretCreatorRequest(question, null, credentials)).result, decision);
  const upstream = JSON.parse(fetch.mock.calls[0].arguments[1].body);
  const input = JSON.parse(upstream.messages[1].content);
  assert.deepEqual(input.capabilities.map(({ id }) => id), registeredEngines.map(({ id }) => id));
  assert.equal(new Set(input.capabilities.map((engine) => engine.domain)).size, 6);
  assert.deepEqual(input.conversation, question.history);
  assert.equal(input.currentExperiment, null);
  assert.equal(upstream.model, "qwen3.7-plus");

  decision = { intent: "create", engine: "pathfinding", version: 1, parameters: { goalLabel: "比较路径", map: { kind: "custom", start: 0, goal: 44, walls: [10] } } };
  const { result } = await interpretCreatorRequest(question, null, credentials);
  assert.deepEqual(result.config.walls, [10]);
  assert.deepEqual(result.config.algorithms, ["dijkstra", "astar"]);

  const pageInput = { intent: "create", engine: "page-replacement", version: 1, parameters: { goalLabel: "比较缺页", frameCount: 3, references: [0, 1, 0] } };
  decision = pageInput;
  const planned = (await interpretCreatorRequest({ question: "比较页面置换" }, null, credentials)).result;
  assert.deepEqual(planned.config, pageInput.parameters);
  assert.deepEqual(getExperimentEngine(planned.engineId, planned.version).execute(planned.config).policies.map(({ faults }) => faults), [2, 2, 2]);

  const invalid = [
    { ...pageInput, engine: "database-index" },
    { ...pageInput, version: 9 },
    { ...pageInput, code: "alert(1)" },
    { ...pageInput, intent: "modify" },
    { ...pageInput, parameters: { ...pageInput.parameters, frameCount: 0 } },
    { intent: "create", engine: "pathfinding", version: 1, parameters: { goalLabel: "比较路径", map: { kind: "custom", start: 0, goal: 44, walls: [1, 9, 10] } } },
  ];
  for (const [index, output] of invalid.entries()) {
    decision = output;
    const attempt = { ...credentials, apiKey: `sk-invalid-config-${index}` };
    await assert.rejects(interpretCreatorRequest(question, null, attempt), { status: 502 });
  }
});

test("the coding model uses text output and accepts only a validated JSON experiment", async (t) => {
  const plan = { intent: "create", engine: "sorting", version: 1, parameters: { goalLabel: "比较排序", values: [3, 1, 2] } };
  let body = ["```json", JSON.stringify(plan), "```"].join("\n");
  const fetch = t.mock.method(globalThis, "fetch", async () => completion(body));
  const credentials = readAICredentials(request(qwen("qwen3-coder-flash", "ap-southeast-1"), "sk-coder-config"));
  const question = { question: "比较冒泡排序和快速排序。" };
  const { result } = await interpretCreatorRequest(question, null, credentials);
  assert.equal(result.engineId, "sorting");
  assert.deepEqual(result.config.values, [3, 1, 2]);
  const payload = JSON.parse(fetch.mock.calls[0].arguments[1].body);
  assert.equal(payload.model, "qwen3-coder-flash");
  assert.equal(payload.response_format, undefined);
  assert.equal(payload.enable_thinking, undefined);
  for (const invalid of [
    "结果如下：" + JSON.stringify(plan),
    JSON.stringify({ ...plan, parameters: { ...plan.parameters, values: [1.2, 3] } }),
    JSON.stringify({ ...plan, code: "alert(1)" }),
  ]) {
    body = invalid;
    await assert.rejects(interpretCreatorRequest(question, null, credentials), { status: 502 });
  }
  assert.equal(fetch.mock.callCount(), 4);
});

test("registered engines compute sorting, preemption and reproducible packet loss", () => {
  const sorting = getExperimentEngine("sorting", 1);
  const sorted = sorting.execute({ goalLabel: "Compare", values: [7, -2, 7, 0, -9] });
  assert.deepEqual(sorted.bubble.sorted, [-9, -2, 0, 7, 7]);
  assert.deepEqual(sorted.quick.sorted, sorted.bubble.sorted);
  assert.ok(sorted.bubble.comparisons > 0 && sorted.quick.swaps > 0);
  assert.equal(sorting.execute({ goalLabel: "Compare", values: [1, 2.5] }), null);

  const scheduling = getExperimentEngine("cpu-scheduling", 1);
  const processes = [{ arrival: 0, burst: 4 }, { arrival: 1, burst: 2 }, { arrival: 8, burst: 1 }];
  const rr = scheduling.execute({ goalLabel: "Observe", policy: "rr", quantum: 2, processes });
  const fcfs = scheduling.execute({ goalLabel: "Observe", policy: "fcfs", quantum: 2, processes });
  assert.deepEqual(rr.timeline, [
    { process: 0, start: 0, end: 2 }, { process: 1, start: 2, end: 4 }, { process: 0, start: 4, end: 6 },
    { process: null, start: 6, end: 8 }, { process: 2, start: 8, end: 9 },
  ]);
  assert.deepEqual(rr.processes.map((process) => process.waiting), [2, 1, 0]);
  assert.equal(rr.switches, 2);
  assert.equal(fcfs.timeline[0].end, 4);
  assert.equal(scheduling.execute({ goalLabel: "Observe", policy: "rr", quantum: 0, processes }), null);

  const network = getExperimentEngine("network-transmission", 1);
  const config = network.configure({ goalLabel: "Observe", packets: 3,
    links: { AB: { delay: 10, loss: 0 }, BD: { delay: 10, loss: 0 }, AC: { delay: 3, loss: 0 }, CD: { delay: 4, loss: 100 } } }, 2);
  const blocked = network.execute(config);
  assert.deepEqual(blocked.route, ["AC", "CD"]);
  assert.equal(blocked.delivered, 0);
  assert.equal(blocked.dropped, 3);
  assert.equal(blocked.averageLatency, null);
  const open = { ...config, links: { ...config.links, CD: { delay: 4, loss: 0 } } };
  assert.equal(network.execute(open).averageLatency, 7);
  const stochastic = { ...config, links: { ...config.links, CD: { delay: 4, loss: 45 } } };
  assert.deepEqual(network.execute(stochastic), network.execute(stochastic));
  assert.equal(network.execute({ ...config, seed: -1 }), null);
});
