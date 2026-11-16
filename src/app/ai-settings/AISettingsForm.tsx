"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { aiProviders, aiRequestHeaders, availableAIModels, billingLabels, isApiKey, maxApiKeyLength, modelSelectionMessage, parseAISelection, qwenRegions, type AIProvider, type TokenUsage } from "@/lib/aiSettings";
import { isPlatformModel, platformModels, platformQuota } from "@/lib/platformAI";
import { retainTemporaryAIKey, selectAIMode, selectPlatformAIModel, selectTemporaryAIProvider, setPlatformAIVerification, setTemporaryAI, useTemporaryAI } from "@/lib/temporaryAI";
import { ConnectionResult, useConnectionTest, type ConnectionTest } from "./ConnectionFeedback";

type ConnectionState = "unconfigured" | "unverified" | "pending" | "connected" | "error";
const modeOptions = [
  { value: "platform", label: "平台免费 AI", detail: "无需填写 Key。", icon: "lucide:sparkles" },
  { value: "byok", label: "自定义 API Key", detail: "使用自己的服务商账户。", icon: "lucide:key-round" },
] as const;
const connectionLabels: Record<ConnectionState, string> = {
  unconfigured: "未配置", unverified: "未验证", pending: "验证中", connected: "已验证", error: "验证失败",
};

export function AISettingsForm({ configured }: { configured: boolean }) {
  const { mode } = useTemporaryAI();
  const test = useConnectionTest();
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="ai-settings-layout">
      <section className="ai-settings-index" aria-labelledby="ai-settings-title">
        <h1 id="ai-settings-title"><span>AI 服务</span><span>设置</span></h1>
        <fieldset className="ai-settings-modes">
          <legend>使用方式</legend>
          {modeOptions.map(({ value, label, detail, icon }) => <label key={value} className="ai-settings-mode">
            <input className="sr-only" type="radio" name="ai-service-mode" value={value} checked={mode === value}
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
        {mode === "platform" ? <PlatformConnectionForm configured={configured} test={test} form={form} /> : <CustomConnection test={test} form={form} />}
      </section>
      {test.result && <ConnectionResult result={test.result} dismiss={test.dismiss} retry={() => form.current?.requestSubmit()} />}
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
    {usage && <p className="ai-settings-usage">上次测试 <b>{usage.totalTokens}</b> tokens</p>}
  </header>;
}

type FormProps = { test: ConnectionTest; form: RefObject<HTMLFormElement | null> };

function CustomConnection({ test, form }: FormProps) {
  const { provider } = useTemporaryAI();
  return <ProviderConnectionForm key={provider} provider={provider} test={test} form={form} />;
}

function TestButton({ test, disabled, label }: { test: ConnectionTest; disabled: boolean; label: string }) {
  const testing = test.attempt?.kind === "pending";
  return <button className="ai-settings-test" type="submit" disabled={disabled || testing}>
    {testing ? <span className="ai-settings-spinner" aria-hidden="true" /> : <CatalogIcon icon="lucide:plug-zap" width={18} />}
    {testing ? "正在验证连接…" : test.attempt?.kind === "error" ? "重新测试" : label}
  </button>;
}

function PlatformConnectionForm({ configured, test, form }: FormProps & { configured: boolean }) {
  const { platformModel, platformVerification } = useTemporaryAI();

  function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !test.canTest || test.isPending()) return;
    setPlatformAIVerification(platformModel);
    void test.run({
      headers: { "X-AI-Provider": "siliconflow", "X-AI-Platform-Model": platformModel },
      provider: "硅基流动", onVerified: (value) => setPlatformAIVerification(platformModel, value),
    });
  }

  const state = !configured ? "unconfigured" : test.attempt?.kind ?? (platformVerification && test.canTest ? "connected" : "unverified");
  const message = configured ? test.message : "等待管理员配置。";
  return <>
    <ConnectionSummary provider="硅基流动" model={platformModels[platformModel]} state={state} usage={state === "connected" ? platformVerification?.usage : undefined} />
    <form className="ai-settings-fields" ref={form} onSubmit={testConnection}>
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

function ProviderConnectionForm({ provider, test, form }: FormProps & { provider: AIProvider }) {
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
  const [announcement, setAnnouncement] = useState("");
  const keyInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function clearDraft() { setDraft(""); }
    window.addEventListener("pagehide", clearDraft);
    return () => window.removeEventListener("pagehide", clearDraft);
  }, []);

  function resetConnection(removeKey = false) {
    test.reset();
    retainTemporaryAIKey(provider, removeKey ? undefined : savedKey);
    setAnnouncement("");
  }

  function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (test.isPending() || !test.canTest) return;
    const apiKey = draft.trim() || retainedKey || "";
    const selection = parseAISelection(provider, modelValue, provider === "qwen" ? region : undefined);
    if (!selection) {
      test.unverified(modelSelectionMessage);
      return;
    }
    if (!isApiKey(apiKey)) {
      test.unverified(apiKey ? "请检查 Key 格式。" : "请填写你的 API Key。");
      keyInput.current?.focus();
      return;
    }

    setAnnouncement("");
    retainTemporaryAIKey(provider, { apiKey, region: selection.provider === "qwen" ? selection.region : undefined });
    setDraft("");
    void test.run({
      headers: aiRequestHeaders(selection, apiKey), provider: aiProviders[provider].label, model: selection.model,
      onVerified: (verification) => setTemporaryAI({ apiKey, selection, verification }),
    });
  }

  const hasKey = !!(draft.trim() || retainedKey);
  const verification = !draft && connected?.apiKey === retainedKey && connected?.selection.model === modelValue
    ? connected?.verification : undefined;
  const state = !hasKey ? "unconfigured" : test.attempt?.kind ?? (verification && test.canTest ? "connected" : "unverified");
  return (
    <>
      <ConnectionSummary provider={aiProviders[provider].label} model={selected?.label}
        state={state} usage={state === "connected" ? verification?.usage : undefined} />
      <form className="ai-settings-fields" ref={form} onSubmit={testConnection} autoComplete="off">
        <div className="ai-settings-provider-fields">
          <div>
            <label htmlFor="ai-provider">选择服务商</label>
            <select id="ai-provider" value={provider} onChange={(event) => {
              const selected = event.target.value;
              if (Object.hasOwn(aiProviders, selected)) {
                test.reset();
                selectTemporaryAIProvider(selected as AIProvider);
              }
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
          autoComplete="off" spellCheck={false} autoCapitalize="none" disabled={!test.canTest} aria-describedby="ai-key-help"
          placeholder={state === "connected" ? "已验证。可输入新 Key。" : retainedKey ? "已保留 Key" : "粘贴你的 API Key"}
          onChange={(event) => { resetConnection(); setDraft(event.target.value); }} />
        <p className="ai-settings-help" id="ai-key-help">只在当前标签页有效。</p>
        {test.message && <p className="ai-settings-feedback" data-state={state} role="status">{test.message}</p>}

        <div className="ai-settings-actions">
          <TestButton test={test} disabled={!test.canTest || !modelValue || !hasKey} label="保存并测试连接" />
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
