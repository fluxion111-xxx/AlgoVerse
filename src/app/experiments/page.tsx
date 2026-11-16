import type { Metadata } from "next";
import { NavigationLink } from "@/components/NavigationLink";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { EditorialStory } from "@/components/experiments/EditorialStory";
import { ExperimentCreator } from "@/components/experiments/ExperimentCreator";
import { LabMasthead } from "@/components/experiments/LabMasthead";
import { courseRoute, courses, primaryExperimentRoute, type Course } from "@/lib/courses";
import { registeredEngines } from "@/lib/experimentEngines";
import { creatorRoute } from "@/lib/navigation";
import "../home-editorial.css";
import "../story-editorial.css";
import "./catalog-editorial.css";

export const metadata: Metadata = {
  title: "实验中心｜AlgoVerse 智算万象",
  description: "六个计算机方向。选一门，动手做实验。",
};

const photography = {
  algorithms: { photo: "/phase-two/board.webp", position: "center 45%" },
  "operating-systems": { photo: "/phase-two/processor.webp", position: "center 46%" },
  networks: { photo: "/phase-two/switch.webp", position: "center 50%" },
  programming: { photo: "/lab/laptop.jpg", position: "center 48%" },
  databases: { photo: "/phase-two/storage.webp", position: "center 44%" },
  ai: { photo: "/phase-two/gpu.webp", position: "center 55%" },
} satisfies Record<Course["slug"], { photo: string; position: string }>;

export default function ExperimentsPage() {
  return <div className="editorial-home editorial-dynamic lab-index">
    <a className="editorial-skip" href="#main-content">跳到正文</a>
    <LabMasthead />
    <main id="main-content">
      <section className="lab-index-hero editorial-frame" aria-labelledby="experiments-title">
        <div>
          <p className="editorial-kicker"><span lang="en">AlgoVerse</span><span>{registeredEngines.length} 个可运行实验</span></p>
          <h1 id="experiments-title">实验中心</h1>
        </div>
        <div className="lab-index-hero-aside">
          <p className="lab-index-hero-deck">拆开计算机。动手跑一遍。</p>
          <div className="editorial-actions">
            <a className="editorial-button editorial-button-primary" href="#courses">浏览六大模块 <CatalogIcon icon="lucide:arrow-down" width={17} /></a>
            <a className="editorial-button" href="#process">用 AI 设计实验 <CatalogIcon icon="lucide:arrow-up-right" width={17} /></a>
          </div>
        </div>
      </section>
      <EditorialStory id="courses" titleId="lab-index-title" mode="directory" kicker="六大实验领域"
        headline={["选个方向，", "动手试。"]} intro="从算法到模型，每门都能跑。"
        entries={courses.map((course) => ({ id: course.slug, title: course.title, description: course.introduction, ...photography[course.slug],
          label: `${registeredEngines.filter(({ domain }) => domain === course.slug).length} 个可运行实验`,
          link: { href: courseRoute(course), label: "进入模块" },
          secondary: { href: primaryExperimentRoute(course), label: `试试${course.primary.title}` } }))} />
      <section id="process" className="lab-index-creation editorial-frame" aria-labelledby="lab-creation-title">
        <div className="lab-index-creation-copy">
          <p className="editorial-kicker" lang="en">AI WORKBENCH</p>
          <h2 id="lab-creation-title">带个问题来。</h2>
          <p>写下想法，再选参数。</p>
          <nav className="lab-index-workflow-links" aria-label="实验入口">
            <NavigationLink href={creatorRoute}>AI 智能创造 <CatalogIcon icon="lucide:arrow-up-right" width={17} /></NavigationLink>
            <NavigationLink href="/experiments/create?mode=resume">继续当前任务 <CatalogIcon icon="lucide:arrow-up-right" width={17} /></NavigationLink>
          </nav>
        </div>
        <ExperimentCreator />
      </section>
    </main>
  </div>;
}
