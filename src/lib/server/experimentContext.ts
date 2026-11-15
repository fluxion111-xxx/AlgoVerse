import "server-only";
import { notFound } from "next/navigation";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { getExperimentRun, getExperimentSession, getExperimentWorkflow } from "./experimentRecords";

export type ExperimentSearch = { sessionId?: string | string[]; runId?: string | string[] };

export async function getExperimentContext({ sessionId, runId }: ExperimentSearch) {
  const run = runId === undefined ? null : await getExperimentRun(runId);
  if (runId !== undefined && (!run || (sessionId !== undefined && run.session.id !== sessionId))) notFound();
  const id = sessionId ?? run?.session.id;
  const workflow = id === undefined ? null : await getExperimentWorkflow(id);
  if (id !== undefined && !workflow) notFound();
  const record = workflow?.plan ? await getExperimentSession(id, workflow.revision) : null;
  const session = run?.session ?? record?.session;
  const engine = session ? getExperimentEngine(session.engineId, session.engineVersion) : undefined;
  if (session && !engine?.validate(session.config)) notFound();
  return { session, engine, run, workflow, confirmedAt: run?.confirmedAt ?? record?.confirmedAt,
    task: workflow ? { sessionId: workflow.id, runId: run?.id } : null };
}
