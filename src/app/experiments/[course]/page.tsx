import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { CatalogMasthead } from "@/components/experiments/CatalogMasthead";
import { CoursePreview } from "@/components/experiments/CoursePreview";
import { courses, getCourse } from "@/lib/courses";
import "../catalog.css";

type CoursePageProps = { params: Promise<{ course: string }> };

export function generateStaticParams() {
  return courses.map(({ slug }) => ({ course: slug }));
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const course = getCourse((await params).course);
  return course ? { title: `${course.title}｜AlgoVerse`, description: course.introduction } : {};
}

export default async function CoursePage({ params }: CoursePageProps) {
  const course = getCourse((await params).course);
  if (!course) notFound();
  const order = String(courses.indexOf(course) + 1).padStart(2, "0");

  return (
    <main className={`catalog-page course-page theme-${course.slug}`}>
      <CatalogMasthead />
      <div className="catalog-width course-entry">
        <header className="course-hero">
          <div>
            <div className="course-index"><CatalogIcon icon={course.icon} width={23} /><span>{order}</span></div>
            <h1>{course.title}</h1>
            <p>{course.introduction}</p>
            <a className="catalog-jump" href="#course-experiments">查看实验 <CatalogIcon icon="lucide:arrow-down" width={17} /></a>
          </div>
          <div className="course-hero-paper"><CoursePreview course={course} interactive /></div>
        </header>

        <div className="course-body">
          <section className="course-topics" aria-labelledby="course-topics-title">
            <h2 id="course-topics-title">知识点</h2>
            <ul>{course.experiments.map(({ title }) => <li key={title}>{title}</li>)}</ul>
          </section>

          <section className="course-experiments" id="course-experiments" aria-labelledby="course-experiments-title">
            <div className="catalog-section-heading"><h2 id="course-experiments-title">实验列表</h2></div>
            <ul>{course.experiments.map(({ title, prompt, href }) => (
              <li key={title}>
                <div><h3>{title}</h3><p>{prompt}</p></div>
                {href ? (
                  <div className="course-lab-actions">
                    <span className="course-lab-ready">可运行</span>
                    <Link href={href}>打开寻路实验 <CatalogIcon icon="lucide:arrow-up-right" width={16} /></Link>
                  </div>
                ) : <span className="course-lab-pending">开发中</span>}
              </li>
            ))}</ul>
          </section>
        </div>
      </div>
    </main>
  );
}
