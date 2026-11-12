import { maxQuestionLength, type CreatorRequest, type CreatorResponse } from "@/lib/experimentCreator";

export async function POST(request: Request) {
  const payload: Partial<CreatorRequest> | null = await request.json().catch(() => null);
  const question = typeof payload?.question === "string" ? payload.question.trim() : "";

  if (!question || question.length > maxQuestionLength) {
    return Response.json({ status: "invalid", message: "请输入 1–300 字。" } satisfies CreatorResponse, { status: 400 });
  }

  return Response.json({ status: "unavailable", message: "AI 尚未接入。未生成实验。" } satisfies CreatorResponse, { status: 503 });
}
