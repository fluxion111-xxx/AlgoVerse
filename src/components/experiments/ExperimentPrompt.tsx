"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Icon } from "@iconify/react";
import { openExperimentQuestion } from "@/app/experiments/actions";
import { maxQuestionLength } from "@/lib/experimentCreator";
import { nextExperimentQuestion } from "@/lib/experimentQuestions";
import { experimentDomains } from "@/lib/experiments/engine";
import { LabIcon } from "./LabIcon";

type Domain = keyof typeof experimentDomains;
const domains = Object.keys(experimentDomains) as Domain[];

export function ExperimentPrompt({ appearance }: { appearance?: "editorial" | "catalog" }) {
  const [submitError, submit, saving] = useActionState(openExperimentQuestion, "");
  const [question, setQuestion] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ domain: Domain; lastInRound: boolean } | null>(null);
  const error = saving ? "" : feedback ?? submitError;
  const editorial = appearance === "editorial";
  const catalog = appearance === "catalog";
  const inputId = catalog ? "creator-question" : "home-question";
  const errorId = `${inputId}-error`;

  function fill(domain: Domain) {
    const { text, lastInRound } = nextExperimentQuestion(domain);
    setQuestion(text);
    setFeedback("");
    setSelection({ domain, lastInRound });
  }

  function edit(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setQuestion(event.target.value);
    setFeedback("");
    setSelection(null);
  }

  const inputProps = {
    id: inputId,
    name: "question",
    required: true,
    maxLength: maxQuestionLength,
    value: question,
    readOnly: saving,
    onChange: edit,
    "aria-invalid": !!error,
    "aria-describedby": error ? errorId : undefined,
  };
  const field = <>
    <label className={editorial ? undefined : "sr-only"} htmlFor={inputId}>{catalog ? "你想弄懂什么？" : "你想研究什么？"}</label>
    {appearance ? <textarea {...inputProps} rows={editorial || question.length > 24 ? 4 : 1}
      placeholder={editorial ? "比如：比较冒泡排序和快速排序" : "比如：CPU 怎么轮流调度？"}
      onKeyDown={catalog ? (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (!saving) event.currentTarget.form?.requestSubmit();
        }
      } : undefined} />
      : <input {...inputProps} placeholder="比如：比较冒泡与快排。" />}
  </>;
  const form = <form className={editorial ? "editorial-prompt" : catalog ? undefined : "home-experiment-prompt"}
    aria-busy={saving} action={submit} noValidate onSubmit={(event) => {
      if (!question.trim()) {
        event.preventDefault();
        setFeedback("先写下你的问题。");
        const field = event.currentTarget.elements.namedItem("question");
        if (field instanceof HTMLElement) field.focus();
        return;
      }
      setFeedback(null);
    }}>
    {catalog ? <div className="lab-question">
      {field}
      <button className="lab-creator-submit" type="submit" aria-label="在工作台打开问题" disabled={saving}>
        <LabIcon name="arrow" />
      </button>
    </div> : field}
    {error && <p id={errorId} role="alert" className={editorial ? "editorial-prompt-error" : catalog ? "lab-creator-feedback" : "sr-only"}>{error}</p>}
    {!catalog && <button type="submit" disabled={saving} aria-label={editorial ? undefined : "在工作台打开问题"}>
      {editorial && <span>{saving ? "正在创建…" : "进入创造台"}</span>}
      <Icon icon="lucide:arrow-up-right" width={20} aria-hidden="true" />
    </button>}
  </form>;

  if (!appearance) return form;

  return <>
    {form}
    <section className={editorial ? "editorial-domains" : "lab-examples"} aria-labelledby={`${inputId}-directions`}>
      <p id={`${inputId}-directions`}>从专业方向开始</p>
      <p className="experiment-question-hint">点击专业方向，自动填写一道实验问题</p>
      <ul>{domains.map((domain) => <li key={domain}>
        <button type="button" aria-controls={inputId} aria-pressed={selection?.domain === domain} disabled={saving} onClick={() => fill(domain)}>
          <span>{experimentDomains[domain]}</span><LabIcon name="refresh" width={14} />
        </button>
      </li>)}</ul>
      <p className={selection?.lastInRound ? "experiment-question-status" : "sr-only"} role="status">
        {selection?.lastInRound ? "本模块题目已浏览完。再点一次，开始新一轮。" : selection ? `已填入。 ${question}` : ""}
      </p>
    </section>
  </>;
}
