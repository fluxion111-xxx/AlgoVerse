import Link from "next/link";
import { creatorRoute, quickStartRoute } from "@/lib/navigation";
import type { DiagnosisMetric, Diagnosis } from "@/lib/quickStart";
import type { SearchResult } from "@/lib/pathfinding";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import type { ExperimentResults } from "@/lib/experimentEngines";
import { QuickStartRequest } from "./QuickStartRequest";

function metricValue(result: SearchResult, metric: DiagnosisMetric) {
  if (metric === "visited") return result.visited.length;
  if (metric === "pathLength") return result.pathLength?.toFixed(2) ?? "无路径";
  return `${result.elapsedMs.toFixed(2)} ms`;
}

export function DiagnosisSummary({ diagnosis, evidence, pathfinding }: {
  diagnosis: Diagnosis;
  evidence: Record<string, string>;
  pathfinding?: { dijkstra: SearchResult; astar: SearchResult } | null;
}) {
  return <>
    <h3>实验结论</h3><p>{diagnosis.conclusion}</p>
    <table>
      <caption className="sr-only">本轮诊断的数据依据</caption>
      <thead><tr><th scope="col">数据依据</th>{pathfinding ? <><th scope="col">Dijkstra</th><th scope="col">A*</th></> : <th scope="col">本轮结果</th>}</tr></thead>
      <tbody>{diagnosis.evidence.filter((metric) => Object.hasOwn(evidence, metric)).map((metric) => (
        <tr key={metric}><th scope="row">{evidenceLabels[metric]}</th>
          {pathfinding ? <><td>{metricValue(pathfinding.dijkstra, metric as DiagnosisMetric)}</td><td>{metricValue(pathfinding.astar, metric as DiagnosisMetric)}</td></> : <td>{evidence[metric]}</td>}</tr>
      ))}</tbody>
    </table>
    <h3>为什么不同</h3><p>{diagnosis.explanation}</p>
    <h3>下一步建议</h3><p>{diagnosis.suggestion}</p>
  </>;
}

export function QuickStartDiagnosis({ diagnosis, runId, auto, results, studio = false, settingsHref }: {
  diagnosis: Diagnosis | null;
  runId: string;
  auto: boolean;
  results: ExperimentResults;
  studio?: boolean;
  settingsHref?: string;
}) {
  const pathfinding = "dijkstra" in results ? results : null;
  const evidence = experimentEvidence(results);
  return (
    <section className="quick-start-diagnosis" aria-labelledby="quick-start-diagnosis-title">
      <div className="experiment-section-head"><h2 id="quick-start-diagnosis-title">本轮 AI 诊断</h2></div>
      {diagnosis ? (
        <DiagnosisSummary diagnosis={diagnosis} evidence={evidence} pathfinding={pathfinding} />
      ) : (
        <div className="preset-actions">
          <QuickStartRequest operation="diagnose" id={runId} auto={auto} className="experiment-run" settingsHref={settingsHref} />
        </div>
      )}
      {!studio && <div className="preset-actions">
        <Link className="experiment-back" href={quickStartRoute}>再次体验</Link>
        <Link className="experiment-back" href="/experiments">进入实验中心</Link>
        <Link className="experiment-back" href={creatorRoute}>自主创建实验</Link>
      </div>}
    </section>
  );
}
