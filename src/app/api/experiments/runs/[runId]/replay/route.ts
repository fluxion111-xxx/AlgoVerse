import { aiJson } from "@/lib/server/aiProvider";
import { getAgentTask, getExperimentRun } from "@/lib/server/experimentRecords";

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const agentId = new URL(request.url).searchParams.get("agentId");
  if (agentId !== null && !(await getAgentTask(agentId))?.runs.some(({ id }) => id === runId)) {
    return aiJson({ message: "找不到本轮实验。" }, 404);
  }
  const run = await getExperimentRun(runId);
  return run ? aiJson({ id: run.id, sessionId: run.session.id, tool: run.session.engineId, version: run.session.engineVersion,
    config: run.session.config, results: run.results }) : aiJson({ message: "找不到本轮实验。" }, 404);
}
