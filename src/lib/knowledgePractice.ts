import { getKnowledgeTopic } from "./knowledge";
import { getDeepLesson } from "@/content/lessons/index";

export type PracticeResult = { correct: boolean; explanation: string; wrong?: string; review?: string };
export type PracticeAttempts = Record<string, Record<string, boolean>>;
export type PracticeDetail = { attemptedAt?: string; selectedOptions?: number[] };
export type PracticeDetails = Record<string, Record<string, PracticeDetail>>;

export function getPracticeExercise(topicId: string, exerciseId: string) {
  const lesson = getDeepLesson(topicId)?.exercises.find(({ id }) => id === exerciseId);
  if (lesson) return { exercise: lesson, interactive: true } as const;
  const exercise = getKnowledgeTopic(topicId)?.topic.teaching?.exercises.find(({ id }) => id === exerciseId);
  return exercise ? { exercise, interactive: false } as const : undefined;
}

export function hasPracticeExercise(topicId: string, exerciseId: string) {
  return !!getPracticeExercise(topicId, exerciseId);
}

function optionIndex(selection: unknown, count: number) {
  if (typeof selection !== "string" || !/^(0|[1-9][0-9]*)$/.test(selection)) return null;
  const index = Number(selection);
  return index < count ? index : null;
}

function normalizedText(input: string) {
  return input.normalize("NFKC").toLowerCase().replace(/\s/g, "");
}

export function practiceSelection(topicId: string, exerciseId: string, selection: unknown) {
  const question = getPracticeExercise(topicId, exerciseId);
  if (!question || !("options" in question.exercise)) return undefined;
  const { options } = question.exercise;
  const values = Array.isArray(selection) ? selection : [selection];
  const indices = values.map((value) => optionIndex(value, options.length));
  return indices.every((index) => index !== null) ? indices : undefined;
}

export function gradeKnowledgeExercise(topicId: string, exerciseId: string, selection: unknown): PracticeResult | null {
  const question = getPracticeExercise(topicId, exerciseId);
  if (!question) return null;
  if (question.interactive) {
    const { exercise: lessonExercise } = question;
    let correct: boolean;
    if (lessonExercise.kind === "multiple") {
      if (!Array.isArray(selection) || !selection.length || selection.length > lessonExercise.options.length) return null;
      const indices = selection.map((item: unknown) => optionIndex(item, lessonExercise.options.length));
      if (indices.includes(null) || new Set(indices).size !== indices.length) return null;
      correct = indices.length === lessonExercise.answer.length && lessonExercise.answer.every((item) => indices.includes(item));
    } else if (lessonExercise.kind === "integer" || lessonExercise.kind === "text") {
      if (typeof selection !== "string" || !selection.trim() || selection.length > 80) return null;
      const text = lessonExercise.kind === "integer" ? selection.normalize("NFKC").trim().replace(/^−/, "-") : normalizedText(selection);
      correct = lessonExercise.kind === "integer" ? /^[+-]?\d+$/.test(text) && Number(text) === lessonExercise.answer
        : lessonExercise.answer.some((answer) => normalizedText(answer) === text);
    } else {
      const index = optionIndex(selection, lessonExercise.options.length);
      if (index === null) return null;
      correct = index === lessonExercise.answer;
    }
    return { correct, explanation: lessonExercise.explanation,
      ...(!correct && { wrong: lessonExercise.wrong, review: lessonExercise.review }) };
  }
  const { exercise } = question;
  const index = optionIndex(selection, exercise.options.length);
  return index === null ? null : { correct: index === exercise.answer, explanation: exercise.explanation };
}

export function practiceSummary(attempts: PracticeAttempts[string] | undefined) {
  const answers = Object.values(attempts ?? {});
  return { answered: answers.length, correct: answers.filter(Boolean).length };
}
