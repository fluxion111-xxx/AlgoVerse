import Link from "next/link";
import { CatalogIcon } from "./experiments/CatalogEffects";

export type StudyRecommendationData = {
  angle: string;
  reason: string;
  practice: string;
  check: string;
  topic: { title: string; href: string };
  mistake?: { topic: string; prompt: string; selected: string[] };
};

export function StudyRecommendation({ advice }: { advice: StudyRecommendationData }) {
  return <div className="study-advice-result" aria-live="polite">
    <p className="study-advice-angle">{advice.angle}</p>
    {advice.mistake && <div className="study-mistake">
      <p>错题 · {advice.mistake.topic}</p>
      <blockquote>{advice.mistake.prompt}</blockquote>
      {advice.mistake.selected.length > 0 && <p>你选了 · {advice.mistake.selected.join("、")}</p>}
    </div>}
    <dl className="study-advice-steps">
      <div><dt>{advice.mistake ? "哪里卡住" : "为什么选这节"}</dt><dd>{advice.reason}</dd></div>
      <div><dt>怎么试</dt><dd>{advice.practice}</dd></div>
      <div><dt>怎么自查</dt><dd>{advice.check}</dd></div>
    </dl>
    <Link href={advice.topic.href}>{advice.topic.title}<CatalogIcon icon="lucide:arrow-up-right" width={16} /></Link>
  </div>;
}
