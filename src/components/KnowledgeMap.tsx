import Form from "next/form";
import Link from "next/link";
import { getDeepLesson } from "@/content/lessons/index";
import { CourseCover, StudyChapter } from "@/app/learning-path/StudyChapter";
import { StudyDirectory } from "@/app/learning-path/StudyDirectory";
import { StudyTopicReader } from "@/app/learning-path/StudyTopicReader";
import { CatalogIcon } from "./experiments/CatalogEffects";
import {
  chapterFilters, chapterPreparation, curriculumChapters, curriculumGroups, curriculumRoute, learningTopicRoute,
  matchesChapterFilter, matchesCurriculumScope, resolveCurriculumScope, searchCurriculum,
  type ChapterFilter, type CurriculumScope,
} from "@/lib/curriculum";
import { getKnowledgeTopic, hasCompleteTeaching, type KnowledgeEntry } from "@/lib/knowledge";
import { maxKnowledgeQueryLength, searchKnowledge } from "@/lib/knowledgeSearch";
import { practiceSummary } from "@/lib/knowledgePractice";
import { topicTouched } from "@/lib/learningPath";
import type { LearningProgress } from "@/lib/server/experimentRecords";

type MapParams = { [key in "module" | "course" | "chapter" | "q" | "status" | "page" | "topic"]?: string | string[] };
const resultsPerPage = 12;
function Lesson({ entry, progress, current, toTopic }: {
  entry: KnowledgeEntry; progress: LearningProgress; current: boolean; toTopic: (entry: KnowledgeEntry) => string;
}) {
  const { topic } = entry;
  const run = progress.byTopic[topic.id];
  const read = progress.readTopics.has(topic.id);
  const practice = practiceSummary(progress.practice[topic.id]);
  return <li className="study-topic" data-current={current}>
    <div>
      <Link href={toTopic(entry)} aria-current={current ? "location" : undefined}>{topic.title}</Link>
      {getDeepLesson(topic.id) && <span className="study-deep-label">互动课程</span>}
      <p className="study-topic-summary">{topic.summary}</p>
      {topic.prerequisiteIds?.map((id) => {
        const prerequisite = getKnowledgeTopic(id);
        return prerequisite && <small key={id}>先读 <Link href={toTopic(prerequisite)}>{prerequisite.topic.title}</Link></small>;
      })}
    </div>
    <span>{[read && "已读", run && `已跑 ${run.count} 轮`,
      practice.answered && `答对 ${practice.correct}/${practice.answered} 题`].filter(Boolean).join(" · ") || "待学习"}</span>
  </li>;
}

export function KnowledgeMap({ progress, goal, params }: { progress: LearningProgress; goal?: string; params: MapParams }) {
  function value(key: keyof MapParams) {
    const item = params[key];
    return typeof item === "string" ? item : undefined;
  }
  const scope = resolveCurriculumScope({ module: value("module"), course: value("course"), chapter: value("chapter") });
  const selected: CurriculumScope = { module: scope.group?.id, course: scope.course?.id, chapter: scope.chapter?.id };
  const query = value("q")?.trim().slice(0, maxKnowledgeQueryLength) ?? "";
  const status = value("status");
  const filter: ChapterFilter = status && Object.hasOwn(chapterFilters, status) ? status as ChapterFilter : "all";
  const group = scope.group ?? curriculumGroups.find(({ id }) => id === goal) ?? curriculumGroups[0];
  const availableChapters = curriculumChapters.filter((chapter) => chapter.group.id === group.id && matchesChapterFilter(chapter, filter));
  const groupCourses = group.courses.filter((course) => availableChapters.some((chapter) => chapter.course === course));
  const course = scope.course ?? groupCourses.find((course) =>
    availableChapters.some((chapter) => chapter.course === course && chapter.lessons.length)) ?? groupCourses[0];
  const chapters = availableChapters.filter((chapter) => chapter.course === course);
  const chapter = scope.chapter ? chapters.find((item) => item.id === scope.chapter?.id)
    : chapters.find((item) => item.lessons.length) ?? chapters[0];

  function route(next: CurriculumScope, options: { q?: string; page?: number } = {}) {
    return curriculumRoute(next, goal, { ...options, status: filter });
  }
  const toTopic = (entry: KnowledgeEntry) => learningTopicRoute(entry, goal);
  function chapterLink(item: (typeof chapters)[number]) {
    return { title: item.title, href: route({ module: group.id, course: item.course.id, chapter: item.id }).replace("#knowledge-map", "#study-chapter-title") };
  }

  const lessons = query && filter !== "outline" ? searchKnowledge(query).filter(({ domain, course, chapter, topic }) =>
    matchesCurriculumScope({ module: domain.id, course: course.id, chapter: chapter.id }, selected)
    && (filter !== "lab" || topic.experiments.length > 0)
    && (filter !== "complete" || hasCompleteTeaching(topic))) : [];
  const chapterMatches = query ? searchCurriculum(query, selected, filter) : [];
  const total = lessons.length + chapterMatches.length;
  const pageCount = Math.max(1, Math.ceil(total / resultsPerPage));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(value("page") ?? "", 10) || 1));
  const start = (page - 1) * resultsPerPage;
  const end = start + resultsPerPage;
  const visibleLessons = lessons.slice(start, end);
  const visibleChapters = chapterMatches.slice(Math.max(0, start - lessons.length), Math.max(0, end - lessons.length));
  const linkedChapters = chapter ? chapterPreparation(chapter.key) : [];
  const chapterIndex = chapter ? chapters.indexOf(chapter) : -1;
  const previous = chapters[chapterIndex - 1];
  const next = chapterIndex >= 0 ? chapters[chapterIndex + 1] : undefined;
  const activeTopic = chapter?.lessons.find(({ topic }) => topic.id === value("topic"));

  return <section className="study-map editorial-frame" id="knowledge-map" aria-labelledby="knowledge-map-title">
    <header className="study-index-head">
      <div><p className="editorial-kicker" lang="en">KNOWLEDGE INDEX</p><h2 id="knowledge-map-title"><span>知识地图</span></h2></div>
      <div className="study-search" id="knowledge-search">
      <Form key={`${query}:${filter}`} action="/learning-path#knowledge-map" role="search" aria-label="知识搜索">
        {goal && <input type="hidden" name="goal" value={goal} />}
        {Object.entries(selected).map(([name, item]) => item && <input key={name} type="hidden" name={name} value={item} />)}
        <label htmlFor="knowledge-query" className="sr-only">搜索课程、章节和知识点</label>
        <div className="study-query">
          <CatalogIcon icon="lucide:search" width={19} />
          <input type="search" id="knowledge-query" name="q" placeholder="试试 B+ 树或 Transformer" defaultValue={query} maxLength={maxKnowledgeQueryLength} />
        </div>
        <label htmlFor="chapter-filter" className="sr-only">筛选章节</label>
        <select id="chapter-filter" name="status" defaultValue={filter}>
          {Object.entries(chapterFilters).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <button className="editorial-button" type="submit">搜索</button>
      </Form>
      {(scope.group || filter !== "all" || query) && <p className="study-scope">
        {scope.chapter?.title ?? scope.course?.title ?? scope.group?.title ?? "全部课程"}
        {" · "}{chapterFilters[filter]}
        <Link className="catalog-direct" href={curriculumRoute({}, goal)}>清除筛选</Link>
      </p>}
      </div>
    </header>
    {query ? <div className="study-results">
      <p className="study-results-count">找到 {lessons.length} 个知识点、{chapterMatches.length} 章。</p>
      {!total && <p className="study-empty">没找到。换个词试试。</p>}
      {visibleLessons.length > 0 && <ul className="study-matches">{visibleLessons.map((entry) => <li key={entry.topic.id}>
        <Link className="catalog-direct" href={toTopic(entry)}>{entry.topic.title}</Link>
        <small>{entry.domain.title} / {entry.course.title} / {entry.chapter.title}</small>
        <p>{entry.topic.summary}</p>
      </li>)}</ul>}
      {visibleChapters.length > 0 && <ul className="study-matches study-chapter-matches">{visibleChapters.map((match) => <li key={match.key}>
        <Link className="catalog-direct" href={curriculumRoute({ module: match.group.id, course: match.course.id, chapter: match.id }, goal).replace("#knowledge-map", "#study-chapter-title")}>{match.title}</Link>
        <small>{match.group.title} / {match.course.title} · {chapterFilters[match.status]}{match.hasLab && " · 可运行实验"}</small>
        <p>{match.coverage}</p>
      </li>)}</ul>}
      {pageCount > 1 && <nav className="study-pagination" aria-label="搜索结果分页">
        {page > 1 && <Link href={route(selected, { q: query, page: page - 1 })}>上一页</Link>}
        <span>{page} / {pageCount}</span>
        {page < pageCount && <Link href={route(selected, { q: query, page: page + 1 })}>下一页</Link>}
      </nav>}
    </div> : <div className="study-contents">
      <StudyDirectory chapter={chapter?.title}>
      <nav className="study-domains" aria-label="专业模块">
        <h3>专业领域</h3>
        {curriculumGroups.map((item, index) => <Link key={item.id} href={route({ module: item.id })}
          aria-current={item.id === group.id ? "location" : undefined}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          {item.title}<CatalogIcon icon="lucide:arrow-up-right" width={15} />
        </Link>)}
      </nav>
        <nav className="study-course-list" aria-label="课程">
          <h4>课程目录</h4>
          {groupCourses.map((item) => <Link key={item.id} href={route({ module: group.id, course: item.id })}
            aria-current={item === course ? "location" : undefined}>{item.title} <small>{item.chapters.length} 章</small></Link>)}
        </nav>
        {!groupCourses.length && <p className="study-empty">这个模块没有符合条件的章节。</p>}
      {course && chapters.length > 0 && <nav className="study-chapter-list" aria-label="章节">
          <h4>{course.title} · 章节</h4>
          <ol>{chapters.map((item) => <li key={item.key}>
            <Link href={chapterLink(item).href} data-study-chapter
              aria-current={item === chapter ? "location" : undefined}>{item.title}</Link>
          </li>)}</ol>
        </nav>}
      </StudyDirectory>
      <div className="study-edition">
        {course && <CourseCover key={`${group.id}:${course.id}`} group={group} course={course} />}
        {chapter && <StudyChapter chapter={chapter} previous={previous && chapterLink(previous)} next={next && chapterLink(next)}
          studied={chapter.lessons.filter(({ topic }) => topicTouched(topic.id, progress)).length} />}
        {course && <div className="study-course">
          {activeTopic && <StudyTopicReader key={activeTopic.topic.id} entry={activeTopic} progress={progress} toTopic={toTopic} />}
          {chapter ? <section className="study-chapter" aria-labelledby="study-topic-list-title">
            <h5 id="study-topic-list-title">本章知识点</h5>
            {linkedChapters.length > 0 && <p className="study-prerequisites">相关基础{linkedChapters.map((item) =>
              <Link className="catalog-direct" key={item.key} href={curriculumRoute({ module: item.group.id, course: item.course.id, chapter: item.id }, goal)}>{item.title}</Link>)}</p>}
            {chapter.lessons.length ? <ul className="study-topic-list">{chapter.lessons.map((entry) =>
              <Lesson key={entry.topic.id} entry={entry} progress={progress} current={activeTopic === entry} toTopic={toTopic} />)}</ul>
              : <p className="study-empty">本章正文待编写。</p>}
          </section> : <p className="study-empty">这门课没有符合条件的章节。</p>}
          <details className="study-references">
            <summary>课程参考资料</summary>
            <ul>{course.sources.map(({ title, href }) => <li key={href}><a className="catalog-direct" href={href}>{title}</a></li>)}</ul>
          </details>
        </div>}
      </div>
    </div>}
  </section>;
}
