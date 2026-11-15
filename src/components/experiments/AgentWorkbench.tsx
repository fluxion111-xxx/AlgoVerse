"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { agentDialogueActive, agentFinished, agentLimits, agentRoute, schedulingWaitReport, type AgentCall, type AgentDecision, type AgentRun, type AgentTask, type SchedulingEvidence } from "@/lib/experimentAgent";
import { maxQuestionLength } from "@/lib/experimentCreator";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { evidenceLabels } from "@/lib/experiments/evidence";
import { workflowAISettingsRoute, workflowRoute, type ExperimentTask } from "@/lib/navigation";
import { fetchWithTemporaryAI, useActiveAI } from "@/lib/temporaryAI";

const phases: Record<AgentTask["phase"], string> = {
  draft: "等待规划", deciding: "AI 正在分析", confirm: "等待确认", running: "工具运行中",
  observe: "等待分析", clarify: "需要补充", finished: "任务完成", unsupported: "暂不支持",
  cancelled: "任务已取消", limit: "已到任务上限", "ai-error": "分析失败", "tool-error": "运行失败",
};

async function agentRequest(body: object, connection?: ReturnType<typeof useActiveAI>, signal?: AbortSignal): Promise<AgentTask> {
  const response = await fetchWithTemporaryAI("/api/experiments/agent", connection, body, signal);
  const payload = await response.json();
  if (!response.ok || !payload.task) throw new Error(payload.message ?? "请求失败。请重试。");
  return payload.task;
}

function ToolDetails({ call }: { call: AgentCall }) {
  const { config } = call;
  return <>
    <p>{config.goalLabel}</p>
    {"processes" in config && <p>
      {config.policy === "fcfs" ? "FCFS" : `RR · 时间片 ${config.quantum}`}
      {" · "}{config.processes.map(({ arrival, burst }, index) => `P${index + 1} (${arrival}, ${burst})`).join("、")}
    </p>}
    <details>
      <summary>查看完整参数</summary>
      <pre className="agent-config">{JSON.stringify(config, null, 2)}</pre>
    </details>
  </>;
}

function DecisionDetails({ decision, runs, report = false }: { decision: Pick<AgentDecision, "observation" | "evidence">; runs: AgentRun[]; report?: boolean }) {
  const scheduling = report && decision.evidence.some(({ metric }) => metric === "waiting") ? schedulingWaitReport(runs) : null;
  return <>
    {!report && decision.observation && <p className="agent-reply">{decision.observation}</p>}
    {scheduling && <dl className="preset-details">
      <div><dt>已测 RR 中等待最短</dt><dd>时间片 {scheduling.bestTrials.map(({ config }) => config.quantum).join("、")}
        {" · "}{scheduling.bestWait.toFixed(2)}</dd></div>
      <div><dt>RR 基线 → 最短等待</dt><dd>{scheduling.firstRR.wait.toFixed(2)} → {scheduling.bestWait.toFixed(2)}</dd></div>
      {scheduling.fcfs && <div><dt>同进程的 FCFS 等待</dt><dd>{scheduling.fcfs.wait.toFixed(2)}</dd></div>}
    </dl>}
    {decision.evidence.length > 0 && <dl className="preset-details">
      {decision.evidence.map(({ from, to, metric }, index) => {
        const first = runs[from - 1].metrics[metric];
        const second = runs[to - 1].metrics[metric];
        const numeric = /^-?\d+(?:\.\d+)?$/;
        const difference = from !== to && numeric.test(first) && numeric.test(second)
          ? Number((Number(second) - Number(first)).toFixed(6)) : null;
        return <div key={index}>
          <dt>{evidenceLabels[metric]}</dt>
          <dd>第 {from} 轮 {first}{from !== to && ` → 第 ${to} 轮 ${second}`}
            {difference !== null && `（差 ${difference > 0 ? "+" : ""}${difference}）`}</dd>
        </div>;
      })}
    </dl>}
  </>;
}

function SchedulingDetails({ evidence }: { evidence: SchedulingEvidence[] }) {
  return <section aria-label="调度模型与实测">
    <p>RR 按时间片轮转。进程没跑完会重新排队。切换只计次数。切换不计时。</p>
    {evidence.map(({ from, to, metric, processes }, index) => <dl className="preset-details" key={index}>
      <div><dt>{({ waiting: "每个进程的等待", response: "每个进程的响应", turnaround: "每个进程的周转" })[metric]}</dt>
        <dd>{from === to ? `第 ${from} 轮` : `第 ${from} 轮 → 第 ${to} 轮`}</dd></div>
      {processes.map(({ process, before, after }) => <div key={process}>
        <dt>P{process}</dt><dd>{from === to ? before : `${before} → ${after}`}</dd>
      </div>)}
    </dl>)}
  </section>;
}

export function AgentWorkbench({ initial, initialMessage = "", reference }: { initial: AgentTask | null; initialMessage?: string; reference?: ExperimentTask }) {
  const [task, setTask] = useState(initial);
  const [message, setMessage] = useState(initialMessage);
  const connection = useActiveAI();
  const [busy, setBusy] = useState<"deciding" | "running" | "status" | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const active = useRef<AbortController | null>(null);

  async function send(action: "message" | "retry-message" | "decide" | "approve" | "status", event?: FormEvent) {
    event?.preventDefault();
    if (active.current || cancelling) return;
    const needsModel = action === "message" || action === "retry-message" || action === "decide";
    if (needsModel && !connection) { setError("请先配置 AI 服务。"); return; }
    if (action === "message" && !message.trim()) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(action === "approve" ? "running" : action === "status" ? "status" : "deciding");
    setError("");
    try {
      let current = task;
      if (!current && action === "message") {
        current = await agentRequest({ action: "start", goal: message, ...reference }, connection, controller.signal);
        if (controller.signal.aborted) return;
        setTask(current);
        window.history.replaceState(null, "", `${agentRoute}&agentId=${current.id}`);
      }
      if (!current) return;
      let next = await agentRequest({ action, ...(action === "message" && { message }), id: current.id, revision: current.revision },
        needsModel ? connection : undefined, controller.signal);
      if (controller.signal.aborted) return;
      setTask(next);
      if (action === "message") setMessage("");
      if (action === "approve" && next.phase === "observe" && connection) {
        setBusy("deciding");
        next = await agentRequest({ action: "decide", id: next.id, revision: next.revision }, connection, controller.signal);
        if (!controller.signal.aborted) setTask(next);
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "请求失败。请重试。");
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(null);
      }
    }
  }

  async function cancel() {
    if (!task || cancelling) return;
    setCancelling(true);
    setError("");
    try {
      const next = await agentRequest({ action: "cancel", id: task.id });
      active.current?.abort();
      setTask(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "取消失败。");
    } finally {
      setCancelling(false);
    }
  }

  const terminal = !!task && agentFinished(task.phase);
  const expired = !!task?.leaseUntil && task.leaseUntil <= Date.now();
  const decision = task?.decisions.at(-1);
  const taskVisible = !!task && (!task.dialogue || !!task.plan.length || !!task.pending.length || !!task.runs.length);
  const dialogueBusy = !!task && agentDialogueActive(task);
  const workBusy = !!task && (task.phase === "running" || (task.phase === "deciding" && !expired));
  const settingsHref = workflowAISettingsRoute(task ? `${agentRoute}&agentId=${task.id}` : reference ? workflowRoute("question", reference) : agentRoute);
  const latestTurn = task?.dialogue?.turns.at(-1);
  const decisionInDialogue = decision && latestTurn?.action === "run" && latestTurn.reply === decision.observation;
  return <section className="creator-plan-stage agent-workbench" aria-labelledby="creator-headline">
    <header className="creator-stage-header">
      <div><p className="creator-flow-kicker">AI 实验创造台</p><h1 id="creator-headline">聊聊你的想法</h1></div>
      <div className="preset-actions">
        <Link className="catalog-direct" href={settingsHref}>AI 服务设置</Link>
        {task && !busy && <Link className="catalog-direct" href={agentRoute}>新对话</Link>}
      </div>
    </header>
    {(task?.dialogue?.turns.length || task?.dialogue?.pending) && <section className="workflow-note" aria-label="对话记录">
      {task.dialogue.turns.map((turn, index) => <article key={index}>
        <p className="agent-message"><strong>你</strong> {turn.message}</p>
        {turn.action ? <><strong>{turn.scheduling ? "AI 选取的实测证据" : "AI"}</strong>
          <DecisionDetails decision={{ observation: turn.reply, evidence: turn.evidence }} runs={task.runs} />
          {turn.scheduling && <SchedulingDetails evidence={turn.scheduling} />}
        </> : <p>未收到回复。</p>}
      </article>)}
      {task.dialogue.pending && <article><p className="agent-message"><strong>你</strong> {task.dialogue.pending}</p>
        {!dialogueBusy && <button className="creator-submit" type="button" disabled={!!busy || cancelling} onClick={() => send("retry-message")}>重试回复</button>}
      </article>}
    </section>}
    <form className="creator-compose creator-page-form" onSubmit={(event) => send("message", event)}>
      <label htmlFor="agent-message">想聊什么？</label>
      {reference && !task && <p>可接着聊刚才的实验。</p>}
      <textarea id="agent-message" value={message} onChange={(event) => setMessage(event.target.value)} required
        maxLength={maxQuestionLength} rows={3} disabled={!!busy || dialogueBusy || workBusy} placeholder="问个问题，或试个实验。" />
      <div className="creator-compose-actions"><button className="creator-submit" disabled={!!busy || dialogueBusy || workBusy || cancelling}>
        {busy === "deciding" || dialogueBusy ? "AI 正在回复" : "发送"}
      </button></div>
    </form>
    {task && (taskVisible || dialogueBusy) && <>
      <dl className="creator-plan-summary">
        {taskVisible && <div><dt>任务目标</dt><dd>{task.experimentGoal ?? task.goal}</dd></div>}
        <div><dt>任务状态</dt><dd role="status">{busy === "status" ? "正在刷新" : phases[busy ?? task.phase]}</dd></div>
        <div><dt>已运行</dt><dd>{task.runs.length} / {agentLimits.runs} 轮</dd></div>
      </dl>
      <div className="preset-actions">
        {!terminal && <button type="button" className="creator-tool" disabled={cancelling || busy === "running" || (task.phase === "running" && !expired)}
          onClick={cancel}>取消任务</button>}
        <button type="button" className="creator-tool" disabled={!!busy || cancelling} onClick={() => send("status")}>刷新状态</button>
      </div>
      {task.plan.length > 0 && <section className="workflow-note"><h2>任务计划</h2><ol>
        {task.plan.map((step, index) => <li key={index}>{step}</li>)}
      </ol></section>}
      {decision && (!decisionInDialogue || task.decisions.length > 1) && <section className="workflow-note">
        <h2>{task.phase === "finished" ? "最终实验报告" : "Agent 观察与决策"}</h2>
        {!decisionInDialogue && <DecisionDetails decision={decision} runs={task.runs} report={task.phase === "finished"} />}
        {task.decisions.length > 1 && <details><summary>查看先前决策</summary>
          {task.decisions.slice(0, -1).map((entry, index) => <DecisionDetails key={index} decision={entry} runs={task.runs} />)}
        </details>}
      </section>}
      {task.pending.length > 0 && <section className="workflow-note">
        <h2>{task.runs.length ? "下一轮建议" : "待运行工具"}</h2>
        {task.pending.map((call) => <article key={call.id}>
          <h3>{getExperimentEngine(call.tool)?.creator.title} <small>{phases[busy === "running" ? "running" : task.phase]}</small></h3>
          <ToolDetails call={call} />
        </article>)}
        {(task.phase === "confirm" || task.phase === "tool-error" || (task.phase === "running" && expired)) &&
          <button type="button" className="creator-submit" disabled={!!busy || cancelling || !!task.dialogue?.pending} onClick={() => send("approve")}>
            {task.phase === "tool-error" ? "确认重试工具" : "确认并运行"}
          </button>}
      </section>}
      {(!task.dialogue && task.phase === "draft" || task.phase === "observe" || task.phase === "ai-error" || (task.phase === "deciding" && expired)) &&
        <button type="button" className="creator-submit" disabled={!!busy || cancelling || !!task.dialogue?.pending} onClick={() => send("decide")}>
          {task.phase === "ai-error" ? "重试分析" : "继续分析"}
        </button>}
      {task.runs.length > 0 && <section className="workflow-note">
        <h2>实测结果</h2>
        {task.runs.map((run, index) => <article key={run.id}>
          <h3>第 {index + 1} 轮 · {getExperimentEngine(run.tool)?.creator.title} · 已保存</h3>
          <ToolDetails call={run} />
          <dl className="preset-details">{Object.entries(run.metrics).map(([key, value]) => <div key={key}>
            <dt>{evidenceLabels[key]}</dt><dd>{value}</dd>
          </div>)}</dl>
          <Link className="catalog-direct" href={`/experiments/runs/${run.id}`}>查看回放</Link>
        </article>)}
      </section>}
    </>}
    {(error || task?.dialogue?.error || task?.error) && <p className="preset-error" role="alert">{error || task?.dialogue?.error || task?.error}</p>}
    {taskVisible && <p className="creator-flow-notice">实验已分析 {task.requests} / {agentLimits.decisions} 次。已用 {task.steps} / {agentLimits.steps} 步。</p>}
  </section>;
}
