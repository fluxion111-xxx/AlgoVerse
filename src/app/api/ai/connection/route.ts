import { aiErrorResponse, aiJson, asObject, readAICredentials, requestAIJson } from "@/lib/server/aiProvider";

export async function POST(request: Request) {
  try {
    const credentials = readAICredentials(request);

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
    return aiErrorResponse(error);
  }
}
