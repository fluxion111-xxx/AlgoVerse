"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AgentCall, AgentRun, AgentTask, AgentTurn } from "@/lib/experimentAgent";
import { creatorObservations } from "@/lib/creatorCapabilities";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { evidenceLabels } from "@/lib/experiments/evidence";
import { parseEvidencePosition, type RunEvidenceReference } from "@/lib/experiments/evidencePosition";
import { experimentReport } from "@/lib/experiments/report";
import { adaptEvidenceRun, citedRunEvidence, precedingEvidenceRound, referenceFor, resolveEvidence, verifyRunEvidence, type EvidenceRunData } from "@/lib/experiments/runEvidence";
import type { EvidenceExplanation } from "@/lib/experiments/keyframeEvidence";
import { explorationBlock, type ExplorationChange, type ExplorationSuggestion } from "@/lib/experiments/exploration";
import { parameterLabels } from "@/lib/experiments/runComparison";
import { runAnalysisLink } from "@/lib/navigation";
import type { Diagnosis } from "@/lib/quickStart";
import { WorkbenchIcon, type WorkbenchIconName } from "./WorkbenchIcon";
import { DiagnosisSummary } from "./QuickStartDiagnosis";
import { ConfidenceCheck, DecisionDetails, EvidenceLinks, RoundDifferences, SchedulingDetails } from "./WorkbenchEvidence";
import { KeyframeExplanation } from "./KeyframeExplanation";
import { ExplorationNavigation } from "./ExplorationNavigation";

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
  const questionText = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    if (expanded || !questionText.current) return;
    const element = questionText.current;
    const measure = () => setClipped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    return () => resize.disconnect();
  }, [expanded, question]);

  return <div className="wb-research">
    <div className="wb-research-main">
      <section className="wb-research-question" aria-labelledby="wb-question-title">
        <h3 className="wb-field-name" id="wb-question-title">研究问题</h3>
        <p className="wb-question-text" id="wb-question-text" data-expanded={expanded} ref={questionText}>{question || "你想验证什么？"}</p>
        {(clipped || expanded) && <button className="wb-question-toggle" type="button" aria-expanded={expanded} aria-controls="wb-question-text"
          onClick={() => setExpanded(!expanded)}>{expanded ? "收起全文" : "展开全文"}</button>}
        {target && target !== question && <div className="wb-research-target"><span>研究目标</span><p>{target}</p></div>}
        {!question && <p className="wb-muted">在下方输入问题，或选个示例。</p>}
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
      {!question && <section className="wb-examples" aria-labelledby="wb-examples-title">
        <h2 id="wb-examples-title">选个问题试试</h2>
        {researchExamples.map(({ title, prompt, icon }) => <button key={title} type="button" disabled={blocked} onClick={() => prefill(prompt)}>
          <WorkbenchIcon icon={icon} width={17} /><span>{title}</span>
          <WorkbenchIcon icon="arrow-up-right" width={15} />
        </button>)}
      </section>}
    </div>
    <section className="wb-hypothesis">
      <label htmlFor="wb-hypothesis"><WorkbenchIcon icon="lightbulb" width={17} /> 写个猜想 <small>可选</small></label>
      <textarea id="wb-hypothesis" aria-describedby="wb-hypothesis-hint" placeholder="你猜会发生什么？" value={hypothesis}
        onChange={(event) => onHypothesis(event.target.value)} rows={4} maxLength={120} />
      <p id="wb-hypothesis-hint">规划时，带上你的猜想。</p>
    </section>
  </div>;
}

export type Plan = Pick<AgentCall, "tool" | "version" | "config">;

const planParameterLabels: Readonly<Record<string, string>> = { values: "共用输入", difficulty: "地图难度", nodes: "树节点" };
const mapDifficulties: Readonly<Record<string, string>> = { easy: "简单", normal: "普通", hard: "困难" };

function planValue(key: string, value: unknown, config: Plan["config"]) {
  if (key === "policy") return value === "rr" ? "时间片轮转" : "先来先服务";
  if (key === "directed") return value ? "有向" : "无向";
  if (key === "difficulty" && typeof value === "string") return mapDifficulties[value] ?? value;
  if (key === "walls" && "walls" in config) return `${config.walls.length} 格障碍`;
  if (key === "processes" && "processes" in config) {
    return config.processes.map(({ arrival, burst }, index) => `P${index + 1} (${arrival}, ${burst})`).join("、");
  }
  if (Array.isArray(value)) {
    if (value.length > 20 || value.some((item) => item !== null && typeof item === "object")) return `${value.length} 项`;
    return value.map((item) => item ?? "空").join("、") || "空";
  }
  if (value && typeof value === "object") return `${Object.keys(value).length} 项`;
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value ?? "空");
}

function PlanParameters({ plan, group }: { plan: Plan; group?: number }) {
  const { config, tool, version } = plan;
  const engine = getExperimentEngine(tool, version);
  const observations = engine && creatorObservations[tool];
  const fields = engine && "curriculum" in engine ? engine.curriculum.fields : undefined;
  const parameters = Object.entries(config).filter(([key]) => key !== "goalLabel" && key !== "algorithms"
    && !(key === "quantum" && "policy" in config && config.policy === "fcfs"));

  return <article className="wb-plan-tool">
    <header>
      <WorkbenchIcon icon="flask-conical" width={19} />
      <h3>{group === undefined ? engine?.creator.title ?? tool : `第 ${group} 组 · ${engine?.creator.title ?? tool}`}</h3>
      <code>{tool}</code>
    </header>
    <div className="wb-plan-columns">
      <div className="wb-plan-context">
        <h4>目标与观测</h4>
        <dl className="wb-list">
          <div><dt>实验目标</dt><dd>{config.goalLabel}</dd></div>
          {observations?.comparison && <div><dt>对照条件</dt><dd>{observations.comparison}</dd></div>}
          {observations && <div><dt>观察指标</dt><dd>{observations.metrics}</dd></div>}
        </dl>
      </div>
      <div className="wb-plan-parameters">
        <h4>实验参数</h4>
        <dl className="wb-list">
          {parameters.map(([key, value]) => <div key={key}>
            <dt>{fields?.find(([name]) => name === key)?.[1].label ?? planParameterLabels[key] ?? parameterLabels[key] ?? key}</dt>
            <dd>{planValue(key, value, config)}</dd>
          </div>)}
        </dl>
        <details className="wb-details"><summary>完整参数</summary><pre className="wb-config" tabIndex={0}>{JSON.stringify(config, null, 2)}</pre></details>
      </div>
    </div>
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

  return <section className="wb-panel wb-plan" aria-labelledby="wb-plan-title">
    <header className="wb-panel-head">
      <h2 id="wb-plan-title">{pending.length ? "本轮方案" : savedPlan ? "保存的方案" : "本轮运行配置"}</h2>
      {pending.length > 0 && <span className="wb-chip" data-tone="good"><WorkbenchIcon icon="shield-check" width={14} /> 参数校验通过</span>}
    </header>
    <div className="wb-plan-scroll" tabIndex={0} role="region" aria-label="方案详情">
      {(decision?.observation || !!decision?.plan?.length) && <section className="wb-plan-overview">
        <h3>方案说明</h3>
        {decision.observation && <p>{decision.observation}</p>}
        {!!decision.plan?.length && <ol className="wb-plan-steps">{decision.plan.map((step, index) => <li key={index}>{step}</li>)}</ol>}
      </section>}
      {pending.length ? pending.map((call, index) => <PlanParameters key={call.id} plan={call} group={pending.length > 1 ? index + 1 : undefined} />)
        : <PlanParameters plan={(savedPlan ?? lastRun)!} />}
    </div>
    <footer className="wb-panel-foot wb-plan-actions">
      {pending.length > 0 && <p className="wb-muted">{pending.length > 1 ? `本次确认包含 ${pending.length} 组方案。` : "核对参数后再运行。"}</p>}
      <div className="wb-actions">
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
      </div>
    </footer>
  </section>;
}

export type RunDetails = EvidenceRunData | null | undefined;

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

const pairedRunMetrics: Partial<Record<AgentRun["tool"], { columns: [string, string]; metrics: string[] }>> = {
  sorting: { columns: ["冒泡排序", "快速排序"], metrics: ["comparisons", "swaps"] },
  pathfinding: { columns: ["Dijkstra", "A*"], metrics: ["visited", "pathLength", "elapsedMs"] },
};

function RunMetrics({ run, highlight }: { run: AgentRun; highlight?: string }) {
  const group = pairedRunMetrics[run.tool];
  const metrics = Object.entries(run.metrics);
  const pairs = group ? metrics.flatMap(([metric, value]) => {
    if (!group.metrics.includes(metric)) return [];
    const [left, right, extra] = value.split(" / ");
    if (!left || !right || extra !== undefined) return [];
    const timed = metric === "elapsedMs" && right.endsWith(" ms");
    return [{ metric, label: timed ? `${evidenceLabels[metric]}（ms）` : evidenceLabels[metric], left, right: timed ? right.slice(0, -3) : right }];
  }) : [];
  const remaining = metrics.filter(([key]) => !pairs.some(({ metric }) => metric === key));

  return <div className="wb-run-metric-data">
    {group && pairs.length > 0 && <table className="wb-run-comparison" aria-label="本轮算法对比">
      <thead><tr><th scope="col">指标</th>{group.columns.map((name) => <th key={name} scope="col">{name}</th>)}</tr></thead>
      <tbody>{pairs.map(({ metric, label, left, right }) => <tr key={metric} data-evidence-target={`metric:${metric}`}
        data-evidence-highlight={highlight === metric || undefined} tabIndex={highlight === metric ? -1 : undefined}>
        <th scope="row">{label}</th><td>{left}</td><td>{right}</td>
      </tr>)}</tbody>
    </table>}
    {remaining.length > 0 && <dl className="wb-metrics">{remaining.map(([metric, value]) => <div key={metric} data-evidence-target={`metric:${metric}`}
      data-evidence-highlight={highlight === metric || undefined} tabIndex={highlight === metric ? -1 : undefined}>
      <dt>{evidenceLabels[metric]}</dt><dd>{value}</dd>
    </div>)}</dl>}
  </div>;
}

export function RunStage({ run, runs, details, number, researchId, evidence, evidenceNavigation, evidenceError,
  canExplain, explanationModel, locateEvidence, explainEvidence, selectRound, retry, showAnalysis }: {
  run: AgentRun; runs: AgentRun[]; details: RunDetails; number: number; selectRound: (id: string) => void;
  researchId?: string; evidence?: string; retry: () => void; showAnalysis: () => void;
  evidenceNavigation: number; evidenceError: string; canExplain: boolean; explanationModel: string;
  locateEvidence: (reference: RunEvidenceReference) => boolean;
  explainEvidence: (reference: RunEvidenceReference, controller: AbortController) => Promise<EvidenceExplanation>;
}) {
  const engine = getExperimentEngine(run.tool, run.version);
  const metrics = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const position = parseEvidencePosition(evidence);
  const data = researchId ? adaptEvidenceRun(researchId, run, details) : null;
  const reference = data && position ? referenceFor(data, position) : undefined;
  const target = reference ? resolveEvidence(data, reference) : null;
  const token = target?.token;
  const playbackTarget = token && position?.kind !== "metric" ? token : undefined;
  useEffect(() => {
    if (!token) return;
    const element = Array.from(stage.current?.querySelectorAll<HTMLElement>("[data-evidence-target]") ?? [])
      .find((node) => node.dataset.evidenceTarget === token);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [run.id, token, evidenceNavigation]);
  return <div className="wb-run" id={`agent-run-${run.id}`} ref={stage}>
    <header className="wb-panel-head wb-run-title">
      <div>
        {runs.length < 2 && <p className="wb-field-name">第 {number} 轮 · 实测</p>}
        <h2>{engine?.creator.title ?? run.tool}</h2>
      </div>
      <div className="wb-run-toolbar">
        <RoundPicker runs={runs} run={run} select={selectRound} />
        <button type="button" className="wb-button wb-link wb-run-metrics-link" onClick={() => {
          metrics.current?.focus({ preventScroll: true });
          metrics.current?.scrollIntoView({ block: "start", behavior: "instant" });
        }}>实测指标 <WorkbenchIcon icon="chevron-down" width={15} /></button>
      </div>
    </header>
    {evidence && <p className={target ? "wb-evidence-status" : "wb-muted"} role="status">
      {target ? `第 ${number} 轮 · ${target.label}` : details === undefined && position ? "正在定位证据。" : "找不到这条证据。"}
    </p>}
    {evidenceError && <p className="wb-alert" role="alert">{evidenceError}</p>}
    <div className="wb-run-grid">
      <section className="wb-run-playback" aria-labelledby="wb-run-playback-title" data-evidence-target={playbackTarget}
        data-evidence-highlight={!!playbackTarget || undefined} data-evidence-position={position?.kind === "result" && target ? position.key : undefined}
        tabIndex={playbackTarget ? -1 : undefined}>
        <h3 className="sr-only" id="wb-run-playback-title">运行回放</h3>
        <div className="wb-replay">
          {data ? <Replay key={playbackTarget ? `${run.id}:${playbackTarget}:${evidenceNavigation}` : run.id}
            run={{ ...run, config: data.data.config }} results={data.data.results} evidenceStep={target?.replayStep} />
            : details !== undefined ? <p role="alert">回放加载失败。 <button className="wb-button" type="button" onClick={retry}>重试</button></p>
            : <p role="status">正在读取运行记录。</p>}
        </div>
        {data && <KeyframeExplanation key={`${run.id}:${explanationModel}`} run={data} reference={reference}
          canExplain={canExplain} locate={locateEvidence} explain={explainEvidence} />}
      </section>
      <section className="wb-run-summary" ref={metrics} tabIndex={-1} aria-labelledby="wb-run-metrics-title">
        <h3 id="wb-run-metrics-title">实测指标</h3>
        <RunMetrics key={run.id} run={data ? { ...run, metrics: data.metrics } : run}
          highlight={token && position?.kind === "metric" ? position.key : undefined} />
        <div className="wb-run-links">
          <button type="button" className="wb-button" onClick={showAnalysis}>查看诊断 <WorkbenchIcon icon="arrow-right" width={16} /></button>
          <Link className="wb-button wb-link" href={runAnalysisLink(run.id)}>打开详情 <WorkbenchIcon icon="arrow-up-right" width={15} /></Link>
        </div>
      </section>
    </div>
  </div>;
}

export function AnalysisStage({ run, runs, details, diagnosis, task, researchId, runDetails, evidenceError, showEvidence, diagnosing, diagnosisError, blocked, modelBlocked, canDiagnose, diagnose, stopDiagnosis, discuss, guess, explore, adopt, retry }: {
  run: AgentRun; runs: AgentRun[]; details: RunDetails; diagnosis?: Diagnosis; task: AgentTask | null; diagnosing: boolean;
  researchId?: string; runDetails: Record<string, RunDetails>; evidenceError: string;
  showEvidence: (reference: RunEvidenceReference) => void;
  diagnosisError: string; blocked: boolean; modelBlocked: boolean; canDiagnose: boolean; diagnose: () => void; stopDiagnosis: () => void;
  discuss: (message: string) => void; guess: string; explore: (controller: AbortController) => Promise<ExplorationSuggestion[]>;
  adopt: (change: ExplorationChange) => void; retry: () => void;
}) {
  const number = runs.findIndex(({ id }) => id === run.id) + 1;
  const turns = task?.dialogue?.turns ?? [];
  const explanation = turns.findLast((turn) => turn.action === "explain"
    && turn.evidence.some(({ from, to }) => from === number || to === number));
  const finalDecision = task?.phase === "finished" ? task.decisions.at(-1) : undefined;
  const final = finalDecision?.evidence.some(({ from, to }) => from === number || to === number) ? finalDecision : undefined;
  const hypothesis = proposalHypothesis(task, run);
  const evidenceRuns = runs.map((round) => researchId ? adaptEvidenceRun(researchId, round, runDetails[round.id]) : null);
  const current = evidenceRuns[number - 1];
  const firstRound = task?.dialogue?.focus?.firstRun ?? 0;
  const previous = precedingEvidenceRound(runs, number - 1, firstRound);
  const previousEvidence = previous ? evidenceRuns[runs.indexOf(previous)] : null;
  const verifiedRounds = runs.map((round, index) => ({ ...round, metrics: evidenceRuns[index]?.metrics ?? {} }));
  const result = current ? verifyRunEvidence(current, previousEvidence, diagnosis?.evidence) : null;
  const report = current ? experimentReport(current.data.config, current.data.results) : undefined;
  const suggestion = current ? diagnosis?.suggestion ?? report?.suggestion : undefined;
  const compareHypothesis = `用第 ${number} 轮的实测检验我当时的猜想。`;
  return <div className="wb-content-stack wb-analysis">
    <section className="wb-panel wb-analysis-report">
      <header className="wb-panel-head"><div><p className="wb-field-name">第 {number} 轮 · 证据</p><h2>结果诊断</h2></div>
        <Link className="wb-button wb-link" href={runAnalysisLink(run.id, true)}>打开详情 <WorkbenchIcon icon="arrow-up-right" width={15} /></Link>
      </header>
      <div className="wb-panel-body">
        {report && <div className="wb-report" key={`report-${run.id}`}><strong>{report.conclusion}</strong><p>{report.explanation}</p></div>}
        {details === undefined && !diagnosis && <p role="status">正在读取运行记录。</p>}
        {details !== undefined && !current && <p role="alert">读取结果失败。 <button className="wb-button" type="button" onClick={retry}>重试</button></p>}
        <ConfidenceCheck result={result} openEvidence={showEvidence} waiting={details === undefined} />
        {evidenceError && <p className="wb-alert" role="alert">{evidenceError}</p>}
        {current && explanation && <details className="wb-details" open>
          <summary>Agent 实测解读</summary>
          <p className="wb-muted">AI 解读。请对照实测证据。</p>
          <DecisionDetails decision={{ observation: explanation.reply ?? "", evidence: explanation.evidence ?? [] }} runs={verifiedRounds} />
          {explanation.scheduling && <SchedulingDetails evidence={explanation.scheduling} />}
          <EvidenceLinks links={citedRunEvidence(explanation.evidence ?? [], evidenceRuns)} openEvidence={showEvidence} />
        </details>}
        {current && final && <details className="wb-details" open><summary>Agent 任务报告</summary>
          <DecisionDetails decision={final} runs={verifiedRounds} report />
          <EvidenceLinks links={citedRunEvidence(final.evidence, evidenceRuns)} openEvidence={showEvidence} />
        </details>}
        {current && diagnosis && <details className="wb-details wb-diagnosis-result" key={`diagnosis-${run.id}`} open>
          <summary>本轮 AI 诊断</summary><DiagnosisSummary diagnosis={diagnosis} evidence={current.metrics} />
          <EvidenceLinks links={citedRunEvidence(diagnosis.evidence.map((metric) => ({ from: number, to: number, metric })), evidenceRuns)} openEvidence={showEvidence} />
        </details>}
        {diagnosisError && <p className="wb-alert" role="alert">{diagnosisError}</p>}
      </div>
      <footer className="wb-panel-foot">
        {diagnosing ? <button type="button" className="wb-button" onClick={stopDiagnosis}>停止诊断</button>
          : !diagnosis && <button type="button" className="wb-button" onClick={diagnose} disabled={modelBlocked || !canDiagnose || !current}>生成 AI 诊断</button>}
        <button type="button" className="wb-button" disabled={blocked} onClick={() => discuss(`请分析第 ${number} 轮的实测结果。`)}>问 Agent</button>
      </footer>
    </section>
    <section className="wb-panel">
      <header className="wb-panel-head"><h2>猜想与差异</h2></header>
      <div className="wb-panel-body">
        {hypothesis ? <div className="wb-hypothesis-result"><p>{hypothesis}</p>
          <button type="button" className="wb-button" disabled={blocked} onClick={() => discuss(compareHypothesis)}>用实测检验猜想</button>
        </div> : <p className="wb-muted">本轮未记录猜想。</p>}
        {current ? <RoundDifferences run={verifiedRounds[number - 1]} rounds={verifiedRounds} firstRun={firstRound} />
          : <p className="wb-muted">暂无可验证证据</p>}
      </div>
    </section>
    <ExplorationNavigation key={JSON.stringify([run.id, task?.revision, guess])} legacySuggestion={suggestion}
      unavailable={current ? explorationBlock(task, run.id) : details === undefined ? "正在读取本轮实测。" : "暂无可验证证据。"}
      modelBlocked={modelBlocked} blocked={blocked} generate={explore} adopt={adopt} />
  </div>;
}
