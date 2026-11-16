"use client";

import { schedulingWaitReport, type AgentDecision, type AgentRun, type SchedulingEvidence } from "@/lib/experimentAgent";
import { evidenceLabels } from "@/lib/experiments/evidence";
import { experimentRunComparison } from "@/lib/experiments/runComparison";
import { LazyTutorReply } from "./LazyTutorReply";

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

export function SchedulingDetails({ evidence }: { evidence: SchedulingEvidence[] }) {
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

export function RoundDifferences({ run, rounds, firstRun }: { run: AgentRun; rounds: AgentRun[]; firstRun: number }) {
  const index = rounds.findIndex(({ id }) => id === run.id);
  if (index < firstRun) return <p className="wb-muted">历史轮次可单独查看。</p>;
  const previousIndex = rounds.findLastIndex((previous, round) => round >= firstRun && round < index
    && previous.tool === run.tool && previous.version === run.version
    && Object.keys(run.metrics).some((metric) => Object.hasOwn(previous.metrics, metric)));
  if (previousIndex < 0) return <p className="wb-muted">等一轮同类实测。</p>;
  const comparison = experimentRunComparison([
    { ...rounds[previousIndex], round: previousIndex + 1 },
    { ...run, round: index + 1 },
  ], run.tool, run.version);
  const change = comparison.changes[0];
  return <details className="wb-details" open>
    <summary>第 {change.from} 轮 → 第 {change.to} 轮</summary>
    <p>{change.detail}</p>
    {change.parameters.length > 0 && <dl className="wb-list">
      {change.parameters.map(({ label, previous, value }, i) => <div key={i}>
        <dt>{label}</dt><dd>{JSON.stringify(previous) ?? "—"} → {JSON.stringify(value) ?? "—"}</dd>
      </div>)}
    </dl>}
    <div className="wb-table" tabIndex={0} aria-label="两轮指标">
      <table><thead><tr><th scope="col">指标</th><th scope="col">第 {change.from} 轮</th><th scope="col">第 {change.to} 轮</th></tr></thead>
        <tbody>{Object.entries(run.metrics).filter(([metric]) => Object.hasOwn(rounds[previousIndex].metrics, metric)).map(([metric, value]) =>
          <tr key={metric}><th scope="row">{evidenceLabels[metric]}</th>
            <td>{rounds[previousIndex].metrics[metric]}</td><td>{value}</td></tr>)}</tbody>
      </table>
    </div>
  </details>;
}

