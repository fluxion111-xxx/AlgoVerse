import type { Metadata } from "next";
import { NavigationLink } from "@/components/NavigationLink";
import { notFound } from "next/navigation";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { LabWorkspace } from "@/components/experiments/LabWorkspace";
import { CoursePreview } from "@/components/experiments/CoursePreview";
import { ExperimentCreator } from "@/components/experiments/ExperimentCreator";
import { KnowledgeExplorer, KnowledgeOutline } from "@/components/experiments/KnowledgeExplorer";
import { courseRoute, courses, getCourse, primaryExperimentRoute } from "@/lib/courses";
import { registeredEngines } from "@/lib/experimentEngines";
import { getDefaultKnowledgeTopic, getExperimentTopic, getKnowledgeTopic, knowledgeTopicRoute } from "@/lib/knowledge";
import { getExperimentRun, hasReadTopic } from "@/lib/server/experimentRecords";
import { updateTopicReading } from "./knowledgeActions";

type CoursePageProps = {
  params: Promise<{ course: string }>;
  searchParams: Promise<{ view?: string | string[]; topic?: string | string[]; runId?: string | string[] }>;
};

export function generateStaticParams() {
  return courses.map(({ slug }) => ({ course: slug }));
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const course = getCourse((await params).course);
  return course ? { title: `${course.title}｜AlgoVerse`, description: course.introduction } : {};
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const course = getCourse((await params).course);
  if (!course) notFound();
  const order = String(courses.indexOf(course) + 1).padStart(2, "0");
  const primary = primaryExperimentRoute(course);
  const primaryEngine = registeredEngines.find((engine) => engine.route === primary);
  const { view, topic, runId } = await searchParams;
  if (view !== undefined && view !== "knowledge" && view !== "workshop" && view !== "research") notFound();
  const defaultTopic = getDefaultKnowledgeTopic(course.slug);
  const entry = topic === undefined ? defaultTopic : getKnowledgeTopic(topic);
  const knowledge = view === "knowledge" || (view === undefined && (topic !== undefined || course.slug === "algorithms"));
  if ((knowledge || topic !== undefined) && entry?.domain.id !== course.slug) notFound();
  const run = runId === undefined ? null : await getExperimentRun(runId);
  if (runId !== undefined && (!run || run.topicId !== entry?.topic.id
    || !getExperimentTopic(run.topicId, run.session.engineId))) notFound();
  const research = view === "research";
  const viewParams = new URLSearchParams();
  if (entry) viewParams.set("topic", entry.topic.id);
  if (run) viewParams.set("runId", run.id);
  const workshopRoute = `${courseRoute(course)}?view=workshop${viewParams.size ? `&${viewParams}` : ""}#course-experiments`;
  const researchRoute = `${courseRoute(course)}?view=research${viewParams.size ? `&${viewParams}` : ""}#course-research`;
  const read = knowledge && entry ? await hasReadTopic(entry.topic.id) : false;
  const preview = <div className="course-hero-paper"><CoursePreview course={course} interactive /></div>;

  return (
    <LabWorkspace className={`catalog-page course-page theme-${course.slug}`}>
      <div className="course-entry">
        <header className={`course-hero${knowledge ? " course-hero-reading" : ""}`}>
          <div>
            <div className="course-index"><CatalogIcon icon={course.icon} width={23} /><span>{order}</span></div>
            <h1>{course.title}</h1>
            <p>{course.introduction}</p>
            {defaultTopic ? <NavigationLink className="catalog-jump" href={workshopRoute}>查看实验 <CatalogIcon icon="lucide:arrow-down" width={17} /></NavigationLink>
              : <a className="catalog-jump" href="#course-experiments">查看实验 <CatalogIcon icon="lucide:arrow-down" width={17} /></a>}
          </div>
          {!knowledge && preview}
        </header>

        {defaultTopic && entry && <nav className="knowledge-views" aria-label="模块视图">
          <NavigationLink href={knowledgeTopicRoute(entry, run?.id)} aria-current={knowledge ? "page" : undefined}>知识探索</NavigationLink>
          <NavigationLink href={workshopRoute} aria-current={!knowledge && !research ? "page" : undefined}>实验工坊</NavigationLink>
          <NavigationLink href={researchRoute} aria-current={research ? "page" : undefined}>AI 研究</NavigationLink>
        </nav>}
        {knowledge && entry ? <KnowledgeExplorer key={entry.topic.id} entry={entry} run={run} read={read} preview={preview}
          updateReading={updateTopicReading.bind(null, entry.topic.id)} /> : research && entry ? <div className="course-body">
          <KnowledgeOutline entry={entry} runId={run?.id} />
          <section className="knowledge-sheet" id="course-research" aria-labelledby="course-research-title">
            <p className="knowledge-trail">{course.title} / {entry.topic.title}</p>
            <h2 id="course-research-title">AI 研究</h2>
            <p>写个问题，交给实验工作台。</p>
            <ExperimentCreator key={entry.topic.id} mode="question" savedQuestion={`我想研究「${entry.topic.title}」。`} />
          </section>
        </div> : <div className="course-body course-workshop">
          <section className="course-experiments" id="course-experiments" aria-labelledby="course-experiments-title">
            <div className="catalog-section-heading"><h2 id="course-experiments-title">实验列表</h2></div>
            <ul>
              <li>
                <div><h3>{course.primary.title}</h3><p>{course.primary.prompt}</p></div>
                <div className="course-lab-actions">
                  <span className={primaryEngine ? "course-lab-ready" : "course-lab-pending"}>{primaryEngine ? "可运行" : "开发中"}</span>
                  <NavigationLink href={primary}>{primaryEngine ? "打开实验" : "查看详情"} <CatalogIcon icon="lucide:arrow-up-right" width={16} /></NavigationLink>
                </div>
              </li>
              {course.experiments.map(({ title, prompt, href }) => {
                const engine = registeredEngines.find((option) => option.route === href);
                return (
                  <li key={title}>
                    <div><h3>{title}</h3><p>{prompt}</p></div>
                    {engine ? (
                      <div className="course-lab-actions">
                        <span className="course-lab-ready">可运行</span>
                        <NavigationLink href={engine.route}>打开实验 <CatalogIcon icon="lucide:arrow-up-right" width={16} /></NavigationLink>
                      </div>
                    ) : <span className="course-lab-pending">开发中</span>}
                  </li>
                );
              })}
            </ul>
          </section>
          {entry && <KnowledgeOutline entry={entry} runId={run?.id} />}
        </div>}
      </div>
    </LabWorkspace>
  );
}
