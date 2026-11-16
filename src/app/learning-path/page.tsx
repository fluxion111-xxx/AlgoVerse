import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { StudyAdvice } from "@/components/StudyAdvice";
import { StudyGoal } from "@/components/StudyGoal";
import { StudyRecommendation } from "@/components/StudyRecommendation";
import { StudySectionNav } from "@/components/StudySectionNav";
import { curriculumGroups } from "@/lib/curriculum";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { knowledgeEntries } from "@/lib/knowledge";
import { learningSuggestion, suggestionStep, topicTouched } from "@/lib/learningPath";
import { practiceSummary } from "@/lib/knowledgePractice";
import { getLearningProgress } from "@/lib/server/experimentRecords";
import "../home-editorial.css";
import "../story-editorial.css";
import "./study-editorial.css";

export const metadata: Metadata = { title: "学习路径｜AlgoVerse" };

type StudyParams = { [key in "goal" | "module" | "course" | "chapter" | "q" | "status" | "page" | "topic" | "suggestion"]?: string | string[] };

export default async function LearningPathPage({ searchParams }: { searchParams: Promise<StudyParams> }) {
  const params = await searchParams;
  const { goal } = params;
  const target = curriculumGroups.find(({ id }) => id === goal);
  const progress = await getLearningProgress();
  const count = Object.values(progress.byEngine).reduce((total, entry) => total + entry.count, 0);
  const touched = knowledgeEntries.filter(({ topic }) => topicTouched(topic.id, progress)).length;
  const step = suggestionStep(params.suggestion);
  const suggestion = learningSuggestion(progress, target?.id, step);
  const practice = Object.values(progress.practice).reduce((total, attempts) => total + practiceSummary(attempts).answered, 0);

  return <div className="editorial-home editorial-study">
    <a className="editorial-skip" href="#main-content">跳到正文</a>
    <Header action={{ href: "#knowledge-map", label: "打开知识地图" }} />
    <main id="main-content">
      <section className="study-cover" aria-labelledby="study-title">
        <div className="study-cover-image" aria-hidden="true">
          <Image src="/lab/laptop.jpg" alt="" fill preload sizes="(max-width: 700px) 48vw, 51vw" />
        </div>
        <div className="study-cover-copy editorial-frame">
          <p className="editorial-kicker" lang="en">LEARNING PATH</p>
          <h1 id="study-title"><span>学习路径</span></h1>
          <p>按章节学，做实验验证。</p>
        </div>
      </section>
      <StudySectionNav />
      <KnowledgeMap progress={progress} goal={target?.id} params={params} />
      <section className="study-progress editorial-frame" id="study-progress" aria-labelledby="study-progress-title">
        <h2 id="study-progress-title">学习进度</h2>
        <dl>
          <div><dt>已读知识点</dt><dd>{progress.readTopics.size}</dd></div>
          <div><dt>待学习</dt><dd>{knowledgeEntries.length - touched}</dd></div>
          <div><dt>已答练习</dt><dd>{practice} <small>题</small></dd></div>
          <div><dt>已保存实验</dt><dd>{count} <small>轮</small></dd></div>
        </dl>
        <a className="study-progress-link" href="#study-records">回看实验 <CatalogIcon icon="lucide:arrow-down" width={15} /></a>
      </section>
      <section className="study-guide editorial-frame" id="study-guide" aria-labelledby="study-guide-title">
        <div className="study-next">
          <p className="editorial-kicker" lang="en">NEXT LESSON</p>
          <h2 id="study-guide-title">下一步</h2>
          <StudyGoal key={target?.id ?? "all"} goal={target?.id} step={step}
            options={curriculumGroups.map(({ id, title }) => ({ id, title }))} />
          {suggestion ? <StudyRecommendation advice={{ ...suggestion,
            topic: { title: suggestion.entry.topic.title, href: suggestion.href } }} />
            : <p>这个方向可以回顾了。</p>}
        </div>
        <StudyAdvice key={target?.id ?? "all"} goal={target?.id} />
      </section>
      <section id="study-records" className="study-records editorial-frame" aria-labelledby="study-record-title">
        <header className="study-section-head">
          <div><p className="editorial-kicker" lang="en">LAB NOTES</p><h2 id="study-record-title">我的实验记录</h2></div>
          <p>已运行 {count} 轮</p>
        </header>
        {count === 0 ? <div className="study-record-empty">
          <p>保存一轮实验，就能在这里回看。</p>
          <Link href="/experiments">去实验中心 <CatalogIcon icon="lucide:arrow-up-right" width={16} /></Link>
        </div> : <>
          {count > progress.recent.length && <p className="study-empty">展示最近 {progress.recent.length} 轮。</p>}
          <ul className="study-runs">{progress.recent.map(({ id, engineId, completedAt }) => {
            const engine = getExperimentEngine(engineId);
            return <li key={id}>
              <Link className="study-run-title" href={`/experiments/runs/${id}`} aria-describedby={`study-run-time-${id}`}>
                {engine?.creator.title ?? "查看实验"}
                <span className="study-run-replay">回放 <CatalogIcon icon="lucide:arrow-up-right" width={14} /></span>
              </Link>
              <time id={`study-run-time-${id}`} dateTime={completedAt}>{completedAt.slice(0, 16).replace("T", " ")} UTC</time>
              <Link className="study-run-tutor" href={`/ai-tutor?runId=${id}`}>问助教 <CatalogIcon icon="lucide:arrow-up-right" width={14} /></Link>
            </li>;
          })}</ul>
        </>}
      </section>
    </main>
  </div>;
}
