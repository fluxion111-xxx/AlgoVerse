import { createHash } from "node:crypto";
import { curriculumGroups } from "@/lib/curriculum";
import { learningSuggestion, suggestionStep } from "@/lib/learningPath";
import { practiceSummary } from "@/lib/knowledgePractice";
import { aiErrorResponse, aiJson, asObject, readAICredentials, requestAIJson } from "@/lib/server/aiProvider";
import { getLearningProgress } from "@/lib/server/experimentRecords";

type Advice = { reason: string; practice: string; check: string };

function adviceKey({ reason, practice, check }: Advice) {
  const fields = [reason, practice, check].map((field) => field.normalize("NFKC").toLowerCase().replace(/[\p{P}\s]+/gu, ""));
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex").slice(0, 24);
}

function validateAdvice(value: unknown): Advice | null {
  const answer = asObject(value);
  if (!answer || Object.keys(answer).length !== 3) return null;
  const { reason, practice, check } = answer;
  if (typeof reason !== "string" || !reason.trim() || reason.length > 220
    || typeof practice !== "string" || !practice.trim() || practice.length > 150
    || typeof check !== "string" || !check.trim() || check.length > 150) return null;
  return { reason: reason.trim(), practice: practice.trim(), check: check.trim() };
}

export async function POST(request: Request) {
  try {
    const credentials = readAICredentials(request);
    const body = asObject(await request.json().catch(() => null));
    const goal = curriculumGroups.find(({ id }) => id === body?.goal);
    if (body?.includeProgress !== true || (body.goal !== undefined && !goal)) {
      return aiJson({ status: "error", message: "请确认学习目标和记录授权。" }, 400);
    }
    const previous = Array.isArray(body.previous) ? body.previous.slice(-6).filter((key): key is string =>
      typeof key === "string" && /^[a-f0-9]{24}$/.test(key)) : [];
    const progress = await getLearningProgress();
    const suggestion = learningSuggestion(progress, goal?.id, suggestionStep(body.step));
    if (!suggestion) return aiJson({ status: "complete", message: "可以换个方向复习。" });

    const { entry, angle, mistake, reason, practice, check, href } = suggestion;
    const { topic } = entry;
    const { result } = await requestAIJson(credentials, {
      operation: "learning_advice",
      retryFormat: true,
      instructions: [
        "你是计算机学习教练。按 angle 给一条具体建议，聚焦给定的错题或知识点。",
        "有 mistake 时，从题目、已记录的选项和解析判断卡点。没有保存选项时，只说可能卡在哪，不能猜测选了什么。",
        "用 reason 说明判断依据。用 practice 给一个可以立刻做的小验证，最好有两组对照。用 check 写出能自己检查的标准。",
        "没有错题时，从知识点出一道入门自查。已读、做过或答对一次都不能证明掌握。禁止编造答题或实验结果。",
        '只输出 JSON {"reason":"为什么","practice":"做什么","check":"如何核对"}。每句尽量不超过 15 字。',
      ].join("\n"),
      input: {
        goal: goal?.title ?? "全部方向", angle, mistake,
        topic: { title: topic.title, summary: topic.summary, read: progress.readTopics.has(topic.id),
          runs: progress.byTopic[topic.id]?.count ?? 0, practice: practiceSummary(progress.practice[topic.id]) },
        example: practice,
      },
      maxTokens: 600,
      validate: validateAdvice,
    });
    const key = adviceKey(result);
    const repeated = previous.includes(key);
    const advice = repeated ? { reason, practice, check } : result;
    return aiJson({
      status: "advice", ...advice, angle, key: adviceKey(advice), basedOnRecords: repeated,
      topic: { title: topic.title, href },
      mistake: mistake && { topic: mistake.topic, prompt: mistake.prompt, selected: mistake.selected },
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
