"use client";

import { useState } from "react";
import { SortingReplay } from "@/components/experiments/SimulationReplay";
import { sortingEngine } from "@/lib/experiments/sorting";

export function SortingLessonDemo() {
  const [sequence, setSequence] = useState("3, 1, 2");
  const [run, setRun] = useState<{ id: number; config: NonNullable<ReturnType<typeof sortingEngine.configure>>; result: ReturnType<typeof sortingEngine.run> }>();
  const values = sequence.trim().split(/[\s,，]+/).map((item) => /^-?\d+$/.test(item) ? Number(item) : NaN);
  const config = sortingEngine.configure({ values, goalLabel: "观察比较和交换次数。" }, 0);
  return <section id="lesson-demo" className="lesson-section lesson-demonstration creator-canvas" aria-labelledby="lesson-demo-title">
    <h6 id="lesson-demo-title">让两种排序跑一次</h6>
    <label className="lesson-sort-input" htmlFor="lesson-sort-values">整数序列</label>
    <input id="lesson-sort-values" type="text" maxLength={120} value={sequence} onChange={(event) => {
      setSequence(event.target.value);
      setRun(undefined);
    }} />
    <p>输入 2–20 项。范围 −999 到 999。</p>
    <button className="catalog-jump" type="button" disabled={!config} onClick={() => {
      if (config) setRun({ id: (run?.id ?? 0) + 1, config, result: sortingEngine.run(config) });
    }}>运行排序</button>
    {!config && <p role="status">请检查序列。</p>}
    {run && <>
      <SortingReplay key={run.id} config={run.config} results={run.result} />
      <dl className="lesson-metrics" aria-label="冒泡 / 快排实测数据">
        <div><dt>比较次数</dt><dd>{run.result.bubble.comparisons} / {run.result.quick.comparisons}</dd></div>
        <div><dt>交换次数</dt><dd>{run.result.bubble.swaps} / {run.result.quick.swaps}</dd></div>
      </dl>
    </>}
    <p>本页试跑。要保存结果，请打开排序实验。</p>
  </section>;
}
