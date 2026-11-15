"use client";

import { useActionState, useState } from "react";
import type { LessonExercise } from "@/content/lessons/types";
import type { PracticeResult } from "@/lib/knowledgePractice";

type Props = {
  id: string;
  prompt: string;
  kind: LessonExercise["kind"];
  level: LessonExercise["level"];
  options?: readonly string[];
  saved?: boolean;
  submit: (previous: PracticeResult | null, form: FormData) => Promise<PracticeResult | null>;
};

function AnswerForm({ id, prompt, kind, level, options, saved, submit }: Props) {
  const [result, action, pending] = useActionState(submit, null);
  const [sent, setSent] = useState(false);
  const multi = kind === "multiple";
  const formats = { single: "单选", boolean: "判断", code: "代码阅读", multiple: "多选", integer: "计算", text: "填空" };
  return <form action={action} onSubmit={() => setSent(true)} className="lesson-exercise knowledge-exercise" id={id} aria-busy={pending}>
    <fieldset disabled={pending}>
      <legend><small>{level} · {formats[kind]}</small><span>{prompt}</span></legend>
      {options ? options.map((option, index) => <label key={option}>
        <input type={multi ? "checkbox" : "radio"} name={multi ? "choices" : "choice"} value={index} required={!multi} />
        <span>{option}</span>
      </label>) : <label className="lesson-answer-input">
        <span>你的答案</span><input type="text" name="choice" inputMode={kind === "integer" ? "numeric" : "text"}
          maxLength={80} required autoComplete="off" />
      </label>}
      <button className="catalog-jump" type="submit">{pending ? "正在判题…" : "提交答案"}</button>
      {saved !== undefined && <small className="lesson-attempt-note">{saved ? "最近一次答对" : "最近一次答错"}</small>}
    </fieldset>
    {result ? <div className="knowledge-exercise-result" role="status" data-answer={result.correct ? "correct" : "incorrect"}>
      <strong>{result.correct ? "答对了。" : "再想想。"}</strong>
      {result.wrong && <p>{result.wrong}</p>}
      <p>{result.explanation}</p>
      {result.review && <a className="catalog-direct" href={`#lesson-${result.review}`}>复习相关讲解</a>}
    </div> : sent && !pending && <p role="status">{multi ? "至少选一项，再提交。" : "请填写有效答案。"}</p>}
  </form>;
}

export function DeepExercise(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <div className="lesson-exercise-sheet">
    <AnswerForm key={attempt} {...props} />
    <button className="lesson-retry" type="button" onClick={() => setAttempt((value) => value + 1)}>重新练习</button>
  </div>;
}
