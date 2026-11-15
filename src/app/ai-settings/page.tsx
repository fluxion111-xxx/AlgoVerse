import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { buildRoute, creatorRoute, diagnosisRoute } from "@/lib/navigation";
import { platformAIConfigured } from "@/lib/server/aiProvider";
import { AISettingsForm } from "./AISettingsForm";
import "../home-editorial.css";
import "../story-editorial.css";
import "./settings.css";

export const metadata: Metadata = { title: "AI 服务设置｜AlgoVerse" };

export default async function AISettingsPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const { returnTo } = await searchParams;
  const workflow = typeof returnTo === "string" ? returnTo.split("?")[0] : "";
  const experimentReturn = [buildRoute, creatorRoute, diagnosisRoute].includes(workflow);
  const returnLink = typeof returnTo === "string" && (experimentReturn || workflow === "/learning-path" || workflow === "/ai-tutor") ? returnTo : null;
  const returnLabel = experimentReturn ? "返回实验流程" : workflow === "/learning-path" ? "返回学习路径" : "返回 AI 助教";
  return (
    <div className="editorial-home ai-settings">
      <a className="editorial-skip" href="#ai-settings-main">跳到设置</a>
      <Header action={{ href: returnLink ?? "/ai-tutor", label: returnLabel }} />
      <main id="ai-settings-main" className="ai-settings-frame" tabIndex={-1}>
        <Link className="ai-settings-back" href={returnLink ?? "/ai-tutor"}>← {returnLabel}</Link>
        <AISettingsForm configured={platformAIConfigured()} />
      </main>
    </div>
  );
}
