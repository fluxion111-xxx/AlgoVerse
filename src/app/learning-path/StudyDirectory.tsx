"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";

export function StudyDirectory({ chapter, children }: { chapter?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  return <aside className="study-index" aria-label="知识目录" data-open={open}>
    <button className="study-directory-toggle" type="button" disabled={!ready} aria-expanded={open} aria-controls="study-directory"
      onClick={() => setOpen(!open)}>
      <span>{open ? "收起目录" : "展开目录"}</span>
      {chapter && <small>{chapter}</small>}
      <CatalogIcon icon={open ? "lucide:minus" : "lucide:plus"} width={17} />
    </button>
    <div id="study-directory" onClick={(event) => {
      if (event.target instanceof Element && event.target.closest("a[data-study-chapter]")) setOpen(false);
    }}>{children}</div>
  </aside>;
}
