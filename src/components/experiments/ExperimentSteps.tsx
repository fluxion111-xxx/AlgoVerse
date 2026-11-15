import Link from "next/link";
import { experimentTaskLinks, type ExperimentTask, type WorkflowStep } from "@/lib/navigation";

const stages = [
  { step: "question", label: "提问" },
  { step: "config", label: "设计方案" },
  { step: "run", label: "运行与分析" },
] as const;

export function ExperimentSteps({ current, task, hasPlan }: {
  current: WorkflowStep; task?: ExperimentTask | null; hasPlan?: boolean;
}) {
  const links = experimentTaskLinks(task);
  const active = current === "diagnosis" ? "run" : current;
  const complete = { question: !!task, config: !!hasPlan, run: !!task?.runId };
  return <nav aria-label="实验流程">
    <ol className="creator-stage-nav">
      {stages.map(({ step, label }, index) => <li key={step} aria-current={step === active ? "step" : undefined}>
        <span className="creator-stage-number" aria-hidden="true">0{index + 1}</span>
        {step === active ? <strong>{label}</strong> : step === "question" || complete[step]
          ? <Link prefetch={false} href={links[step]}>{label}</Link>
          : <span aria-disabled="true">{label}</span>}
        {complete[step] && <span className="creator-stage-done"><span aria-hidden="true">✓</span><span className="sr-only">已完成</span></span>}
      </li>)}
    </ol>
  </nav>;
}
