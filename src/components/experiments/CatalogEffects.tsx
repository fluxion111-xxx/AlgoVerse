"use client";

import { Icon } from "@iconify/react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { PointerEvent } from "react";
import type { Course } from "@/lib/courses";
import { CoursePreview } from "./CoursePreview";

export function CatalogIcon({ icon, width }: { icon: string; width: number }) {
  return <Icon icon={icon} width={width} aria-hidden="true" />;
}

export function CourseTile({ course, index }: { course: Course; index: number }) {
  const reduceMotion = useReducedMotion();

  function tilt(event: PointerEvent<HTMLAnchorElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const tile = event.currentTarget;
    const bounds = tile.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    tile.style.setProperty("--paper-x", `${x * 10}px`);
    tile.style.setProperty("--paper-y", `${y * 8}px`);
  }

  function resetTilt(event: PointerEvent<HTMLAnchorElement>) {
    event.currentTarget.style.removeProperty("--paper-x");
    event.currentTarget.style.removeProperty("--paper-y");
  }

  return (
    <motion.article
      className={`course-tile theme-${course.slug}`}
      initial={reduceMotion ? false : { opacity: 0, x: index % 2 === 0 ? -12 : 12, y: 20 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.42, delay: reduceMotion ? 0 : (index % 2) * 0.07, ease: "easeOut" }}
    >
      <Link className="course-tile-link" href={`/experiments/${course.slug}`} onPointerMove={tilt} onPointerLeave={resetTilt}>
        <span className="course-paper-shadow" aria-hidden="true">
          <span className="course-paper-fold" />
          <span className="course-paper-face" />
        </span>
        <div className="course-tile-copy">
          <div className="course-index"><Icon icon={course.icon} width={20} aria-hidden="true" /><span>{String(index + 1).padStart(2, "0")}</span></div>
          <h3>{course.title}</h3>
          <p>{course.introduction}</p>
          <span className="course-tile-open">进入课程 <Icon icon="lucide:arrow-up-right" width={16} aria-hidden="true" /></span>
        </div>
        <div className="course-tile-figure">
          <CoursePreview course={course} />
          {course.slug === "ai" && (
            <svg className="course-figure-mark" viewBox="0 0 100 84" fill="none" aria-hidden="true">
              <path d="M87 10C95 28 78 44 55 46C36 48 26 40 33 28C42 13 67 32 56 51C48 64 30 70 11 73M18 59L8 74L25 80" pathLength="1" />
            </svg>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
