"use client";

import { useState } from "react";
import { countWork, growthAt, verifyLinearUpperBound } from "@/lib/lessons/growth";

const series = [
  { key: "linear", name: "2n + 7", color: "#e8c577" },
  { key: "nLogN", name: "⌈n log₂ n⌉", color: "#a5bf9b" },
  { key: "quadratic", name: "n²", color: "#eea47a" },
] as const;
const sizes = Array.from({ length: 12 }, (_, index) => 2 ** (index + 1));
const x = (n: number) => 49 + (Math.log2(n) - 1) * 32;
const y = (cost: number) => 190 - Math.log2(cost) * 6.7;

export function GrowthLessonDemo() {
  const [index, setIndex] = useState(2);
  const [multiplier, setMultiplier] = useState(3);
  const [start, setStart] = useState(6);
  const [run, setRun] = useState<{ n: number; steps: number }>();
  const n = sizes[index];
  const costs = growthAt(n);
  const proof = verifyLinearUpperBound(multiplier, start);
  return <section id="lesson-demo" className="lesson-section lesson-demonstration" aria-labelledby="lesson-demo-title">
    <h6 id="lesson-demo-title">拖动规模，看增长</h6>
    <figure className="lesson-growth-plot">
      <svg viewBox="0 0 427 218" role="img" aria-label={`双对数增长曲线，当前输入 ${n}`}>
        {[2, 6, 10, 14, 18, 22].map((power) => <g key={power}>
          <path d={`M49 ${y(2 ** power)}H402`} />
          <text x="4" y={y(2 ** power) + 4}>{2 ** power >= 1024 ? `${2 ** (power - 10)}K` : 2 ** power}</text>
        </g>)}
        {[2, 16, 128, 1024, 4096].map((size) => <text key={size} x={x(size)} y="210" textAnchor="middle">{size}</text>)}
        <path className="lesson-crosshair" d={`M${x(n)} 21V191`} />
        {series.map(({ key, color }) => <g key={key}>
          <polyline points={sizes.map((size) => `${x(size)},${y(growthAt(size)[key])}`).join(" ")} style={{ stroke: color }} />
          <circle cx={x(n)} cy={y(costs[key])} r="4" style={{ fill: color }} />
        </g>)}
      </svg>
      <figcaption>两轴都按倍数排列。纵轴是模型计步。</figcaption>
    </figure>
    <label className="lesson-range" htmlFor="lesson-size">输入规模 n <output>{n}</output></label>
    <input id="lesson-size" type="range" min="0" max={sizes.length - 1} value={index} aria-valuetext={String(n)}
      onChange={(event) => { setIndex(event.target.valueAsNumber); setRun(undefined); }} />
    <dl className="lesson-metrics" aria-label="当前规模的成本">{series.map(({ key, name, color }) =>
      <div key={key}><dt><i style={{ backgroundColor: color }} />{name}</dt><dd>{costs[key].toLocaleString("zh-CN")}</dd></div>)}</dl>
    <div className="lesson-run">
      <button className="catalog-jump" type="button" onClick={() => setRun({ n, steps: countWork(n) })}>运行计步</button>
      <p>按示例逐次计数。浏览器运行同逻辑模型。</p>
      {run && <output role="status">n = {run.n}，实际执行 {run.steps} 次计数。</output>}
    </div>
    <div className="lesson-bound">
      <h6>检验你选的上界</h6>
      <div className="lesson-bound-inputs">
        <label>常数 C <select value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>门槛 n₀ <select value={start} onChange={(event) => setStart(Number(event.target.value))}>
          {Array.from({ length: 16 }, (_, i) => i + 1).map((value) => <option key={value}>{value}</option>)}
        </select></label>
      </div>
      <p role="status" data-valid={proof.valid}>在 n₀ 处：{proof.cost} {proof.valid ? "≤" : ">"} {proof.upper}。{
        proof.valid ? "从该门槛起恒成立。" : proof.earliest === null ? "这个 C 永远不够。" : `最小门槛是 ${proof.earliest}。`
      }</p>
      <p>将不等式移项，得到 (C−2)n ≥ 7。C &gt; 2 时，左侧随 n 增大。</p>
    </div>
  </section>;
}
