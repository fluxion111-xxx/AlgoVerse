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

test("real engines run validated plans only after confirmation, including a new join lab", async (t) => {
  const examples = [
    ["比较冒泡排序和快速排序。", { intent: "compare", engine: "sorting", version: 1,
      parameters: { goalLabel: "比较交换次数", values: [7, 2, 9, 4, 3] } }],
    ["模拟 CPU 时间片轮转调度。", { intent: "create", engine: "cpu-scheduling", version: 1,
      parameters: { goalLabel: "观察抢占", policy: "rr", quantum: 2, processes: [{ arrival: 0, burst: 5 }, { arrival: 1, burst: 3 }] } }],
    ["比较 Dijkstra 与 A*。", { intent: "compare", engine: "pathfinding", version: 1,
      parameters: { goalLabel: "对比访问节点", map: { kind: "random", difficulty: "normal" } } }],
    ["比较哈希连接与嵌套循环。", { intent: "compare", engine: "join-strategies", version: 1,
      parameters: { goalLabel: "比较连接候选数", leftRows: [2, 2], rightRows: [2, 2, 3] } }],
  ];
  let index = 0;
  const { ask } = await setup(t, ({ question, capabilities }) => {
    assert.equal(question, examples[index][0]);
    assert.equal(capabilities.length, 30);
    const join = capabilities.find(({ id }) => id === "join-strategies");
    assert.deepEqual(Object.keys(join.parameters), ["goalLabel", "leftRows", "rightRows"]);
    assert.match(join.comparison, /哈希分组/);
    const pathfinding = capabilities.find(({ id }) => id === "pathfinding");
    assert.deepEqual(Object.keys(pathfinding.parameters), ["goalLabel", "map"]);
    assert.match(pathfinding.description, /地图必须可达/);
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
  const [sorting, scheduling, pathfinding, join] = runs.map(({ results }) => results);
  assert.deepEqual(sorting.bubble.sorted, [2, 3, 4, 7, 9]);
  assert.deepEqual(sorting.quick.sorted, sorting.bubble.sorted);
  assert.deepEqual(scheduling.timeline[0], { process: 0, start: 0, end: 2 });
  assert.equal(scheduling.switches, 4);
  assert.equal(pathfinding.dijkstra.pathLength, pathfinding.astar.pathLength);
  assert.ok(pathfinding.astar.visited.length > 0 && pathfinding.dijkstra.visited.length > 0);
  assert.deepEqual(join.metrics, { joinMatches: "4", nestedCandidates: "6", hashCandidates: "4", hashBuildRows: "3", hashLookupCount: "2" });
});

test("all twelve new labs run and retest from their learning-path entries", async (t) => {
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
      assert.equal(getExperimentTopic(topic, lab.id).domain.id, lab.domain);
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
    });
  }
  assert.deepEqual(Object.values(counts), [2, 2, 2, 2, 2, 2]);
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
