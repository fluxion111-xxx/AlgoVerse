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
const { runCreatorExperiment } = await import("../src/app/experiments/actions.ts");
const { getExperimentSession, getExperimentWorkflow, getExperimentRun, runExperimentSession } = await import("../src/lib/server/experimentRecords.ts");
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

test("real engines run the validated sorting, round-robin and pathfinding plans only after confirmation", async (t) => {
  const examples = [
    ["比较冒泡排序和快速排序。", { intent: "compare", engine: "sorting", version: 1,
      parameters: { goalLabel: "比较交换次数", values: [7, 2, 9, 4, 3] } }],
    ["模拟 CPU 时间片轮转调度。", { intent: "create", engine: "cpu-scheduling", version: 1,
      parameters: { goalLabel: "观察抢占", policy: "rr", quantum: 2, processes: [{ arrival: 0, burst: 5 }, { arrival: 1, burst: 3 }] } }],
    ["比较 Dijkstra 与 A*。", { intent: "compare", engine: "pathfinding", version: 1,
      parameters: { goalLabel: "对比访问节点", map: { kind: "random", difficulty: "normal" } } }],
  ];
  let index = 0;
  const { ask } = await setup(t, ({ question, capabilities }) => {
    assert.equal(question, examples[index][0]);
    assert.equal(capabilities.length, 18);
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
  const [sorting, scheduling, pathfinding] = runs.map(({ results }) => results);
  assert.deepEqual(sorting.bubble.sorted, [2, 3, 4, 7, 9]);
  assert.deepEqual(sorting.quick.sorted, sorting.bubble.sorted);
  assert.deepEqual(scheduling.timeline[0], { process: 0, start: 0, end: 2 });
  assert.equal(scheduling.switches, 4);
  assert.equal(pathfinding.dijkstra.pathLength, pathfinding.astar.pathLength);
  assert.ok(pathfinding.astar.visited.length > 0 && pathfinding.dijkstra.visited.length > 0);
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
