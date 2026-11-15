import { concept, type CoreTopic } from "@/content/knowledge/core/types";
import { lesson, type Teaching } from "@/content/knowledge/teaching/types";
import type { KnowledgeTopic } from "@/lib/knowledge";

type Exercise = readonly [
  prompt: string, options: readonly [string, string, string], answer: 0 | 1 | 2, explanation: string,
];

export function fullTopic(
  location: readonly [course: string, chapter: string],
  identity: readonly [id: string, title: string, difficulty: Teaching["difficulty"]],
  prerequisites: readonly [string, ...string[]],
  source: KnowledgeTopic["sources"][number],
  summary: string, principle: string, objective: string, example: string, misconception: string,
  [prompt, options, answer, explanation]: Exercise,
  reference?: Teaching["reference"],
  experiments: KnowledgeTopic["experiments"] = [],
): CoreTopic {
  const [id, title, difficulty] = identity;
  const entry = concept(...location, id, title, difficulty, summary, principle, source, prerequisites);
  entry.topic.teaching = lesson(difficulty, objective, example, misconception,
    { id: "apply", prompt, options, answer, explanation }, reference);
  entry.topic.experiments = experiments;
  return entry;
}
