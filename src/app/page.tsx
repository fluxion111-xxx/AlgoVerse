import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { EditorialStory } from "@/components/experiments/EditorialStory";
import { ExperimentPrompt } from "@/components/experiments/ExperimentPrompt";
import { courseRoute, courses } from "@/lib/courses";
import { experimentTaskLinks, quickStartRoute, workflowSteps } from "@/lib/navigation";
import { getActiveAIWorkflow } from "@/lib/server/experimentRecords";
import "./home-editorial.css";
import "./story-editorial.css";

const steps = Object.keys(workflowSteps) as (keyof typeof workflowSteps)[];
const workflowImages = {
  question: { photo: "/lab/laptop.jpg", position: "center 49%", label: "问题", description: "说清想验证的事。" },
  config: { photo: "/phase-two/board.webp", position: "center 47%", label: "方案", description: "先看方案，再确认参数。" },
  run: { photo: "/phase-one/server-workbench.webp", position: "center 57%", label: "实测", description: "用同一组输入，比结果。" },
  diagnosis: { photo: "/phase-two/storage.webp", position: "center 53%", label: "复盘", description: "从本轮数据找原因。" },
} satisfies Record<keyof typeof workflowSteps, { photo: string; position: string; label: string; description: string }>;

export default async function Home() {
  const task = await getActiveAIWorkflow();
  const links = experimentTaskLinks(task);

  return <div className="editorial-home editorial-dynamic editorial-landing">
    <a className="editorial-skip" href="#main-content">跳到正文</a>
    <Header action={{ href: "#home-ask", label: "发起实验" }} />
    <main id="main-content">
      <section className="editorial-hero" aria-labelledby="home-heading">
        <div className="editorial-hero-photo">
          <Image src="/phase-one/server-workbench.webp" alt="机房里的工作站和服务器机柜" fill preload sizes="(max-width: 700px) 100vw, 57vw" />
        </div>
        <div className="editorial-hero-content editorial-frame">
          <p className="editorial-kicker"><span lang="en">AlgoVerse</span><span>算法与仿真实验</span></p>
          <h1 id="home-heading"><span><span>把问题</span></span><span><span>跑一遍。</span></span></h1>
          <p className="editorial-hero-deck">带一个问题来。<br />改参数，看结果。</p>
          <div className="editorial-actions">
            <Link className="editorial-button editorial-button-primary" href="/experiments">开始实验 <CatalogIcon icon="lucide:arrow-up-right" width={18} /></Link>
            <Link className="editorial-button" href={quickStartRoute}><CatalogIcon icon="lucide:play" width={17} />一分钟上手</Link>
          </div>
          <a className="editorial-scroll" href="#atlas-title">向下探索 <CatalogIcon icon="lucide:arrow-down" width={16} /></a>
        </div>
      </section>

      <EditorialStory id="process" titleId="atlas-title" mode="workflow" kicker="一题四步"
        headline={["把想法", "放进实验。"]} intro="从一个问题，到一轮实测。"
        entries={steps.map((step) => ({ id: step, title: workflowSteps[step], ...workflowImages[step],
          link: { href: links[step], label: "进入这一步" } }))}>
        <div id="home-ask" className="editorial-story-form">
          <div className="story-form-copy">
            <p className="editorial-kicker">AI 实验创造台</p>
            <h3>带个问题来。</h3>
            <p>先问，再动手。</p>
            {task && <Link className="editorial-resume" href="/experiments/create?mode=resume">继续上次实验 <CatalogIcon icon="lucide:arrow-up-right" width={16} /></Link>}
          </div>
          <div className="editorial-studio-form">
            <ExperimentPrompt appearance="editorial" />
            <nav className="editorial-domains" aria-label="六大实验方向">
              <p>从课程开始</p>
              <ul>{courses.map((course) => <li key={course.slug}>
                <Link href={courseRoute(course)}>{course.title}<CatalogIcon icon="lucide:arrow-up-right" width={15} /></Link>
              </li>)}</ul>
            </nav>
          </div>
        </div>
      </EditorialStory>
    </main>
  </div>;
}
