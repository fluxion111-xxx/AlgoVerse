import { AIRequestError, AIUnverifiedError, aiErrorResponse, aiJson, asObject, readAICredentials, requestAIJson } from "@/lib/server/aiProvider";

async function hasEmptyPayload(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return true;
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512) {
        void reader.cancel().catch(() => {});
        return false;
      }
      text += decoder.decode(value, { stream: true });
    }
    const payload = asObject(JSON.parse(text + decoder.decode()));
    return !!payload && Object.keys(payload).length === 0;
  } catch {
    return false;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    const credentials = readAICredentials(request);

    // Model endpoints are selected by the adapter's provider and region allowlist.
    if (new URL(request.url).search || request.headers.has("x-ai-base-url") || request.headers.has("x-base-url")
      || !await hasEmptyPayload(request)) {
      throw new AIUnverifiedError("请使用预设服务地址。", 400);
    }

    const { model, usage } = await requestAIJson(credentials, {
      operation: "connection_test",
      instructions: '只输出这个 JSON 对象：{"ok":true}。',
      input: "连接测试",
      maxTokens: 32,
      validate(value) {
        const result = asObject(value);
        return result?.ok === true && Object.keys(result).length === 1 ? true : null;
      },
    });
    return aiJson({ status: "connected", model, usage });
  } catch (error) {
    if (error instanceof AIUnverifiedError) return aiJson({ status: "unverified", message: error.message }, error.status);
    if (error instanceof AIRequestError && error.status === 404) {
      return aiJson({ status: "error", message: "所选模型不可用。请检查权限。" }, 404);
    }
    return aiErrorResponse(error);
  }
}
