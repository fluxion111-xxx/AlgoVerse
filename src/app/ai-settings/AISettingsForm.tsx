"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { aiKeyProviderMessage, aiProviders, aiRequestHeaders, availableAIModels, billingLabels, isApiKey, isMaskedApiKey, maxApiKeyLength, modelSelectionMessage, normalizeApiKeyDraft, parseAISelection, parseQwenWorkspace, qwenRegions, selectableAIProviderIds, type AIProvider, type TokenUsage } from "@/lib/aiSettings";
import { isPlatformModel, platformModelIds, platformModels, platformQuota } from "@/lib/platformAI";
import { clearAIProvider, refreshAIConfiguration, selectAIMode, selectPlatformAIModel, selectTemporaryAIProvider, setAIConfiguration, setPlatformAIVerification, useTemporaryAI } from "@/lib/temporaryAI";
import { ConnectionResult, httpsHint, useConnectionTest, type ConnectionTest } from "./ConnectionFeedback";

type ConnectionState = "unconfigured" | "unverified" | "pending" | "connected" | "error" | "auth";
const modeOptions = [
  { value: "platform", label: "平台免费 AI", detail: "无需填写 Key。", icon: "lucide:sparkles" },
  { value: "byok", label: "自定义 API Key", detail: "使用自己的服务商账户。", icon: "lucide:key-round" },
] as const;
const connectionLabels: Record<ConnectionState, string> = {
  unconfigured: "未配置", unverified: "未验证", pending: "验证中", connected: "已验证", error: "验证失败", auth: "认证失败",
};

export function AISettingsForm({ configured }: { configured: boolean }) {
  const { mode, configurationError } = useTemporaryAI();
  const selectedMode = configured ? mode : "byok";
  const test = useConnectionTest();
  useEffect(() => { void refreshAIConfiguration(); }, []);
  return (
    <div className="ai-settings-layout">
      <section className="ai-settings-index" aria-labelledby="ai-settings-title">
        <h1 id="ai-settings-title"><span>AI 服务</span><span>设置</span></h1>
        <fieldset className="ai-settings-modes">
          <legend>使用方式</legend>
          {modeOptions.filter(({ value }) => configured || value === "byok").map(({ value, label, detail, icon }) => <label key={value} className="ai-settings-mode">
            <input className="sr-only" type="radio" name="ai-service-mode" value={value} checked={selectedMode === value}
              onChange={() => { test.reset(); selectAIMode(value); }} />
            <span className="ai-settings-mode-body">
              <CatalogIcon icon={icon} width={20} />
              <span><strong>{label}</strong><small>{detail}</small></span>
              <CatalogIcon icon="lucide:arrow-up-right" width={17} />
            </span>
          </label>)}
        </fieldset>
      </section>
      <section className="ai-settings-console" aria-labelledby="ai-connection-title">
        {configurationError && <p className="ai-settings-feedback" role="status">
          {configurationError} <button className="ai-settings-clear" type="button" onClick={() => void refreshAIConfiguration()}>重读配置</button>
        </p>}
        {selectedMode === "platform" ? <PlatformConnectionForm configured={configured} test={test} /> : <CustomConnection test={test} />}
      </section>
      {test.result && <ConnectionResult result={test.result} dismiss={test.dismiss} />}
    </div>
  );
}

function ConnectionSummary({ provider, model, state, usage, label }: {
  provider: string; model?: string; state: ConnectionState; usage?: TokenUsage; label?: string;
}) {
  return <header className="ai-settings-summary">
    <div className="ai-settings-summary-head">
      <h2 id="ai-connection-title">连接详情</h2>
      <span className="ai-settings-badge" data-state={state === "auth" ? "error" : state} role="status">{label ?? connectionLabels[state]}</span>
    </div>
    <dl className="ai-settings-readout">
      <div><dt>服务商</dt><dd>{provider}</dd></div>
      <div><dt>当前模型</dt><dd>{model ? <span lang="en">{model}</span> : "请选择模型"}</dd></div>
    </dl>
    {usage && <p className="ai-settings-usage">上次测试 <b>{usage.totalTokens}</b> tokens</p>}
  </header>;
}

type FormProps = { test: ConnectionTest };

function CustomConnection({ test }: FormProps) {
  const { provider, configuration, configurationError } = useTemporaryAI();
  const legacy = configuration?.providers.qwen;
  const fallback = configuration?.providers.qianwen ? "qianwen" : "deepseek";
  const selected = provider === "qwen" && !legacy ? fallback : provider;

  useEffect(() => {
    if (configuration && selected !== provider) selectTemporaryAIProvider(selected);
  }, [configuration, provider, selected]);

  if (provider === "qwen" && !configuration && !configurationError) return <p role="status">正在读取 AI 配置…</p>;
  return <ProviderConnectionForm key={selected} provider={selected} test={test} />;
}

function TestButton({ test, disabled, label }: { test: ConnectionTest; disabled: boolean; label: string }) {
  const testing = test.attempt?.kind === "pending";
  return <button className="ai-settings-test" type="submit" disabled={disabled || testing || test.cooling}>
    {testing ? <span className="ai-settings-spinner" aria-hidden="true" /> : <CatalogIcon icon="lucide:plug-zap" width={18} />}
    {testing ? "正在验证连接…" : test.attempt?.kind === "error" ? "重新测试" : label}
  </button>;
}

function PlatformConnectionForm({ configured, test }: FormProps & { configured: boolean }) {
  const { platformModel, platformVerification } = useTemporaryAI();

  function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !test.canTest || test.isPending() || test.cooling) return;
    void test.run({
      headers: { "X-AI-Provider": "siliconflow", "X-AI-Platform-Model": platformModel },
      provider: "硅基流动", model: platformModelIds[platformModel], onVerified: (value) => setPlatformAIVerification(platformModel, value),
    });
  }

  const state = !configured ? "unconfigured" : test.attempt?.kind ?? (platformVerification && test.canTest ? "connected" : "unverified");
  const message = configured ? test.message : "等待管理员配置。";
  return <>
    <ConnectionSummary provider="硅基流动" model={platformModels[platformModel]} state={state} usage={state === "connected" ? platformVerification?.usage : undefined} />
    <form className="ai-settings-fields" onSubmit={testConnection}>
      <label htmlFor="ai-platform-model">模型</label>
      <select id="ai-platform-model" value={platformModel} aria-describedby="ai-platform-help" onChange={(event) => {
        const model = event.target.value;
        if (!isPlatformModel(model)) return;
        test.reset();
        selectPlatformAIModel(model);
      }}>
        {Object.entries(platformModels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <p className="ai-settings-help" id="ai-platform-help">每次调用前核验免费价格。</p>
      {message && <p className="ai-settings-feedback" data-state={state} role="status">{message}</p>}
      <div className="ai-settings-actions">
        <TestButton test={test} disabled={!configured || !test.canTest} label="测试连接" />
      </div>
    </form>
    <footer className="ai-settings-policy">
      <CatalogIcon icon="lucide:gauge" width={18} />
      <div><h3>免费额度</h3><p>单 IP 每分钟 {platformQuota.visitorPerMinute} 次。全站每天 {platformQuota.totalPerDay} 次。</p></div>
    </footer>
  </>;
}

function ProviderConnectionForm({ provider, test }: FormProps & { provider: AIProvider }) {
  const { configuration, configurationError, mode } = useTemporaryAI();
  const saved = configuration?.providers[provider];
  const [draft, setDraft] = useState("");
  const [regionOverride, setRegion] = useState<string>();
  const [modelOverride, setModel] = useState<string>();
  const [workspaceOverride, setWorkspace] = useState<string>();
  const region = regionOverride ?? (saved?.selection.provider === "qwen" ? saved.selection.region : qwenRegions[0].id);
  const savedWorkspace = saved?.selection.provider === "qwen" && saved.selection.region === region ? saved.workspaceId ?? "" : "";
  const workspaceId = parseQwenWorkspace(workspaceOverride ?? savedWorkspace, region);
  const retainedKey = provider === "qwen"
    ? saved?.selection.provider === "qwen" && saved.selection.region === region && workspaceId === savedWorkspace : !!saved;
  const models = availableAIModels(provider, region);
  const model = modelOverride ?? saved?.selection.model ?? models[0]?.apiId;
  const selected = models.find(({ apiId }) => apiId === model);
  const modelValue = selected?.apiId ?? "";
  const [announcement, setAnnouncement] = useState("");
  const [clearing, setClearing] = useState(false);
  const keyInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function clearDraft() { setDraft(""); }
    window.addEventListener("pagehide", clearDraft);
    return () => window.removeEventListener("pagehide", clearDraft);
  }, []);

  function resetConnection() {
    test.reset();
    setAnnouncement("");
  }

  function switchProvider(next: AIProvider) {
    resetConnection();
    selectTemporaryAIProvider(next);
  }

  async function clearKey() {
    resetConnection();
    if (saved) {
      setClearing(true);
      try { await clearAIProvider(provider, saved.credentialVersion); }
      catch { setAnnouncement("清除失败。请重试。"); return; }
      finally { setClearing(false); }
    }
    setDraft("");
    setAnnouncement("已清除 Key。");
    keyInput.current?.focus();
  }

  function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (test.isPending() || clearing || !test.canTest || test.cooling) return;
    const apiKey = normalizeApiKeyDraft(keyInput.current?.value ?? draft);
    const selection = parseAISelection(provider, modelValue, provider === "qwen" ? region : undefined);
    if (!selection) {
      test.unverified(modelSelectionMessage);
      return;
    }
    if (!apiKey && !retainedKey) {
      test.unverified("请填写你的 API Key。");
      keyInput.current?.focus();
      return;
    }
    const providerMessage = aiKeyProviderMessage(provider, apiKey);
    if (providerMessage) {
      test.unverified(providerMessage);
      keyInput.current?.focus();
      return;
    }
    if (apiKey && !isApiKey(apiKey, provider)) {
      const hint = isMaskedApiKey(apiKey) ? "这是遮挡后的 Key。请粘贴创建时的完整值。"
        : provider !== "qianwen" && apiKey.length > maxApiKeyLength ? "Key 太长。请只复制密钥。"
        : /\s/.test(apiKey) ? "Key 中有空格。请重新粘贴。"
        : !apiKey.startsWith("sk-") ? "Key 缺少 sk- 前缀。"
        : "Key 格式有误。请只复制密钥。";
      test.unverified(hint);
      keyInput.current?.focus();
      return;
    }
    if (provider === "qwen" && workspaceId === null) {
      test.unverified("请填写同地域的业务空间 ID 或专属地址。");
      return;
    }

    setAnnouncement("");
    void test.run({
      headers: { ...aiRequestHeaders(selection, apiKey), "X-AI-Save-Credential": "1",
        ...(saved && { "X-AI-Credential-Version": saved.credentialVersion }),
        ...(provider === "qwen" && apiKey && workspaceId && { "X-AI-Qwen-Workspace": workspaceId }) },
      provider: aiProviders[provider].label, model: selection.model,
      onVerified: (_verification, configuration) => {
        if (configuration) {
          if (mode !== "byok") selectAIMode("byok");
          setAIConfiguration(configuration, selection);
        }
        setDraft("");
      },
      onConfigurationChanged: () => void refreshAIConfiguration(),
      onAuthFailure: () => { if (!apiKey) void refreshAIConfiguration(); },
    });
  }

  const hasKey = !!(draft.trim() || retainedKey);
  const verification = !draft && retainedKey ? saved?.verifications.find(({ model }) => model === modelValue) : undefined;
  const state = test.attempt?.kind ?? (!draft && retainedKey && saved?.authenticationFailed ? "auth"
    : verification ? "connected" : hasKey || (!configuration && !configurationError) ? "unverified" : "unconfigured");
  const deepSeekAuthFailed = provider === "deepseek" && saved?.authenticationFailed;
  const deepSeekConnected = provider === "deepseek" && !deepSeekAuthFailed && !!saved?.verifications.length;
  const summaryState = deepSeekAuthFailed ? "auth" : deepSeekConnected ? "connected" : state;
  const connectionLabel = deepSeekAuthFailed ? "连接已失效。请重新验证。" : deepSeekConnected ? "API Key 已连接" : undefined;
  return (
    <>
      <ConnectionSummary provider={aiProviders[provider].label} model={selected?.label}
        state={summaryState} label={connectionLabel} usage={summaryState === "connected" ? verification?.usage : undefined} />
      <form className="ai-settings-fields" onSubmit={testConnection} autoComplete="off">
        <div className="ai-settings-provider-fields">
          <div>
            <label htmlFor="ai-provider">选择服务商</label>
            <select id="ai-provider" value={provider === "qwen" ? "" : provider} onChange={(event) => {
              const selected = selectableAIProviderIds.find((id) => id === event.target.value);
              if (selected) switchProvider(selected);
            }}>
              {provider === "qwen" && <option value="" disabled hidden>选择新服务商</option>}
              {selectableAIProviderIds.map((id) => <option key={id} value={id}>{aiProviders[id].label}</option>)}
            </select>
          </div>
          {provider === "qwen" && <div>
            <label htmlFor="ai-region">百炼地域</label>
            <select id="ai-region" value={region} aria-describedby="ai-region-help" onChange={(event) => {
              resetConnection();
              setDraft("");
              setWorkspace(undefined);
              if (!availableAIModels(provider, event.target.value).some(({ apiId }) => apiId === model)) setModel("");
              setRegion(event.target.value);
            }}>
              {qwenRegions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <p id="ai-region-help" className="ai-settings-help">请选择 Key 所在地域。</p>
          </div>}
        </div>
        {provider === "qwen" && <>
          <label htmlFor="ai-qwen-workspace">百炼业务空间（可选）</label>
          <input id="ai-qwen-workspace" type="text" value={workspaceOverride ?? savedWorkspace} maxLength={160}
            placeholder="llm-…" spellCheck={false} autoCapitalize="none" aria-describedby="ai-qwen-workspace-help"
            onChange={(event) => { resetConnection(); setWorkspace(event.target.value); }} />
          <p className="ai-settings-help" id="ai-qwen-workspace-help">可填 ID 或专属地址。留空用公共地址。</p>
        </>}

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
          {deepSeekConnected && selected && !draft && !verification && <p>当前模型未验证。</p>}
          {selected?.output === "text" && <p>文本返回，服务端校验。</p>}
        </div>

        <label htmlFor="ai-key">API Key</label>
        <input id="ai-key" ref={keyInput} type="password" value={draft} maxLength={provider === "qianwen" ? undefined : maxApiKeyLength}
          autoComplete="off" spellCheck={false} autoCapitalize="none" disabled={!test.canTest} aria-describedby="ai-key-help"
          placeholder={state === "connected" ? "已验证。可输入新 Key。" : retainedKey ? "已保留 Key" : "粘贴你的 API Key"}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            const key = normalizeApiKeyDraft(pasted);
            if (pasted === key) return;
            const input = event.currentTarget;
            event.preventDefault();
            resetConnection();
            setDraft(input.value.slice(0, input.selectionStart ?? 0) + key + input.value.slice(input.selectionEnd ?? input.value.length));
          }}
          onChange={(event) => { resetConnection(); setDraft(event.target.value); }} />
        <p className="ai-settings-help" id="ai-key-help">{test.canTest === false ? httpsHint
          : provider === "qianwen" ? "请填千问 AI 平台的按量 Key。验证后保留 8 小时。"
          : provider === "qwen" ? "请填同地域的阿里云百炼 Key。验证后保留 8 小时。" : "验证后暂存于服务端，最多 8 小时。"}</p>
        {test.canTest !== false && test.message && <p className="ai-settings-feedback" data-state={state} role={state === "error" ? "alert" : "status"}>{test.message}</p>}

        <div className="ai-settings-actions">
          <TestButton test={test} disabled={clearing || !test.canTest} label="测试并保存" />
          <button className="ai-settings-clear" type="button" disabled={clearing || test.isPending() || (!draft && !saved)}
            onClick={() => void clearKey()}>清除 Key</button>
          {provider !== "qwen" && configuration?.providers.qwen && <button className="ai-settings-clear" type="button"
            disabled={clearing || test.isPending()} onClick={() => switchProvider("qwen")}>管理已存百炼 Key</button>}
          {announcement && <span className="ai-settings-help" role="status">{announcement}</span>}
        </div>
      </form>
      <footer className="ai-settings-policy">
        <CatalogIcon icon="lucide:shield-check" width={18} />
        <div><h3>计费与密钥</h3><p>服务商按用量计费。凭据到期后需重新验证。</p></div>
      </footer>
    </>
  );
}
