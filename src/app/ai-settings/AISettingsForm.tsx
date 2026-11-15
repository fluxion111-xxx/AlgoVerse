"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { aiProviders, aiRequestHeaders, availableAIModels, billingLabels, canUseAITransport, isApiKey, maxApiKeyLength, modelSelectionMessage, parseAISelection, qwenRegions, type AIProvider, type TokenUsage } from "@/lib/aiSettings";
import { isPlatformModel, platformModels, platformQuota } from "@/lib/platformAI";
import { retainTemporaryAIKey, selectAIMode, selectPlatformAIModel, selectTemporaryAIProvider, setTemporaryAI, useTemporaryAI } from "@/lib/temporaryAI";

type ConnectionResponse = { status: "connected"; model: string; usage: TokenUsage } | { status: "error"; message: string };
type ConnectionState = "unconfigured" | "idle" | "pending" | "connected" | "error";
const httpsHint = "请通过 HTTPS 打开此页。";
const modeOptions = [
  { value: "platform", label: "平台免费 AI", detail: "无需填写 Key。", icon: "lucide:sparkles" },
  { value: "byok", label: "自定义 API Key", detail: "使用自己的服务商账户。", icon: "lucide:key-round" },
] as const;
const connectionLabels: Record<ConnectionState, string> = {
  unconfigured: "待管理员配置", idle: "尚未测试", pending: "连接中", connected: "连接成功", error: "连接失败",
};

export function AISettingsForm({ configured }: { configured: boolean }) {
  const { mode } = useTemporaryAI();
  return (
    <div className="ai-settings-layout">
      <section className="ai-settings-index" aria-labelledby="ai-settings-title">
        <h1 id="ai-settings-title"><span>AI 服务</span><span>设置</span></h1>
        <fieldset className="ai-settings-modes">
          <legend>使用方式</legend>
          {modeOptions.map(({ value, label, detail, icon }) => <label key={value} className="ai-settings-mode">
            <input className="sr-only" type="radio" name="ai-service-mode" value={value} checked={mode === value}
              onChange={() => selectAIMode(value)} />
            <span className="ai-settings-mode-body">
              <CatalogIcon icon={icon} width={20} />
              <span><strong>{label}</strong><small>{detail}</small></span>
              <CatalogIcon icon="lucide:arrow-up-right" width={17} />
            </span>
          </label>)}
        </fieldset>
      </section>
      <section className="ai-settings-console" aria-labelledby="ai-connection-title">
        {mode === "platform" ? <PlatformConnectionForm configured={configured} /> : <CustomConnection />}
      </section>
    </div>
  );
}

function ConnectionSummary({ provider, model, state, usage }: { provider: string; model?: string; state: ConnectionState; usage?: TokenUsage }) {
  return <header className="ai-settings-summary">
    <div className="ai-settings-summary-head">
      <h2 id="ai-connection-title">连接详情</h2>
      <span className="ai-settings-badge" data-state={state} role="status">{connectionLabels[state]}</span>
    </div>
    <dl className="ai-settings-readout">
      <div><dt>服务商</dt><dd>{provider}</dd></div>
      <div><dt>当前模型</dt><dd>{model ? <span lang="en">{model}</span> : "请选择模型"}</dd></div>
    </dl>
    {usage && <p className="ai-settings-usage">测试用量 <b>{usage.totalTokens}</b> tokens</p>}
  </header>;
}

function CustomConnection() {
  const { provider } = useTemporaryAI();
  return <ProviderConnectionForm key={provider} provider={provider} />;
}

function PlatformConnectionForm({ configured }: { configured: boolean }) {
  const { platformModel } = useTemporaryAI();
  const [status, setStatus] = useState<ConnectionState>("idle");
  const [usage, setUsage] = useState<TokenUsage>();
  const [canTest, setCanTest] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    setCanTest(canUseAITransport(window.location));
    return () => { pending.current?.abort(); pending.current = null; };
  }, []);

  async function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || pending.current) return;
    if (!canUseAITransport(window.location)) { setError(httpsHint); setStatus("error"); return; }
    const controller = new AbortController();
    pending.current = controller;
    setStatus("pending");
    setError("");
    setUsage(undefined);
    try {
      const response = await fetch("/api/ai/connection", {
        method: "POST", cache: "no-store", redirect: "error", signal: controller.signal,
        headers: { "Content-Type": "application/json", "X-AI-Provider": "siliconflow", "X-AI-Platform-Model": platformModel },
        body: "{}",
      });
      const result: ConnectionResponse | null = await response.json().catch(() => null);
      if (pending.current !== controller) return;
      if (response.ok && result?.status === "connected") { setUsage(result.usage); setStatus("connected"); return; }
      setError(result?.status === "error" ? result.message : "测试失败，请重试。");
      setStatus("error");
    } catch {
      if (pending.current !== controller) return;
      setError("请求失败，请重试。");
      setStatus("error");
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }

  const visibleError = error || (configured && canTest === false ? httpsHint : "");
  return <>
    <ConnectionSummary provider="硅基流动" model={platformModels[platformModel]} state={!configured ? "unconfigured" : visibleError ? "error" : status} usage={usage} />
    <form className="ai-settings-fields" onSubmit={testConnection}>
      <label htmlFor="ai-platform-model">模型</label>
      <select id="ai-platform-model" value={platformModel} aria-describedby="ai-platform-help" onChange={(event) => {
        const model = event.target.value;
        if (!isPlatformModel(model)) return;
        pending.current?.abort();
        pending.current = null;
        selectPlatformAIModel(model);
        setStatus("idle");
        setError("");
        setUsage(undefined);
      }}>
        {Object.entries(platformModels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <p className="ai-settings-help" id="ai-platform-help">每次调用前核验免费价格。</p>
      {visibleError && <p className="ai-settings-error" role="alert">{visibleError}</p>}
      <div className="ai-settings-actions">
        <button className="ai-settings-test" type="submit" disabled={!configured || !canTest || status === "pending"}>
          <CatalogIcon icon="lucide:plug-zap" width={18} />{status === "pending" ? "正在测试…" : "测试连接"}
        </button>
      </div>
    </form>
    <footer className="ai-settings-policy">
      <CatalogIcon icon="lucide:gauge" width={18} />
      <div><h3>免费额度</h3><p>单 IP 每分钟 {platformQuota.visitorPerMinute} 次。全站每天 {platformQuota.totalPerDay} 次。</p></div>
    </footer>
  </>;
}

function ProviderConnectionForm({ provider }: { provider: AIProvider }) {
  const { connections, keys } = useTemporaryAI();
  const connected = connections[provider];
  const savedKey = keys[provider];
  const [draft, setDraft] = useState("");
  const [region, setRegion] = useState<string>(connected?.selection.provider === "qwen"
    ? connected.selection.region : savedKey?.region ?? qwenRegions[0].id);
  const retainedKey = savedKey && (provider !== "qwen" || savedKey.region === region) ? savedKey.apiKey : undefined;
  const [model, setModel] = useState(connected?.selection.model ?? (savedKey ? "" : availableAIModels(provider, region)[0]?.apiId ?? ""));
  const models = availableAIModels(provider, region);
  const selected = models.find(({ apiId }) => apiId === model);
  const modelValue = selected?.apiId ?? "";
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [canTest, setCanTest] = useState<boolean | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const pending = useRef<AbortController | null>(null);
  const keyInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCanTest(canUseAITransport(window.location));
    function clearDraft() {
      pending.current?.abort();
      pending.current = null;
      setDraft("");
      setTesting(false);
    }
    window.addEventListener("pagehide", clearDraft);
    return () => {
      pending.current?.abort();
      pending.current = null;
      window.removeEventListener("pagehide", clearDraft);
    };
  }, []);

  function resetConnection(removeKey = false) {
    pending.current?.abort();
    pending.current = null;
    retainTemporaryAIKey(provider, removeKey ? undefined : savedKey);
    setTesting(false);
    setError("");
    setAnnouncement("");
  }

  async function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (!canUseAITransport(window.location)) {
      setError(httpsHint);
      return;
    }
    const apiKey = draft.trim() || retainedKey || "";
    const selection = parseAISelection(provider, modelValue, provider === "qwen" ? region : undefined);
    if (!selection) {
      setError(modelSelectionMessage);
      return;
    }
    if (!isApiKey(apiKey)) {
      setError(apiKey ? "请检查 Key 格式。" : "请填写你的 API Key。");
      keyInput.current?.focus();
      return;
    }

    const controller = new AbortController();
    pending.current = controller;
    setTesting(true);
    setError("");
    setAnnouncement("");
    retainTemporaryAIKey(provider, { apiKey, region: selection.provider === "qwen" ? selection.region : undefined });
    setModel(selection.model);
    setDraft("");
    try {
      const response = await fetch("/api/ai/connection", {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        headers: {
          ...aiRequestHeaders(selection, apiKey),
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      const result: ConnectionResponse | null = await response.json().catch(() => null);
      if (pending.current !== controller) return;
      if (response.ok && result?.status === "connected" && result.model === selection.model) {
        setTemporaryAI({ apiKey, selection, usage: result.usage });
        setDraft("");
      } else {
        setError(result?.status === "error" ? result.message : "测试失败，请重试。");
        if (response.status === 404 && result?.status === "error" && result.message === modelSelectionMessage) setModel("");
      }
    } catch {
      if (pending.current === controller) setError("请求失败，请重试。");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setTesting(false);
      }
    }
  }

  const visibleError = error || (canTest === false ? httpsHint : "");
  return (
    <>
      <ConnectionSummary provider={aiProviders[provider].label} model={selected?.label}
        state={testing ? "pending" : visibleError ? "error" : connected ? "connected" : "idle"} usage={connected?.usage} />
      <form className="ai-settings-fields" onSubmit={testConnection} autoComplete="off">
        <div className="ai-settings-provider-fields">
          <div>
            <label htmlFor="ai-provider">选择服务商</label>
            <select id="ai-provider" value={provider} onChange={(event) => {
              const selected = event.target.value;
              if (Object.hasOwn(aiProviders, selected)) selectTemporaryAIProvider(selected as AIProvider);
            }}>
              {Object.entries(aiProviders).map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}
            </select>
          </div>
          {provider === "qwen" && <div>
            <label htmlFor="ai-region">百炼地域</label>
            <select id="ai-region" value={region} aria-describedby="ai-region-help" onChange={(event) => {
              resetConnection();
              setDraft("");
              if (!availableAIModels(provider, event.target.value).some(({ apiId }) => apiId === model)) setModel("");
              setRegion(event.target.value);
            }}>
              {qwenRegions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <p id="ai-region-help" className="ai-settings-help">请选择 Key 所在地域。</p>
          </div>}
        </div>

        <label htmlFor="ai-model">模型</label>
        <select id="ai-model" value={modelValue} aria-describedby="ai-model-help" onChange={(event) => {
          resetConnection();
          setModel(event.target.value);
        }}>
          <option value="" disabled>请选择模型</option>
          {models.map(({ apiId, label }) => <option key={apiId} value={apiId}>{label}</option>)}
        </select>
        <div id="ai-model-help" className="ai-settings-help">
          <p>{selected ? <>API 模型 <code>{selected.apiId}</code> · {billingLabels[selected.billing]}</> : modelSelectionMessage}</p>
          {selected?.output === "text" && <p>文本返回，服务端校验。</p>}
        </div>

        <label htmlFor="ai-key">API Key</label>
        <input id="ai-key" ref={keyInput} type="password" value={draft} maxLength={maxApiKeyLength}
          autoComplete="off" spellCheck={false} autoCapitalize="none" disabled={!canTest} aria-describedby="ai-key-help"
          placeholder={connected ? "已验证。可输入新 Key。" : retainedKey ? "Key 已保留，请测试。" : "粘贴你的 API Key"}
          onChange={(event) => { resetConnection(); setDraft(event.target.value); }} />
        <p className="ai-settings-help" id="ai-key-help">只在当前标签页有效。</p>
        {visibleError && <p className="ai-settings-error" role="alert">{visibleError}</p>}

        <div className="ai-settings-actions">
          <button className="ai-settings-test" type="submit" disabled={testing || !canTest || !modelValue || (!draft.trim() && !retainedKey)}>
            <CatalogIcon icon="lucide:plug-zap" width={18} />{testing ? "正在测试…" : "测试连接"}
          </button>
          <button className="ai-settings-clear" type="button" disabled={!draft && !savedKey} onClick={() => {
            resetConnection(true);
            setDraft("");
            setAnnouncement("已清除 Key。");
            keyInput.current?.focus();
          }}>清除 Key</button>
          {announcement && <span className="ai-settings-help" role="status">{announcement}</span>}
        </div>
      </form>
      <footer className="ai-settings-policy">
        <CatalogIcon icon="lucide:shield-check" width={18} />
        <div><h3>计费与密钥</h3><p>服务商按用量计费。刷新后请重新输入 Key。</p></div>
      </footer>
    </>
  );
}
