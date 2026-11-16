"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { canUseAITransport } from "@/lib/aiSettings";
import { workflowAISettingsRoute } from "@/lib/navigation";
import { fetchWithTemporaryAI, useActiveAI } from "@/lib/temporaryAI";
import { StudyRecommendation, type StudyRecommendationData } from "./StudyRecommendation";

export function StudyAdvice({ goal }: { goal?: string }) {
  const connection = useActiveAI();
  const [advice, setAdvice] = useState<StudyRecommendationData & { basedOnRecords?: boolean }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef<AbortController | null>(null);
  const previous = useRef<string[]>([]);
  const step = useRef(0);

  useEffect(() => {
    setReady(true);
    return () => { pending.current?.abort(); pending.current = null; };
  }, []);

  async function generate() {
    if (!connection || pending.current) return;
    if (!canUseAITransport(window.location)) { setError("请通过 HTTPS 使用 AI。"); return; }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetchWithTemporaryAI("/api/ai/learning", connection,
        { goal, includeProgress: true, step: step.current, previous: previous.current }, controller.signal);
      const result = await response.json();
      if (pending.current !== controller) return;
      if (result.status === "complete") { setAdvice(undefined); setMessage(result.message); return; }
      if (!response.ok || result.status !== "advice") { setError(result.message ?? "生成失败，请重试。"); return; }
      setAdvice(result);
      previous.current = [...previous.current, result.key].slice(-6);
      step.current = (step.current + 1) % 1_000_000;
    } catch {
      if (pending.current === controller) setError("生成失败，请重试。");
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }

  return <section className="study-advice" aria-labelledby="study-advice-title" aria-busy={busy}>
    <h3 id="study-advice-title">AI 学习建议</h3>
    <p>发送学习目标和进度。<br />也会发送错题及已存选项。</p>
    <div className="study-advice-actions">
      {connection && <button className="editorial-button editorial-button-primary" type="button" disabled={!ready || busy} onClick={generate}>
        {busy ? "正在生成…" : error ? "重试" : advice ? "换个角度" : "生成建议"}
      </button>}
      <Link className="study-guide-link" href={workflowAISettingsRoute(goal ? `/learning-path?goal=${goal}` : "/learning-path")}>AI 服务设置</Link>
    </div>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {advice?.basedOnRecords && <p>换个角度看学习记录。</p>}
    {advice && <StudyRecommendation advice={advice} />}
  </section>;
}
