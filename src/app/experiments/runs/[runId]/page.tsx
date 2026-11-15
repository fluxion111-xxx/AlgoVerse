import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DecisionDetails } from "@/components/experiments/AgentWorkbench";
import { ExperimentBench } from "@/components/experiments/ExperimentBench";
import { LabWorkspace } from "@/components/experiments/LabWorkspace";
import { QuickStartDiagnosis } from "@/components/experiments/QuickStartDiagnosis";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { agentWorkbenchLink, runAnalysisLink, withExperimentTask, workflowAISettingsRoute, workflowRoute } from "@/lib/navigation";
import { getExperimentContext } from "@/lib/server/experimentContext";
import { getAgentTask, getDiagnosis, getExperimentRun } from "@/lib/server/experimentRecords";
import { runLabExperiment } from "../../actions";
import "../../create/agent-workbench.css";

export default async function ExperimentRunPage({ params, searchParams }: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ step?: string; view?: string }>;
}) {
  const run = await getExperimentRun((await params).runId);
  if (!run) notFound();
  const { session } = run;
  const engine = getExperimentEngine(session.engineId, session.engineVersion);
  if (!engine?.validate(session.config)) notFound();
  const task = { sessionId: session.id, runId: run.id };
  const { step, view } = await searchParams;
  if (step === "diagnosis") redirect(runAnalysisLink(run.id, true));
  if (view === "analysis" || session.source?.type === "agent") {
    const [context, diagnosis, agent] = await Promise.all([
      getExperimentContext(task), getDiagnosis(run.id),
      session.source?.type === "agent" ? getAgentTask(session.source.taskId) : null,
    ]);
    const member = agent?.runs.some(({ id }) => id === run.id) ? agent : null;
    const conversation = agentWorkbenchLink({ ...task, agentId: member?.id });
    const returnLink = member ? `${conversation}#agent-run-${run.id}` : conversation;
    const metrics = experimentEvidence(run.results);
    const comparison = member?.runs.filter(({ tool, version }) => tool === engine.id && version === engine.version) ?? [];
    const keys = [...new Set(comparison.flatMap(({ metrics }) => Object.keys(metrics)))];
    const final = member?.phase === "finished" ? member.decisions.at(-1) : undefined;
    return <LabWorkspace className={`catalog-page creator-studio theme-${engine.domain}`} back={{ href: returnLink, label: member ? "返回 Agent 继续讨论" : "到 Agent 讨论" }}>
      <div className="creator-spread">
        <header className="workflow-title">
          <p>专业实验分析</p><h1>{engine.creator.title}</h1><p>{session.config.goalLabel}</p>
          <div className="agent-analysis-actions">
            <a href="#experiment-replay" className="catalog-direct">回放实验</a>
            <a href="#run-diagnosis" className="catalog-direct">查看诊断</a>
            <Link href={`${agentWorkbenchLink({ ...task, agentId: member?.id, intent: "question" })}#agent-message`} className="catalog-direct">调整后再试</Link>
          </div>
        </header>
        <ExperimentBench engine={engine} context={context} action={runLabExperiment} presentation="result" />
        <section className="workflow-note" aria-labelledby="run-report-title">
          <h2 id="run-report-title">本轮实验报告</h2>
          <p>完成时间 · <time dateTime={run.completedAt}>{run.completedAt.replace("T", " ").slice(0, 16)} UTC</time></p>
          <dl className="preset-details">{Object.entries(metrics).map(([key, value]) => <div key={key}>
            <dt>{evidenceLabels[key]}</dt><dd>{value}</dd>
          </div>)}</dl>
          <details><summary>本轮参数</summary><pre className="agent-analysis-config">{JSON.stringify(session.config, null, 2)}</pre></details>
        </section>
        {comparison.length > 1 && <section className="workflow-note agent-analysis-table" aria-labelledby="run-comparison-title">
          <h2 id="run-comparison-title">多轮实测对比</h2>
          <table><thead><tr><th scope="col">轮次</th>{keys.map((key) => <th scope="col" key={key}>{evidenceLabels[key]}</th>)}</tr></thead>
            <tbody>{comparison.map((entry) => <tr key={entry.id}>
              <th scope="row"><Link href={runAnalysisLink(entry.id)} aria-current={entry.id === run.id ? "page" : undefined}>
                第 {(member?.runs.indexOf(entry) ?? -1) + 1} 轮{entry.id === run.id ? " · 本轮" : ""}</Link></th>
              {keys.map((key) => <td key={key}>{entry.metrics[key] ?? "—"}</td>)}
            </tr>)}</tbody>
          </table>
        </section>}
        {final && member && <section className="workflow-note" aria-label="Agent 任务报告">
          <h2>Agent 任务报告</h2><DecisionDetails decision={final} runs={member.runs} report />
        </section>}
        <section className="workflow-note" id="run-diagnosis" aria-label="本轮诊断">
          <div id="creator-diagnosis">
            <QuickStartDiagnosis diagnosis={diagnosis} runId={run.id} auto={false} results={run.results} studio
              settingsHref={workflowAISettingsRoute(agentWorkbenchLink({ ...task, intent: "diagnosis" }))} />
          </div>
        </section>
      </div>
    </LabWorkspace>;
  }
  if (session.source?.type === "creator" || session.source?.type === "quick-start") redirect(workflowRoute("run", task));
  redirect(withExperimentTask(engine.route, task));
}
