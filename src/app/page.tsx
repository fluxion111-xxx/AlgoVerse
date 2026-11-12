"use client";

import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { AlgorithmLab } from "@/components/AlgorithmLab";
import { FlowCards } from "@/components/FlowCards";
import "./home-restored.css";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const router = useRouter();

  return (
    <main className="site-shell home-restored">
      <div className="page-grain" aria-hidden="true" />
      <Header />
      <div className="home-scene">
        <div className="home-paper home-paper-left" aria-hidden="true" />
        <div className="home-paper home-paper-device" aria-hidden="true" />
        <div className="home-paper home-paper-base" aria-hidden="true" />
        <div className="home-paper home-paper-rust" aria-hidden="true" />
        <div className="home-books" aria-hidden="true"><i /><i /></div>
        <Icon icon="lucide:settings" className="home-gear" aria-hidden="true" />
        <div className="mountain mountain-left" aria-hidden="true" />
        <div className="mountain mountain-right" aria-hidden="true" />
        <div className="mountain mountain-distant" aria-hidden="true" />
        <div className="mountain mountain-front" aria-hidden="true" />
        <div className="robot-accent" aria-hidden="true"><span className="robot-antenna" /><span className="robot-head"><span className="robot-screen"><i /><i /></span></span></div>
        <div className="content-wrap">
          <section className="hero" aria-label="智算万象首页">
            <motion.div className="hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <h1>智算万象</h1>
              <div className="subtitle-paper">AI 让算法实验更简单、更有趣。</div>
              <div className="hero-description"><p>想学算法？别只看课本！</p><p>在这里，动手实验、AI 共创。</p><p>实时验证，用结果说话。</p></div>
              <div className="hero-actions">
                <button className="primary-cta" onClick={() => router.push("/experiments")}>开始实验 <Icon icon="lucide:arrow-right" width={23} /></button>
                <button className="secondary-cta" onClick={() => scrollTo("process")}><Icon icon="lucide:play" width={22} />1分钟上手</button>
              </div>
            </motion.div>
            <AlgorithmLab />
          </section>
          <FlowCards />
        </div>
      </div>
    </main>
  );
}
