"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LazyTutorReply } from "@/components/experiments/LazyTutorReply";
import { canUseAITransport } from "@/lib/aiSettings";
import { maxCreatorHistory, maxQuestionLength, type CreatorTurn } from "@/lib/experimentCreator";
import { fetchWithTemporaryAI, useActiveAI } from "@/lib/temporaryAI";
import { workflowAISettingsRoute } from "@/lib/navigation";
import type { TutorCodeBlock } from "@/lib/tutorReply";

type Reply = { answer: string; codeBlocks?: TutorCodeBlock[]; sources: { title: string; href: string }[];
  recommendation?: { title: string; href: string } };
type Turn = CreatorTurn & Reply;
const prompts = [
  ["讲简单些", "请用更简单的话解释本节核心概念。给一个短例子。"],
  ["换个例子", "用不同的输入给一个新例子。一步步说明。"],
  ["读代码", "请逐步解释本节代码。强调容易读错的行。"],
  ["提示解题", "请用问题引导我解题。先别直接给答案。"],
  ["加一道练习", "给我一道新的应用练习。先只给题目和一条提示。"],
  ["推荐实验", "请根据本节内容推荐合适的站内实验。没有适合的就直接说明。"],
] as const;

export function LessonTutor({ topicId, returnTo, platformConfigured, attempts, hasCode }: {
  topicId: string; returnTo: string; platformConfigured: boolean; attempts: readonly boolean[]; hasCode: boolean;
}) {
  const connection = useActiveAI();
  const available = connection && (!("platformModel" in connection) || platformConfigured);
  const [ready, setReady] = useState(false);
  const [question, setQuestion] = useState("");
  const [share, setShare] = useState(false);
  const [history, setHistory] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const reply = history.at(-1);

  useEffect(() => {
    setReady(true);
    return () => { pending.current?.abort(); pending.current = null; };
  }, []);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !available || !question.trim()) return;
    if (!canUseAITransport(window.location)) { setError("请通过 HTTPS 使用 AI。"); return; }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    const text = question.trim();
    try {
      const response = await fetchWithTemporaryAI("/api/ai/tutor", connection, {
        question: text, topicId, includePractice: share,
        history: history.map(({ question, answer, codeBlocks }) => ({ question, answer, codeBlocks })),
      }, controller.signal);
      const data = await response.json();
      if (pending.current !== controller) return;
      if (!response.ok || data.status !== "answer") { setError(data.message ?? "生成失败，请重试。"); return; }
      setHistory((turns) => [...turns, { ...data, question: text }].slice(-maxCreatorHistory));
      setQuestion("");
    } catch {
      if (pending.current === controller) setError("连接失败，请重试。");
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }
  return <section className="lesson-tutor lesson-section" id="lesson-tutor" aria-labelledby="lesson-tutor-title">
    <h6 id="lesson-tutor-title">问阿洛</h6>
    <p>阿洛会参考本节内容。</p>
    {!available && <p role="status">请先配置 AI 服务。</p>}
    <Link className="catalog-direct" href={workflowAISettingsRoute(returnTo)}>AI 服务设置</Link>
    <div className="lesson-prompts">{prompts.filter(([label]) => hasCode || label !== "读代码").map(([label, text]) => <button key={label} type="button" disabled={!ready || busy || !available}
      onClick={() => { setQuestion(text); input.current?.focus(); }}>{label}</button>)}</div>
    <form onSubmit={ask} aria-busy={busy}>
      <label htmlFor="lesson-tutor-question">你卡在哪一步？</label>
      <textarea id="lesson-tutor-question" ref={input} maxLength={maxQuestionLength} rows={2} value={question} disabled={!available || !ready || busy}
        onChange={(event) => setQuestion(event.target.value)} />
      <label className="lesson-share"><input type="checkbox" checked={share} disabled={busy || !ready}
        onChange={(event) => { setShare(event.target.checked); setHistory([]); setError(""); }} />允许读取本节答题正误</label>
      {share && <p role="status">本节已答 {attempts.length} 题。最近答错 {attempts.filter((correct) => !correct).length} 题。</p>}
      <button className="catalog-jump" type="submit" disabled={!ready || !available || !question.trim() || busy}>{busy ? "正在回答…" : "发送问题"}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {reply && <div className="lesson-ai-reply" aria-live="polite">
      <p className="lesson-ai-question">{reply.question}</p>
      <LazyTutorReply answer={reply.answer} codeBlocks={reply.codeBlocks} reveal={false} />
      {reply.sources.map(({ title, href }) => <Link key={href} className="catalog-direct" href={href}>{title}</Link>)}
      {reply.recommendation && <Link className="catalog-direct" href={reply.recommendation.href}>{reply.recommendation.title}</Link>}
    </div>}
  </section>;
}
