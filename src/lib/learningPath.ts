import { getKnowledgeTopic, knowledgeEntries, type KnowledgeEntry } from "./knowledge";
import { practiceSummary, type PracticeAttempts } from "./knowledgePractice";

type TopicProgress = { readTopics: ReadonlySet<string>; byTopic: Readonly<Record<string, unknown>>; practice?: PracticeAttempts };

export function topicTouched(id: string, progress: TopicProgress) {
  return progress.readTopics.has(id) || Boolean(progress.byTopic[id]) || practiceSummary(progress.practice?.[id]).answered > 0;
}

export function learningSuggestion(progress: TopicProgress, domainId?: KnowledgeEntry["domain"]["id"]) {
  const entries = domainId ? knowledgeEntries.filter(({ domain }) => domain.id === domainId) : knowledgeEntries;
  const review = entries.find(({ topic }) => {
    const { answered, correct } = practiceSummary(progress.practice?.[topic.id]);
    return answered > correct;
  });
  if (review) {
    const { entry, reason } = prerequisiteSuggestion(review, progress);
    return { entry, reason: entry === review ? "这题答错过。先看看解析。" : reason };
  }
  const next = entries.find(({ topic }) => !topicTouched(topic.id, progress));
  if (next) return prerequisiteSuggestion(next, progress);
  const practice = entries.find(({ topic }) => topic.experiments.length && !progress.byTopic[topic.id]);
  return practice ? { entry: practice, reason: "这里还有实验可以动手做。" } : null;
}

function prerequisiteSuggestion(next: KnowledgeEntry, progress: TopicProgress) {
  const visited = new Set<string>();
  function firstPrerequisite(entry: KnowledgeEntry): KnowledgeEntry {
    visited.add(entry.topic.id);
    for (const id of entry.topic.prerequisiteIds ?? []) {
      const prerequisite = getKnowledgeTopic(id);
      const { answered, correct } = practiceSummary(progress.practice?.[id]);
      if (prerequisite && !visited.has(id) && (!topicTouched(id, progress) || correct < answered)) return firstPrerequisite(prerequisite);
    }
    return entry;
  }
  const entry = firstPrerequisite(next);
  return { entry, reason: entry === next ? "这个知识点还没有学习记录。" : `先补基础，再读「${next.topic.title}」。` };
}
