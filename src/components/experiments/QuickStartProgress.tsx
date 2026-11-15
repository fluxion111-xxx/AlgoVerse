import { quickStartSteps } from "@/lib/quickStart";

export function QuickStartProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="quick-start-progress" aria-label="新手体验进度">
      <p aria-live="polite"><strong>0{step}/04</strong> {quickStartSteps[step - 1]}</p>
      <ol>
        {quickStartSteps.map((label, index) => (
          <li key={label} aria-current={index + 1 === step ? "step" : undefined}>
            <span>0{index + 1}</span> {label}
            <span className="sr-only">{index + 1 < step ? "，已完成" : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
