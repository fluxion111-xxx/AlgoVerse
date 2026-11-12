"use client";

import { useRef, useState, type FormEvent } from "react";
import { maxQuestionLength, type CreatorRequest, type CreatorResponse } from "@/lib/experimentCreator";
import { LabIcon } from "./LabIcon";

const examples = [
  { label: "CPU 调度", question: "为什么 CPU 会进行进程调度？" },
  { label: "排序算法", question: "冒泡排序怎么交换数字？" },
  { label: "网络传输", question: "数据包怎么找到下一站？" },
  { label: "聚类分析", question: "散点多了，怎么分成几组？" },
];

export function ExperimentCreator() {
  const input = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checking) return;

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

  function useExample(example: string) {
    setQuestion(example);
    setStatus("");
    input.current?.focus();
  }

  return (
    <section className="lab-creator" aria-labelledby="creator-title">
      <h2 id="creator-title"><span>AI</span> 实验创造台</h2>
      <p>用一句话，生成你的实验。</p>
      <form onSubmit={submit} aria-busy={checking}>
        <div className="lab-question">
          <label className="sr-only" htmlFor="creator-question">你想弄懂什么？</label>
          <textarea
            id="creator-question"
            ref={input}
            rows={1}
            maxLength={maxQuestionLength}
            placeholder="比如：为什么 CPU 会进行进程调度？"
            value={question}
            readOnly={checking}
            onChange={(event) => { setQuestion(event.target.value); setStatus(""); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button className="lab-creator-submit" type="submit" aria-label="提交实验问题" disabled={checking} data-empty={!question.trim()}>
            <LabIcon name="arrow" />
          </button>
        </div>
        <div className="lab-examples">
          {examples.map(({ label, question: example }) => (
            <button key={label} type="button" disabled={checking} onClick={() => useExample(example)}>{label}</button>
          ))}
        </div>
        <p className="lab-creator-feedback" role="status">{checking ? "检查中…" : status}</p>
      </form>
    </section>
  );
}
