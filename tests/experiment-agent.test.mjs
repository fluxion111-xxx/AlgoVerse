import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const scope = Symbol.for("algoverse.test.agentCookies");
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export {}" };
    if (specifier === "next/headers") return { shortCircuit: true,
      url: "data:text/javascript,export const cookies = () => globalThis[Symbol.for('algoverse.test.agentCookies')]" };
    if (specifier.startsWith("@/")) return next(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if (specifier.startsWith("./") && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.includes("/src/")) {
      return next(new URL(`${specifier}.ts`, context.parentURL).href, context);
    }
    return next(specifier, context);
  },
});
const { POST } = await import("../src/app/api/experiments/agent/route.ts");
const { agentTools, prepareToolCall } = await import("../src/lib/server/agentTools.ts");
const { getExperimentRun, getExperimentSession, runConfirmedAgentCall, getAgentTask } = await import("../src/lib/server/experimentRecords.ts");
const { registeredEngines } = await import("../src/lib/experimentEngines.ts");
const { experimentEvidence } = await import("../src/lib/experiments/evidence.ts");
const { schedulingWaitReport } = await import("../src/lib/experimentAgent.ts");
hooks.deregister();

const model = "Qwen/Qwen3.5-4B";
const key = "sk-agent-fixture-secret-key";
const tool = "cpu-scheduling";
const processes = [{ arrival: 0, burst: 6 }, { arrival: 1, burst: 4 }, { arrival: 2, burst: 3 }];
const call = (policy, quantum) => ({ tool, parameters: { goalLabel: "比较等待时间", policy, quantum, processes } });
const compare = { from: 1, to: 2, metric: "waiting" };
const first = { action: "run", plan: ["跑两组基线", "试新时间片"], observation: "固定进程输入。", evidence: [], calls: [call("fcfs", 2), call("rr", 2)] };

function pricingPage() {
  const chats = [{ modelName: model, targetModelName: model, status: "normal", currency: "¥", inputPrice: 0, price: 0,
    pricing: [{ specification: "prompt", price: 0 }, { specification: "completion", price: 0 }] }];
  const pricingApiItems = ["input-tokens", "output-tokens"].map((componentCode) => ({
    playgroundName: model, componentCode, realTimePriceCnyUnit: 0,
  }));
  return `<script>self.__next_f.push(${JSON.stringify([1, "4:" + JSON.stringify([["$", "$L", null, { data: { chats, pricingApiItems } }]]) + "\n"])})</script>`;
}

async function setup(t, ip, respond) {
  const previousQuota = globalThis.algoVersePlatformQuota;
  delete globalThis.algoVersePlatformQuota;
  t.after(() => { globalThis.algoVersePlatformQuota = previousQuota; });
  const values = new Map();
  globalThis[scope] = { get: (name) => values.get(name), set: (name, value) => values.set(name, { value }) };
  const dir = await mkdtemp(join(tmpdir(), "algoverse-agent-test-"));
  const environment = { ALGOVERSE_DATA_DIR: dir, SILICONFLOW_API_KEY: key, NODE_ENV: "test" };
  for (const [name, value] of Object.entries(environment)) {
    const previous = process.env[name];
    t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
    process.env[name] = value;
  }
  t.after(async () => { delete globalThis[scope]; await rm(dir, { recursive: true, force: true }); });
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url === "https://www.siliconflow.cn/pricing") return new Response(pricingPage());
    assert.ok(["https://api.siliconflow.cn/v1/chat/completions", "https://api.deepseek.com/chat/completions"].includes(url));
    assert.equal(init.headers.Authorization, `Bearer ${key}`);
    assert.ok(!init.body.includes(key));
    const upstream = JSON.parse(init.body);
    assert.equal(upstream.model, url.includes("deepseek") ? "deepseek-flash" : model);
    const input = JSON.parse(upstream.messages[1].content);
    assert.equal(upstream.max_tokens, Object.hasOwn(input, "message") ? 1200 : 1000);
    const output = await respond(input);
    if (output instanceof Response) return output;
    return Response.json({ model, choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }],
      usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } });
  });
  async function post(action, task, extra = {}, headers = {}) {
    const response = await POST(new Request("https://algoverse.test/api/experiments/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AI-Provider": "siliconflow", "CF-Connecting-IP": ip, ...headers },
      body: JSON.stringify({ action, id: task?.id, revision: task?.revision, ...extra }),
    }));
    const payload = await response.json();
    assert.ok(!JSON.stringify(payload).includes(key));
    return { ...payload, http: response.status };
  }
  return { post, values };
}

test("all 18 advertised tools execute their real engine and expose verified metrics", () => {
  assert.equal(agentTools.length, 18);
  for (const engine of registeredEngines) {
    const tool = agentTools.find((entry) => entry.tool === engine.id);
    const config = engine.preset(1234);
    assert.ok(tool.inputSchema && tool.outputSchema && engine.validate(config), engine.id);
    assert.ok(Object.keys(experimentEvidence(engine.execute(config))).length > 0, engine.id);
  }
  assert.equal(prepareToolCall({ ...call("rr", 2), tool: "shell" }, 1234), null);
  assert.equal(prepareToolCall(call("rr", 0), 1234), null);
  assert.equal(prepareToolCall({ ...call("rr", 2), code: "throw 1" }, 1234), null);
});

test("FCFS and RR run only after approval, then adaptive RR uses real observations and saves an evidence report", async (t) => {
  const { post, values } = await setup(t, "192.0.2.10", ({ runs, tools }) => {
    assert.equal(tools.length, 18);
    if (!runs.length) return first;
    if (runs.length === 2) {
      assert.deepEqual(runs.map(({ metrics }) => metrics.waiting), ["4.33", "6.00"]);
      return { action: "run", observation: "轮转等待较高。试加长时间片。", evidence: [compare], calls: [call("rr", 4)] };
    }
    assert.equal(runs[2].metrics.waiting, "5.33");
    return { action: "finish", evidence: [compare, { ...compare, from: 2, to: 3 }] };
  });
  const draft = (await post("start", null, { goal: "比较 FCFS 和 RR 调度算法，分析平均等待时间，并尝试优化时间片。" })).task;
  assert.equal((await post("approve", draft)).http, 409);
  const proposed = (await post("decide", draft)).task;
  assert.equal(proposed.phase, "confirm");
  assert.equal(await runConfirmedAgentCall(proposed, proposed.pending[0].id), null);
  for (const pending of proposed.pending) assert.equal(await getExperimentSession(pending.sessionId), null);
  const approvals = await Promise.all([post("approve", proposed), post("approve", proposed)]);
  assert.deepEqual(approvals.map(({ http }) => http).sort(), [200, 409]);
  const observed = approvals.find(({ http }) => http === 200).task;
  const next = (await post("decide", observed)).task;
  assert.equal(next.phase, "confirm");
  assert.deepEqual(next.pending[0].config.processes, processes);
  assert.equal(await getExperimentRun(next.pending[0].id), null);
  const trial = (await post("approve", next)).task;
  const report = (await post("decide", trial)).task;
  assert.equal(report.phase, "finished");
  assert.equal(report.requests, 3);
  assert.equal(report.runs.length, 3);
  assert.equal(report.decisions.at(-1).observation, "");
  assert.equal(schedulingWaitReport(report.runs).bestWait, 5.33);
  assert.equal(schedulingWaitReport(report.runs).bestTrials[0].config.quantum, 4);
  for (const run of report.runs) assert.ok((await getExperimentRun(run.id)).results.timeline.length);
  assert.deepEqual((await getAgentTask(report.id)).decisions.at(-1).evidence, [compare, { ...compare, from: 2, to: 3 }]);
  values.clear();
  assert.equal((await post("status", report)).http, 404);
});

test("failed calls, clarification, stale approvals and cancellation cannot create runs", async (t) => {
  let output = new Response(null, { status: 503 });
  const { post } = await setup(t, "192.0.2.11", () => output);
  assert.equal((await post("start", null, { goal: "测试" }, { Origin: "https://other.test" })).http, 403);
  assert.equal((await post("start", null, { goal: key })).http, 400);
  let task = (await post("start", null, { goal: "做个实验" }, {
    Origin: "https://lab.algoverse.test", Host: "lab.algoverse.test",
  })).task;
  task = (await post("decide", task)).task;
  assert.equal(task.phase, "ai-error");
  output = { action: "clarify", observation: "想观察哪个现象？" };
  task = (await post("decide", task)).task;
  task = (await post("clarify", task, { answer: "比较 CPU 调度。" })).task;
  output = { ...first, calls: [{ ...call("rr", 2), tool: "shell" }] };
  task = (await post("decide", task)).task;
  assert.equal(task.phase, "ai-error");
  output = first;
  task = (await post("decide", task)).task;
  const cancelled = (await post("cancel", task)).task;
  assert.equal(cancelled.phase, "cancelled");
  assert.equal((await post("approve", task)).http, 409);
  assert.equal(await getExperimentRun(task.pending[0].id), null);
});

test("unusable model responses consume the task budget and never fall back to a second model", async (t) => {
  let requests = 0;
  const { post } = await setup(t, "192.0.2.12", () => {
    requests++;
    return { action: "finish", observation: "这个结果没有运行记录。", evidence: [compare] };
  });
  let task = (await post("start", null, { goal: "分析结果" })).task;
  for (let index = 0; index < 6; index++) {
    task = (await post("decide", task)).task;
    assert.equal(task.phase, "ai-error");
  }
  task = (await post("decide", task)).task;
  assert.equal(task.phase, "limit");
  assert.equal(requests, 6);
  assert.deepEqual(task.runs, []);
});

test("cancelling during model analysis prevents the late decision from publishing", async (t) => {
  const entered = Promise.withResolvers();
  const result = Promise.withResolvers();
  const { post } = await setup(t, "192.0.2.13", () => {
    entered.resolve();
    return result.promise;
  });
  const draft = (await post("start", null, { goal: "比较调度策略" })).task;
  const deciding = post("decide", draft);
  await entered.promise;
  const cancelled = (await post("cancel", draft)).task;
  result.resolve(first);
  assert.equal((await deciding).http, 409);
  assert.equal(cancelled.phase, "cancelled");
  assert.deepEqual((await getAgentTask(draft.id)).pending, []);
});

test("one dialogue routes chat, writing, knowledge, clarification and external requests through the configured model", async (t) => {
  const messages = ["今天想放松一下。", "写一段雨后街角的开头。", "环形队列为什么需要取模？", "帮我弄一下这个。", "我是说，把上一段改得轻快些。", "替我发送邮件。"];
  const responses = [
    { action: "answer", observation: "去窗边坐一会儿，给自己倒杯水。" },
    { action: "answer", observation: "雨歇了。\n街角的招牌在水里亮了一下。" },
    { action: "answer", observation: "取模会让下标绕回起点。" },
    { action: "clarify", observation: "你想改哪一段？" },
    { action: "answer", observation: "雨一停，街灯就踩着水花亮起来。" },
    { action: "unsupported", observation: "我可以起草邮件。这里没有发送工具。" },
  ];
  let index = 0;
  const { post } = await setup(t, "192.0.2.14", (input) => {
    assert.equal(input.message, messages[index]);
    assert.deepEqual(input.conversation.map(({ message, reply }) => [message, reply]), messages.slice(0, index).map((message, offset) => [message, responses[offset].observation]));
    return responses[index++];
  });
  const headers = { "X-AI-Provider": "deepseek", "X-AI-Model": "deepseek-flash", Authorization: `Bearer ${key}` };
  let task = (await post("start", null, { goal: messages[0] }, headers)).task;
  for (const message of messages) {
    task = (await post("message", task, { message }, headers)).task;
    assert.equal(task.dialogue.turns.at(-1).reply, responses[index - 1].observation);
    assert.equal(task.dialogue.turns.at(-1).action, responses[index - 1].action);
    assert.equal(task.requests, 0);
    assert.deepEqual(task.pending, []);
    assert.deepEqual(task.runs, []);
  }
  assert.equal((await post("status", task)).task.dialogue.turns.length, 6);
  assert.equal((await post("approve", task)).http, 409);
});

test("experiment follow-ups share the authorized history, revise a pending proposal and explain real Run evidence", async (t) => {
  const calls = [
    (input) => { assert.equal(input.message, "帮我研究 CPU 调度。"); return first; },
    (input) => {
      assert.equal(input.pendingTools.length, 2);
      assert.equal(input.conversation[0].message, "帮我研究 CPU 调度。");
      return { action: "run", observation: "用原来的进程跑轮转。", calls: [call("rr", 2)] };
    },
    (input) => {
      assert.equal(input.runs[0].metrics.waiting, "6.00");
      assert.equal(input.runs[0].config.policy, "rr");
      assert.ok(input.evidenceOptions.includes("r1-r1-waiting"));
      assert.equal(input.runDetails[0].switchingConsumesTime, false);
      return { action: "explain", observation: "误把切换次数算成耗时。", evidence: ["r1-r1-waiting"] };
    },
    (input) => {
      assert.equal(input.conversation.at(-1).action, "explain");
      assert.equal(input.runs[0].config.quantum, 2);
      return { action: "run", observation: "沿用进程，把时间片调大。", calls: [call("rr", 4)] };
    },
  ];
  const { post } = await setup(t, "192.0.2.15", (input) => calls.shift()(input));
  const goal = "帮我研究 CPU 调度。";
  let task = (await post("start", null, { goal })).task;
  task = (await post("message", task, { message: goal })).task;
  const original = task;
  task = (await post("message", task, { message: "换成时间片轮转。" })).task;
  assert.equal(task.pending.length, 1);
  assert.equal(task.pending[0].config.policy, "rr");
  assert.equal((await post("approve", original)).http, 409);
  assert.equal(await getExperimentRun(task.pending[0].id), null);
  task = (await post("approve", task)).task;
  task = (await post("message", task, { message: "为什么等待时间变长了？" })).task;
  assert.equal(task.dialogue.turns.at(-1).action, "explain");
  assert.equal(task.dialogue.turns.at(-1).reply, "");
  assert.deepEqual(task.dialogue.turns.at(-1).scheduling[0].processes.map(({ after }) => after), [7, 5, 6]);
  assert.equal(task.runs.length, 1);
  task = (await post("message", task, { message: "那试试更大的时间片。" })).task;
  assert.equal(task.phase, "confirm");
  assert.deepEqual(task.pending[0].config.processes, processes);
  assert.equal(task.pending[0].config.quantum, 4);
  assert.equal(await getExperimentRun(task.pending[0].id), null);
  assert.ok(await getExperimentRun(task.runs[0].id));
  const imported = (await post("start", null, { goal: "解释这轮", sessionId: task.runs[0].sessionId, runId: task.runs[0].id })).task;
  assert.equal(imported.runs[0].id, task.runs[0].id);
  assert.equal((await post("start", null, { goal: "假冒", sessionId: imported.id, runId: task.runs[0].id })).http, 404);
});

test("failed dialogue requests preserve history and cannot smuggle tool calls through a text answer", async (t) => {
  let output = { action: "answer", observation: "早上好。" };
  const { post } = await setup(t, "192.0.2.16", () => output);
  let task = (await post("start", null, { goal: "你好" })).task;
  task = (await post("message", task, { message: "你好" })).task;
  output = new Response(null, { status: 503 });
  task = (await post("message", task, { message: "换个说法。" })).task;
  assert.equal(task.dialogue.pending, "换个说法。");
  assert.ok(task.dialogue.error);
  assert.equal(task.dialogue.turns.length, 1);
  output = { action: "answer", observation: "我做完了。", calls: [call("rr", 3)] };
  task = (await post("retry-message", task)).task;
  assert.ok(task.dialogue.error);
  assert.deepEqual(task.pending, []);
  output = { action: "explain", observation: "声称已有数据。", evidence: [{ from: 1, to: 1, metric: "waiting" }] };
  task = (await post("retry-message", task)).task;
  assert.ok(task.dialogue.error);
  output = { action: "answer", observation: "早呀。今天想聊点什么？" };
  task = (await post("retry-message", task)).task;
  assert.equal(task.dialogue.turns.at(-1).message, "换个说法。");
  assert.equal(task.dialogue.turns.length, 2);
  assert.equal(task.dialogue.error, undefined);
});

test("a new message keeps the text of a previous unanswered turn as context", async (t) => {
  const { post } = await setup(t, "192.0.2.17", ({ message, conversation }) => {
    if (message === "写一段雨后的街景。") return new Response(null, { status: 503 });
    assert.deepEqual(conversation, [{ message: "写一段雨后的街景。" }]);
    return { action: "answer", observation: "雨刚停，路灯在水洼里晃。" };
  });
  let task = (await post("start", null, { goal: "写一段雨后的街景。" })).task;
  task = (await post("message", task, { message: "写一段雨后的街景。" })).task;
  task = (await post("message", task, { message: "从路灯开始写。" })).task;
  assert.deepEqual(task.dialogue.turns[0], { message: "写一段雨后的街景。" });
  assert.equal(task.dialogue.turns[1].action, "answer");
});
