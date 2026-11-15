import { notFound, redirect } from "next/navigation";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { withExperimentTask, workflowRoute } from "@/lib/navigation";
import { getExperimentContext, type ExperimentSearch } from "@/lib/server/experimentContext";

export default async function ComparePage({ searchParams }: { searchParams: Promise<ExperimentSearch & { engine?: string }> }) {
  const { engine: id, ...params } = await searchParams;
  const { task, engine, workflow } = await getExperimentContext(params);
  if (id !== undefined) {
    const selected = getExperimentEngine(id);
    if (!selected || (engine && engine.id !== selected.id)) notFound();
    if (!task || (engine && !workflow?.isAI)) redirect(withExperimentTask(selected.route, task));
  }
  if (task && engine && !workflow?.isAI) redirect(withExperimentTask(engine.route, task));
  redirect(workflowRoute("run", task));
}
