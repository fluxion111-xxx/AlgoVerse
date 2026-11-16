import type { Diagnosis } from "@/lib/quickStart";
import { evidenceLabels } from "@/lib/experiments/evidence";
import type { experimentReport } from "@/lib/experiments/report";
import { QuickStartRequest } from "./QuickStartRequest";

export function DiagnosisSummary({ diagnosis, evidence }: {
  diagnosis: Diagnosis;
  evidence: Record<string, string>;
}) {
  return <>
    <h3>最终结论</h3><p>{diagnosis.conclusion}</p>
    <h3>详细报告</h3><p>{diagnosis.explanation}</p>
    <table>
      <caption className="sr-only">本轮诊断的数据依据</caption>
      <thead><tr><th scope="col">数据依据</th><th scope="col">本轮结果</th></tr></thead>
      <tbody>{diagnosis.evidence.filter((metric) => Object.hasOwn(evidence, metric)).map((metric) => (
        <tr key={metric}><th scope="row">{evidenceLabels[metric]}</th><td>{evidence[metric]}</td></tr>
      ))}</tbody>
    </table>
    <h3>下一步建议</h3><p>{diagnosis.suggestion}</p>
  </>;
}

export function QuickStartDiagnosis({ diagnosis, runId, report, settingsHref }: {
  diagnosis: Diagnosis | null;
  runId: string;
  report: ReturnType<typeof experimentReport>;
  settingsHref?: string;
}) {
  return (
    <section className="quick-start-diagnosis" aria-labelledby="quick-start-diagnosis-title">
      <div className="experiment-section-head"><h2 id="quick-start-diagnosis-title">{diagnosis ? "本轮 AI 诊断" : "本地实验诊断"}</h2></div>
      <h3 className="experiment-report-label">最终结论</h3>
      <p className="experiment-report-lead">{report.conclusion}</p>
      <h3 className="experiment-report-label">详细诊断</h3>
      <p className="experiment-report-copy">{report.explanation}</p>
      <h3 className="experiment-report-label">{diagnosis ? "AI 复测建议" : "下一轮怎么试"}</h3>
      <p className="experiment-report-copy">{diagnosis?.suggestion ?? report.suggestion}</p>
      {!diagnosis && settingsHref && (
        <div className="preset-actions">
          <QuickStartRequest operation="diagnose" id={runId} auto={false} className="experiment-run" requestLabel="让 AI 选复测方向" settingsHref={settingsHref} />
        </div>
      )}
    </section>
  );
}
