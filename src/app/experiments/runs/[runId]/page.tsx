import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DecisionDetails } from "@/components/experiments/WorkbenchEvidence";
import { ExperimentBench } from "@/components/experiments/ExperimentBench";
import { ExperimentRunReports } from "@/components/experiments/ExperimentRunReports";
import { LabWorkspace } from "@/components/experiments/LabWorkspace";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { agentWorkbenchLink, runAnalysisLink, withExperimentTask, workflowRoute } from "@/lib/navigation";
import { getExperimentContext } from "@/lib/server/experimentContext";
import { getAgentTask, getExperimentRun } from "@/lib/server/experimentRecords";
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
    const [context, agent] = await Promise.all([
      getExperimentContext(task),
      session.source?.type === "agent" ? getAgentTask(session.source.taskId) : null,
    ]);
    const member = agent?.runs.some(({ id }) => id === run.id) ? agent : null;
    const conversation = agentWorkbenchLink({ ...task, agentId: member?.id, focus: "run" });
    const returnLink = member ? `${conversation}#agent-run-${run.id}` : conversation;
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
        <ExperimentRunReports run={run} history={session.source?.type === "agent" ? member?.runs ?? [] : undefined} />
        {final && member && <section className="workflow-note" aria-label="Agent 任务报告">
          <h2>Agent 任务报告</h2><DecisionDetails decision={final} runs={member.runs} report />
        </section>}
      </div>
    </LabWorkspace>;
  }
  if (session.source?.type === "creator" || session.source?.type === "quick-start") redirect(workflowRoute("run", task));
  redirect(withExperimentTask(engine.route, task));
}
