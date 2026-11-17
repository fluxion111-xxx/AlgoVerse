import { containsPossibleAIKey } from "@/lib/aiSettings";
import { maxCreatorHistory, maxCreatorReplyLength, maxQuestionLength, type CreatorResponse } from "@/lib/experimentCreator";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { experimentEvidence } from "@/lib/experiments/evidence";
import { aiErrorResponse, aiJson, asObject, readAICredentials, reusePendingAI, type PendingAIRequest } from "@/lib/server/aiProvider";
import { interpretCreatorRequest } from "@/lib/server/creatorAI";
import { generateQuickStartPlan } from "@/lib/server/experimentAI";
import { containsSavedAIKey } from "@/lib/server/aiCredentialSession";
import { createAIExperimentSession, getExperimentRun, getExperimentWorkflow, getQuickStart, recordOperationKey, rememberExperimentTask, saveQuickStartPlan, saveWorkflowRevision, startQuickStart } from "@/lib/server/experimentRecords";

const pending = new Map<string, PendingAIRequest<void>>();

export async function POST(request: Request) {
  const payload = asObject(await request.json().catch(() => null));
  if (payload?.mode === "quick-start") {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return aiJson({ status: "error", message: "请求格式有误。" }, 415);
    }
    try {
      if (payload.operation === "start") {
        const draft = await startQuickStart();
        return aiJson({ status: "started", sessionId: draft.id }, 201);
      }
      if (payload.operation !== "generate") return aiJson({ status: "error", message: "步骤无效。" }, 400);
      const record = await getQuickStart(payload.sessionId);
      if (!record) return aiJson({ status: "error", message: "找不到这次体验。" }, 404);
      if (!record.session) {
        const credentials = readAICredentials(request);
        const key = await recordOperationKey(record.draft.id);
        await reusePendingAI(pending, key, credentials, async () => {
          const { plan, model } = await generateQuickStartPlan(record.draft.question, credentials);
          if (!await saveQuickStartPlan(record.draft.id, plan, model)) throw new Error("Could not save plan");
        });
      }
      await rememberExperimentTask(record.draft.id);
      return aiJson({ status: "configured", sessionId: record.draft.id });
    } catch (error) {
      return aiErrorResponse(error);
    }
  }
  const question = typeof payload?.question === "string" ? payload.question.trim() : "";

  if (!question || question.length > maxQuestionLength) {
    return aiJson({ status: "error", message: "请输入 1–300 字。" } satisfies CreatorResponse, 400);
  }

  try {
    const credentials = readAICredentials(request);
    const history = payload?.history ?? [];
    if (!Array.isArray(history) || history.length > maxCreatorHistory) {
      return aiJson({ status: "error", message: "对话记录有误。" }, 400);
    }
    const turns = [];
    for (const entry of history) {
      const turn = asObject(entry);
      if (typeof turn?.question !== "string" || !turn.question.trim() || turn.question.length > maxQuestionLength
        || typeof turn.answer !== "string" || !turn.answer.trim() || turn.answer.length > maxCreatorReplyLength) {
        return aiJson({ status: "error", message: "对话记录有误。" }, 400);
      }
      turns.push({ question: turn.question, answer: turn.answer });
    }

    const sessionId = payload?.sessionId;
    const record = sessionId === undefined ? null : await getExperimentWorkflow(sessionId);
    if (sessionId !== undefined && !record) return aiJson({ status: "error", message: "找不到本次会话。" }, 404);
    if (record && payload?.revision !== undefined && payload.revision !== record.revision) {
      return aiJson({ status: "error", message: "会话已更新，请刷新。" }, 409);
    }
    const run = payload?.runId === undefined ? null : await getExperimentRun(payload.runId);
    if (payload?.runId !== undefined && (!run || run.session.id !== record?.id)) return aiJson({ status: "error", message: "找不到本轮实验。" }, 404);
    const previous = run?.session ?? record?.plan ?? record?.previousPlan;
    const current = previous ? { engine: previous.engineId, version: previous.engineVersion, question: previous.question, config: previous.config,
      ...(run && { metrics: experimentEvidence(run.results) }) } : null;
    // Keep accidentally pasted credentials out of model inputs and experiment files.
    const input = JSON.stringify({ question, turns, current });
    if (input.includes(credentials.apiKey) || containsSavedAIKey(request, input) || containsPossibleAIKey(input)) {
      return aiJson({ status: "error", message: "请先移除问题里的 Key。" }, 400);
    }

    const { result, model } = await interpretCreatorRequest({ question, history: turns }, current, credentials);
    if ("answer" in result) {
      const alternative = getExperimentEngine(result.recommend);
      return aiJson({ status: "answer", intent: result.intent, answer: result.answer,
        ...(alternative && { alternatives: [{ title: alternative.creator.title, href: alternative.route }] }),
      } satisfies CreatorResponse);
    }
    let id: string;
    if (record) {
      const saved = await saveWorkflowRevision(record.id, record.revision, question, {
        engineId: result.engineId, engineVersion: result.version, config: result.config, source: { type: "creator", model, intent: result.intent },
      });
      if (saved === null) return aiJson({ status: "error", message: "会话已更新，请刷新。" }, 409);
      id = record.id;
    } else {
      id = (await createAIExperimentSession(question, result.engineId, result.version, result.config, model, result.intent)).id;
    }
    await rememberExperimentTask(id);
    return aiJson({ status: "ready", sessionId: id } satisfies CreatorResponse, 201);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
