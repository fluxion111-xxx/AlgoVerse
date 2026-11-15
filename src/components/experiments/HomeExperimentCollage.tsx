import Link from "next/link";
import { CatalogIcon } from "./CatalogEffects";
import { ExperimentPrompt } from "./ExperimentPrompt";
import { courses } from "@/lib/courses";

export function HomeExperimentCollage() {
  return <section className="lab-assembly home-experiment-atlas" aria-labelledby="atlas-title">
    <div className="lab-shadow-sheet" aria-hidden="true" />
    <div className="lab-window atlas-window">
      <header><p>AI 实验工作台</p><h2 id="atlas-title">把问题放进实验。</h2></header>
      <nav className="atlas-topology" aria-label="六大实验方向">
        <i className="atlas-trace trace-one" aria-hidden="true" /><i className="atlas-trace trace-two" aria-hidden="true" />
        {courses.map((course, index) => <Link key={course.slug} href={`/experiments/${course.slug}`} className={`atlas-node atlas-node-${index + 1}`}>
          <CatalogIcon icon={course.icon} width={20} />{course.title}
        </Link>)}
      </nav>
      <ExperimentPrompt />
    </div>
  </section>;
}
