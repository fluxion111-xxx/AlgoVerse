import { containsPossibleAIKey } from "@/lib/aiSettings";
import { evidencePositionToken, parseEvidencePosition, type RunEvidenceReference } from "@/lib/experiments/evidencePosition";
import { keyframeContext, type EvidenceExplanation } from "@/lib/experiments/keyframeEvidence";
import { adaptEvidenceRun } from "@/lib/experiments/runEvidence";
import { containsSavedAIKey } from "@/lib/server/aiCredentialSession";
import { aiErrorResponse, aiJson, asObject, assertAIRequestOrigin, readAICredentials, reusePendingAI, type PendingAIRequest } from "@/lib/server/aiProvider";
import { explainAgentEvidence } from "@/lib/server/experimentAgent";
import { getAgentTask, getExperimentRun, recordOperationKey } from "@/lib/server/experimentRecords";

const pending = new Map<string, PendingAIRequest<EvidenceExplanation>>();

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    assertAIRequestOrigin(request);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return aiJson({ message: "请求格式有误。" }, 415);
    const body = asObject(await request.json().catch(() => null));
    const position = parseEvidencePosition(body?.position);
    if (!body || Object.keys(body).length !== 3 || typeof body.researchId !== "string" || typeof body.sessionId !== "string" || !position) {
      return aiJson({ message: "证据位置有误。" }, 400);
    }

    const { runId } = await params;
    const run = await getExperimentRun(runId);
    const missing = () => aiJson({ message: "找不到这条证据。" }, 404);
    if (!run || body.sessionId !== run.session.id) return missing();
    const data = { id: run.id, sessionId: run.session.id, tool: run.session.engineId,
      version: run.session.engineVersion, config: run.session.config, results: run.results };
    const researchId = body.researchId;
    const round = researchId === run.session.id && run.session.source?.type !== "agent"
      ? { ...data, metrics: {}, completedAt: run.completedAt }
      : (await getAgentTask(researchId))?.runs.find(({ id, sessionId }) => id === runId && sessionId === data.sessionId);
    const adapted = round && adaptEvidenceRun(researchId, round, data);
    const reference: RunEvidenceReference = { researchId, sessionId: run.session.id, runId, position };
    const context = adapted && keyframeContext(adapted, reference);
    if (!context) return missing();

    const input = JSON.stringify(context);
    if (containsSavedAIKey(request, input) || containsPossibleAIKey(input)) {
      return aiJson({ message: "证据包含敏感内容。" }, 400);
    }
    const credentials = readAICredentials(request, true);
    const key = await recordOperationKey(`${researchId}:${run.session.id}:${runId}:${evidencePositionToken(position)}`);
    const result = await reusePendingAI(pending, key, credentials,
      async () => ({ reference, explanation: await explainAgentEvidence(context, credentials) }));
    return aiJson(result);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
