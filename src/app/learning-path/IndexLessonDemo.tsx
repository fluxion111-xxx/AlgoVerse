"use client";

import { useState } from "react";
import { IndexReplay } from "@/components/experiments/DomainReplay";
import { bPlusTreeEngine } from "@/lib/experiments/bPlusTree";

const preset = bPlusTreeEngine.preset(0);

export function IndexLessonDemo() {
  const [lower, setLower] = useState("8");
  const [upper, setUpper] = useState("17");
  const [order, setOrder] = useState(1);
  const [run, setRun] = useState<{ id: number; lower: number; upper: number; data: ReturnType<typeof bPlusTreeEngine.run> }>();
  const config = bPlusTreeEngine.configure({ ...preset, order, lower: lower === "" ? NaN : Number(lower),
    upper: upper === "" ? NaN : Number(upper) }, 0);
  return <section id="lesson-demo" className="lesson-section lesson-demonstration" aria-labelledby="lesson-demo-title">
    <h6 id="lesson-demo-title">走一次叶链</h6>
    <p>插入顺序：{preset.keys.join("、")}。</p>
    <div className="lesson-bound-inputs">
      <label>查询下界 <input type="number" min={-99} max={99} value={lower} onChange={(event) => { setLower(event.target.value); setRun(undefined); }} /></label>
      <label>查询上界 <input type="number" min={-99} max={99} value={upper} onChange={(event) => { setUpper(event.target.value); setRun(undefined); }} /></label>
      <label>节点容量 <select value={order} onChange={(event) => { setOrder(Number(event.target.value)); setRun(undefined); }}>
        {[1, 2, 3].map((item) => <option key={item} value={item}>{2 * item} 个键</option>)}</select></label>
    </div>
    <button className="catalog-jump" type="button" disabled={!config} onClick={() => {
      if (config) setRun({ id: (run?.id ?? 0) + 1, lower: config.lower, upper: config.upper, data: bPlusTreeEngine.run(config) });
    }}>运行区间查找</button>
    {!config && <p role="status">请检查上下界。下界不能更大。</p>}
    {run && <>
      <IndexReplay key={run.id} lower={run.lower} upper={run.upper} results={run.data} />
      <output aria-live="polite">命中 {run.data.matches.join("、") || "无"}。访问 {run.data.visitedCount} 个节点。</output>
    </>}
    <p>此处运行索引模型。SQL 用来说明查询语义。</p>
  </section>;
}
