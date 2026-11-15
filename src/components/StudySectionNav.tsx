"use client";

import { useEffect, useState } from "react";
import { CatalogIcon } from "./experiments/CatalogEffects";

const sections = [
  { id: "knowledge-map", label: "知识地图" },
  { id: "study-progress", label: "学习进度" },
  { id: "study-guide", label: "学习建议" },
  { id: "study-records", label: "实验记录" },
] as const;

export function StudySectionNav() {
  const [active, setActive] = useState<string>(sections[0].id);

  useEffect(() => {
    const landmarks = sections.map(({ id }) => document.getElementById(id));
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = Math.min(window.innerHeight * .3, 190);
      const atEnd = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3;
      const index = atEnd ? sections.length - 1 : landmarks.findLastIndex((node) => node && node.getBoundingClientRect().top <= line);
      setActive(sections[Math.max(0, index)].id);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return <nav className="study-jump-links editorial-frame" aria-label="页内导航">
    {sections.map(({ id, label }) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>
      {label}<CatalogIcon icon="lucide:arrow-down" width={15} />
    </a>)}
  </nav>;
}
