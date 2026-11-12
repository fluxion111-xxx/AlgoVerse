"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { courses, pathfindingRoute } from "@/lib/courses";
import { LabIcon } from "./LabIcon";

const searchEntries = [
  ...courses.map((course) => ({
    title: course.title,
    href: `/experiments/${course.slug}`,
    keywords: course.experiments.map(({ title }) => title).join(" "),
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
  const term = query.trim().toLowerCase();
  const entries = searchEntries.filter(({ title, keywords }) => `${title} ${keywords}`.toLowerCase().includes(term));

  return (
    <header className="lab-masthead">
      <Link className="lab-brand" href="/" aria-label="AlgoVerse 智算万象首页">
        <span className="brand-mark" aria-hidden="true"><i /><i /></span>
        <span>AlgoVerse</span>
        <small>智算万象</small>
      </Link>
      <nav className="lab-nav" aria-label="主导航">
        <Link href="/">首页</Link>
        <Link href="/experiments" aria-current="page">实验中心</Link>
        <Link href="/#process">学习路径</Link>
        <a href="#creator-title">AI 助教</a>
      </nav>
      <div className="lab-tools">
        <button type="button" popoverTarget="lab-search" aria-label="搜索课程"><LabIcon name="search" /></button>
        <button type="button" popoverTarget="lab-profile" aria-label="访问菜单"><LabIcon name="account" /></button>
      </div>
      <div className="lab-popover" id="lab-search" popover="auto" ref={search} onKeyDown={dismissOnEscape} role="search" aria-label="搜索课程">
        <label htmlFor="lab-search-input">搜索课程</label>
        <input id="lab-search-input" type="search" autoFocus placeholder="试试「寻路」" value={query} onChange={(event) => setQuery(event.target.value)} />
        <ul>
          {entries.map(({ title, href }) => <li key={href}><Link href={href} onClick={() => search.current?.hidePopover()}>{title}</Link></li>)}
        </ul>
        {!entries.length && <p role="status">没找到，换个词试试。</p>}
      </div>
      <div className="lab-popover lab-profile" id="lab-profile" popover="auto" onKeyDown={dismissOnEscape}>
        <p>访客模式</p>
        <ul>
          <li><Link href="/#process">学习路径</Link></li>
          <li>
            <button type="button" onClick={(event) => {
              event.currentTarget.closest<HTMLElement>(".lab-profile")?.hidePopover();
              document.getElementById("creator-question")?.focus();
            }}>打开实验创造台</button>
          </li>
        </ul>
      </div>
    </header>
  );
}
