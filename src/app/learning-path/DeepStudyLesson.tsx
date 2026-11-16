import Link from "next/link";
import { KnowledgeExercise } from "@/components/KnowledgeExercise";
import type { DeepLesson, LessonBlock } from "@/content/lessons/types";
import { getKnowledgeTopic, type KnowledgeEntry } from "@/lib/knowledge";
import { platformAIConfigured } from "@/lib/server/aiProvider";
import { isTeachingModel } from "@/lib/lessons/teachingModels";
import type { LearningProgress } from "@/lib/server/experimentRecords";
import { answerDeepExercise, answerKnowledgeExercise } from "./actions";
import { DeepExercise } from "./DeepExercise";
import { LessonDemo } from "./LessonDemo";
import { LessonTutor } from "./LessonTutor";
import "./deep-lesson.css";
import "../experiments/experiments.css";
import "../experiments/create/studio.css";

function Section({ block }: { block: LessonBlock }) {
  return <section className="lesson-section" id={`lesson-${block.id}`} aria-labelledby={`lesson-title-${block.id}`}>
    <h6 id={`lesson-title-${block.id}`}>{block.title}</h6>
    {block.kind === "explain" && <>
      {block.paragraphs.map((text) => <p key={text}>{text}</p>)}
      {block.formula && <pre className="knowledge-reference" tabIndex={0}>{block.formula}</pre>}
    </>}
    {block.kind === "steps" && <ol className="lesson-steps">{block.steps.map(({ label, text }) => <li key={label}>
      <strong>{label}</strong><p>{text}</p>
    </li>)}</ol>}
    {block.kind === "code" && <div className="lesson-code">
      <figure>
        <figcaption lang="en">{block.language}</figcaption>
        <pre tabIndex={0}><code>{block.source.split("\n").map((line, index) =>
          <span className="lesson-code-line" key={index}><i aria-hidden="true">{index + 1}</i>{line}{"\n"}</span>)}</code></pre>
      </figure>
      <dl>{block.notes.map(({ lines, text }) => <div key={lines}><dt>第 {lines} 行</dt><dd>{text}</dd></div>)}</dl>
      <a className="catalog-direct" href="#lesson-demo">到演示区试跑</a>
    </div>}
  </section>;
}

export function DeepStudyLesson({ entry, lesson, progress, toTopic }: {
  entry: KnowledgeEntry; lesson: DeepLesson; progress: LearningProgress; toTopic: (entry: KnowledgeEntry) => string;
}) {
  const { topic } = entry;
  const results = progress.practice[topic.id] ?? {};
  const answered = lesson.exercises.filter(({ id }) => Object.hasOwn(results, id)).length;
  const wrong = lesson.exercises.filter(({ id }) => results[id] === false);
  const legacy = topic.teaching?.exercises ?? [];
  const next = getKnowledgeTopic(lesson.next);
  const previousId = entry.chapter.topics[entry.chapter.topics.findIndex(({ id }) => id === topic.id) - 1]?.id;
  const previous = getKnowledgeTopic(previousId ?? topic.prerequisiteIds?.[0]);
  const sections = [...lesson.blocks.map(({ id, title }) => [`lesson-${id}`, title] as const),
    ["lesson-demo", "动手演示"], ["knowledge-practice", "练习与解析"], ["lesson-tutor", "AI 辅导"], ["lesson-recap", "本节小结"]] as const;

  return <div className="deep-lesson">
    <div className="lesson-lead">
      <div><p>{lesson.intro}</p><ul>{lesson.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul></div>
      <div className="lesson-progress"><label htmlFor="lesson-progress">本节练习 {answered} / {lesson.exercises.length}</label>
        <progress id="lesson-progress" value={answered} max={lesson.exercises.length} />
        {wrong.length > 0 && <nav aria-label="错题复习"><strong>错题复习</strong>{wrong.map(({ id, prompt }) =>
          <a className="catalog-direct" key={id} href={`#lesson-exercise-${id}`}>{prompt}</a>)}</nav>}
      </div>
    </div>
    <nav className="lesson-index" aria-label="本节目录">{sections.map(([id, title]) =>
      <a key={id} href={`#${id}`}>{title}</a>)}</nav>
    {lesson.blocks.map((block) => <Section key={block.id} block={block} />)}
    {isTeachingModel(lesson.demo) ? <LessonDemo model={lesson.demo} /> : <LessonDemo demo={lesson.demo} />}
    <section className="lesson-section knowledge-practice" id="knowledge-practice" tabIndex={-1} aria-labelledby="lesson-practice-title">
      <h6 id="lesson-practice-title">练习与解析</h6>
      {lesson.exercises.map(({ id, kind, level, prompt, ...item }) => <DeepExercise key={id} id={`lesson-exercise-${id}`}
        kind={kind} level={level} prompt={prompt} options={"options" in item ? item.options : undefined}
        saved={results[id]} submit={answerDeepExercise.bind(null, topic.id, id)} />)}
      {legacy.length > 0 && <details className="lesson-original-practice"><summary>原有练习</summary>
        {legacy.map(({ id, prompt, options }) => <KnowledgeExercise key={id} id={`${topic.id}-${id}`}
          prompt={prompt} options={options} submit={answerKnowledgeExercise.bind(null, topic.id, id)} />)}
      </details>}
    </section>
    <LessonTutor topicId={topic.id} returnTo={toTopic(entry).replace("#knowledge-topic", "#lesson-tutor")}
      hasCode={lesson.blocks.some(({ kind }) => kind === "code")}
      platformConfigured={platformAIConfigured()} attempts={Object.values(results)} />
    <section className="lesson-section" id="lesson-recap">
      <h6>本节小结</h6>
      <ul>{lesson.recap.map((point) => <li key={point}>{point}</li>)}</ul>
      <p>{lesson.extension}</p>
      <ul>{lesson.sources.map(({ title, href }) => <li key={href}><a className="catalog-direct" href={href}>{title}</a></li>)}</ul>
    </section>
    <nav className="study-chapter-turn lesson-turn" aria-label="相邻知识点">
      {previous && <Link href={toTopic(previous)} aria-label={`上一节 · ${previous.topic.title}`}><span><small>上一节</small>{previous.topic.title}</span></Link>}
      {next && <Link href={toTopic(next)} aria-label={`下一节 · ${next.topic.title}`}><span><small>下一节</small>{next.topic.title}</span></Link>}
    </nav>
  </div>;
}
