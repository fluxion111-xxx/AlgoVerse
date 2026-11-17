import type { Diagnosis } from "@/lib/quickStart";
import { aiErrorResponse, aiJson, readAICredentials, reusePendingAI, type PendingAIRequest } from "@/lib/server/aiProvider";
import { diagnoseExperimentRun, expandSavedDiagnosis } from "@/lib/server/experimentAI";
import { getDiagnosis, getExperimentRun, recordOperationKey, saveDiagnosis } from "@/lib/server/experimentRecords";

const pending = new Map<string, PendingAIRequest<Diagnosis>>();

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return aiJson({ status: "error", message: "请求格式有误。" }, 415);
  }
  try {
    const { runId } = await params;
    const run = await getExperimentRun(runId);
    if (!run?.session.source) {
      return aiJson({ status: "error", message: "找不到本轮实验。" }, 404);
    }
    let diagnosis = await getDiagnosis(run.id);
    if (!diagnosis) {
      const credentials = readAICredentials(request);
      const key = await recordOperationKey(`${run.session.id}:${run.id}`);
      diagnosis = await reusePendingAI(pending, key, credentials, async () => {
        const saved = await saveDiagnosis(await diagnoseExperimentRun(run, credentials));
        if (!saved) throw new Error("Could not save diagnosis");
        return saved;
      });
    }
    return aiJson({ status: "ready", diagnosis: expandSavedDiagnosis(run, diagnosis) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
