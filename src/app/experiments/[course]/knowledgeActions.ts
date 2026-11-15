"use server";

import { revalidatePath } from "next/cache";
import { getKnowledgeTopic } from "@/lib/knowledge";
import { setReadTopic } from "@/lib/server/experimentRecords";

export async function updateTopicReading(topicId: string, form: FormData) {
  const entry = getKnowledgeTopic(topicId);
  const read = form.get("read");
  if (!entry || (read !== "yes" && read !== "no")) return;
  await setReadTopic(topicId, read === "yes");
  revalidatePath(`/experiments/${entry.domain.id}`);
  revalidatePath("/learning-path");
}
