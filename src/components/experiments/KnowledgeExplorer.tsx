import Link from "next/link";
import type { ReactNode } from "react";
import { KnowledgeReadingActions, KnowledgeTeaching } from "@/components/KnowledgeTeaching";
import { getDeepLesson } from "@/content/lessons/index";
import { curriculumRoute, learningTopicRoute } from "@/lib/curriculum";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { getKnowledgeTopic, knowledgeTopicRoute, type KnowledgeEntry } from "@/lib/knowledge";
import { withExperimentTask } from "@/lib/navigation";
import type { ExperimentRun } from "@/lib/server/experimentRecords";
import { CatalogIcon } from "./CatalogEffects";

export function KnowledgeOutline({ entry, runId }: { entry: KnowledgeEntry; runId?: string }) {
  const { domain, course, chapter, topic } = entry;
  return <nav className="course-topics knowledge-outline" id="knowledge-outline" tabIndex={-1} aria-label="知识目录">
    <h2>知识目录</h2>
    <Link className="catalog-direct" href={curriculumRoute({ module: domain.id })}>浏览全部课程</Link>
    <details open>
      <summary>{course.title}</summary>
      {course.chapters.map((unit) => <details key={unit.id} open={unit.id === chapter.id}>
        <summary>{unit.title}</summary>
        <ul>{unit.topics.map((node) => <li key={node.id}>
          <Link href={knowledgeTopicRoute({ domain, course, chapter: unit, topic: node }, node.id === topic.id ? runId : undefined)}
            aria-current={node.id === topic.id ? "location" : undefined}>{node.title}</Link>
        </li>)}</ul>
      </details>)}
    </details>
  </nav>;
}

function TopicLinks({ title, ids, domainId }: {
  title: string;
  ids?: readonly string[];
  domainId: KnowledgeEntry["domain"]["id"];
}) {
  if (!ids?.length) return null;
  return <section className="knowledge-links">
    <h3>{title}</h3>
    <ul>{ids.map((id) => {
      const target = getKnowledgeTopic(id);
      if (!target) return null;
      return <li key={id}>
        <Link className="catalog-direct" href={knowledgeTopicRoute(target)}>{target.topic.title}</Link>
        {target.domain.id !== domainId && <small>{target.domain.title}</small>}
      </li>;
    })}</ul>
  </section>;
}

export function KnowledgeExplorer({ entry, run, read, updateReading, preview }: {
  entry: KnowledgeEntry;
  run: ExperimentRun | null;
  read: boolean;
  updateReading: (form: FormData) => Promise<void>;
  preview?: ReactNode;
}) {
  const { domain, course, chapter, topic } = entry;
  const studyRoute = getDeepLesson(topic.id) ? learningTopicRoute(entry)
    : curriculumRoute({ module: domain.id, course: course.id, chapter: chapter.id });
  const sorting = run?.results && "kind" in run.results && run.results.kind === "sorting" ? run.results : null;
  const runEngine = run && getExperimentEngine(run.session.engineId, run.session.engineVersion);
  const evidence = run && !sorting ? Object.entries(experimentEvidence(run.results)) : [];
  return <div className="course-body knowledge-layout">
    <article id="knowledge-topic" className="knowledge-sheet knowledge-reading" aria-labelledby="knowledge-title">
      <header className="knowledge-reading-head">
        <p className="knowledge-trail">{course.title} / {chapter.title}</p>
        <h2 id="knowledge-title">{topic.title}</h2>
        {topic.difficulty && <p className="knowledge-trail">{topic.difficulty}</p>}
        <p>{topic.summary}</p>
        <KnowledgeReadingActions topic={topic} read={read} updateReading={updateReading} outline />
      </header>
      <TopicLinks title="先读这些" ids={topic.prerequisiteIds} domainId={domain.id} />
      {topic.sections.map((section) => <section key={section.title} className="knowledge-copy">
        <h3>{section.title}</h3>
        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>)}
      <KnowledgeTeaching topic={topic} />
      {runEngine && run && <section className="knowledge-result" aria-labelledby="knowledge-result-title">
        <h3 id="knowledge-result-title">本轮实验结果</h3>
        {sorting ? <>
          {"values" in run.session.config && <p>输入序列 · {run.session.config.values.join("、")}</p>}
          <p>排序结果 · {sorting.bubble.sorted.join("、")}</p>
          <table>
            <thead><tr><th scope="col">指标</th><th scope="col">冒泡排序</th><th scope="col">快速排序</th></tr></thead>
            <tbody>
              <tr><th scope="row">比较</th><td>{sorting.bubble.comparisons}</td><td>{sorting.quick.comparisons}</td></tr>
              <tr><th scope="row">交换</th><td>{sorting.bubble.swaps}</td><td>{sorting.quick.swaps}</td></tr>
            </tbody>
          </table>
        </> : <>
          {"dijkstra" in run.results && <p>指标顺序 · Dijkstra / A*</p>}
          <dl>{evidence.map(([key, value]) => <div key={key}><dt>{evidenceLabels[key]}</dt><dd>{value}</dd></div>)}</dl>
        </>}
        <Link className="catalog-direct" href={`${withExperimentTask(runEngine.route, { sessionId: run.session.id, runId: run.id })}#knowledge-lab`}>回放本轮实验</Link>
      </section>}
      {topic.experiments.map(({ engineId, label, prompt }) => {
        const engine = getExperimentEngine(engineId);
        return engine && <div key={engine.id} className="knowledge-action">
          <p>{prompt}</p>
          <Link className="catalog-jump" href={`${engine.route}?${new URLSearchParams({ topic: topic.id })}#knowledge-lab`}>
            {run?.session.engineId === engineId ? "开启新一轮" : label}<CatalogIcon icon="lucide:arrow-up-right" width={16} />
          </Link>
        </div>;
      })}
      <TopicLinks title="接着读" ids={topic.relatedTopicIds} domainId={domain.id} />
      <footer className="knowledge-sources">
        <h3>参考资料</h3>
        <ul>{topic.sources.map(({ title, href }) => <li key={href}><a className="catalog-direct" href={href}>{title}</a></li>)}</ul>
      </footer>
      <div className="knowledge-study-actions">
        <Link className="catalog-direct" href={`/ai-tutor?${new URLSearchParams({ topic: topic.id, ...(run && { runId: run.id }) })}`}>问 AI 助教</Link>
        <Link className="catalog-direct" href={studyRoute}>查看学习地图</Link>
      </div>
    </article>
    <aside className="knowledge-sidebar">
      <KnowledgeOutline entry={entry} runId={run?.id} />
      {preview}
    </aside>
  </div>;
}
