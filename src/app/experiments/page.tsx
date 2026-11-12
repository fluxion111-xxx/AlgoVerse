import type { Metadata } from "next";
import Link from "next/link";
import { CatalogIcon, CourseTile } from "@/components/experiments/CatalogEffects";
import { CatalogMasthead } from "@/components/experiments/CatalogMasthead";
import { ExperimentCreator } from "@/components/experiments/ExperimentCreator";
import { courses, pathfindingRoute } from "@/lib/courses";
import "./catalog.css";
import "./catalog-collage.css";

export const metadata: Metadata = {
  title: "实验中心｜AlgoVerse 智算万象",
  description: "六门计算机课程。选一门，动手做实验。",
};

export default function ExperimentsPage() {
  return (
    <main className="catalog-page catalog-edition">
      <CatalogMasthead isCatalog />
      <div className="catalog-width">
        <div className="catalog-hero">
          <header className="catalog-title">
            <h1>实验中心</h1>
            <svg className="catalog-underline" viewBox="0 0 490 44" fill="none" aria-hidden="true">
              <path d="M5 34C116 23 267 1 475 10M106 39C216 28 321 13 424 16" pathLength="1" />
            </svg>
            <p>选一门课，动手跑一遍。</p>
            <div className="catalog-title-actions">
              <a className="catalog-jump" href="#courses">浏览六门课 <CatalogIcon icon="lucide:arrow-down" width={17} /></a>
              <Link className="catalog-direct" href={pathfindingRoute}>打开寻路实验 <CatalogIcon icon="lucide:arrow-up-right" width={17} /></Link>
            </div>
          </header>
          <svg className="catalog-ink-note" viewBox="0 0 340 120" fill="none" aria-hidden="true">
            <path d="M6 72C66 23 154 12 216 30C257 42 253 78 208 78C169 78 187 35 237 32C280 30 306 56 318 99M296 88L319 105L329 79" pathLength="1" />
          </svg>
          <div className="creator-stack">
            <ExperimentCreator />
          </div>
        </div>

        <section className="catalog-courses" id="courses" aria-labelledby="catalog-courses-title">
          <div className="catalog-directory">
            <h2 id="catalog-courses-title">课程目录</h2>
            <svg viewBox="0 0 112 46" fill="none" aria-hidden="true">
              <path d="M5 9C35 4 74 12 99 32M82 32L103 36L98 17" pathLength="1" />
            </svg>
          </div>
          <div className="catalog-spread">
            {courses.map((course, index) => <CourseTile key={course.slug} course={course} index={index} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
