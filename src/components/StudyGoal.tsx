"use client";

import Form from "next/form";
import { useState } from "react";
import { useFormStatus } from "react-dom";

function UpdateSuggestion() {
  const { pending } = useFormStatus();
  return <button className="editorial-button editorial-button-primary" type="submit" disabled={pending}>
    {pending ? "正在更新…" : "更新建议"}
  </button>;
}

export function StudyGoal({ goal, step, options }: { goal?: string; step: number; options: { id: string; title: string }[] }) {
  const [selected, setSelected] = useState(goal ?? "");
  const nextStep = selected === (goal ?? "") ? (step + 1) % 1_000_000 : 0;
  return <Form className="study-goal" action="/learning-path#study-guide">
    <label htmlFor="learning-goal">学习目标</label>
    <select id="learning-goal" name="goal" value={selected} onChange={(event) => setSelected(event.target.value)}>
      <option value="">全部方向</option>
      {options.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
    </select>
    <input type="hidden" name="suggestion" value={nextStep} />
    <UpdateSuggestion />
  </Form>;
}
