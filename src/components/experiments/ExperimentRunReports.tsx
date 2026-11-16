import type { ReactNode } from "react";
import Link from "next/link";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { experimentReport } from "@/lib/experiments/report";
import { experimentRunComparison, type ComparisonRun } from "@/lib/experiments/runComparison";
import { runAnalysisLink, workflowAISettingsRoute } from "@/lib/navigation";
import { getComparableExperimentRuns, getDiagnosis, type ExperimentRun } from "@/lib/server/experimentRecords";
import { QuickStartDiagnosis } from "./QuickStartDiagnosis";

function parameterValue(value: unknown) {
  if (value === "rr") return "时间片轮转";
  if (value === "fcfs") return "先来先服务";
  if (value === "euclidean") return "欧氏距离";
  if (value === "manhattan") return "曼哈顿距离";
  if (typeof value === "boolean") return value ? "启用" : "关闭";
  return JSON.stringify(value) ?? "—";
}

export async function ExperimentRunReports({ run, history, settingsHref, children }: {
  run: ExperimentRun;
  history?: readonly ComparisonRun[];
  settingsHref?: string;
  children?: ReactNode;
}) {
  const { config, engineId, engineVersion } = run.session;
  const [runs, diagnosis] = await Promise.all([history ?? getComparableExperimentRuns(run), getDiagnosis(run.id)]);
  const report = experimentReport(config, run.results);
  const metrics = experimentEvidence(run.results);
  const comparison = experimentRunComparison(runs, engineId, engineVersion);
  const input = engineId === "sorting" && "values" in config ? config.values : null;
  return <>
    <section className="workflow-note experiment-run-report" aria-labelledby="run-report-title">
      <h2 id="run-report-title">本轮实验报告</h2>
      <h3 className="experiment-report-label">最终结论</h3>
      <p className="experiment-report-lead">{report.conclusion}</p>
      <h3 className="experiment-report-label">详细报告</h3>
      <p className="experiment-report-copy">{report.detail}</p>
      {input && <p className="experiment-report-meta">计数顺序 · 冒泡 / 快排</p>}
      {"dijkstra" in run.results && <p className="experiment-report-meta">指标顺序 · Dijkstra / A*</p>}
      <dl className="preset-details experiment-report-metrics">
        {input && <div><dt>原始输入</dt><dd>{input.join("、")}</dd></div>}
        {Object.entries(metrics).map(([key, value]) => <div key={key}><dt>{evidenceLabels[key]}</dt><dd>{value}</dd></div>)}
        <div><dt>完成时间</dt><dd><time dateTime={run.completedAt}>{run.completedAt.replace("T", " ").slice(0, 16)} UTC</time></dd></div>
      </dl>
      <details><summary>本轮参数</summary><pre className="experiment-report-config">{JSON.stringify(config, null, 2)}</pre></details>
    </section>
    {comparison.rounds.length > 1 && <section className="workflow-note experiment-run-report" aria-labelledby="run-comparison-title">
      <h2 id="run-comparison-title">多轮实测对比</h2>
      <h3 className="experiment-report-label">最终结论</h3>
      <p className="experiment-report-lead">{comparison.conclusion}</p>
      <h3 className="experiment-report-label">逐轮变化</h3>
      <ol className="experiment-report-changes">
        {comparison.changes.map(({ from, to, detail, metrics: changedMetrics, parameters }) => <li key={to}>
          <strong>第 {from} 轮 → 第 {to} 轮</strong>
          <p className="experiment-report-copy">{detail}</p>
          {parameters.length > 0 && <details>
            <summary>改动 · {parameters.map(({ label }) => label).join("、")}</summary>
            <dl className="preset-details experiment-report-metrics">
              {parameters.map(({ label, previous, value }) => <div key={label}><dt>{label}</dt>
                <dd>{parameterValue(previous)} → {parameterValue(value)}</dd></div>)}
            </dl>
          </details>}
          {changedMetrics.length > 0 && <dl className="preset-details experiment-report-metrics">
            {changedMetrics.map(({ key, label, previous, value, deltas }) => <div key={key}><dt>{label}</dt>
              <dd>{previous} <span className="experiment-report-change-word">变为</span> {value}{deltas.length > 0 && <small>差值 · {deltas.join("、")}</small>}</dd></div>)}
          </dl>}
        </li>)}
      </ol>
      {comparison.sorting && <p className="experiment-report-meta" id="run-comparison-order">计数顺序 · 冒泡 / 快排</p>}
      <div className="experiment-report-table" role="region" aria-label="各轮实测数据" tabIndex={0}>
        <table aria-describedby={comparison.sorting ? "run-comparison-order" : undefined}>
          <thead><tr><th scope="col">轮次</th>{comparison.sorting && <th scope="col">原始输入</th>}
            {comparison.keys.map((key) => <th scope="col" key={key}>{evidenceLabels[key]}</th>)}
          </tr></thead>
          <tbody>{comparison.rounds.map((entry) => <tr key={entry.id}>
            <th scope="row"><Link href={`${runAnalysisLink(entry.id)}#run-comparison-title`} aria-current={entry.id === run.id ? "page" : undefined}>
              第 {entry.round} 轮{entry.id === run.id ? " · 本轮" : ""}</Link></th>
            {comparison.sorting && <td>{entry.input?.join("、")}</td>}
            {comparison.keys.map((key) => <td key={key}>{entry.metrics[key] ?? "—"}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>}
    <section className="workflow-note experiment-run-report" id="run-diagnosis" aria-label="本轮诊断">
      <div id="creator-diagnosis">
        <QuickStartDiagnosis diagnosis={diagnosis} runId={run.id} report={report}
          settingsHref={run.session.source ? settingsHref ?? workflowAISettingsRoute(runAnalysisLink(run.id, true)) : undefined} />
        {children}
      </div>
    </section>
  </>;
}
