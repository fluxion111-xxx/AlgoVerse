"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Icon } from "@iconify/react";
import { maxQuestionLength } from "@/lib/experimentCreator";
import { openExperimentQuestion } from "@/app/experiments/actions";

export function ExperimentPrompt({ appearance }: { appearance?: "editorial" }) {
  const [submitError, submit, saving] = useActionState(openExperimentQuestion, "");
  const [question, setQuestion] = useState("");
  const [edited, setEdited] = useState(false);
  const error = edited || saving ? "" : submitError;
  const editorial = appearance === "editorial";
  function editQuestion(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setQuestion(event.target.value);
    setEdited(true);
  }
  return <form className={editorial ? "editorial-prompt" : "home-experiment-prompt"} aria-busy={saving} action={submit} onSubmit={() => setEdited(false)}>
    <label className={editorial ? undefined : "sr-only"} htmlFor="home-question">你想研究什么？</label>
    {editorial
      ? <textarea id="home-question" name="question" required maxLength={maxQuestionLength} rows={4}
        placeholder="比如：比较冒泡排序和快速排序" aria-invalid={!!error} aria-describedby={error ? "home-question-error" : undefined}
        value={question} onChange={editQuestion} />
      : <input id="home-question" name="question" required maxLength={maxQuestionLength} placeholder="比如：比较冒泡与快排。"
        value={question} onChange={editQuestion} />}
    {error && <p id={editorial ? "home-question-error" : undefined} role="alert" className={editorial ? "editorial-prompt-error" : "sr-only"}>{error}</p>}
    <button type="submit" disabled={saving} aria-label={editorial ? undefined : "在工作台打开问题"}>
      {editorial && <span>{saving ? "正在创建…" : "进入创造台"}</span>}
      <Icon icon="lucide:arrow-up-right" width={20} aria-hidden="true" />
    </button>
  </form>;
}
