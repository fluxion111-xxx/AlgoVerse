import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const scope = Symbol.for("algoverse.test.agentCookies");
registerHooks({
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
const { POST: diagnosisPOST } = await import("../src/app/api/experiments/runs/[runId]/diagnosis/route.ts");
const { POST: tutorPOST } = await import("../src/app/api/ai/tutor/route.ts");
const { POST: learningPOST } = await import("../src/app/api/ai/learning/route.ts");
const { agentTools, prepareToolCall } = await import("../src/lib/server/agentTools.ts");
const { createAIExperimentSession, createWorkbenchSession, confirmExperimentSession, runExperimentSession, getComparableExperimentRuns,
  getActiveAgentTask, getExperimentRun, getExperimentSession, runConfirmedAgentCall, getAgentTask, getTutorHistory, saveDiagnosis,
  getLearningProgress, submitKnowledgeExercise } = await import("../src/lib/server/experimentRecords.ts");
const { learningSuggestion } = await import("../src/lib/learningPath.ts");
const { getExperimentEngine, registeredEngines } = await import("../src/lib/experimentEngines.ts");
const { experimentEvidence } = await import("../src/lib/experiments/evidence.ts");
const { schedulingWaitReport } = await import("../src/lib/experimentAgent.ts");
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
  const upstreamFetch = t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url === "https://www.siliconflow.cn/pricing") return new Response(pricingPage());
    assert.ok(["https://api.siliconflow.cn/v1/chat/completions", "https://api.deepseek.com/chat/completions"].includes(url));
    assert.equal(init.headers.Authorization, `Bearer ${key}`);
    assert.ok(!init.body.includes(key));
    const upstream = JSON.parse(init.body);
    assert.equal(upstream.model, url.includes("deepseek") ? "deepseek-flash" : model);
    const input = JSON.parse(upstream.messages[1].content);
    const expectedTokens = Object.hasOwn(input, "angle") ? 600
      : Object.hasOwn(input, "question") ? 1100 : Object.hasOwn(input, "message") || input.stage === "plan" ? 1200 : 1000;
    assert.equal(upstream.max_tokens, expectedTokens);
    if (Object.hasOwn(input, "message")) {
      assert.deepEqual(upstream.messages.slice(2), [
        ...input.conversation.flatMap(({ message, reply }) => [
          { role: "user", content: message }, ...(reply ? [{ role: "assistant", content: reply }] : []),
        ]),
        { role: "user", content: `Resolve the following request using the conversation. Inherit the exact subject and methods when omitted.\n${JSON.stringify({ context: { focus: input.focus, lastExchange: input.lastExchange }, message: input.message })}` },
      ]);
    }
    const output = await respond(input, upstream.messages[0].content, upstream.messages.slice(2));
    if (output instanceof Response) return output;
    return modelReply(JSON.stringify(output));
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
  async function ask(question, task) {
    const response = await tutorPOST(new Request("https://algoverse.test/api/ai/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AI-Provider": "siliconflow", "CF-Connecting-IP": ip },
      body: JSON.stringify({ conversation: true, question, agentId: task?.id, revision: task?.revision }),
    }));
    const payload = await response.json();
    assert.ok(!JSON.stringify(payload).includes(key));
    return { ...payload, http: response.status };
  }
  return { post, ask, values, upstreamFetch };
}

function modelReply(content, finishReason = "stop") {
  return Response.json({ model, choices: [{ finish_reason: finishReason, message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } });
}

const sortingPlan = { action: "run", plan: ["比较两种排序"], observation: "用同一组数比较。",
  calls: [{ tool: "sorting", parameters: { goalLabel: "比较排序", values: [5, 2, 9, 1] } }] };

test("learning advice uses the saved wrong choice and varies even when the model repeats", async (t) => {
  const ip = "192.0.2.43";
  const angles = [];
  await setup(t, ip, (input) => {
    angles.push(input.angle);
    assert.deepEqual(input.mistake.selected, ["让 C 随 n 增长"]);
    assert.match(input.mistake.explanation, /常数固定/);
    return { reason: "要固定常数。", practice: "写出两条界。", check: "核对同一尾段。" };
  });
  const topic = "asymptotic-bounds";
  assert.equal((await submitKnowledgeExercise(topic, "deep-theta", ["2"])).correct, false);
  const progress = await getLearningProgress();
  const cards = [0, 1, 2].map((step) => learningSuggestion(progress, "algorithms", step));
  assert.equal(new Set(cards.map(({ angle }) => angle)).size, 3);
  assert.deepEqual(cards[0].mistake.selected, ["让 C 随 n 增长"]);
  assert.match(cards[2].href, /#lesson-exercise-deep-theta$/);
  const generate = async (step, previous = []) => {
    const response = await learningPOST(new Request("https://algoverse.test/api/ai/learning", {
      method: "POST", headers: { "Content-Type": "application/json", "X-AI-Provider": "siliconflow", "CF-Connecting-IP": ip },
      body: JSON.stringify({ goal: "algorithms", includeProgress: true, step, previous }),
    }));
    assert.equal(response.status, 200);
    return response.json();
  };
  const first = await generate(0);
  const next = await generate(1, [first.key]);
  assert.deepEqual(angles, cards.slice(0, 2).map(({ angle }) => angle));
  assert.equal(next.basedOnRecords, true);
  assert.notEqual(first.practice, next.practice);
  assert.deepEqual(next.mistake.selected, ["让 C 随 n 增长"]);

  assert.equal((await submitKnowledgeExercise(topic, "deep-theta", ["0", "1"])).correct, true);
  assert.equal(learningSuggestion(await getLearningProgress(), "algorithms", 0)?.mistake, undefined);
});

test("tutor history lists saved conversations for the current visitor", async (t) => {
  const { ask, post, values } = await setup(t, "192.0.2.40", () => ({ answer: "可以继续聊。" }));
  const first = await ask("冒泡排序如何比较？");
  const second = await ask("B+ 树如何查范围？");
  await post("start", null, { goal: "独立工作台任务" });

  const summaries = await getTutorHistory();
  assert.deepEqual(summaries.map(({ id, title }) => ({ id, title })), [
    { id: second.task.id, title: second.task.goal },
    { id: first.task.id, title: first.task.goal },
  ]);
  assert.ok(summaries.every(({ updatedAt }) => Number.isFinite(Date.parse(updatedAt))));
  assert.equal((await getAgentTask(first.task.id)).dialogue.turns[0].message, first.task.goal);
  values.set("algoverse_visitor", { value: "0".repeat(64) });
  assert.deepEqual(await getTutorHistory(), []);
  assert.equal(await getAgentTask(first.task.id), null);
});

test("tutor retries a truncated reply, then accepts a complete answer with only verified citations", async (t) => {
  let calls = 0;
  const { ask } = await setup(t, "192.0.2.37", (input, instructions) => {
    assert.equal(input.question, "冒泡排序和快速排序谁更快？");
    if (++calls === 1) return modelReply('{"answer":"快排', "length");
    assert.match(instructions, /只输出一个完整的 JSON 对象/);
    const [source] = input.knowledge;
    assert.ok(source);
    return modelReply("```json\n" + JSON.stringify({
      action: "answer", observation: "快排通常更快。", citations: [source.id, "invalid-topic", source.id],
    }) + "\n```");
  });
  const result = await ask("冒泡排序和快速排序谁更快？");
  assert.equal(result.status, "shared");
  assert.equal(calls, 2);
  assert.equal(result.task.dialogue.turns.length, 1);
  assert.equal(result.task.dialogue.turns[0].reply, "快排通常更快。");
  assert.equal(result.task.dialogue.turns[0].tutor.sources.length, 1);
});

test("workbench retries an invalid proposal and accepts a fenced valid plan without running it", async (t) => {
  let calls = 0;
  const { post, upstreamFetch } = await setup(t, "192.0.2.38", (input, instructions) => {
    assert.equal(input.message, "帮我比较冒泡排序和快速排序。");
    if (++calls === 1) return { ...sortingPlan, calls: [{ tool: "unregistered-tool", parameters: {} }] };
    assert.match(instructions, /只输出一个完整的 JSON 对象/);
    return modelReply("```json\n" + JSON.stringify(sortingPlan) + "\n```");
  });
  const message = "帮我比较冒泡排序和快速排序。";
  const draft = (await post("start", null, { goal: message })).task;
  const planned = (await post("message", draft, { message })).task;
  assert.equal(calls, 2);
  assert.equal(upstreamFetch.mock.calls.filter(({ arguments: [url] }) => url === "https://www.siliconflow.cn/pricing").length, 2);
  assert.equal(planned.phase, "confirm");
  assert.equal(planned.dialogue.turns.length, 1);
  assert.equal(planned.pending[0].tool, "sorting");
  assert.equal(await getExperimentRun(planned.pending[0].id), null);
});

test("tutor reuses the sorting discussion and hands off a plan to the same workbench task", async (t) => {
  const question = "冒泡排序是和快速排序谁更快？";
  const followUp = "请你帮我实验";
  const focus = { topic: "冒泡排序和快速排序", goal: "在同一组输入上比较比较和交换次数" };
  let calls = 0;
  const { ask, post } = await setup(t, "192.0.2.18", (input) => {
    calls++;
    if (input.question === question) return { answer: "快排通常更快，输入顺序也有影响。", focus };
    assert.equal(input.stage, "plan");
    assert.deepEqual(input.focus, focus);
    assert.equal(input.request, followUp);
    return sortingPlan;
  });
  const previous = (await post("start", null, { goal: "继续手头的实验" })).task;
  const explained = await ask(question);
  assert.equal(explained.status, "shared");
  assert.equal(explained.workbench, undefined);
  assert.equal(explained.task.dialogue.turns.at(-1).action, "answer");
  assert.deepEqual(explained.task.dialogue.focus, focus);
  assert.equal((await getActiveAgentTask()).id, previous.id);

  const planned = await ask(followUp, explained.task);
  assert.equal(planned.status, "shared");
  assert.equal(planned.task.id, explained.task.id);
  assert.equal(planned.workbench, `/experiments/create?agentId=${planned.task.id}`);
  assert.equal(planned.task.phase, "confirm");
  assert.equal(planned.task.pending[0].tool, "sorting");
  assert.equal(planned.task.runs.length, 0);
  assert.equal(await getExperimentRun(planned.task.pending[0].id), null);
  assert.deepEqual(planned.task.dialogue.turns.map(({ message }) => message), [question, followUp]);
  assert.equal((await getActiveAgentTask()).id, planned.task.id);
  assert.equal(calls, 2);

  const confirmed = await post("approve", planned.task);
  assert.equal(confirmed.task.runs.length, 1);
  assert.equal(confirmed.task.runs[0].id, planned.task.pending[0].id);
});

test("tutor supplies the prior turn to the model when the provider omitted remembered focus", async (t) => {
  const question = "冒泡排序和快速排序谁更快？输入用 5、2、9、1。";
  const reply = "快排通常更快，可以用这组数据比较。";
  const followUp = "帮我把它们实际跑一遍。";
  const { ask } = await setup(t, "192.0.2.17", (input, _instructions, dialogue) => {
    if (input.question === question) return { answer: reply };
    if (input.question === followUp) {
      assert.deepEqual(dialogue, [{ role: "user", content: question }, { role: "assistant", content: reply }, { role: "user", content: followUp }]);
      return { action: "plan", focus: { topic: "冒泡排序和快速排序", goal: "比较两种排序", constraints: "输入是 5、2、9、1" } };
    }
    assert.equal(input.focus.constraints, "输入是 5、2、9、1");
    return sortingPlan;
  });
  const first = await ask(question);
  const planned = await ask(followUp, first.task);
  assert.equal(planned.task.phase, "confirm");
  assert.deepEqual(planned.task.pending[0].config.values, [5, 2, 9, 1]);
});

test("a typed confirmation runs the saved sorting plan once without calling AI again", async (t) => {
  const { post, values, upstreamFetch } = await setup(t, "192.0.2.19", () => sortingPlan);
  const message = "帮我比较冒泡排序和快速排序。";
  const draft = (await post("start", null, { goal: message })).task;
  const proposed = (await post("message", draft, { message })).task;
  assert.equal(proposed.phase, "confirm");
  assert.equal(proposed.autoContinue, false);
  assert.equal(await getExperimentRun(proposed.pending[0].id), null);
  const requests = upstreamFetch.mock.callCount();

  const done = (await post("message", proposed, { message: "确认！" }, { "X-AI-Provider": "unconfigured" })).task;
  assert.equal(done.phase, "observe");
  assert.deepEqual(done.pending, []);
  assert.equal(done.runs.length, 1);
  const runId = done.runs[0].id;
  assert.equal(runId, proposed.pending[0].id);
  assert.deepEqual(done.runs[0].metrics, { comparisons: "6 / 5", swaps: "4 / 2", sorted: "1、2、5、9" });
  const replay = await post("sorting-replay", done, { runId });
  assert.equal(replay.http, 200);
  assert.deepEqual(replay.results.bubble.sorted, [1, 2, 5, 9]);
  assert.deepEqual(replay.results.quick.sorted, [1, 2, 5, 9]);
  assert.ok(replay.results.bubble.frames.some(({ kind }) => kind === "swap"));
  assert.ok(replay.results.quick.frames.some(({ kind }) => kind === "compare"));
  assert.equal((await post("message", proposed, { message: "开始" })).http, 409);
  assert.deepEqual((await post("message", done, { message: "运行" })).task, done);
  assert.equal(upstreamFetch.mock.callCount(), requests);
  values.clear();
  assert.equal((await post("sorting-replay", done, { runId })).http, 404);
});

test("questions, negations and requests to edit are not consent; the button can still run", async (t) => {
  const { post } = await setup(t, "192.0.2.20", ({ message }) => message === "比较排序。" ? sortingPlan
    : { action: "answer", observation: "当前方案仍待确认。" });
  let task = (await post("start", null, { goal: "比较排序。" })).task;
  task = (await post("message", task, { message: "比较排序。" })).task;
  const runId = task.pending[0].id;
  for (const message of ["确认？", "先不要运行", "确认，换成倒序数据", "开始用什么数据？", "“确认”是什么意思？"]) {
    task = (await post("message", task, { message })).task;
    assert.equal(task.phase, "confirm");
    assert.equal(task.pending[0].id, runId);
    assert.equal(await getExperimentRun(runId), null);
  }
  task = (await post("approve", task)).task;
  assert.equal(task.phase, "observe");
  assert.equal(task.runs[0].id, runId);
});

test("a tool failure leaves the proposal available for explicit retry without a success record", async (t) => {
  const { post, upstreamFetch } = await setup(t, "192.0.2.21", () => sortingPlan);
  const draft = (await post("start", null, { goal: "比较排序" })).task;
  const proposed = (await post("message", draft, { message: "比较排序" })).task;
  const engine = getExperimentEngine("sorting");
  const execute = t.mock.method(engine, "execute", () => { throw new Error("tool failure fixture"); });
  const failed = (await post("message", proposed, { message: "开始运行" })).task;
  assert.equal(failed.phase, "tool-error");
  assert.match(failed.error, /失败/);
  assert.deepEqual(failed.runs, []);
  assert.equal(await getExperimentRun(proposed.pending[0].id), null);
  assert.deepEqual((await post("message", failed, { message: "确认" })).task, failed);
  assert.equal(execute.mock.callCount(), 1);
  execute.mock.restore();
  assert.equal((await post("approve", failed)).task.runs[0].id, proposed.pending[0].id);
  assert.equal(upstreamFetch.mock.callCount(), 2);
});

test("a greeting still uses the configured model with instructions for concise replies", async (t) => {
  const { post } = await setup(t, "192.0.2.22", ({ message }, instructions) => {
    assert.equal(message, "你好");
    assert.match(instructions, /寒暄和日常对话默认一句/);
    assert.match(instructions, /不要自我介绍、提平台名称、列功能/);
    return { action: "answer", observation: "嗨，很高兴见到你！有什么算法或系统想一起探索吗？" };
  });
  const draft = (await post("start", null, { goal: "你好" })).task;
  const done = (await post("message", draft, { message: "你好" })).task;
  assert.equal(done.dialogue.turns.at(-1).reply, "嗨，很高兴见到你！");
  assert.deepEqual(done.pending, []);
});

test("all 30 advertised tools execute their real engine and expose verified metrics", () => {
  assert.equal(agentTools.length, 30);
  for (const engine of registeredEngines) {
    const tool = agentTools.find((entry) => entry.tool === engine.id);
    const config = engine.preset(1234);
    assert.ok(tool.inputSchema && tool.outputSchema && engine.validate(config), engine.id);
    assert.ok(Object.keys(experimentEvidence(engine.execute(config))).length > 0, engine.id);
    const proposal = prepareToolCall({ tool: engine.id, parameters: "preset" }, 1234, { presetGoal: "验证默认配置" });
    assert.deepEqual(proposal?.config, { ...config, goalLabel: "验证默认配置" }, engine.id);
  }
  assert.equal(prepareToolCall({ ...call("rr", 2), tool: "shell" }, 1234), null);
  assert.equal(prepareToolCall(call("rr", 0), 1234), null);
  assert.equal(prepareToolCall({ ...call("rr", 2), code: "throw 1" }, 1234), null);
  const base = prepareToolCall(call("rr", 2), 1234);
  assert.equal(prepareToolCall({ tool, parameters: { quantum: 0 } }, 1234, { base }), null);
  assert.equal(prepareToolCall({ tool, parameters: { code: "throw 1" } }, 1234, { base }), null);
  const network = "network-transmission";
  const networkBase = prepareToolCall({ tool: network, parameters: "preset" }, 1234, { presetGoal: "观察丢包" });
  const revised = prepareToolCall({ tool: network, parameters: { packets: 15 } }, 5678, { base: networkBase });
  assert.deepEqual(revised?.config, { ...networkBase.config, packets: 15 });
  assert.equal(prepareToolCall({ tool: network, parameters: { seed: 123 } }, 1234, { base: networkBase }), null);
});

test("manual reports compare saved rounds in scope and expand a cached diagnosis locally", async (t) => {
  const { values, upstreamFetch } = await setup(t, "192.0.2.49", () => assert.fail("Diagnosis should reuse the saved result"));
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
  const pages = getExperimentEngine("page-replacement");
  const runConfigured = async (session, topic) => {
    t.mock.timers.tick(1000);
    await confirmExperimentSession(session.id);
    return runExperimentSession(session.id, randomUUID(), undefined, topic);
  };
  const manual = async (frameCount, topic) => runConfigured(await createWorkbenchSession("比较页框数", pages.id, pages.version,
    { ...pages.preset(), frameCount }), topic);
  const first = await manual(3);
  await manual(3, "page-replacement-topic");
  const creator = await createAIExperimentSession("比较页框数", pages.id, pages.version, pages.preset(), model, "create");
  await runConfigured(creator);
  const second = await manual(4);
  const third = await manual(2);
  const history = await getComparableExperimentRuns(second);
  assert.deepEqual(history.map(({ id, round }) => [id, round]), [[first.id, 1], [second.id, 2], [third.id, 3]]);
  assert.deepEqual(history.map(({ config }) => config.frameCount), [3, 4, 2]);

  await saveDiagnosis({ runId: second.id, model, promptVersion: 3, createdAt: second.completedAt,
    conclusion: "简短结论", explanation: "简短解释", suggestion: "保留原有建议。", evidence: ["pageHits"] });
  const response = await diagnosisPOST(new Request("https://algoverse.test", { method: "POST", headers: { "content-type": "application/json" } }),
    { params: Promise.resolve({ runId: second.id }) });
  assert.equal(response.status, 200);
  const { diagnosis } = await response.json();
  assert.match(diagnosis.conclusion, /缺页最少/);
  assert.match(diagnosis.explanation, /OPT 会查看未来访问/);
  assert.equal(diagnosis.suggestion, "保留原有建议。");
  assert.deepEqual(diagnosis.evidence, ["pageHits", "pageFaults"]);
  assert.equal(upstreamFetch.mock.callCount(), 0);

  values.delete("algoverse_visitor");
  assert.deepEqual(await getComparableExperimentRuns(second), []);
});

test("FCFS and RR run only after approval, then adaptive RR uses real observations and saves an evidence report", async (t) => {
  const { post, values } = await setup(t, "192.0.2.10", ({ message, runs, tools }) => {
    if (message) return { action: "plan", focus: { topic: "FCFS 和 RR 调度", goal: "比较等待时间并优化时间片" } };
    assert.equal(tools.length, 30);
    if (!runs.length) return { ...first, autoContinue: true };
    if (runs.length === 2) {
      assert.deepEqual(runs.map(({ metrics }) => metrics.waiting), ["4.33", "6.00"]);
      return { action: "run", observation: "轮转等待较高。试加长时间片。", evidence: [compare], calls: [call("rr", 4)] };
    }
    assert.equal(runs[2].metrics.waiting, "5.33");
    return { action: "finish", evidence: [compare, { ...compare, from: 2, to: 3 }] };
  });
  const draft = (await post("start", null, { goal: "比较 FCFS 和 RR 调度算法，分析平均等待时间，并尝试优化时间片。" })).task;
  assert.equal((await post("approve", draft)).http, 409);
  const proposed = (await post("message", draft, { message: draft.goal })).task;
  assert.equal(proposed.phase, "confirm");
  assert.equal(proposed.autoContinue, true);
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

test("stopping one reply preserves its proposal and ignores unrelated stop requests", async (t) => {
  const entered = Promise.withResolvers();
  const result = Promise.withResolvers();
  const { post } = await setup(t, "192.0.2.24", ({ message }) => {
    if (message === "比较排序。") return sortingPlan;
    entered.resolve();
    return result.promise;
  });
  const draft = (await post("start", null, { goal: "比较排序。" })).task;
  const proposal = (await post("message", draft, { message: "比较排序。" })).task;
  assert.equal((await getActiveAgentTask()).id, draft.id);
  assert.equal(proposal.dialogue.turns[0].proposalIds[0], proposal.pending[0].id);
  assert.equal(proposal.decisions[0].calls[0].id, proposal.pending[0].id);
  const operationId = randomUUID();
  const waiting = post("message", proposal, { message: "把输入改一下。", operationId });
  await entered.promise;
  const unrelated = (await post("stop", proposal, { operationId: randomUUID() })).task;
  assert.equal(unrelated.dialogue.pending, "把输入改一下。");
  const stopped = (await post("stop", proposal, { operationId })).task;
  assert.equal(stopped.dialogue.pending, undefined);
  assert.deepEqual(stopped.dialogue.turns.at(-1), { message: "把输入改一下。", stopped: true });
  assert.deepEqual(stopped.pending, proposal.pending);
  result.resolve(sortingPlan);
  assert.equal((await waiting).http, 409);
  const finished = (await post("approve", stopped)).task;
  assert.equal(finished.runs.length, 1);
  assert.equal((await getExperimentRun(finished.runs[0].id)).session.source.taskId, draft.id);
});

test("a saved creator configuration resumes in Agent and still requires approval", async (t) => {
  const { post, upstreamFetch } = await setup(t, "192.0.2.25", () => { throw new Error("Unexpected model request"); });
  const engine = getExperimentEngine("sorting");
  const config = engine.preset(1);
  const session = await createAIExperimentSession("比较排序。", engine.id, engine.version, config, model, "compare");
  const proposal = (await post("start", null, { goal: session.question, sessionId: session.id, importPlan: true })).task;
  assert.equal(proposal.phase, "confirm");
  assert.deepEqual(proposal.pending[0].config, config);
  assert.equal(await getExperimentRun(proposal.pending[0].id), null);
  assert.equal((await getActiveAgentTask()).id, proposal.id);
  const finished = (await post("approve", proposal)).task;
  assert.equal(finished.runs.length, 1);
  assert.equal((await post("approve", proposal)).http, 409);
  assert.equal(upstreamFetch.mock.callCount(), 0);
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
      assert.equal(input.selectedRound, 1);
      assert.deepEqual(input.diagnoses.map(({ round, evidence }) => ({ round, evidence })), [{ round: 1, evidence: ["waiting"] }]);
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
  const selectedRunId = task.runs[0].id;
  await saveDiagnosis({ runId: selectedRunId, model, promptVersion: 3, createdAt: new Date().toISOString(),
    evidence: ["waiting"], conclusion: "平均等待为 6。", explanation: "本轮使用固定时间片。", suggestion: "试一个更大的时间片。" });
  assert.equal((await post("message", task, { message: "看看这轮。", selectedRunId: randomUUID() })).http, 404);
  task = (await post("message", task, { message: "为什么等待时间变长了？", selectedRunId })).task;
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

test("an elliptical request after a knowledge answer proposes and executes the same comparison", async (t) => {
  const topic = "二叉树的先序遍历与后序遍历";
  const question = "先序遍历和后序遍历有什么区别？";
  const reply = "先序先访问根，后序最后访问根。";
  const goal = "比较同一棵树的先序和后序";
  const { post } = await setup(t, "192.0.2.21", (input) => {
    if (input.stage === "plan") {
      assert.deepEqual(input.focus, { topic, goal });
      assert.equal(input.message, undefined);
      assert.equal(input.request, "帮我设计一个实验");
      assert.ok(input.tools.some(({ tool }) => tool === "tree-traversal"));
      return { action: "run", plan: ["用同一棵树对比"], observation: "看看根节点何时出现。",
        calls: [{ tool: "tree-traversal", parameters: "preset" }] };
    }
    if (input.message === question) return { action: "answer", observation: reply, focus: { topic } };
    assert.equal(input.message, "帮我设计一个实验");
    assert.equal(input.focus.topic, topic);
    assert.deepEqual(input.conversation, [{ message: question, reply, action: "answer", evidence: [] }]);
    assert.deepEqual(input.lastExchange, input.conversation[0]);
    assert.equal(input.phase, "draft");
    assert.equal(input.tools, undefined);
    return { action: "plan", focus: { topic, goal } };
  });
  let task = (await post("start", null, { goal: question })).task;
  task = (await post("message", task, { message: question })).task;
  task = (await post("status", task)).task;
  assert.equal(task.dialogue.focus.topic, topic);
  task = (await post("message", task, { message: "帮我设计一个实验" })).task;
  assert.equal(task.phase, "confirm");
  assert.equal(task.dialogue.requests, 3);
  assert.equal(task.experimentGoal, goal);
  assert.equal(task.pending[0].tool, "tree-traversal");
  assert.equal(task.pending[0].config.goalLabel, goal);
  assert.equal(await getExperimentRun(task.pending[0].id), null);
  task = (await post("message", task, { message: "确认" })).task;
  const { results } = await getExperimentRun(task.runs[0].id);
  assert.equal(results.kind, "tree-traversal");
  assert.deepEqual(results.traversals.find(({ order }) => order === "preorder").values, [4, 2, 1, 3, 7, 9]);
  assert.deepEqual(results.traversals.find(({ order }) => order === "postorder").values, [1, 3, 2, 9, 7, 4]);
});

test("changing topic clears a pending plan and a later edit keeps the selected defaults", async (t) => {
  const topic = "轮转调度的时间片";
  const goal = "观察轮转调度等待时间";
  const networkQuestion = "用实验比较两种延迟路径。";
  const responses = [
    () => ({ action: "run", focus: { topic: "网络链路延迟", goal: "观察网络选路" }, plan: ["建立网络"],
      observation: "用模拟链路观察选路。", calls: [{ tool: "network-transmission", parameters: "preset" }] }),
    (input) => {
      assert.equal(input.currentExperiment.tool, "network-transmission");
      return { action: "answer", observation: "时间片用来限制一次运行多久。", focus: { topic, switchTopic: true } };
    },
    (input) => {
      assert.equal(input.focus.topic, topic);
      assert.equal(input.currentExperiment, undefined);
      assert.deepEqual(input.plan, []);
      assert.deepEqual(input.pendingTools, []);
      assert.equal(input.conversation[0].message, networkQuestion);
      return { action: "plan", focus: { topic, goal, defaults: "allowed" } };
    },
    (input) => {
      assert.equal(input.stage, "plan");
      assert.equal(input.focus.defaults, "allowed");
      assert.deepEqual(input.tools.find((entry) => entry.tool === tool).preset.processes, processes);
      return { action: "run", plan: ["模拟轮转调度"],
        observation: "选一组示例进程。", calls: [{ tool, parameters: "preset" }] };
    },
    (input) => {
      assert.equal(input.focus.defaults, "allowed");
      assert.equal(input.focus.goal, goal);
      assert.equal(input.currentExperiment.config.quantum, 2);
      return { action: "plan", focus: { topic, goal, constraints: "时间片改到 5" } };
    },
    (input) => {
      assert.equal(input.stage, "plan");
      assert.equal(input.focus.defaults, "allowed");
      assert.equal(input.focus.constraints, "时间片改到 5");
      assert.equal(input.request, "只把时间片改到 5。");
      assert.equal(input.revisionBase.config.quantum, 2);
      return { action: "run", observation: "只调整时间片。", calls: [{ tool, parameters: { quantum: 5 } }] };
    },
  ];
  const { post } = await setup(t, "192.0.2.22", (input) => responses.shift()(input));
  let task = (await post("start", null, { goal: networkQuestion })).task;
  const previous = (await post("message", task, { message: networkQuestion })).task;
  assert.equal(previous.phase, "confirm");
  task = (await post("message", previous, { message: "换个话题，轮转调度的时间片是什么？" })).task;
  assert.equal(task.phase, "draft");
  assert.equal(task.experimentGoal, undefined);
  assert.equal((await post("approve", previous)).http, 409);
  task = (await post("message", task, { message: "试一下，数据你来定。" })).task;
  const base = task.pending[0].config;
  assert.deepEqual(base.processes, processes);
  task = (await post("message", task, { message: "只把时间片改到 5。" })).task;
  assert.deepEqual(task.pending[0].config, { ...base, quantum: 5 });
  assert.equal(await getExperimentRun(task.pending[0].id), null);
  task = (await post("approve", task)).task;
  assert.equal(task.runs.length, 1);
  assert.equal(task.runs[0].config.quantum, 5);
  assert.ok(task.runs[0].metrics.waiting);
  assert.equal(await getExperimentRun(previous.pending[0].id), null);
});

test("a completed run remains available as history after switching to an unsupported topic", async (t) => {
  const topic = "真实数据库的查询执行计划";
  const { post } = await setup(t, "192.0.2.23", (input) => {
    if (input.stage === "plan") {
      assert.equal(input.focus.topic, topic);
      assert.deepEqual(input.runs, []);
      return { action: "unsupported", observation: "这里无法连接你的真实数据库。" };
    }
    if (!input.conversation.length) return sortingPlan;
    if (input.conversation.length === 1) return { action: "answer", observation: "查询计划描述如何访问表和索引。",
      focus: { topic, switchTopic: true } };
    assert.equal(input.focus.topic, topic);
    assert.equal(input.currentExperiment, undefined);
    assert.equal(input.runs[0].currentTopic, false);
    assert.equal(input.runs[0].tool, "sorting");
    return { action: "plan", focus: { topic, goal: "读取真实生产数据库的查询执行计划" } };
  });
  let task = (await post("start", null, { goal: "比较排序。" })).task;
  task = (await post("message", task, { message: "比较排序。" })).task;
  task = (await post("approve", task)).task;
  const runId = task.runs[0].id;
  task = (await post("message", task, { message: "换个话题，如何查看我的生产数据库的查询计划？" })).task;
  task = (await post("message", task, { message: "帮我在我的数据库里试一下。" })).task;
  assert.equal(task.dialogue.turns.at(-1).action, "unsupported");
  assert.deepEqual(task.pending, []);
  assert.deepEqual(task.runs.map(({ id }) => id), [runId]);
  assert.ok(await getExperimentRun(runId));
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
  output = { action: "answer", observation: "早呀。今天想聊点什么？" };
  task = (await post("retry-message", task)).task;
  assert.equal(task.dialogue.turns.at(-1).message, "换个说法。");
  assert.equal(task.dialogue.turns.length, 2);
  assert.equal(task.dialogue.error, undefined);
});

test("workbench rejects invented evidence even after a format retry", async (t) => {
  let calls = 0;
  const { post } = await setup(t, "192.0.2.39", () => {
    calls++;
    return { action: "explain", observation: "声称已有数据。", evidence: [{ from: 1, to: 1, metric: "waiting" }] };
  });
  const draft = (await post("start", null, { goal: "查看实验数据。" })).task;
  const result = (await post("message", draft, { message: draft.goal })).task;
  assert.equal(calls, 2);
  assert.match(result.dialogue.error, /格式有误/);
  assert.deepEqual(result.dialogue.turns, []);
  assert.deepEqual(result.pending, []);
  assert.deepEqual(result.runs, []);
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
