import type { Metadata } from "next";
import { CourseTile } from "@/components/experiments/CatalogEffects";
import { LabMasthead } from "@/components/experiments/LabMasthead";
import { LabIcon } from "@/components/experiments/LabIcon";
import { LabPaper, LabPaperMasks, LabSheet } from "@/components/experiments/LabPaper";
import { ExperimentCreator } from "@/components/experiments/ExperimentCreator";
import { courses } from "@/lib/courses";
import "./catalog-collage.css";

export const metadata: Metadata = {
  title: "实验中心｜AlgoVerse 智算万象",
  description: "六门计算机课程。选一门，动手做实验。",
};

export default function ExperimentsPage() {
  return (
    <main className="lab-catalog collage-page">
      <div className="lab-stage collage-canvas">
        <LabPaperMasks />
        <div className="lab-collage" aria-hidden="true">
          <LabPaper shape="black" className="lab-graph-paper" />
          <LabPaper shape="rust" className="lab-rust-top" />
          <LabPaper shape="rust" className="lab-rust-right" />
          <LabPaper shape="backing" className="lab-backing" />
          <LabPaper shape="rust" className="lab-rust-bottom" />
          <LabPaper shape="networkRibbon" className="lab-network-paper" />
          <span className="lab-middle-scrap" />
          <LabPaper shape="corner" className="lab-corner" />
          <LabPaper shape="masthead" className="lab-header-paper" />
          <span className="lab-mountain lab-mountain-left" />
          <span className="lab-mountain lab-mountain-center" />
          <span className="lab-mountain lab-mountain-right" />
          <span className="lab-gear"><LabIcon name="gear" /></span>
        </div>
        <LabMasthead />

        <header className="lab-title">
          <h1>实验中心</h1>
          <LabSheet className="lab-title-label" shape="label"><p>把计算机拆开看看。</p></LabSheet>
        </header>

        <div className="lab-workbench" aria-hidden="true">
          <span className="lab-work-scrap" />
          <span className="lab-desk-surface" />
          <span className="lab-prop lab-prop-books"><img src="/lab/books.jpg" alt="" width="850" height="535" /></span>
          <span className="lab-prop lab-prop-mug"><img src="/lab/mug.jpg" alt="" width="850" height="567" /></span>
          <span className="lab-prop lab-prop-laptop"><img src="/lab/laptop.jpg" alt="" width="850" height="566" /></span>
        </div>

        <LabSheet className="lab-creator-sheet" shape="creator">
          <span className="lab-tape lab-tape-creator" aria-hidden="true" />
          <ExperimentCreator />
        </LabSheet>

        <section className="lab-courses" id="courses" aria-label="课程目录">
          {courses.map((course, index) => <CourseTile key={course.slug} course={course} index={index} />)}
          <span className="lab-tape lab-tape-course" aria-hidden="true" />
        </section>
      </div>
    </main>
  );
}
