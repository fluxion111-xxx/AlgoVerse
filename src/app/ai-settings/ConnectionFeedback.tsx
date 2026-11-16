"use client";

import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import { canUseAITransport, type TokenUsage } from "@/lib/aiSettings";
import type { ConnectionVerification } from "@/lib/temporaryAI";

type ResponseBody = { status: "connected"; model: string; usage: TokenUsage }
  | { status: "error" | "unverified"; message: string };
type Attempt = { kind: "pending" } | { kind: "error" | "unverified"; message: string };
type Result = { kind: "success"; provider: string; model: string } | { kind: "error"; message: string };
const httpsHint = "请通过 HTTPS 打开此页。";
const invalidResponse = "验证结果有误。请重试。";

export function useConnectionTest() {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [canTest, setCanTest] = useState<boolean | null>(null);
  const pending = useRef<AbortController | null>(null);

  function cancel() {
    pending.current?.abort();
    pending.current = null;
  }

  function reset() {
    cancel();
    setAttempt(null);
    setResult(null);
  }

  useEffect(() => {
    setCanTest(canUseAITransport(window.location));
    window.addEventListener("pagehide", reset);
    return () => {
      cancel();
      window.removeEventListener("pagehide", reset);
    };
  }, []);

  async function run({ headers, provider, model, onVerified }: {
    headers: Record<string, string>;
    provider: string;
    model?: string;
    onVerified: (verification: ConnectionVerification) => void;
  }) {
    if (pending.current || !canTest) return;
    const controller = new AbortController();
    pending.current = controller;
    setAttempt({ kind: "pending" });
    setResult(null);

    function fail(message: string) {
      setAttempt({ kind: "error", message });
      setResult({ kind: "error", message });
    }

    try {
      const response = await fetch("/api/ai/connection", {
        method: "POST", cache: "no-store", redirect: "error", signal: controller.signal,
        headers: { "Content-Type": "application/json", ...headers }, body: "{}",
      });
      const body: ResponseBody | null = await response.json().catch(() => null);
      if (pending.current !== controller) return;

      if (!response.ok && body?.status === "unverified") {
        setAttempt({ kind: "unverified", message: body.message });
      } else if (response.ok && body?.status === "connected" && typeof body.model === "string" && body.model
        && (!model || body.model === model) && Number.isSafeInteger(body.usage?.totalTokens)) {
        onVerified({ model: body.model, usage: body.usage });
        setAttempt(null);
        setResult({ kind: "success", provider, model: body.model });
      } else {
        fail(body?.status === "error" ? body.message : invalidResponse);
      }
    } catch {
      if (pending.current === controller) fail("验证请求失败。请重试。");
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }

  return {
    attempt, result, canTest, run, reset,
    isPending: () => !!pending.current,
    message: attempt && "message" in attempt ? attempt.message : canTest === false ? httpsHint : "",
    unverified: (message: string) => setAttempt({ kind: "unverified", message }),
    dismiss: () => setResult(null),
  };
}

export type ConnectionTest = ReturnType<typeof useConnectionTest>;

// Lucide check and x from Iconify. Bundle the result marks for offline use.
const marks = {
  success: "m20 6-11 11-5-5",
  error: "m18 6-12 12M6 6l12 12",
};

export function ConnectionResult({ result, dismiss, retry }: { result: Result; dismiss: () => void; retry: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  return <dialog className="ai-settings-result" ref={dialog} data-result={result.kind} onClose={dismiss}
    aria-labelledby="ai-result-title" aria-describedby="ai-result-detail">
    <header>
      <span className="ai-settings-result-mark">
        <Icon icon={{ width: 24, height: 24, body: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="${marks[result.kind]}"/>` }}
          width={20} aria-hidden="true" />
      </span>
      <h2 id="ai-result-title">{result.kind === "success" ? "连接成功" : "连接失败"}</h2>
    </header>
    {result.kind === "success" && <dl className="ai-settings-result-model">
      <div><dt>服务商</dt><dd>{result.provider}</dd></div>
      <div><dt>模型</dt><dd><code lang="en">{result.model}</code></dd></div>
    </dl>}
    <p id="ai-result-detail">{result.kind === "success" ? <>当前模型已通过验证，可以开始使用<span className="ai-settings-result-name">阿洛</span></> : result.message}</p>
    <div className="ai-settings-actions">
      {result.kind === "error" && <button className="ai-settings-test" type="button" onClick={() => { dismiss(); retry(); }}>重新测试</button>}
      <button className="ai-settings-clear" type="button" autoFocus onClick={() => dialog.current?.close()}>关闭</button>
    </div>
  </dialog>;
}
