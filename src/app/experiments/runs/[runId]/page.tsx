import { notFound, redirect } from "next/navigation";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { withExperimentTask, workflowRoute } from "@/lib/navigation";
import { getExperimentRun } from "@/lib/server/experimentRecords";

export default async function ExperimentRunPage({ params, searchParams }: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const run = await getExperimentRun((await params).runId);
  if (!run) notFound();
  const { session } = run;
  const engine = getExperimentEngine(session.engineId, session.engineVersion);
  if (!engine?.validate(session.config)) notFound();
  const task = { sessionId: session.id, runId: run.id };
  if ((await searchParams).step === "diagnosis") redirect(workflowRoute("diagnosis", task));
  if (session.source?.type === "creator" || session.source?.type === "quick-start") redirect(workflowRoute("run", task));
  redirect(withExperimentTask(engine.route, task));
}
