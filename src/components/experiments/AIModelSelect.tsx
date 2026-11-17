import type { useAIModelChoices } from "@/lib/temporaryAI";

export function AIModelSelect({ id, models, disabled }: { id: string; models: ReturnType<typeof useAIModelChoices>; disabled: boolean }) {
  const { current, options, select } = models;
  let hint = current.reason;
  if (!hint && "selection" in current.choice) {
    if (current.choice.selection.provider === "deepseek") {
      hint = current.verified ? "API Key 已连接。" : "API Key 已连接。当前模型未验证。";
    } else if (!current.verified) hint = "此模型未验证。";
  }
  return <>
    <label className="sr-only" htmlFor={id}>切换 AI 模型</label>
    <select id={id} value={current.id} onChange={(event) => select(event.target.value)} disabled={disabled}
      title={`${current.label} · ${current.model}${hint ? ` · ${hint}` : ""}`} aria-describedby={hint ? `${id}-hint` : undefined}>
      {options.map(({ id: value, label, reason }) => <option key={value} value={value} disabled={!!reason}>
        {label}{reason ? `（${reason.replace(/。$/u, "")}）` : ""}
      </option>)}
    </select>
    {hint && <span className="sr-only" id={`${id}-hint`}>{hint}</span>}
  </>;
}
