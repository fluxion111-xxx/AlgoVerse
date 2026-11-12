"use client";

import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { Header } from "@/components/Header";
import { AlgorithmLab } from "@/components/AlgorithmLab";
import { FlowCards } from "@/components/FlowCards";
import { InkArrow } from "@/components/PaperDetails";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  return (
    <main className="site-shell">
      <div className="page-grain" aria-hidden="true" />
      <Header />
      <div className="home-scene">
        <div className="mountain mountain-left" aria-hidden="true" />
        <div className="mountain mountain-right" aria-hidden="true" />
        <div className="mountain mountain-distant" aria-hidden="true" />
        <div className="mountain mountain-front" aria-hidden="true" />
        <div className="branch branch-left" aria-hidden="true" />
        <div className="branch branch-right" aria-hidden="true" />
        <div className="robot-accent" aria-hidden="true"><span className="robot-antenna" /><span className="robot-head"><span className="robot-screen"><i /><i /></span></span></div>
        <div className="content-wrap">
          <section className="hero" aria-label="智算万象首页">
            <motion.div className="hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <div className="hero-spark" aria-hidden="true"><i /><i /><i /></div>
              <h1>智算万象<svg className="title-stroke" viewBox="0 0 320 76" preserveAspectRatio="none" aria-hidden="true"><path d="M1 72C82 23 186 58 273 29C305 19 312 4 293 7C280 8 268 13 258 19C271 5 298-5 313 2C333 13 299 33 271 38C173 62 101 39 1 72Z" fill="currentColor" /></svg></h1>
              <div className="subtitle-paper">AI 让算法实验更简单、更有趣。</div>
              <div className="hero-description"><p>想学算法？别只看课本！</p><p>在这里，动手实验、AI 共创。</p><p>实时验证，用结果说话。</p></div>
              <div className="hero-actions">
                <button className="primary-cta" onClick={() => { scrollTo("lab"); window.setTimeout(() => document.querySelector<HTMLButtonElement>(".run-button")?.click(), 450); }}>开始实验 <Icon icon="lucide:arrow-right" width={23} /></button>
                <button className="secondary-cta" onClick={() => scrollTo("process")}><Icon icon="lucide:play" width={22} />1分钟上手</button>
              </div>
              <InkArrow className="hand-arrow" />
            </motion.div>
            <AlgorithmLab />
          </section>
          <FlowCards />
        </div>
      </div>
    </main>
  );
}
