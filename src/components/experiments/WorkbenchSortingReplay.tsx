"use client";

import { useMemo, type CSSProperties } from "react";
import type { SortingConfig, sortingEngine } from "@/lib/experiments/sorting";
import { Controls, useReplay } from "./SimulationReplay";

type SortingResult = ReturnType<typeof sortingEngine.run>;

const eventLabels = { initial: "初始序列", compare: "正在比较", swap: "交换位置", done: "排序完成" };

function traceOrder(values: number[], frames: SortingResult["bubble"]["frames"]) {
  let order = values.map((_, index) => index);
  return [order, ...frames.map(({ kind, active: [left, right] }) => {
    // Positions change only at recorded swaps. IDs stay distinct even for equal values.
    if (kind === "swap") {
      order = [...order];
      [order[left], order[right]] = [order[right], order[left]];
    }
    return order;
  })];
}

function SortingTrace({ title, values, result, step, scale }: {
  title: string; values: number[]; result: SortingResult["bubble"]; step: number; scale: number;
}) {
  const orders = useMemo(() => traceOrder(values, result.frames), [values, result.frames]);
  const at = Math.min(step, result.frames.length);
  const frame = result.frames[at - 1];
  const sequence = frame?.values ?? values;
  const event = frame?.kind ?? "initial";
  const signed = values.some((value) => value < 0);
  const positions = new Array<number>(values.length);
  orders[at].forEach((id, index) => { positions[id] = index; });

  return <section className="wb-sort-trace">
    <header><h3>{title}</h3><span className="wb-sort-event" data-event={event}>{eventLabels[event]}</span></header>
    <div className="wb-sort-scroll" tabIndex={values.length > 10 ? 0 : undefined}>
      <div className="wb-sort-plot" data-event={event} data-signed={signed} role="img" aria-label={`序列 ${sequence.join("、")}`}
        style={{ "--wb-bar-width": `${100 / values.length}%`, "--wb-plot-min": `${values.length * 28}px` } as CSSProperties}>
        <div className="wb-sort-grid" aria-hidden="true" />
        {positions.map((index, id) => {
          const value = sequence[index];
          return <div key={id} className="wb-sort-bar"
            aria-hidden="true" data-active={frame?.active.includes(index)} style={{ translate: `${index * 100}%` }}>
            <div className="wb-sort-track">
              <i data-negative={value < 0} data-zero={value === 0} style={{ blockSize: `${Math.abs(value) / scale * (signed ? 46 : 94)}%` }} />
            </div>
            <span>{value}</span>
          </div>;
        })}
      </div>
    </div>
    <dl className="wb-sort-counts">
      <div><dt>比较</dt><dd>{frame?.comparisons ?? 0}</dd></div>
      <div><dt>交换</dt><dd>{frame?.swaps ?? 0}</dd></div>
    </dl>
  </section>;
}

export function WorkbenchSortingReplay({ config, results }: { config: SortingConfig; results: SortingResult }) {
  const replay = useReplay(Math.max(results.bubble.frames.length, results.quick.frames.length), 290);
  const { values } = config;
  const scale = Math.max(1, ...values.map(Math.abs));
  return <div className="wb-sort-replay">
    <Controls replay={replay} />
    <div className="wb-sort-traces">
      <SortingTrace title="冒泡排序" values={values} result={results.bubble} step={replay.step} scale={scale} />
      <SortingTrace title="快速排序" values={values} result={results.quick} step={replay.step} scale={scale} />
    </div>
    <p className="simulation-caption">快排取末项作基准。</p>
  </div>;
}
