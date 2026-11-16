import { maxQuestionLength } from "@/lib/experimentCreator";
import { isWorkbenchFocus } from "@/lib/workbenchHistory";
import { containsSavedAIKey } from "@/lib/server/aiCredentialSession";
import { createWorkflowDraft, getWorkbenchHistory, saveWorkbenchView } from "@/lib/server/experimentRecords";

const headers = { "Cache-Control": "private, no-store" };
const json = (body: object, status = 200) => Response.json(body, { status, headers });
const failed = () => json({ message: "保存失败。请重试。" }, 503);

export async function GET() {
  try { return json(await getWorkbenchHistory()); }
  catch { return json({ message: "历史读取失败。请重试。" }, 503); }
}

function sameOrigin(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  return (!site || site === "same-origin" || site === "none")
    && (!origin || origin === `${url.protocol}//${request.headers.get("host") ?? url.host}`);
}

function containsKey(request: Request, text: string) {
  const platformKey = process.env.SILICONFLOW_API_KEY?.trim();
  return /\bsk-[A-Za-z0-9_-]{16,}\b/i.test(text) || (!!platformKey && text.includes(platformKey)) || containsSavedAIKey(request, text);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ message: "请在本站操作。" }, 403);
  const body = await request.json().catch(() => null);
  if (typeof body?.question !== "string" || body.question.length > maxQuestionLength) return json({ message: "问题最多 300 字。" }, 400);
  if (containsKey(request, body.question)) return json({ message: "请移除问题里的 Key。" }, 400);
  try { return json({ id: await createWorkflowDraft(body.question.trim()) }, 201); }
  catch { return failed(); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return json({ message: "请在本站操作。" }, 403);
  const body = await request.json().catch(() => null);
  if (!isWorkbenchFocus(body?.focus)
    || (body.runId !== undefined && typeof body.runId !== "string")
    || (body.hypothesis !== undefined && (typeof body.hypothesis !== "string" || body.hypothesis.length > 120))
    || (body.draftQuestion !== undefined && (typeof body.draftQuestion !== "string" || body.draftQuestion.length > maxQuestionLength))) {
    return json({ message: "会话内容有误。" }, 400);
  }
  const { id, focus, runId, hypothesis, draftQuestion } = body;
  if (containsKey(request, hypothesis ?? "") || containsKey(request, draftQuestion ?? "")) return json({ message: "请先移除草稿里的 Key。" }, 400);
  try {
    const saved = await saveWorkbenchView(id, { focus, runId, hypothesis, draftQuestion });
    if (saved === "cookie") return json({ message: "无法保存。请允许本站 Cookie。" }, 401);
    if (saved === "missing") return json({ message: "找不到这项研究。" }, 404);
    return json({ saved: true });
  } catch { return failed(); }
}
