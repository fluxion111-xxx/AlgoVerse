import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { CatalogIcon } from "./CatalogEffects";
import "@/app/home-editorial.css";
import "@/app/story-editorial.css";
import "@/app/experiments/catalog.css";
import "@/app/experiments/experiments.css";
import "@/app/experiments/preset.css";
import "@/app/experiments/create/studio.css";
import "@/app/experiments/workspace.css";

export function LabWorkspace({ children, className, back = { href: "/experiments", label: "实验中心" }, skipLabel = "跳到实验内容" }: {
  children: ReactNode;
  className: string;
  back?: { href: string; label: string };
  skipLabel?: string;
}) {
  return <main className={`lab-workspace ${className}`}>
    <a className="editorial-skip" href="#lab-content">{skipLabel}</a>
    <Header action={back} />
    <div className="lab-workspace-frame" id="lab-content" tabIndex={-1}>
      <Link className="lab-workspace-back" href={back.href}>
        <CatalogIcon icon="lucide:arrow-left" width={15} />{back.label}
      </Link>
      {children}
    </div>
  </main>;
}
