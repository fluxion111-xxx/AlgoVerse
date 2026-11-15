import Link from "next/link";
import { getDeepLesson } from "@/content/lessons/index";
import { DeepStudyLesson } from "./DeepStudyLesson";
import { LessonTutor } from "./LessonTutor";
import { updateStudyReading } from "./actions";
import { KnowledgeReadingActions, KnowledgeTeaching } from "@/components/KnowledgeTeaching";
import { getKnowledgeTopic, knowledgeTopicRoute, type KnowledgeEntry } from "@/lib/knowledge";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { platformAIConfigured } from "@/lib/server/aiProvider";
import { getExperimentRun, type ExperimentRun, type LearningProgress } from "@/lib/server/experimentRecords";

function SortBars({ label, values }: { label: string; values: readonly number[] }) {
  const max = Math.max(1, ...values.map(Math.abs));
  return <div className="study-bars-row">
    <strong>{label}</strong>
    <ol aria-label={`${label} · ${values.join("、")}`}>
      {values.map((value, index) => <li key={index} data-negative={value < 0}>
        <span><i style={{ height: `${Math.abs(value) / max * 49}%` }} /></span>
        <small>{value}</small>
      </li>)}
    </ol>
  </div>;
}

function RunFigure({ run }: { run: ExperimentRun }) {
  const { results } = run;
  const evidence = Object.entries(experimentEvidence(results));
  const sorting = "kind" in results && results.kind === "sorting" ? results : null;
  return <figure className="study-result-figure">
    <figcaption>本轮实验结果</figcaption>
    {sorting && "values" in run.session.config && <div className="study-bars">
      <SortBars label="输入" values={run.session.config.values} />
      <SortBars label="排序后" values={sorting.bubble.sorted} />
    </div>}
    <dl>{evidence.map(([id, value]) => <div key={id}><dt>{evidenceLabels[id] ?? id}</dt><dd>{value}</dd></div>)}</dl>
    <Link className="catalog-direct" href={`/experiments/runs/${run.id}`}>回放本轮实验</Link>
  </figure>;
}

export async function StudyTopicReader({ entry, progress, toTopic }: {
  entry: KnowledgeEntry; progress: LearningProgress; toTopic: (entry: KnowledgeEntry) => string;
}) {
  const { domain, course, chapter, topic } = entry;
  const latest = progress.byTopic[topic.id]?.latest;
  const saved = latest ? await getExperimentRun(latest.id) : null;
  const run = saved?.topicId === topic.id ? saved : null;
  const lesson = getDeepLesson(topic.id);
  const reference = topic.teaching?.reference;
  const teaching = topic.teaching && { ...topic.teaching, reference: undefined };
  return <article className="study-chapter knowledge-reading study-topic-reader" id="knowledge-topic" aria-labelledby="study-topic-title">
    <header className="knowledge-reading-head">
      <p className="knowledge-trail">{course.title} / {chapter.title}{topic.difficulty && ` · ${topic.difficulty}`}</p>
      <h5 id="study-topic-title" tabIndex={-1}>{topic.title}</h5>
      <p>{topic.summary}</p>
      <KnowledgeReadingActions topic={topic} read={progress.readTopics.has(topic.id)}
        updateReading={updateStudyReading.bind(null, topic.id)} />
    </header>
    {reference && !lesson && <section className="study-notation" aria-label={reference.kind === "code" ? "代码片段" : "关键公式"}>
      <h6>{reference.kind === "code" ? "代码片段" : "关键公式"}</h6>
      <pre className="knowledge-reference" tabIndex={0}><code>{reference.text}</code></pre>
    </section>}
    {run && <RunFigure run={run} />}
    {lesson ? <DeepStudyLesson entry={entry} lesson={lesson} progress={progress} toTopic={toTopic} /> : <>
    {topic.sections.map(({ title, paragraphs }) => <section className="knowledge-copy" key={title}>
      <h6>{title}</h6>
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </section>)}
    <KnowledgeTeaching topic={{ ...topic, teaching }} />
    <div className="deep-lesson"><LessonTutor topicId={topic.id}
      returnTo={toTopic(entry).replace("#knowledge-topic", "#lesson-tutor")}
      hasCode={reference?.kind === "code"} platformConfigured={platformAIConfigured()}
      attempts={Object.values(progress.practice[topic.id] ?? {})} /></div>
    </>}
    {topic.experiments.map(({ engineId, label, prompt }) => {
      const engine = getExperimentEngine(engineId);
      return engine?.domain === domain.id && <section className="study-topic-lab" key={engineId}>
        <p>{prompt}</p>
        <Link className="catalog-jump" href={`${engine.route}?${new URLSearchParams({ topic: topic.id })}#knowledge-lab`}>{label}</Link>
      </section>;
    })}
    {!!topic.relatedTopicIds?.length && <section className="study-topic-related">
      <h6>接着读</h6>
      {topic.relatedTopicIds.map((id) => {
        const related = getKnowledgeTopic(id);
        return related && <Link className="catalog-direct" key={id} href={toTopic(related)}>{related.topic.title}</Link>;
      })}
    </section>}
    <footer className="knowledge-sources">
      <h6>参考资料</h6>
      <ul>{topic.sources.map(({ title, href }) => <li key={href}><a className="catalog-direct" href={href}>{title}</a></li>)}</ul>
      <div className="study-topic-links">
        <Link className="catalog-direct" href={`/ai-tutor?${new URLSearchParams({ topic: topic.id, ...(run && { runId: run.id }) })}`}>问 AI 助教</Link>
        {domain.id !== "foundations" && <Link className="catalog-direct" href={knowledgeTopicRoute(entry, run?.id)}>打开专业知识页</Link>}
      </div>
    </footer>
  </article>;
}
