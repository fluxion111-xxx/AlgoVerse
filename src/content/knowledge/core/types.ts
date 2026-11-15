import type { KnowledgeTopic } from "@/lib/knowledge";

export type CoreTopic = {
  courseId: string;
  chapterId: string;
  topic: KnowledgeTopic;
};

export function concept(
  courseId: string, chapterId: string, id: string, title: string,
  difficulty: KnowledgeTopic["difficulty"], summary: string, principle: string,
  source: KnowledgeTopic["sources"][number], prerequisiteIds: readonly string[] = [],
  experiments: KnowledgeTopic["experiments"] = [],
): CoreTopic {
  return { courseId, chapterId, topic: {
    id, title, difficulty, summary, sections: [{ title: "核心原理", paragraphs: [principle] }],
    sources: [source], prerequisiteIds, experiments,
  } };
}
