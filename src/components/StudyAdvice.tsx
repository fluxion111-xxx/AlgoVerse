"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { canUseAITransport } from "@/lib/aiSettings";
import { workflowAISettingsRoute } from "@/lib/navigation";
import { fetchWithTemporaryAI, useActiveAI } from "@/lib/temporaryAI";

export function StudyAdvice({ goal }: { goal?: string }) {
  const connection = useActiveAI();
  const [advice, setAdvice] = useState<{ advice: string; topic: { title: string; href: string } }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const pending = useRef(false);

  useEffect(() => { setReady(true); }, []);

  async function generate() {
    if (!connection || pending.current) return;
    if (!canUseAITransport(window.location)) { setError("请通过 HTTPS 使用 AI。"); return; }
    pending.current = true;
    setBusy(true);
    setError("");
    setAdvice(undefined);
    try {
      const response = await fetchWithTemporaryAI("/api/ai/learning", connection, { goal, includeProgress: true });
      const result = await response.json();
      if (!response.ok || result.status !== "advice") { setError(result.message ?? "生成失败，请重试。"); return; }
      setAdvice(result);
    } catch { setError("生成失败，请重试。"); }
    finally { pending.current = false; setBusy(false); }
  }

  return <section className="study-advice" aria-labelledby="study-advice-title" aria-busy={busy}>
    <h3 id="study-advice-title">AI 学习建议</h3>
    <p>发送学习目标和已读状态。<br />也会发送答题数和实验轮数。</p>
    <div className="study-advice-actions">
      {connection && <button className="editorial-button editorial-button-primary" type="button" disabled={!ready || busy} onClick={generate}>{busy ? "正在生成…" : error ? "重试" : "生成建议"}</button>}
      <Link className="study-guide-link" href={workflowAISettingsRoute(goal ? `/learning-path?goal=${goal}` : "/learning-path")}>AI 服务设置</Link>
    </div>
    {error && <p role="alert">{error}</p>}
    {advice && <div className="study-advice-result" aria-live="polite">
      <p>{advice.advice}</p><Link href={advice.topic.href}>{advice.topic.title}</Link>
    </div>}
  </section>;
}
