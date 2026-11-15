"use server";

import { revalidatePath } from "next/cache";
import type { PracticeResult } from "@/lib/knowledgePractice";
import { setReadTopic, submitKnowledgeExercise } from "@/lib/server/experimentRecords";

export async function answerKnowledgeExercise(topicId: string, exerciseId: string, _previous: PracticeResult | null, form: FormData) {
  const result = await submitKnowledgeExercise(topicId, exerciseId, form.get("choice"));
  if (result) revalidatePath("/learning-path");
  return result;
}

export async function answerDeepExercise(topicId: string, exerciseId: string, _previous: PracticeResult | null, form: FormData) {
  const choices = form.getAll("choices");
  const result = await submitKnowledgeExercise(topicId, exerciseId, choices.length ? choices : form.get("choice"));
  if (result) revalidatePath("/learning-path");
  return result;
}

export async function updateStudyReading(topicId: string, form: FormData) {
  const choice = form.get("read");
  if (choice !== "yes" && choice !== "no") return;
  await setReadTopic(topicId, choice === "yes");
  revalidatePath("/learning-path");
}
