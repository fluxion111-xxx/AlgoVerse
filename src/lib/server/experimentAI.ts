import "server-only";
import { type Diagnosis, type QuickStartPlan } from "@/lib/quickStart";
import { diagnosisChoices } from "@/lib/experiments/diagnosis";
import { experimentReviewTopics } from "@/lib/knowledge";
import { asObject, requestAIJson, type AICredentials } from "./aiProvider";
import type { ExperimentRun } from "./experimentRecords";

function validText(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

export async function generateQuickStartPlan(question: string, credentials: AICredentials) {
  const { result: plan, model } = await requestAIJson<QuickStartPlan>(credentials, {
    operation: "quick_start_plan",
    instructions: '为固定的 AlgoVerse 新手寻路案例选障碍难度，写简短可验证的中文目标。地图由引擎生成。只输出 JSON，例如 {"domain":"algorithms","engine":"pathfinding","comparison":"dijkstra-and-astar","difficulty":"normal","goal":"比较两种算法访问的节点数"}。difficulty 可选 easy、normal 或 hard。',
    input: { question, grid: { columns: 9, rows: 5 } },
    maxTokens: 400,
    validate(value) {
      const object = asObject(value);
      if (!object || Object.keys(object).length !== 5) return null;
      const { domain, engine, comparison, difficulty, goal } = object;
      if (domain !== "algorithms" || engine !== "pathfinding" || comparison !== "dijkstra-and-astar"
        || (difficulty !== "easy" && difficulty !== "normal" && difficulty !== "hard") || !validText(goal, 100)) return null;
      return { domain, engine, comparison, difficulty, goal: goal.trim() };
    },
  });
  return { plan, model };
}

export async function diagnoseExperimentRun(run: ExperimentRun, credentials: AICredentials): Promise<Diagnosis> {
  const { engineId, config } = run.session;
  const { observations, steps } = diagnosisChoices(engineId, config, run.results);
  // The model selects what to investigate. Only the recorded run supplies its factual claims.
  const { result, model } = await requestAIJson<Pick<Diagnosis, "conclusion" | "explanation" | "suggestion" | "evidence">>(credentials, {
    operation: "experiment_diagnosis",
    instructions: [
      "依据本轮实测指标，选一项最能说明结果的观察。再选一个能检验它的后续实验。",
      "只输出一个 JSON 对象。metric 只能用 observations 的 id。next 只能用 steps 的 id。",
      `格式示例：${JSON.stringify({ metric: observations[0].id, next: steps[0].id })}`,
    ].join("\n"),
    input: { engine: engineId, observations, steps,
      knowledge: experimentReviewTopics(engineId, run.topicId).map(({ topic }) => topic.title) },
    maxTokens: 800,
    validate(value) {
      const object = asObject(value);
      if (!object || Object.keys(object).length !== 2) return null;
      const observation = observations.find(({ id }) => id === object.metric);
      const step = steps.find(({ id }) => id === object.next);
      if (!observation || !step) return null;
      return { conclusion: observation.conclusion, explanation: observation.explanation,
        suggestion: step.suggestion, evidence: [observation.id] };
    },
  });
  return { runId: run.id, model, promptVersion: 3, createdAt: new Date().toISOString(), ...result };
}

