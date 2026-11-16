import { maxQuestionLength } from "@/lib/experimentCreator";
import { isAgentConfirmation } from "@/lib/experimentAgent";
import { sortingEngine } from "@/lib/experiments/sorting";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { aiErrorResponse, aiJson, asObject, readAICredentials } from "@/lib/server/aiProvider";
import { approveAgentTools, cancelAgentTask, clarifyAgentTask, decideAgentTask, replyToAgentMessage, stopAgentAnalysis } from "@/lib/server/experimentAgent";
import { createAgentTask, getAgentTask, getExperimentRun, getExperimentWorkflow } from "@/lib/server/experimentRecords";

function inputText(value: unknown) {
  return typeof value === "string" && value.length <= maxQuestionLength ? value.trim() : "";
}

function containsKey(value: string, auth?: string | null) {
  const platformKey = process.env.SILICONFLOW_API_KEY?.trim();
  const key = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return /\bsk-[A-Za-z0-9_-]{16,}\b/i.test(value) || (!!platformKey && value.includes(platformKey)) || (!!key && value.includes(key));
}

export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  if ((site && site !== "same-origin" && site !== "none") || (origin && origin !== `${url.protocol}//${host}`)) {
    return aiJson({ message: "请在本站操作。" }, 403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return aiJson({ message: "请求格式有误。" }, 415);
  }
  const body = asObject(await request.json().catch(() => null));
  if (!body) return aiJson({ message: "请求格式有误。" }, 400);
  const authorization = request.headers.get("authorization");
  const operationId = typeof body.operationId === "string" && /^[a-f0-9-]{36}$/i.test(body.operationId) ? body.operationId : undefined;
  try {
    if (body.action === "start") {
      const goal = inputText(body.goal);
      if (!goal) return aiJson({ message: "请输入 1–300 字。" }, 400);
      if (containsKey(goal, authorization)) return aiJson({ message: "请移除问题里的 Key。" }, 400);
      const workflow = body.sessionId === undefined ? null : await getExperimentWorkflow(body.sessionId);
      const run = body.runId === undefined ? null : await getExperimentRun(body.runId);
      if ((body.sessionId !== undefined && !workflow) || (body.runId !== undefined && (!run || run.session.id !== workflow?.id))) {
        return aiJson({ message: "找不到本轮实验。" }, 404);
      }
      const importPlan = body.importPlan === true;
      const plan = workflow?.plan;
      if (importPlan && (run || !plan || !getExperimentEngine(plan.engineId, plan.engineVersion)?.validate(plan.config))) {
        return aiJson({ message: "找不到可运行的方案。" }, 404);
      }
      return aiJson({ task: await createAgentTask(goal, run?.session ?? plan, run ?? undefined, {
        importPlan, researchId: workflow?.isAI ? workflow.id : undefined,
      }) }, 201);
    }
    const task = await getAgentTask(body.id);
    if (!task) return aiJson({ message: "找不到这项任务。" }, 404);
    if (body.action === "status") return aiJson({ task });
    if (body.action === "stop" && operationId) return aiJson({ task: await stopAgentAnalysis(task, operationId) });
    if (body.action === "sorting-replay") {
      const run = task.runs.some(({ id, tool }) => id === body.runId && tool === sortingEngine.id)
        ? await getExperimentRun(body.runId) : null;
      if (!run || run.session.engineId !== sortingEngine.id || !sortingEngine.validate(run.session.config)
        || !("kind" in run.results) || run.results.kind !== sortingEngine.id) {
        return aiJson({ message: "找不到排序回放。" }, 404);
      }
      return aiJson({ config: run.session.config, results: run.results });
    }
    if (body.action === "cancel") return aiJson({ task: await cancelAgentTask(task) });
    if (body.revision !== task.revision) return aiJson({ message: "任务已更新。请刷新。" }, 409);
    switch (body.action) {
      case "message":
      case "retry-message": {
        const message = inputText(body.action === "message" ? body.message : task.dialogue?.pending);
        if (!message) return aiJson({ message: "请输入 1–300 字。" }, 400);
        if (body.action === "message" && isAgentConfirmation(task, message)) {
          return aiJson({ task: task.phase === "confirm" ? await approveAgentTools(task) : task });
        }
        const credentials = readAICredentials(request);
        if (containsKey(message, authorization) || message.includes(credentials.apiKey)) {
          return aiJson({ message: "请移除问题里的 Key。" }, 400);
        }
        const selected = body.action === "retry-message" && task.dialogue?.pendingRound !== undefined
          ? task.dialogue.pendingRound ?? undefined
          : body.selectedRunId === undefined ? undefined : task.runs.findIndex(({ id }) => id === body.selectedRunId) + 1;
        if (selected === 0) return aiJson({ message: "找不到本轮实验。" }, 404);
        return aiJson({ task: await replyToAgentMessage(task, message, credentials, operationId, selected) });
      }
      case "decide": return aiJson({ task: await decideAgentTask(task, readAICredentials(request), operationId) });
      case "approve": return aiJson({ task: await approveAgentTools(task) });
      case "clarify": {
        const answer = inputText(body.answer);
        if (!answer) return aiJson({ message: "请输入 1–300 字。" }, 400);
        if (containsKey(answer, authorization)) return aiJson({ message: "请移除问题里的 Key。" }, 400);
        return aiJson({ task: await clarifyAgentTask(task, answer) });
      }
      default: return aiJson({ message: "操作无效。" }, 400);
    }
  } catch (error) {
    return aiErrorResponse(error);
  }
}
