import { curriculumGroups } from "@/lib/curriculum";
import { registeredEngines } from "@/lib/experimentEngines";
import { getKnowledgeTopic, knowledgeEntries, knowledgeTopicRoute } from "@/lib/knowledge";
import { learningSuggestion } from "@/lib/learningPath";
import { practiceSummary } from "@/lib/knowledgePractice";
import { aiErrorResponse, aiJson, asObject, readAICredentials, requestAIJson } from "@/lib/server/aiProvider";
import { getLearningProgress } from "@/lib/server/experimentRecords";

export async function POST(request: Request) {
  try {
    const credentials = readAICredentials(request);
    const body = asObject(await request.json().catch(() => null));
    const goal = curriculumGroups.find(({ id }) => id === body?.goal);
    if (body?.includeProgress !== true || (body.goal !== undefined && !goal)) {
      return aiJson({ status: "error", message: "请确认学习目标和记录授权。" }, 400);
    }

    const progress = await getLearningProgress();
    const suggested = learningSuggestion(progress, goal?.id)?.entry;
    const inScope = knowledgeEntries.filter(({ domain }) => !goal || domain.id === goal.id);
    const reviewed = inScope.filter(({ topic }) => {
      const { answered, correct } = practiceSummary(progress.practice[topic.id]);
      return answered > correct;
    });
    const entries = [...new Set([...(suggested ? [suggested] : []), ...reviewed, ...inScope])].slice(0, 20);
    const input = {
      goal: goal?.title ?? "全部方向",
      topics: entries.map(({ domain, topic }) => ({
        id: topic.id, title: topic.title, domain: domain.title, summary: topic.summary,
        read: progress.readTopics.has(topic.id), runs: progress.byTopic[topic.id]?.count ?? 0,
        practice: practiceSummary(progress.practice[topic.id]),
        prerequisites: (topic.prerequisiteIds ?? []).map((id) => ({
          title: getKnowledgeTopic(id)?.topic.title, read: progress.readTopics.has(id), runs: progress.byTopic[id]?.count ?? 0,
          practice: practiceSummary(progress.practice[id]),
        })),
      })),
      experiments: registeredEngines.filter((engine) => !goal || engine.domain === goal.id)
        .map(({ id, creator }) => ({ title: creator.title, runs: progress.byEngine[id]?.count ?? 0 })),
    };
    const { result } = await requestAIJson(credentials, {
      operation: "learning_advice",
      instructions: '你是计算机学习教练。按学习目标、先修关系、已读状态、实际答题和实验轮数给一条建议。答题统计按每题最近一次计算。answered 大于 correct 时优先复习或补先修。零记录时按目标和先修建议。学习活动不能证明掌握。只输出 JSON {"topicId":"topics 中的一个 id","advice":"说明理由和下一步操作"}。',
      input,
      maxTokens: 650,
      validate(value) {
        const answer = asObject(value);
        const entry = entries.find(({ topic }) => topic.id === answer?.topicId);
        if (!entry || typeof answer?.advice !== "string" || !answer.advice.trim() || answer.advice.length > 500
          || Object.keys(answer).length !== 2) return null;
        return { advice: answer.advice.trim(), topic: { title: entry.topic.title, href: knowledgeTopicRoute(entry) } };
      },
    });
    return aiJson({ status: "advice", ...result });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
