"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { aiSettingsRoute, canUseAITransport } from "@/lib/aiSettings";
import type { QuickStartResponse } from "@/lib/quickStart";
import { fetchWithTemporaryAI, useActiveAI } from "@/lib/temporaryAI";

export function QuickStartRequest({ operation, id, auto, className, requestLabel, settingsHref = aiSettingsRoute }: {
  operation: "start" | "generate" | "diagnose";
  id?: string;
  auto: boolean;
  className: string;
  requestLabel?: string;
  settingsHref?: string;
}) {
  const router = useRouter();
  const connection = useActiveAI();
  const needsKey = operation !== "start" && !connection;
  const busy = useRef(false);
  const attempted = useRef(false);
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState("");
  const request = useCallback(async () => {
    if (busy.current || needsKey) return;
    if (connection && operation !== "start" && !canUseAITransport(window.location)) {
      setError("请通过 HTTPS 使用 AI。");
      return;
    }
    busy.current = true;
    attempted.current = true;
    setStatus("pending");
    setError("");
    try {
      const response = await fetchWithTemporaryAI(operation === "diagnose" ? `/api/experiments/runs/${id}/diagnosis` : "/api/experiments/creator",
        operation === "start" ? undefined : connection, { mode: "quick-start", operation, sessionId: id });
      const result: QuickStartResponse | null = await response.json().catch(() => null);
      if (result?.status === "error") throw new Error(result.message);
      if (!response.ok || !result) throw new Error("请求失败，请重试。");
      if (operation === "start" && result.status === "started") {
        router.replace(`/experiments/create?mode=quick-start&sessionId=${encodeURIComponent(result.sessionId)}${auto ? "" : "&auto=0"}`);
      } else if ((operation === "generate" && result.status === "configured") || (operation === "diagnose" && result.status === "ready")) {
        router.refresh();
      } else {
        throw new Error("响应异常，请重试。");
      }
      setStatus("done");
    } catch (error) {
      setError(error instanceof Error && error.message.length < 80 ? error.message : "请求失败，请重试。");
      setStatus("idle");
      busy.current = false;
    }
  }, [auto, connection, id, needsKey, operation, router]);

  useEffect(() => {
    if (!auto || needsKey || attempted.current) return;
    const timer = window.setTimeout(() => { void request(); }, operation === "start" ? 1800 : 300);
    return () => window.clearTimeout(timer);
  }, [auto, needsKey, operation, request]);

  const label = requestLabel ?? (operation === "start" ? "继续" : operation === "generate" ? "生成配置" : "生成诊断");
  const pending = operation === "start" ? "正在准备…" : operation === "generate" ? "AI 正在生成配置…" : "AI 正在分析本轮…";
  if (needsKey) {
    return <div className="quick-start-request">
      <Link className={className} href={settingsHref}>配置 AI 服务</Link>
      {error && <p className="preset-error" role="alert">{error}</p>}
    </div>;
  }
  return (
    <div className="quick-start-request">
      <button type="button" className={className} onClick={request} disabled={status !== "idle"}>
        {status === "idle" ? (error ? "重试" : label) : pending}
      </button>
      {operation !== "start" && <Link className="catalog-direct workflow-secondary" href={settingsHref}>AI 服务设置</Link>}
      {status !== "idle" && <p role="status" className="sr-only">{pending}</p>}
      {error && <p className="preset-error" role="alert">{error}</p>}
    </div>
  );
}
