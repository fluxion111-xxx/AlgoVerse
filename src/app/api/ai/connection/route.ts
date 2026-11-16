import { isAIProvider } from "@/lib/aiSettings";
import { clearSavedCredential, credentialMetadata, readCredentialSession, saveVerifiedCredential } from "@/lib/server/aiCredentialSession";
import { AIRequestError, AIUnverifiedError, aiErrorResponse, aiJson, asObject, assertAIRequestOrigin, platformAIConfigured, readAICredentials, requestAIJson } from "@/lib/server/aiProvider";

function configuration(session: ReturnType<typeof readCredentialSession>) {
  return { platformConfigured: platformAIConfigured(), ...credentialMetadata(session) };
}

export function GET(request: Request) {
  try {
    assertAIRequestOrigin(request);
    return aiJson(configuration(readCredentialSession(request)));
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertAIRequestOrigin(request);
    const provider = request.headers.get("x-ai-provider");
    if (!isAIProvider(provider) || !await hasEmptyPayload(request)) {
      throw new AIRequestError("请选择要清除的服务商。", 400);
    }
    const session = readCredentialSession(request);
    const version = request.headers.get("x-ai-credential-version");
    if (!clearSavedCredential(session, provider, version)) {
      throw new AIRequestError("AI 配置已变更。请重试。", 409, undefined, "credential_changed");
    }
    return aiJson(configuration(readCredentialSession(request)));
  } catch (error) {
    return aiErrorResponse(error);
  }
}

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
    const credentials = readAICredentials(request, false, true);
    const original = readCredentialSession(request);
    const previous = credentials.visitor === undefined ? original?.providers[credentials.selection.provider] : undefined;
    const expected = request.headers.get("x-ai-credential-version")
      ?? (credentials.visitor === undefined ? credentials.credentialVersion : undefined);
    if (credentials.visitor === undefined && expected !== undefined && expected !== previous?.credentialVersion) {
      throw new AIRequestError("AI 配置已变更。请重试。", 409, undefined, "credential_changed");
    }

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
    if (credentials.visitor === undefined && request.headers.get("x-ai-save-credential") === "1") {
      const saved = saveVerifiedCredential(request, credentials.selection, credentials.apiKey, { model, usage }, original, previous, credentials.workspaceId);
      if (!saved) throw new AIRequestError("Key 未保存。请重试。", 409);
      const response = aiJson({ status: "connected", model, usage, configuration: configuration(saved.session) });
      if (saved.cookie) response.headers.set("Set-Cookie", saved.cookie);
      return response;
    }
    return aiJson({ status: "connected", model, usage });
  } catch (error) {
    if (error instanceof AIUnverifiedError) return aiJson({ status: "unverified", message: error.message }, error.status);
    if (error instanceof AIRequestError && error.status === 404) {
      return aiJson({ status: "error", message: "所选模型不可用。请检查权限。" }, 404);
    }
    return aiErrorResponse(error);
  }
}
