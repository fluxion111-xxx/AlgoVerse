"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { courses, courseRoute, pathfindingRoute } from "@/lib/courses";
import { Header } from "@/components/Header";
import { CatalogIcon } from "./CatalogEffects";

const searchEntries = [
  ...courses.map((course) => ({
    title: course.title,
    href: courseRoute(course),
    keywords: [course.primary.pageTitle, course.primary.title, ...course.experiments.map(({ title }) => title)].join(" "),
  })),
  { title: "打开寻路实验", href: pathfindingRoute, keywords: "图搜索 A* Dijkstra" },
];

function dismissOnEscape(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.currentTarget.hidePopover();
  }
}

export function LabMasthead() {
  const [query, setQuery] = useState("");
  const search = useRef<HTMLDivElement>(null);
  const profile = useRef<HTMLDivElement>(null);
  const term = query.trim().toLowerCase();
  const entries = searchEntries.filter(({ title, keywords }) => `${title} ${keywords}`.toLowerCase().includes(term));

  return (
    <Header>
      <button className="lab-header-tool" type="button" popoverTarget="lab-search" aria-label="搜索课程">
        <CatalogIcon icon="lucide:search" width={18} />
      </button>
      <button className="lab-header-tool" type="button" popoverTarget="lab-profile" aria-label="访问菜单">
        <CatalogIcon icon="lucide:user-round" width={18} />
      </button>
      <div className="lab-index-popover" id="lab-search" popover="auto" ref={search} onKeyDown={dismissOnEscape} role="search" aria-label="搜索课程">
        <label htmlFor="lab-search-input">搜索课程</label>
        <input id="lab-search-input" type="search" autoFocus placeholder="试试「寻路」" value={query} onChange={(event) => setQuery(event.target.value)} />
        <ul>
          {entries.map(({ title, href }) => <li key={href}><Link href={href} onClick={() => search.current?.hidePopover()}>{title}</Link></li>)}
        </ul>
        {!entries.length && <p role="status">没找到，换个词试试。</p>}
      </div>
      <div className="lab-index-popover" id="lab-profile" popover="auto" ref={profile} onKeyDown={dismissOnEscape}>
        <p>访客模式</p>
        <ul>
          <li><Link href="/learning-path" onClick={() => profile.current?.hidePopover()}>学习路径</Link></li>
          <li>
            <button type="button" onClick={() => {
              profile.current?.hidePopover();
              document.getElementById("creator-question")?.focus();
            }}>打开实验创造台</button>
          </li>
        </ul>
      </div>
    </Header>
  );
}
