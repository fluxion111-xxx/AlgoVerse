import type { KnowledgeTopic } from "@/lib/knowledge";
import { aiNotes } from "./ai";
import { algorithmsNotes } from "./algorithms";
import { databasesNotes } from "./databases";
import { foundationsNotes } from "./foundations";
import { networksNotes } from "./networks";
import { programmingNotes } from "./programming";
import { reviewedPrerequisites } from "./prerequisites";
import { recoveryReporting, researchExercises, researchPrinciples } from "./research-cases";
import { systemsNotes } from "./systems";
import type { PrincipleNotes } from "./types";
import { workedExercises } from "./worked-exercises";

const principles: PrincipleNotes = {
  ...algorithmsNotes, ...systemsNotes, ...networksNotes, ...programmingNotes,
  ...databasesNotes, ...aiNotes, ...foundationsNotes, ...researchPrinciples,
};

export const reviewedPrincipleIds = Object.keys(principles);
export const reviewedTopicIds = new Set([
  ...reviewedPrincipleIds,
  ...Object.keys(reviewedPrerequisites),
  ...Object.keys(researchExercises),
  ...Object.keys(workedExercises),
]);

function matching<T>(changes: Readonly<Record<string, T>>, id: string): T | undefined {
  return Object.hasOwn(changes, id) ? changes[id] : undefined;
}

export function refineTeaching(topic: KnowledgeTopic): KnowledgeTopic {
  if (!reviewedTopicIds.has(topic.id)) return topic;

  const paragraphs = matching(principles, topic.id);
  const sections = paragraphs
    ? [{ title: topic.sections[0]?.title ?? "核心原理", paragraphs }, ...topic.sections.slice(1)]
    : topic.sections;
  const prerequisiteIds = matching(reviewedPrerequisites, topic.id) ?? topic.prerequisiteIds;
  const researchExercise = matching(researchExercises, topic.id);
  const workedExercise = matching(workedExercises, topic.id);
  const teaching = topic.teaching;

  if (!researchExercise && !workedExercise) return { ...topic, sections, prerequisiteIds };
  if (!teaching) throw new Error(`Missing teaching for reviewed exercise: ${topic.id}`);

  const exercises = researchExercise ? teaching.exercises.map((exercise) => exercise.id === "apply"
    ? { ...exercise, prompt: researchExercise[0], explanation: researchExercise[1] }
    : exercise) : teaching.exercises;
  const { summary, ...lesson } = topic.id === "looplab-lost" ? recoveryReporting : { summary: topic.summary };
  return {
    ...topic, summary, sections, prerequisiteIds,
    teaching: { ...teaching, ...lesson, exercises: workedExercise ? [...exercises, workedExercise] : exercises },
  };
}
