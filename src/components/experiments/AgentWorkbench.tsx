"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { agentDialogueActive, isAgentConfirmation, schedulingWaitReport, type AgentCall, type AgentDecision, type AgentRun, type AgentTask, type SchedulingEvidence } from "@/lib/experimentAgent";
import { creatorObservations } from "@/lib/creatorCapabilities";
import { maxQuestionLength } from "@/lib/experimentCreator";
import { getExperimentEngine, type ExperimentConfig } from "@/lib/experimentEngines";
import { evidenceLabels } from "@/lib/experiments/evidence";
import { agentWorkbenchLink, runAnalysisLink, workflowAISettingsRoute, type ExperimentTask, type WorkflowStep } from "@/lib/navigation";
import type { Diagnosis } from "@/lib/quickStart";
import { fetchWithTemporaryAI, requestAgentTask as agentRequest, useActiveAI } from "@/lib/temporaryAI";
import { CatalogIcon } from "./CatalogEffects";
import { DiagnosisSummary } from "./QuickStartDiagnosis";
import { SortingReplay } from "./SimulationReplay";
import { LazyTutorReply } from "./LazyTutorReply";

const phases: Record<AgentTask["phase"], string> = {
  draft: "等待规划", deciding: "AI 正在分析", confirm: "等待确认", running: "工具运行中",
  observe: "等待分析", clarify: "需要补充", finished: "任务完成", unsupported: "暂不支持",
  cancelled: "任务已取消", limit: "已到任务上限", "ai-error": "分析失败", "tool-error": "运行失败",
};

function ToolDetails({ config }: { config: ExperimentConfig }) {
  return <>
    <p>{config.goalLabel}</p>
    {"values" in config && <p>输入 · {config.values.join("、")}</p>}
    {"processes" in config && <p>
      {config.policy === "fcfs" ? "FCFS" : `RR · 时间片 ${config.quantum}`}
      {" · "}{config.processes.map(({ arrival, burst }, index) => `P${index + 1} (${arrival}, ${burst})`).join("、")}
    </p>}
    {"nodes" in config && <p>树节点 · {config.nodes.map((node) => node ?? "空").join("、")}</p>}
    <details>
      <summary>查看完整参数</summary>
      <pre className="agent-config">{JSON.stringify(config, null, 2)}</pre>
    </details>
  </>;
}

function SavedSortingReplay({ taskId, runId }: { taskId: string; runId: string }) {
  const [trace, setTrace] = useState<ComponentProps<typeof SortingReplay>>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetchWithTemporaryAI("/api/experiments/agent", undefined,
          { action: "sorting-replay", id: taskId, runId }, controller.signal);
        if (!response.ok) throw new Error("Could not load sorting replay");
        const replay = await response.json();
        if (!controller.signal.aborted) setTrace(replay);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [taskId, runId]);
  if (!trace) return <p role="status">{failed ? "未能加载回放。可打开详情。" : "正在加载排序过程。"}</p>;
  return <div className="agent-sorting-replay"><SortingReplay {...trace} /></div>;
}

export function DecisionDetails({ decision, runs, report = false }: { decision: Pick<AgentDecision, "observation" | "evidence">; runs: AgentRun[]; report?: boolean }) {
  const scheduling = report && decision.evidence.some(({ metric }) => metric === "waiting") ? schedulingWaitReport(runs) : null;
  return <>
    {!report && decision.observation && <LazyTutorReply answer={decision.observation} reveal={false} />}
    {scheduling && <dl className="preset-details">
      <div><dt>已测 RR 中等待最短</dt><dd>时间片 {scheduling.bestTrials.map(({ config }) => config.quantum).join("、")}
        {" · "}{scheduling.bestWait.toFixed(2)}</dd></div>
      <div><dt>RR 基线 → 最短等待</dt><dd>{scheduling.firstRR.wait.toFixed(2)} → {scheduling.bestWait.toFixed(2)}</dd></div>
      {scheduling.fcfs && <div><dt>同进程的 FCFS 等待</dt><dd>{scheduling.fcfs.wait.toFixed(2)}</dd></div>}
    </dl>}
    {decision.evidence.length > 0 && <dl className="preset-details">
      {decision.evidence.map(({ from, to, metric }, index) => {
        const first = runs[from - 1]?.metrics[metric];
        const second = runs[to - 1]?.metrics[metric];
        if (first === undefined || second === undefined) return null;
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

function RunEntry({ taskId, run, number, diagnosis, discuss }: {
  taskId: string; run: AgentRun; number: number; diagnosis?: Diagnosis; discuss: (message: string) => void;
}) {
  const connection = useActiveAI();
  const [saved, setSaved] = useState(diagnosis);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function diagnose() {
    if (request.current || !connection) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const response = await fetchWithTemporaryAI(`/api/experiments/runs/${run.id}/diagnosis`, connection, {}, controller.signal);
      const payload = await response.json();
      if (!response.ok || payload.diagnosis?.runId !== run.id) throw new Error(payload.message ?? "诊断失败。请重试。");
      if (!controller.signal.aborted) setSaved(payload.diagnosis);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "诊断失败。请重试。");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  const report = diagnosis ?? saved;
  return <section className="agent-result" id={`agent-run-${run.id}`}>
    <p className="agent-entry-tag">实测结果 · 第 {number} 轮</p>
    <h3>{getExperimentEngine(run.tool)?.creator.title}</h3>
    {run.tool === "sorting" && <p>指标顺序 · 冒泡 / 快排</p>}
    <dl className="agent-metrics">{Object.entries(run.metrics).map(([key, value]) => <div key={key}>
      <dt>{evidenceLabels[key]}</dt><dd>{value}</dd>
    </div>)}</dl>
    {run.tool === "sorting" && <details className="agent-replay">
      <summary>查看排序过程</summary>
      <SavedSortingReplay taskId={taskId} runId={run.id} />
    </details>}
    <div className="agent-actions">
      <Link className="agent-secondary" href={runAnalysisLink(run.id)}>打开详细分析 <CatalogIcon icon="lucide:arrow-up-right" width={15} /></Link>
      {busy ? <button type="button" className="agent-secondary" onClick={() => request.current?.abort()}>停止诊断</button>
        : !report && <button type="button" className="agent-secondary" disabled={!connection} onClick={() => void diagnose()}>生成诊断</button>}
      <button type="button" className="agent-secondary" onClick={() => discuss(`结合第 ${number} 轮的实测，建议下一轮实验。`)}>试下一轮</button>
    </div>
    {busy && <p role="status">AI 正在诊断。</p>}
    {error && <p role="alert" className="agent-error">{error}</p>}
    {report && <details className="agent-report" open>
      <summary>本轮 AI 诊断</summary>
      <DiagnosisSummary diagnosis={report} evidence={run.metrics} />
    </details>}
  </section>;
}

type SendAction = "message" | "retry-message" | "decide" | "approve" | "import" | "status";
type ActiveRequest = { controller: AbortController; operationId: string; taskId?: string };

export function AgentWorkbench({ initial, initialMessage = "", reference, savedPlan, intent, fresh, selectedRunId, diagnoses = {} }: {
  initial: AgentTask | null;
  initialMessage?: string;
  reference?: ExperimentTask;
  savedPlan?: ExperimentConfig;
  intent?: WorkflowStep;
  fresh?: boolean;
  selectedRunId?: string;
  diagnoses?: Record<string, Diagnosis>;
}) {
  const [task, setTask] = useState(initial);
  const [message, setMessage] = useState(initialMessage);
  const [sent, setSent] = useState("");
  const [selectedRun, setSelectedRun] = useState(selectedRunId);
  const connection = useActiveAI();
  const [busy, setBusy] = useState<"deciding" | "running" | "status" | null>(null);
  const [error, setError] = useState("");
  const active = useRef<ActiveRequest | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const entryHandled = useRef(false);
  const dialogueBusy = !!task && agentDialogueActive(task);
  const expired = !!task?.leaseUntil && task.leaseUntil <= Date.now();
  const workBusy = !!task && (task.phase === "running" || task.phase === "deciding") && !expired;
  const blocked = !!busy || dialogueBusy || workBusy;
  const restoredOperation = dialogueBusy ? task?.dialogue?.operationId : workBusy && task?.phase === "deciding" ? task.operationId : undefined;
  const canStop = busy === "deciding" || (!busy && !!restoredOperation);
  const settingsHref = workflowAISettingsRoute(task ? agentWorkbenchLink({ agentId: task.id }) : agentWorkbenchLink({ intent, fresh, ...reference }));
  const approvalVisible = task && (task.phase === "confirm" || task.phase === "tool-error" || (task.phase === "running" && expired));

  async function send(action: SendAction, text = message) {
    if (active.current || busy || (action === "message" && !text.trim())) return;
    const confirmation = action === "message" && !!task && isAgentConfirmation(task, text);
    const needsModel = (action === "message" && !confirmation) || action === "retry-message" || action === "decide";
    if (needsModel && !connection) { setError("请先配置 AI 服务。"); return; }
    const running = action === "approve" || (confirmation && task?.phase === "confirm");
    const request = { controller: new AbortController(), operationId: crypto.randomUUID(), taskId: task?.id };
    const { signal } = request.controller;
    active.current = request;
    setError("");
    setBusy(running ? "running" : needsModel ? "deciding" : "status");
    if (action === "message" && !confirmation) setSent(text);
    try {
      let current = task;
      if (!current && (action === "message" || action === "import")) {
        current = await agentRequest({ action: "start", goal: action === "import" ? initialMessage || savedPlan?.goalLabel : text,
          ...reference, ...(action === "import" && { importPlan: true }) }, connection, signal);
        if (signal.aborted) return;
        request.taskId = current.id;
        setTask(current);
        window.history.replaceState(null, "", agentWorkbenchLink({ agentId: current.id }));
      }
      if (!current || action === "import") return;
      let next = await agentRequest({ action, operationId: request.operationId,
        ...(needsModel && selectedRun && { selectedRunId: selectedRun }),
        ...(action === "message" && { message: text }), id: current.id, revision: current.revision }, needsModel ? connection : undefined, signal);
      if (signal.aborted) return;
      setTask(next);
      if (running && next.runs.length > current.runs.length) setSelectedRun(undefined);
      if (action === "message") setMessage("");
      if (running && next.phase === "observe" && next.autoContinue !== false && connection) {
        setBusy("deciding");
        next = await agentRequest({ action: "decide", id: next.id, revision: next.revision, operationId: request.operationId }, connection, signal);
        if (!signal.aborted) setTask(next);
      }
    } catch (failure) {
      if (!signal.aborted) setError(failure instanceof Error ? failure.message : "请求失败。请重试。");
    } finally {
      if (active.current === request) {
        active.current = null;
        setSent("");
        setBusy(null);
      }
    }
  }

  async function stop() {
    const request = active.current;
    const operationId = request?.operationId ?? restoredOperation;
    if (!canStop || !operationId) return;
    active.current = null;
    request?.controller.abort();
    setSent("");
    setBusy("status");
    try {
      const taskId = request?.taskId ?? task?.id;
      if (taskId) {
        const stopRequest = () => agentRequest({ action: "stop", id: taskId, operationId });
        setTask(await stopRequest().catch(stopRequest));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "停止失败。请刷新。");
    } finally {
      setBusy(null);
      input.current?.focus();
    }
  }

  const canPlan = !task?.pending.length && !task?.runs.length && !savedPlan && (!!task?.dialogue?.focus || (!task?.dialogue && !!(task?.goal || initialMessage)));
  const planningPrompt = !task?.dialogue ? task?.goal || initialMessage : "帮我设计一个实验。";

  useEffect(() => {
    if (entryHandled.current) return;
    entryHandled.current = true;
    if (intent === "question" || (intent && !task?.pending.length)) input.current?.focus({ preventScroll: true });
    if (intent === "config" && canPlan && connection && !blocked) {
      window.history.replaceState(null, "", task ? agentWorkbenchLink({ agentId: task.id }) : agentWorkbenchLink(reference));
      void send("message", planningPrompt);
    } else if (intent === "run" && savedPlan && reference && !task) {
      void send("import");
    }
  });

  useEffect(() => {
    if (busy || !(dialogueBusy || workBusy) || !task) return;
    const id = task.id;
    const timer = window.setInterval(() => {
      void agentRequest({ action: "status", id }).then((next) => {
        setTask((current) => current?.id === next.id && current.revision <= next.revision ? next : current);
      }).catch(() => {});
    }, 1500);
    return () => window.clearInterval(timer);
  }, [busy, dialogueBusy, workBusy, task?.id]); // Poll only restored server work.

  useEffect(() => {
    if (sent || busy === "running") end.current?.scrollIntoView({ block: "nearest" });
  }, [sent, busy, task?.revision]);

  function prefill(text: string) {
    setMessage(text);
    input.current?.focus();
  }

  function proposal(calls: AgentCall[], decision?: AgentDecision) {
    if (!task || !calls.length) return null;
    const current = calls.some(({ id }) => task.pending.some((call) => call.id === id));
    return <section className="agent-proposal">
      <p className="agent-entry-tag">实验方案{current ? ` · ${phases[busy === "running" ? "running" : task.phase]}` : ""}</p>
      {calls.map((call) => {
        const saved = task.runs.find(({ id }) => id === call.id);
        const pending = task.pending.some(({ id }) => id === call.id);
        return <article className="agent-tool" key={call.id}>
          <h3>{getExperimentEngine(call.tool)?.creator.title}</h3>
          <p className="agent-tool-id">{call.tool} · {saved ? "已运行" : pending ? phases[busy === "running" ? "running" : task.phase] : "方案已结束"}</p>
          <ToolDetails config={call.config} />
          <p>观察 · {creatorObservations[call.tool].metrics}</p>
        </article>;
      })}
      {decision && <details className="agent-events">
        <summary>计划与工具记录</summary>
        <p className="agent-entry-tag">AI 规划</p>
        {!!decision.plan?.length && <ol>{decision.plan.map((step, index) => <li key={index}>{step}</li>)}</ol>}
        <DecisionDetails decision={decision} runs={task.runs} />
        <p>记录模型 · {decision.model}</p>
      </details>}
      {current && <div className="agent-actions">
        <button type="button" className="agent-secondary" onClick={() => prefill("把实验参数改为：")} disabled={blocked}>修改参数</button>
        {approvalVisible && <button type="button" className="agent-primary" disabled={blocked || !!task.dialogue?.pending} onClick={() => void send("approve")}>
          <CatalogIcon icon="lucide:play" width={15} />{task.phase === "tool-error" || expired ? "重试运行" : "确认并运行"}
        </button>}
      </div>}
      {calls.map((call) => {
        const index = task.runs.findIndex(({ id }) => id === call.id);
        return index < 0 ? null : <RunEntry key={call.id} taskId={task.id} run={task.runs[index]} number={index + 1}
          diagnosis={diagnoses[call.id]} discuss={prefill} />;
      })}
    </section>;
  }

  const turnIds = new Set(task?.dialogue?.turns.flatMap((turn) => turn.proposalIds ?? []));
  const described = new Set(task?.decisions.flatMap((decision) => decision.calls?.map(({ id }) => id) ?? []));
  const legacyPending = task?.pending.filter(({ id }) => !described.has(id)) ?? [];
  const legacyRuns = task?.runs.filter(({ id }) => !described.has(id)) ?? [];
  const lastDecision = task?.decisions.at(-1);
  const hasMessages = !!(task?.dialogue?.turns.length || task?.dialogue?.pending || sent);
  const notice = intent === "diagnosis" && !task?.runs.length ? "运行一轮，即可诊断。" : intent === "run" && !task?.pending.length && !task?.runs.length && !savedPlan
    ? "先生成方案，再运行。" : intent === "config" && !canPlan && !task?.pending.length && !task?.runs.length && !savedPlan
      ? "先说说你想研究什么。" : undefined;

  return <section className="agent-workbench" aria-labelledby="creator-headline">
    <header className="agent-header">
      <div><p className="agent-entry-tag"><CatalogIcon icon="lucide:flask-conical" width={16} /> AI 实验创造台</p>
        <h1 id="creator-headline">聊聊你的想法。</h1></div>
      <nav className="agent-actions" aria-label="对话操作">
        <Link className="agent-secondary" href={settingsHref}><CatalogIcon icon="lucide:settings-2" width={15} /> AI 设置</Link>
        {task && !blocked && <Link className="agent-secondary" href={agentWorkbenchLink({ fresh: true })}><CatalogIcon icon="lucide:plus" width={15} /> 新对话</Link>}
      </nav>
    </header>
    <div className="agent-stream" aria-label="对话记录">
      {notice && <p className="agent-notice" role="status">{notice}</p>}
      {!hasMessages && !task?.pending.length && !task?.runs.length && !savedPlan && <div className="agent-empty">
        <p>问个概念，或做个实验。</p>
        <div className="agent-actions">
          <button type="button" className="agent-secondary" onClick={() => prefill("比较冒泡排序和快速排序。")}>比较两种排序 <CatalogIcon icon="lucide:arrow-up-right" width={14} /></button>
          <button type="button" className="agent-secondary" onClick={() => prefill("先序遍历和后序遍历有什么区别？")}>聊聊树遍历 <CatalogIcon icon="lucide:arrow-up-right" width={14} /></button>
        </div>
      </div>}
      {task?.dialogue?.turns.map((turn, index) => {
        const decision = turn.proposalIds?.length ? task.decisions.find(({ calls }) => calls?.some(({ id }) => turn.proposalIds?.includes(id))) : undefined;
        return <article key={index} className="agent-turn">
          <p className="agent-user">{turn.message}</p>
          <div className="agent-answer">
            {turn.action ? <><span className="agent-speaker"><CatalogIcon icon="lucide:sparkles" width={16} /> Agent</span>
              {turn.tutor ? <LazyTutorReply answer={turn.reply} codeBlocks={turn.tutor.codeBlocks} reveal={false} />
                : turn.action !== "run" || !decision
                ? <DecisionDetails decision={{ observation: turn.reply, evidence: turn.evidence }} runs={task.runs} />
                : proposal(decision.calls ?? [], decision)}
              {turn.scheduling && <SchedulingDetails evidence={turn.scheduling} />}</>
              : <p className="agent-muted">{turn.stopped ? "已停止回复。" : "未收到回复。"}</p>}
          </div>
        </article>;
      })}
      {task?.decisions.filter((decision) => decision.calls?.length && decision.calls.every(({ id }) => !turnIds.has(id)))
        .map((decision) => <div key={decision.calls?.[0].id} className="agent-answer">{proposal(decision.calls ?? [], decision)}</div>)}
      {!!legacyPending.length && <div className="agent-answer">{proposal(legacyPending)}</div>}
      {task && legacyRuns.map((run) => <div key={run.id} className="agent-answer">
        <RunEntry taskId={task.id} run={run} number={task.runs.indexOf(run) + 1} diagnosis={diagnoses[run.id]} discuss={prefill} />
      </div>)}
      {savedPlan && !task && <section className="agent-proposal agent-answer">
        <p className="agent-entry-tag">上次保存的方案</p><ToolDetails config={savedPlan} />
        <button type="button" className="agent-primary" disabled={blocked} onClick={() => void send("import")}>继续本次方案</button>
      </section>}
      {task?.phase === "finished" && lastDecision && <details className="agent-report agent-answer" open>
        <summary>最终实验报告</summary><DecisionDetails decision={lastDecision} runs={task.runs} report />
      </details>}
      {task?.question && <p className="agent-answer">{task.question}</p>}
      {(sent || task?.dialogue?.pending) && <article className="agent-turn">
        <p className="agent-user">{sent || task?.dialogue?.pending}</p>
        {!blocked && task?.dialogue?.pending && <button type="button" className="agent-secondary" onClick={() => void send("retry-message")}>重试回复</button>}
      </article>}
      {task && (task.phase === "ai-error" || (task.phase === "observe" && task.autoContinue === true) || (task.phase === "deciding" && expired)) && !task.dialogue?.pending &&
        <button type="button" className="agent-secondary" disabled={blocked} onClick={() => void send("decide")}>继续分析</button>}
      {(busy || dialogueBusy || workBusy) && <p className="agent-loading" role="status">
        <CatalogIcon icon="lucide:loader-circle" width={17} />
        {busy === "running" || task?.phase === "running" ? "工具运行中" : busy === "status" ? "正在更新" : "AI 正在回复"}
      </p>}
      {(error || task?.dialogue?.error || task?.error) && <div>
        <p className="agent-error" role="alert">{error || task?.dialogue?.error || task?.error}</p>
        {task && error && <button className="agent-secondary" type="button" disabled={blocked} onClick={() => void send("status")}>刷新状态</button>}
      </div>}
      <div className="agent-tail" ref={end} />
    </div>
    <div className="agent-dock">
      <form className="agent-composer" onSubmit={(event: FormEvent) => { event.preventDefault(); void send("message"); }}>
        <label htmlFor="agent-message" className="sr-only">发送消息</label>
        <textarea ref={input} id="agent-message" value={message} onChange={(event) => setMessage(event.target.value)}
          maxLength={maxQuestionLength} rows={2} placeholder="问个问题，或试个实验。"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!blocked) event.currentTarget.form?.requestSubmit();
            }
          }} />
        {canStop ? <button type="button" className="agent-primary" onClick={() => void stop()}>
          <CatalogIcon icon="lucide:square" width={15} /> 停止</button> : <button type="submit" className="agent-primary" disabled={blocked || !message.trim()}>
          <CatalogIcon icon="lucide:arrow-up" width={17} /> 发送</button>}
      </form>
      <p className="agent-dock-hint">Enter 发送 · Shift + Enter 换行</p>
    </div>
  </section>;
}
