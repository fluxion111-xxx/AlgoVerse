"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { InkArrow, PaperLayers } from "./PaperDetails";

function PaperSurface() {
  return (
    <span className="paper-surface" aria-hidden="true">
      <span className="paper-fiber-edge" />
      <span className="paper-printed-face" />
    </span>
  );
}

export function FlowCards() {
  return (
    <section className="flow-section" id="process" aria-label="四步实验流程">
      <div className="flow-grid grid">
        <article className="flow-card flow-one">
          <PaperSurface />
          <div className="flow-card-head"><Icon icon="lucide:message-square-more" width={35} /><span className="flow-number">01</span></div>
          <h3>提出想法</h3>
          <p>一句话描述实验。</p>
          <Link className="idea-input" href="/experiments#creator-title" aria-label="打开 AI 实验创造台"><span>比如：比较两种找路法…</span><Icon icon="lucide:arrow-right" width={19} /></Link>
        </article>
        <InkArrow className="flow-arrow arrow-one" />
        <article className="flow-card flow-two">
          <PaperSurface />
          <div className="flow-card-head"><Icon icon="lucide:layers" width={36} /><span className="flow-number">02</span></div>
          <h3>AI 生成实验</h3>
          <p>自动搭建场景与参数。</p>
          <PaperLayers />
        </article>
        <InkArrow className="flow-arrow arrow-two" />
        <article className="flow-card flow-three">
          <PaperSurface />
          <div className="flow-card-head"><Icon icon="lucide:play" width={34} /><span className="flow-number">03</span></div>
          <h3>运行对比</h3>
          <p>实时观察算法差异。</p>
          <svg className="chart-sketch" viewBox="0 0 190 82" aria-hidden="true"><path d="M5 7 3 74 187 74" fill="none" stroke="#a69c8f" strokeWidth="1.4" /><path d="M4 36C28 13 33 56 60 35S88 19 107 34S134 22 143 14S164 34 185 15" fill="none" stroke="#e87528" strokeWidth="2.5" /><path d="M4 62C27 37 35 71 58 57S85 20 106 38S132 67 148 51S170 40 185 44" fill="none" stroke="#598c45" strokeWidth="2.5" /></svg>
        </article>
        <InkArrow className="flow-arrow arrow-three" />
        <article className="flow-card flow-four">
          <PaperSurface />
          <div className="flow-card-head"><Icon icon="lucide:goal" width={36} /><span className="flow-number">04</span></div>
          <h3>诊断改进</h3>
          <p>AI 分析结果并给建议。</p>
          <div className="check-sketch" aria-hidden="true"><span><Icon icon="lucide:check" width={20} /><i /></span><span><Icon icon="lucide:check" width={20} /><i /></span><span><Icon icon="lucide:check" width={20} /><i /></span></div>
        </article>
      </div>
    </section>
  );
}
