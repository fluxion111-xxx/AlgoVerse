"use client";

import { Icon } from "@iconify/react";
import { useRef, useState, type FormEvent } from "react";
import { maxQuestionLength, type CreatorRequest, type CreatorResponse } from "@/lib/experimentCreator";

const example = "为什么 CPU 要进行进程调度？";

export function ExperimentCreator() {
  const input = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text) {
      setStatus("先写下你的问题。");
      input.current?.focus();
      return;
    }

    setChecking(true);
    setStatus("");
    try {
      const response = await fetch("/api/experiments/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text } satisfies CreatorRequest),
      });
      const result: CreatorResponse = await response.json();
      setStatus(result.status === "ready" ? "运行入口还在开发。" : result.message);
    } catch {
      setStatus("连接失败，请再试一次。");
    } finally {
      setChecking(false);
    }
  }

  function useExample() {
    setQuestion(example);
    setStatus("");
    input.current?.focus();
  }

  return (
    <section className="creator-paper" aria-labelledby="creator-title">
      <div className="creator-heading">
        <h2 id="creator-title"><Icon icon="lucide:sparkles" width={23} aria-hidden="true" />AI 实验创造台</h2>
        <span className="creator-badge">AI 尚未接入</span>
      </div>
      <p>把一个问题，变成一次实验。</p>
      <form onSubmit={submit} aria-busy={checking}>
        <label htmlFor="creator-question">你想弄懂什么？</label>
        <textarea id="creator-question" ref={input} maxLength={maxQuestionLength} rows={2} placeholder="写一个你想试的问题。" value={question} onChange={(event) => { setQuestion(event.target.value); setStatus(""); }} />
        <div className="creator-actions">
          <button type="button" className="creator-example" onClick={useExample}>填入 CPU 调度示例</button>
          <button type="submit" className="creator-submit" disabled={checking}>{checking ? "检查中…" : "检查接入"}<Icon icon="lucide:arrow-right" width={17} aria-hidden="true" /></button>
        </div>
        <p className="creator-feedback" role="status">{status || "暂可试填问题。"}</p>
      </form>
    </section>
  );
}
