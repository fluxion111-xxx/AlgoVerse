import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LabWorkspace } from "@/components/experiments/LabWorkspace";
import { ExperimentBench } from "@/components/experiments/ExperimentBench";
import { courseRoute, getCourse } from "@/lib/courses";
import { registeredEngines } from "@/lib/experimentEngines";
import { getExperimentTopic, knowledgeTopicRoute } from "@/lib/knowledge";
import { getExperimentContext, type ExperimentSearch } from "@/lib/server/experimentContext";
import { workflowRoute } from "@/lib/navigation";
import { runKnowledgeExperiment, runLabExperiment } from "../../actions";

type ExperimentPageProps = { params: Promise<{ course: string; experiment: string }>; searchParams: Promise<ExperimentSearch & { topic?: string | string[] }> };

export function generateStaticParams() {
  return registeredEngines.map(({ domain, route }) => ({ course: domain, experiment: route.split("/").at(-1)! }));
}

export async function generateMetadata({ params }: ExperimentPageProps): Promise<Metadata> {
  const { course: slug, experiment } = await params;
  const course = getCourse(slug);
  if (!course) return {};
  const lab = experimentDetails(course, experiment);
  return lab ? { title: `${lab.pageTitle}｜AlgoVerse`, description: lab.prompt } : {};
}

function experimentDetails(course: NonNullable<ReturnType<typeof getCourse>>, slug: string) {
  if (course.primary.slug === slug) return course.primary;
  const lab = course.experiments.find(({ href }) => href === `${courseRoute(course)}/${slug}`);
  return lab && { pageTitle: `${lab.title}实验`, prompt: lab.prompt };
}

export default async function ExperimentPage({ params, searchParams }: ExperimentPageProps) {
  const { course: slug, experiment } = await params;
  const course = getCourse(slug);
  if (!course) notFound();
  const lab = experimentDetails(course, experiment);
  if (!lab) notFound();
  const engine = registeredEngines.find((option) => option.route === `/experiments/${slug}/${experiment}`);
  if (engine) {
    const { topic, ...params } = await searchParams;
    const context = await getExperimentContext(params);
    if (context.session && context.engine?.id !== engine.id) notFound();
    const entry = getExperimentTopic(context.run?.topicId ?? topic, engine.id);
    if (topic !== undefined && (!entry || (context.run && context.run.topicId !== topic))) notFound();
    const action = entry ? runKnowledgeExperiment.bind(null, entry.topic.id) : runLabExperiment;
    const back = entry ? { href: knowledgeTopicRoute(entry, context.run?.id), label: "返回知识点" }
      : { href: courseRoute(course), label: course.title };
    return <LabWorkspace className={`catalog-page creator-studio theme-${course.slug}`} back={back}>
      <div className="creator-spread">
        <header className="workflow-title" id={entry ? "knowledge-lab" : undefined}>
          <h1>{lab.pageTitle}</h1><p>{lab.prompt}</p>
          {entry && <p>{entry.topic.title} · {context.run ? "本轮结果已保存" : "来自知识探索"}</p>}
          {context.run && context.workflow?.isAI && <Link className="catalog-direct" href={workflowRoute("run", context.task)}>返回本轮对比</Link>}
        </header>
        <ExperimentBench engine={context.engine ?? engine} context={context} action={action} />
      </div>
    </LabWorkspace>;
  }

  return (
    <LabWorkspace className={`catalog-page theme-${course.slug}`} back={{ href: courseRoute(course), label: "返回课程目录" }}>
      <div className="course-entry">
        <div className="course-hero">
          <header>
            <h1>{lab.pageTitle}</h1>
            <p>{lab.prompt}</p>
            <Link className="catalog-jump" href={courseRoute(course)}>返回课程目录</Link>
          </header>
          <section className="course-topics" aria-label="实验状态">
            <span className="course-lab-pending">开发中</span>
            <h2>实验尚未开放</h2>
            <p>可以先浏览课程知识点。</p>
          </section>
        </div>
      </div>
    </LabWorkspace>
  );
}
