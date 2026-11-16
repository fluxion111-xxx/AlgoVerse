"use client";

import Image from "next/image";
import { NavigationLink } from "@/components/NavigationLink";
import { useEffect, useRef, type ReactNode } from "react";
import { CatalogIcon } from "./CatalogEffects";

type StoryLink = { href: string; label: string };

export type StoryEntry = {
  id: string;
  title: string;
  description: string;
  photo: string;
  position: string;
  label: string;
  link: StoryLink;
  secondary?: StoryLink;
};

type Props = {
  id: string;
  titleId: string;
  mode: "workflow" | "directory";
  kicker: string;
  headline: [string, string];
  intro: string;
  entries: StoryEntry[];
  children?: ReactNode;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const number = (index: number) => String(index + 1).padStart(2, "0");

function Photo({ entry }: { entry: StoryEntry }) {
  return <Image src={entry.photo} alt="" fill sizes="(max-width: 760px) 92vw, 56vw"
    style={{ objectPosition: entry.position }} />;
}

export function EditorialStory({ id, titleId, mode, kicker, headline, intro, entries, children }: Props) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = section.current;
    if (!root) return;
    const title = root.querySelector<HTMLElement>(".story-head")!;
    const rows = Array.from(root.querySelectorAll<HTMLElement>(".story-row"));
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".story-layer"));
    const panels = Array.from(root.querySelectorAll<HTMLElement>(".story-caption"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 900px) and (min-height: 600px)");
    const images = Array.from(root.querySelectorAll<HTMLElement>(".story-inline"));
    let current = -1;
    let frame: number | undefined;

    const paint = () => {
      frame = undefined;
      const viewport = window.innerHeight;
      const bounds = root.getBoundingClientRect();
      if (bounds.top > viewport || bounds.bottom < 0) return;
      const titleTop = title.getBoundingClientRect().top;
      const position = rows.map((row) => row.getBoundingClientRect());
      const imageTops = wide.matches ? [] : images.map((item) => item.getBoundingClientRect().top);
      const cursor = viewport * .53;
      const centers = position.map(({ top, height }) => top + height / 2);
      const next = centers.findIndex((center) => center > cursor);
      const base = next === -1 ? rows.length - 1 : Math.max(0, next - 1);
      const fraction = next > 0 ? clamp((cursor - centers[base]) / (centers[next] - centers[base])) : 0;
      const active = next > 0 && fraction >= .5 ? next : base;
      const titleRange = Math.min(300, viewport * .39);
      const compactDirectory = mode === "directory" && wide.matches;
      // Its compact masthead can expose the first chapter before the visitor scrolls.
      const titleGate = compactDirectory ? Math.min(viewport * .92, titleTop + window.scrollY + titleRange * .62) : viewport * .92;
      const reveal = clamp((titleGate - titleTop) / titleRange);

      root.style.setProperty("--story-line-one", String(clamp(reveal * (compactDirectory ? 1.62 : 1.5))));
      root.style.setProperty("--story-line-two", String(clamp(compactDirectory ? (reveal - .62) / .38 : (reveal - .24) * 1.32)));
      root.style.setProperty("--story-completion", String((base + fraction) / (rows.length - 1)));
      if (current !== active) {
        rows.forEach((row, index) => row.toggleAttribute("data-active", index === active));
        panels.forEach((panel, index) => panel.toggleAttribute("data-active", index === active));
        root.dataset.active = entries[active].id;
        current = active;
      }

      if (wide.matches) {
        const wipe = clamp((fraction - .08) / .84);
        const firstWipe = clamp((viewport * .94 - position[0].top) / (viewport * .44));
        layers.forEach((layer, index) => {
          const state = index === base ? "base" : index === next && next > base ? "incoming" : "away";
          if (layer.dataset.layer !== state) layer.dataset.layer = state;
          if (state !== "away") {
            const parallax = Math.max(-20, Math.min(20, (centers[index] - cursor) * .095));
            layer.style.setProperty("--story-wipe", String(state === "incoming" ? wipe : next === 0 ? firstWipe : 1));
            layer.style.setProperty("--story-parallax", `${parallax}px`);
            layer.style.setProperty("--story-scale", String(1.08 + Math.abs(parallax) / 230));
          }
        });
      } else {
        images.forEach((item, index) => {
          const progress = clamp((viewport * .97 - imageTops[index]) / (viewport * .37));
          item.style.setProperty("--story-wipe", String(.18 + progress * .82));
          item.style.setProperty("--story-parallax", `${(1 - progress) * 12}px`);
          item.style.setProperty("--story-scale", String(1.06 + (1 - progress) * .11));
        });
      }
    };

    const schedulePaint = () => {
      if (frame === undefined && !reduced.matches) frame = window.requestAnimationFrame(paint);
    };
    const configure = () => {
      root.toggleAttribute("data-motion", !reduced.matches);
      if (reduced.matches) {
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        frame = undefined;
        delete root.dataset.active;
        rows.forEach((row) => row.removeAttribute("data-active"));
        panels.forEach((panel) => panel.removeAttribute("data-active"));
        current = -1;
      }
      schedulePaint();
    };
    const observer = new ResizeObserver(schedulePaint);
    configure();
    observer.observe(root);
    window.addEventListener("scroll", schedulePaint, { passive: true });
    window.addEventListener("resize", configure);
    reduced.addEventListener("change", configure);
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedulePaint);
      window.removeEventListener("resize", configure);
      reduced.removeEventListener("change", configure);
    };
  }, [entries, mode]);

  return <section ref={section} id={id} className={`editorial-story editorial-story--${mode}`} aria-labelledby={titleId}>
    <div className="editorial-frame">
      <header className="story-head">
        <div>
          <p className="editorial-kicker">{kicker}</p>
          <h2 id={titleId}>{headline.map((line) => <span className="story-title-line" key={line}><span>{line}</span></span>)}</h2>
        </div>
        <p className="story-intro">{intro}</p>
      </header>
      <div className="story-track">
        <div className="story-stage" aria-hidden="true">
          <div className="story-stage-image">
            {entries.map((entry) => <div className="story-layer" key={entry.id} data-layer="away">
              <div className="story-image-wipe"><Photo entry={entry} /></div>
            </div>)}
          </div>
          <div className="story-stage-foot">
            <div className="story-caption-stack">
              {entries.map((entry, index) => <p className="story-caption" key={entry.id}><span>{number(index)} / {String(entries.length).padStart(2, "0")}</span>{entry.title}</p>)}
            </div>
            <div className="story-meter"><span /></div>
          </div>
        </div>
        <ol className="story-rows">
          {entries.map((entry, index) => <li className="story-row" key={entry.id}>
            <div className="story-row-main">
              <div className="story-row-key"><span>{number(index)}</span><span>{entry.label}</span></div>
              <h3 className="story-row-title">{entry.title}</h3>
              <p className="story-row-description">{entry.description}</p>
              <div className="story-row-links">
                <NavigationLink href={entry.link.href} className="story-link" aria-label={`${entry.link.label} · ${entry.title}`}>
                  {entry.link.label}<CatalogIcon icon="lucide:arrow-up-right" width={17} />
                </NavigationLink>
                {entry.secondary && <NavigationLink href={entry.secondary.href} className="story-link story-link-secondary">
                  {entry.secondary.label}<CatalogIcon icon="lucide:arrow-right" width={16} />
                </NavigationLink>}
              </div>
            </div>
            <div className="story-inline" aria-hidden="true"><div className="story-image-wipe"><Photo entry={entry} /></div></div>
          </li>)}
        </ol>
      </div>
    </div>
    {children}
  </section>;
}
