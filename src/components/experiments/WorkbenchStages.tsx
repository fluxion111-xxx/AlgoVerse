"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AgentCall, AgentRun, AgentTask, AgentTurn } from "@/lib/experimentAgent";
import { creatorObservations } from "@/lib/creatorCapabilities";
import { getExperimentEngine, type ExperimentResults } from "@/lib/experimentEngines";
import { evidenceLabels } from "@/lib/experiments/evidence";
import { experimentReport } from "@/lib/experiments/report";
import { runAnalysisLink } from "@/lib/navigation";
import type { Diagnosis } from "@/lib/quickStart";
import { WorkbenchIcon, type WorkbenchIconName } from "./WorkbenchIcon";
import { DiagnosisSummary } from "./QuickStartDiagnosis";
import { DecisionDetails, RoundDifferences, SchedulingDetails } from "./WorkbenchEvidence";

const Replay = dynamic(() => import("./WorkbenchReplay").then((module) => module.WorkbenchReplay), {
  loading: () => <p role="status">正在载入播放器。</p>,
});

export function StageEmpty({ icon, title, description, children }: {
  icon: WorkbenchIconName; title: string; description: string; children?: ReactNode;
}) {
  return <div className="wb-empty">
    <span className="wb-section-icon"><WorkbenchIcon icon={icon} width={24} /></span>
    <h2>{title}</h2><p>{description}</p>
    {children && <div className="wb-actions">{children}</div>}
  </div>;
}

export const researchExamples = [
  { title: "比较冒泡与快排", prompt: "帮我比较冒泡排序和快速排序。", icon: "arrow-down-wide-narrow" },
  { title: "比较两种 CPU 调度", prompt: "比较先来先服务和时间片轮转。", icon: "cpu" },
  { title: "观察 A* 如何找路", prompt: "用同一张地图比较 A* 和 Dijkstra。", icon: "route" },
] as const;

function turnHypothesis(turn?: AgentTurn) {
  return turn?.message.split(/\r?\n/u).find((line) => line.startsWith("我的猜想："))?.slice("我的猜想：".length).trim();
}

export function proposalHypothesis(task: AgentTask | null, proposal?: AgentCall) {
  if (!task || !proposal) return undefined;
  const turns = task.dialogue?.turns ?? [];
  const index = turns.findLastIndex(({ proposalIds }) => proposalIds?.includes(proposal.id));
  const explicit = turnHypothesis(turns[index]);
  if (explicit || index < 0) return explicit;

  const firstRun = task.dialogue?.focus?.firstRun ?? 0;
  const olderIds = new Set(task.runs.slice(0, firstRun).map(({ id }) => id));
  if (olderIds.has(proposal.id)) return undefined;
  const boundary = turns.findLastIndex(({ proposalIds }) => proposalIds?.some((id) => olderIds.has(id)));
  if (firstRun && boundary < 0) return undefined;

  const sameGoalIds = new Set(task.decisions.flatMap(({ calls }) => (calls ?? [])
    .filter(({ tool, version, config }) => tool === proposal.tool && version === proposal.version && config.goalLabel === proposal.config.goalLabel)
    .map(({ id }) => id)));
  return turnHypothesis(turns.slice(boundary + 1, index).findLast((turn) =>
    turnHypothesis(turn) && turn.proposalIds?.some((id) => sameGoalIds.has(id))));
}

export function ResearchStage({ question, target, hypothesis, onHypothesis, blocked, prefill, submit, canSubmit, hasPlan, showPlan }: {
  question: string; target: string; hypothesis: string; onHypothesis: (value: string) => void;
  blocked: boolean; prefill: (text: string) => void; submit: () => void; canSubmit: boolean; hasPlan: boolean; showPlan: () => void;
}) {
  return <>
    <div className="wb-research">
      <section className="wb-research-question">
        <span className="wb-section-icon"><WorkbenchIcon icon="notebook-pen" width={25} /></span>
        <p className="wb-field-name">研究问题</p>
        <h2>{question || "你想验证什么？"}</h2>
        {target && target !== question ? <div className="wb-research-target"><span>研究目标</span><p>{target}</p></div>
          : !question && <p>从一个问题开始。</p>}
        <div className="wb-actions">
          {hasPlan && <button type="button" className="wb-button wb-primary" onClick={showPlan}>
            查看方案 <WorkbenchIcon icon="arrow-right" width={16} />
          </button>}
          {(!hasPlan || hypothesis.trim()) && <button type="button" className={hasPlan ? "wb-button" : "wb-button wb-primary"}
            disabled={blocked || !canSubmit} onClick={submit}>
            <WorkbenchIcon icon="sparkles" width={16} /> {hasPlan ? "带上猜想再规划" : "让 AI 设计实验"}
          </button>}
        </div>
      </section>
      <section className="wb-hypothesis">
        <label htmlFor="wb-hypothesis"><WorkbenchIcon icon="lightbulb" width={17} /> 写个猜想 <small>可选</small></label>
        <textarea id="wb-hypothesis" placeholder="你猜会发生什么？为什么？" value={hypothesis}
          onChange={(event) => onHypothesis(event.target.value)} rows={4} maxLength={120} />
        <p>规划时，带上你的猜想。</p>
      </section>
    </div>
    {!question && <section className="wb-examples" aria-labelledby="wb-examples-title">
      <h2 id="wb-examples-title">选个问题试试</h2>
      {researchExamples.map(({ title, prompt, icon }) => <button key={title} type="button" disabled={blocked} onClick={() => prefill(prompt)}>
        <WorkbenchIcon icon={icon} width={17} /><span>{title}</span>
        <WorkbenchIcon icon="arrow-up-right" width={15} />
      </button>)}
    </section>}
  </>;
}

export type Plan = Pick<AgentCall, "tool" | "version" | "config">;

function PlanParameters({ plan }: { plan: Plan }) {
  const { config, tool, version } = plan;
  const engine = getExperimentEngine(tool, version);
  return <article className="wb-plan-tool">
    <header><WorkbenchIcon icon="flask-conical" width={19} /><h3>{engine?.creator.title ?? tool}</h3><code>{tool}</code></header>
    <dl className="wb-list">
      <div><dt>实验目标</dt><dd>{config.goalLabel}</dd></div>
      {"values" in config && <>
        <div><dt>算法</dt><dd>冒泡排序 / 快速排序</dd></div>
        <div><dt>共用输入</dt><dd>{config.values.join("、")}</dd></div>
      </>}
      {"walls" in config && <div><dt>共用地图</dt><dd>{config.walls.length} 格障碍</dd></div>}
      {"processes" in config && <>
        <div><dt>调度策略</dt><dd>{config.policy === "fcfs" ? "先来先服务" : `时间片轮转 · ${config.quantum}`}</dd></div>
        <div><dt>进程配置</dt><dd>{config.processes.map(({ arrival, burst }, index) => `P${index + 1} (${arrival}, ${burst})`).join("、")}</dd></div>
      </>}
      {"nodes" in config && <div><dt>树节点</dt><dd>{config.nodes.map((node) => node ?? "空").join("、")}</dd></div>}
      {engine && <div><dt>观察指标</dt><dd>{creatorObservations[tool].metrics}</dd></div>}
    </dl>
    <details className="wb-details"><summary>完整参数</summary><pre className="wb-config" tabIndex={0}>{JSON.stringify(config, null, 2)}</pre></details>
  </article>;
}

export function PlanStage({ task, savedPlan, lastRun, hasResearch, blocked, modelBlocked, canApprove, retry, approve, edit, importPlan, ask, showRun }: {
  task: AgentTask | null; savedPlan?: Plan; lastRun?: AgentRun; hasResearch: boolean; blocked: boolean; modelBlocked: boolean; canApprove: boolean; retry: boolean;
  approve: () => void; edit: () => void; importPlan: () => void; ask: () => void; showRun: () => void;
}) {
  const pending = task?.pending ?? [];
  const decision = task?.decisions.findLast(({ calls }) => calls?.some(({ id }) => pending.some((call) => call.id === id)));
  if (!pending.length && !savedPlan && !lastRun) return <StageEmpty icon="clipboard-list" title="还没有实验方案"
    description={hasResearch ? "可以沿用当前研究问题。" : "给 AI 一个研究问题。"}>
    <button className="wb-button wb-primary" type="button" onClick={ask} disabled={hasResearch ? modelBlocked : blocked}>
      {hasResearch ? "让 AI 设计实验" : "去设计方案"} <WorkbenchIcon icon="arrow-right" width={16} />
    </button>
  </StageEmpty>;

  return <div className="wb-content-stack">
    <section className="wb-panel">
      <header className="wb-panel-head">
        <h2>{pending.length ? "本轮方案" : savedPlan ? "保存的方案" : "本轮运行配置"}</h2>
        {pending.length > 0 && <span className="wb-chip" data-tone="good"><WorkbenchIcon icon="shield-check" width={14} /> 参数校验通过</span>}
      </header>
      {decision?.observation && <p className="wb-panel-copy">{decision.observation}</p>}
      {decision?.plan?.length ? <ol className="wb-plan-steps">{decision.plan.map((step, index) => <li key={index}>{step}</li>)}</ol> : null}
      {pending.length ? pending.map((call) => <PlanParameters key={call.id} plan={call} />)
        : <PlanParameters plan={(savedPlan ?? lastRun)!} />}
      <footer className="wb-panel-foot">
        {pending.length > 0 && <>
          <button type="button" className="wb-button" onClick={edit} disabled={blocked}><WorkbenchIcon icon="sliders-horizontal" width={16} /> 修改参数</button>
          <button type="button" className="wb-button wb-primary" onClick={approve} disabled={!canApprove}>
            <WorkbenchIcon icon="play" width={16} /> {retry ? "重试运行" : "确认并运行"}
          </button>
        </>}
        {!pending.length && savedPlan && <button type="button" className="wb-button wb-primary" onClick={importPlan} disabled={blocked}>继续本次方案</button>}
        {!pending.length && !savedPlan && <>
          <button type="button" className="wb-button" onClick={edit} disabled={blocked}>修改后再试</button>
          <button type="button" className="wb-button" onClick={showRun}>查看本轮实测</button>
        </>}
      </footer>
    </section>
  </div>;
}

export type RunDetails = { results: ExperimentResults } | null | undefined;

export function RoundPicker({ runs, run, select }: { runs: AgentRun[]; run?: AgentRun; select: (id: string) => void }) {
  if (runs.length < 2) return null;
  return <label className="wb-round-picker">实验轮次
    <select value={run?.id ?? ""} onChange={(event) => select(event.target.value)}>
      {!run && <option value="" disabled>选择历史轮次</option>}
      {runs.map(({ id, tool, version }, index) => <option key={id} value={id}>
        第 {index + 1} 轮 · {getExperimentEngine(tool, version)?.creator.title ?? tool}
      </option>).reverse()}
    </select>
  </label>;
}

export function RunStage({ run, details, number, retry, showAnalysis }: {
  run: AgentRun; details: RunDetails; number: number; retry: () => void; showAnalysis: () => void;
}) {
  const engine = getExperimentEngine(run.tool, run.version);
  return <div className="wb-content-stack" id={`agent-run-${run.id}`}>
    <section className="wb-panel">
      <header className="wb-panel-head">
        <div><p className="wb-field-name">第 {number} 轮 · 实测</p><h2>{engine?.creator.title ?? run.tool}</h2></div>
        <button type="button" className="wb-button" onClick={showAnalysis}>查看诊断 <WorkbenchIcon icon="arrow-right" width={16} /></button>
      </header>
      <dl className="wb-metrics">{Object.entries(run.metrics).map(([metric, value]) => <div key={metric}>
        <dt>{evidenceLabels[metric]}</dt><dd>{value}</dd>
      </div>)}</dl>
      {run.tool === "sorting" && <p className="wb-panel-copy wb-muted">指标顺序 · 冒泡 / 快排</p>}
    </section>
    <section className="wb-panel">
      <header className="wb-panel-head"><h2>运行回放</h2>
        <Link className="wb-button wb-link" href={runAnalysisLink(run.id)}>打开详情 <WorkbenchIcon icon="arrow-up-right" width={15} /></Link>
      </header>
      <div className="wb-replay">
        {details ? <Replay run={run} results={details.results} />
          : details === null ? <p role="alert">回放加载失败。 <button className="wb-button" type="button" onClick={retry}>重试</button></p>
          : <p role="status">正在读取运行记录。</p>}
      </div>
      <p className="wb-panel-copy wb-muted">AI 关键帧讲解尚未开放。</p>
    </section>
  </div>;
}

export function AnalysisStage({ run, runs, details, diagnosis, task, diagnosing, diagnosisError, blocked, modelBlocked, canDiagnose, canAdopt, diagnose, stopDiagnosis, discuss, adopt, retry }: {
  run: AgentRun; runs: AgentRun[]; details: RunDetails; diagnosis?: Diagnosis; task: AgentTask | null; diagnosing: boolean;
  diagnosisError: string; blocked: boolean; modelBlocked: boolean; canDiagnose: boolean; canAdopt: boolean; diagnose: () => void; stopDiagnosis: () => void;
  discuss: (message: string) => void; adopt: (message: string) => void; retry: () => void;
}) {
  const number = runs.findIndex(({ id }) => id === run.id) + 1;
  const turns = task?.dialogue?.turns ?? [];
  const explanation = turns.findLast((turn) => turn.action === "explain"
    && turn.evidence.some(({ from, to }) => from === number || to === number));
  const finalDecision = task?.phase === "finished" ? task.decisions.at(-1) : undefined;
  const final = finalDecision?.evidence.some(({ from, to }) => from === number || to === number) ? finalDecision : undefined;
  const hypothesis = proposalHypothesis(task, run);
  const report = details ? experimentReport(run.config, details.results) : undefined;
  const suggestion = diagnosis?.suggestion ?? report?.suggestion;
  const compareHypothesis = `用第 ${number} 轮的实测检验我当时的猜想。`;
  return <div className="wb-content-stack">
    <section className="wb-panel">
      <header className="wb-panel-head"><div><p className="wb-field-name">第 {number} 轮 · 证据</p><h2>结果诊断</h2></div>
        <Link className="wb-button wb-link" href={runAnalysisLink(run.id, true)}>打开详情 <WorkbenchIcon icon="arrow-up-right" width={15} /></Link>
      </header>
      <div className="wb-panel-body">
        {report && <div className="wb-report"><strong>{report.conclusion}</strong><p>{report.explanation}</p></div>}
        {details === undefined && !diagnosis && <p role="status">正在读取运行记录。</p>}
        {details === null && <p role="alert">读取结果失败。 <button className="wb-button" type="button" onClick={retry}>重试</button></p>}
        {explanation && <details className="wb-details" open>
          <summary>Agent 实测解读</summary>
          <DecisionDetails decision={{ observation: explanation.reply ?? "", evidence: explanation.evidence ?? [] }} runs={runs} />
          {explanation.scheduling && <SchedulingDetails evidence={explanation.scheduling} />}
        </details>}
        {final && <details className="wb-details" open><summary>Agent 任务报告</summary><DecisionDetails decision={final} runs={runs} report /></details>}
        {diagnosis && <details className="wb-details" open><summary>本轮 AI 诊断</summary><DiagnosisSummary diagnosis={diagnosis} evidence={run.metrics} /></details>}
        {diagnosisError && <p className="wb-alert" role="alert">{diagnosisError}</p>}
      </div>
      <footer className="wb-panel-foot">
        {diagnosing ? <button type="button" className="wb-button" onClick={stopDiagnosis}>停止诊断</button>
          : !diagnosis && <button type="button" className="wb-button" onClick={diagnose} disabled={modelBlocked || !canDiagnose}>生成 AI 诊断</button>}
        <button type="button" className="wb-button" disabled={blocked} onClick={() => discuss(`请分析第 ${number} 轮的实测结果。`)}>问 Agent</button>
      </footer>
    </section>
    <section className="wb-panel">
      <header className="wb-panel-head"><h2>猜想与差异</h2></header>
      <div className="wb-panel-body">
        {hypothesis ? <div className="wb-hypothesis-result"><p>{hypothesis}</p>
          <button type="button" className="wb-button" disabled={blocked} onClick={() => discuss(compareHypothesis)}>用实测检验猜想</button>
        </div> : <p className="wb-muted">本轮未记录猜想。</p>}
        <RoundDifferences run={run} rounds={runs} firstRun={task?.dialogue?.focus?.firstRun ?? 0} />
      </div>
    </section>
    <section className="wb-panel">
      <header className="wb-panel-head"><h2>下一轮怎么试</h2></header>
      <div className="wb-panel-body"><p>{suggestion ?? "可请 Agent 给个复测方向。"}</p></div>
      <footer className="wb-panel-foot">
        <button type="button" className="wb-button" disabled={blocked} onClick={() => discuss(`结合第 ${number} 轮实测，建议下一轮实验。`)}>请 Agent 给建议</button>
        {suggestion && canAdopt && <button type="button" className="wb-button wb-primary" disabled={modelBlocked}
          onClick={() => adopt(`沿用第 ${number} 轮配置。拟个新草稿。避开已跑的配置。建议：${suggestion}`)}>采纳并生成草稿</button>}
      </footer>
    </section>
  </div>;
}
