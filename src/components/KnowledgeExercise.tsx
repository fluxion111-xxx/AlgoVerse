"use client";

import { useActionState } from "react";
import type { PracticeResult } from "@/lib/knowledgePractice";

export function KnowledgeExercise({ id, prompt, options, submit }: {
  id: string;
  prompt: string;
  options: readonly string[];
  submit: (previous: PracticeResult | null, form: FormData) => Promise<PracticeResult | null>;
}) {
  const [result, action, pending] = useActionState(submit, null);
  return <form action={action} className="knowledge-exercise" aria-busy={pending}>
    <fieldset disabled={pending}>
      <legend>{prompt}</legend>
      {options.map((option, index) => <label key={option} htmlFor={`${id}-${index}`}>
        <input id={`${id}-${index}`} type="radio" name="choice" value={index} required /> <span>{option}</span>
      </label>)}
      <button className="catalog-jump" type="submit">{pending ? "正在判题…" : "提交答案"}</button>
    </fieldset>
    <p className="knowledge-exercise-result" role="status" data-answer={result ? result.correct ? "correct" : "incorrect" : undefined}>
      {result && <><strong>{result.correct ? "答对了。" : "再想想。"}</strong> <span>{result.explanation}</span></>}
    </p>
  </form>;
}
