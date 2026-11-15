"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { courseRoute, type Course } from "@/lib/courses";
import { LabCourseDiagram } from "./LabCourseDiagram";
import { LabIcon } from "./LabIcon";
import { LabPaper } from "./LabPaper";

export function CatalogIcon({ icon, width }: { icon: string; width: number }) {
  return <Icon icon={icon} width={width} aria-hidden="true" />;
}

const courseLabels = {
  algorithms: "让算法动起来。",
  "operating-systems": "看看 CPU，怎么忙。",
  networks: "追踪每个数据包。",
  programming: "代码背后发生什么？",
  databases: "数据藏在哪里？",
  ai: "看看模型怎么学。",
};

export function CourseTile({ course, index }: { course: Course; index: number }) {
  const shape = course.slug === "operating-systems" ? "os" : course.slug;
  return (
    <article className={`lab-course lab-course-${shape}`}>
      <LabPaper shape={shape} />
      <Link className="lab-course-link" href={courseRoute(course)} aria-label={`进入${course.title}`}>
        <div className="lab-course-copy">
          <span className="lab-course-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <h3>{course.title}</h3>
          <p>{courseLabels[course.slug]}</p>
          <span className="lab-course-button">进入课程 <LabIcon name="arrow" /></span>
        </div>
        <LabCourseDiagram course={course} />
      </Link>
    </article>
  );
}
