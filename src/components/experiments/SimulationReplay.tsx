"use client";

import { useEffect, useState } from "react";
import { networkLinks, type NetworkConfig, type networkEngine } from "@/lib/experiments/network";
import type { SchedulingConfig, schedulingEngine } from "@/lib/experiments/scheduling";
import type { SortingConfig, sortingEngine } from "@/lib/experiments/sorting";

export function useReplay(length: number, interval: number) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || step >= length) return;
    const timer = window.setTimeout(() => setStep(step + 1), interval);
    return () => window.clearTimeout(timer);
  }, [interval, length, playing, step]);
  return { step, playing: playing && step < length, setPlaying, setStep, length };
}

export function Controls({ replay }: { replay: ReturnType<typeof useReplay> }) {
  const { step, playing, setPlaying, setStep, length } = replay;
  return <div className="simulation-controls">
    <button type="button" className="experiment-control" onClick={() => {
      if (step === length) setStep(0);
      setPlaying(!playing);
    }}>{playing ? "暂停" : step === length ? "重播" : "播放"}</button>
    <button type="button" className="experiment-control" disabled={step === length} onClick={() => { setPlaying(false); setStep(step + 1); }}>单步</button>
    <button type="button" className="experiment-control" onClick={() => { setPlaying(false); setStep(0); }}>重置</button>
    <span>{step} / {length} 步</span>
  </div>;
}

export function SortingReplay({ config, results }: { config: SortingConfig; results?: ReturnType<typeof sortingEngine.run> }) {
  const replay = useReplay(results ? Math.max(results.bubble.frames.length, results.quick.frames.length) : 0, 135);
  const max = Math.max(...config.values.map(Math.abs), 1);
  return <div className="simulation-view" aria-label="排序柱状图">
    {results && <Controls replay={replay} />}
    <div className="simulation-sort">
      {(["bubble", "quick"] as const).map((algorithm) => {
        const result = results?.[algorithm];
        const frame = result?.frames[Math.min(replay.step, result.frames.length) - 1];
        const values = frame?.values ?? config.values;
        return <section key={algorithm} className="simulation-panel">
          <h3>{algorithm === "bubble" ? "冒泡排序" : "快速排序"}</h3>
          <div className="simulation-bars" aria-label={`序列 ${values.join("、")}`}>
            {values.map((value, index) => <div key={index} className="simulation-bar" data-active={frame?.active.includes(index)} data-swap={frame?.kind === "swap"}>
              <div className="simulation-bar-axis"><i data-negative={value < 0} style={{ height: `${Math.abs(value) / max * 49}%` }} /></div>
              <span>{value}</span>
            </div>)}
          </div>
          <p>{frame?.kind === "compare" ? "正在比较" : frame?.kind === "swap" ? "交换位置" : frame?.kind === "done" ? "排序完成" : "初始序列"}</p>
          <p>比较 {results ? frame?.comparisons ?? 0 : "—"} · 交换 {results ? frame?.swaps ?? 0 : "—"}</p>
        </section>;
      })}
    </div>
    <p className="simulation-caption">快排取末项作基准。</p>
  </div>;
}

export function SchedulingReplay({ config, results }: { config: SchedulingConfig; results?: ReturnType<typeof schedulingEngine.run> }) {
  const replay = useReplay(results?.timeline.length ?? 0, 560);
  const slices = results?.timeline.slice(0, replay.step) ?? [];
  const time = slices.at(-1)?.end ?? 0;
  const finished = !!results && replay.step === replay.length;
  return <div className="simulation-view" aria-label="CPU 甘特图">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>{config.policy === "rr" ? "时间片轮转" : "先来先服务"}</h3>
      <p className="simulation-caption">{results ? `模拟时刻 ${time}` : "运行后绘制 CPU 时间轴。"}</p>
      <div className="simulation-timeline" aria-label="CPU 占用时间轴">
        {slices.map(({ process, start, end }) => <div key={start} data-process={process ?? "idle"}
          style={{ flexBasis: `${(end - start) * 42}px` }} title={`${start}–${end} · ${process === null ? "空闲" : `P${process + 1}`}`}>
          <span>{process === null ? "空闲" : `P${process + 1}`}</span><small>{start}–{end}</small>
        </div>)}
      </div>
      <table className="simulation-table">
        <thead><tr><th>进程</th><th>到达</th><th>运行</th><th>等待</th><th>周转</th><th>响应</th></tr></thead>
        <tbody>{config.processes.map(({ arrival, burst }, index) => {
          const stats = results?.processes[index];
          const visible = stats && stats.finished <= time;
          return <tr key={index}><th>P{index + 1}</th><td>{arrival}</td><td>{burst}</td>
            <td>{visible ? stats.waiting : "—"}</td><td>{visible ? stats.turnaround : "—"}</td><td>{visible ? stats.response : "—"}</td></tr>;
        })}</tbody>
      </table>
      {finished && <p>平均等待 {results.averageWaiting.toFixed(2)} · 进程切换 {results.switches} 次</p>}
    </section>
  </div>;
}

const nodes = { A: [55, 102], B: [210, 43], C: [210, 161], D: [365, 102] } as const;
type NodeId = keyof typeof nodes;

export function NetworkReplay({ config, results }: { config: NetworkConfig; results?: ReturnType<typeof networkEngine.run> }) {
  const replay = useReplay(results?.events.length ?? 0, 460);
  const events = results?.events.slice(0, replay.step) ?? [];
  const event = events.at(-1);
  const delivered = events.filter(({ state }) => state === "delivered").length;
  const dropped = events.filter(({ state }) => state === "dropped").length;
  return <div className="simulation-view" aria-label="网络传输拓扑">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>{results ? `A → ${results.route[0][1]} → D` : "双路由拓扑"}</h3>
      <svg className="simulation-network" viewBox="0 0 420 204" role="img" aria-label="从 A 到 D 的两条链路">
        {networkLinks.map((link) => {
          const [from, to] = [...link] as [NodeId, NodeId];
          const [x1, y1] = nodes[from];
          const [x2, y2] = nodes[to];
          return <g key={link} data-active={results?.route.includes(link)}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + (from === "C" || to === "C" ? 21 : -11)} textAnchor="middle">{config.links[link].delay} ms / {config.links[link].loss}%</text>
          </g>;
        })}
        {Object.entries(nodes).map(([node, [x, y]]) => <g key={node} className="simulation-node">
          <circle cx={x} cy={y} r="20" /><text x={x} y={y + 5} textAnchor="middle">{node}</text>
        </g>)}
        {event && (() => {
          const [from, to] = [...event.link] as [NodeId, NodeId];
          const [x, y] = nodes[from];
          const [endX, endY] = nodes[to];
          const progress = event.state === "dropped" ? .55 : .88;
          return <circle key={replay.step} className="simulation-packet" data-dropped={event.state === "dropped"}
            cx={x + (endX - x) * progress} cy={y + (endY - y) * progress} r="7"
            style={{ "--packet-offset": `${(x - endX) * progress}px`, "--packet-rise": `${(y - endY) * progress}px` } as React.CSSProperties} />;
        })()}
      </svg>
      <p>{event ? `包 ${event.packet} · ${event.link} · ${event.state === "dropped" ? "丢失" : event.state === "delivered" ? "送达" : "转发"} · ${event.at} ms` : "按总延迟选择路径。"}</p>
      <p>{results ? `送达 ${delivered} · 丢失 ${dropped} · 总计 ${config.packets} 包` : `待发送 ${config.packets} 包`}</p>
      {results && replay.step === replay.length && <p>丢包率 {(results.lossRate * 100).toFixed(1)}% · 平均延迟 {results.averageLatency === null ? "无送达" : `${results.averageLatency.toFixed(1)} ms`}</p>}
      <p className="simulation-caption">逐包模拟。链路独立丢包。</p>
    </section>
  </div>;
}
