import { experimentDomains } from "@/lib/experiments/engine";
import { networkLinks } from "@/lib/experiments/network";
import type { ExperimentConfig, ExperimentEngine } from "@/lib/experimentEngines";
import { PresetDetails } from "./PresetDetails";

export function ExperimentPlan({ engine, config, question }: { engine: ExperimentEngine; config: ExperimentConfig; question: string }) {
  if ("walls" in config) return <PresetDetails question={question} config={config} showDensity />;
  return <dl className="preset-details">
    <div><dt>实验问题</dt><dd>{question}</dd></div>
    <div><dt>领域</dt><dd>{experimentDomains[engine.domain]}</dd></div>
    <div><dt>目标</dt><dd>{config.goalLabel}</dd></div>
    {"values" in config && <>
      <div><dt>算法</dt><dd>冒泡排序、快速排序</dd></div>
      <div><dt>整数序列</dt><dd>{config.values.join("、")}</dd></div>
      <div><dt>观察指标</dt><dd>比较次数、交换次数</dd></div>
    </>}
    {"processes" in config && <>
      <div><dt>策略</dt><dd>{config.policy === "rr" ? `时间片轮转 · ${config.quantum}` : "先来先服务"}</dd></div>
      <div><dt>进程</dt><dd>{config.processes.map(({ arrival, burst }, index) => <p key={index}>P{index + 1} · 到达 {arrival} · 运行 {burst}</p>)}</dd></div>
      <div><dt>观察指标</dt><dd>等待、周转、响应时间</dd></div>
    </>}
    {"links" in config && <>
      <div><dt>数据包</dt><dd>{config.packets} 个</dd></div>
      <div><dt>链路</dt><dd>{networkLinks.map((link) => <p key={link}>{link} · {config.links[link].delay} ms · 丢包 {config.links[link].loss}%</p>)}</dd></div>
      <div><dt>观察指标</dt><dd>送达、丢包、延迟</dd></div>
    </>}
    {"factorialInput" in config && <>
      <div><dt>阶乘输入</dt><dd>{config.factorialInput}</dd></div>
      <div><dt>观察指标</dt><dd>返回值、栈深、调用次数</dd></div>
    </>}
    {"keys" in config && <>
      <div><dt>节点容量</dt><dd>{2 * config.order} 个键</dd></div>
      <div><dt>插入顺序</dt><dd>{config.keys.join("、")}</dd></div>
      <div><dt>查询区间</dt><dd>[{config.lower}, {config.upper}]</dd></div>
    </>}
    {"samples" in config && <>
      <div><dt>邻居数</dt><dd>{config.k}</dd></div>
      <div><dt>距离</dt><dd>{config.metric === "euclidean" ? "欧氏距离" : "曼哈顿距离"}</dd></div>
      <div><dt>待分类点</dt><dd>({config.query.x}, {config.query.y})</dd></div>
      <div><dt>样本</dt><dd>{config.samples.map(({ x, y, label }) => `(${x}, ${y}) ${label}`).join("、")}</dd></div>
    </>}
  </dl>;
}
