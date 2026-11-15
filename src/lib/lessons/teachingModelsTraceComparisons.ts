import { knnEngine } from "@/lib/experiments/knn";
import { networkEngine } from "@/lib/experiments/network";
import { pagePolicies, pageReplacementEngine } from "@/lib/experiments/pageReplacement";
import type { Model } from "./teachingModels";

const displayNumber = (value: number, precision = 2) => Number(value.toFixed(precision));
const tCritical = { 2: 12.7062047364, 5: 2.7764451052, 10: 2.2621571629, 25: 2.0638985616 } as const;
const queryTraces = [[7, 8, 7, 9, 7, 8], [7, 8, 9, 10, 11, 12]] as const;

export const traceComparisonModels = {
  "master-balanced-levels": {
    title: "对照节点增长和单点缩小",
    fields: [
      { label: "规模除数 b", initial: 3, min: 2, max: 3 },
      { label: "单点代价的指数 d", initial: 2, min: 1, max: 2 },
      { label: "分割层数 k", initial: 3, min: 0, max: 5 },
      { label: "子问题数 a 与 bᵈ 的关系", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "相等" }, { value: 1, label: "a 小 1" }, { value: 2, label: "a 大 1" },
      ] },
    ],
    evaluate: ([divisor, power, depth, branch]) => {
      const balanced = divisor ** power;
      const children = balanced + [0, -1, 1][branch];
      const n = divisor ** depth;
      const rows = Array.from({ length: depth + 1 }, (_, level) => {
        const nodes = children ** level;
        const size = divisor ** (depth - level);
        const cost = size ** power;
        return [level, nodes, size, cost, nodes * cost];
      });
      const total = rows.reduce((sum, row) => sum + row[4], 0);
      return {
        caption: `n = ${n}，a = ${children}，层间比 ${children}/${balanced}。总成本 ${total}。`,
        columns: ["层", "节点数", "单点规模", "单点成本", "本层成本"], rows,
      };
    },
  },
  "cgroup-high-thresholds": {
    title: "看拟用量跨过哪道线",
    fields: [
      { label: "本次拟用量（MiB）", initial: 900, min: 0, max: 2000 },
      { label: "memory.high（MiB）", initial: 800, min: 1, max: 2000 },
      { label: "memory.max（MiB）", initial: 1000, min: 1, max: 2000 },
      { label: "假定回收量（MiB）", initial: 80, min: 0, max: 2000 },
    ],
    evaluate: ([usage, high, max, reclaim]) => {
      const columns = ["阶段", "用量（MiB）", "范围"];
      if (high > max || reclaim > usage) {
        return { caption: high > max ? "本例要求 high 不高于 max。" : "假定回收量不能超过拟用量。", columns, rows: [] };
      }
      const after = usage - reclaim;
      const range = (current: number) => current > max ? "超过 max" : current > high ? "仅超过 high" : "未超过 high";
      return {
        caption: `起点${range(usage)}。假定回收后剩 ${after} MiB，${range(after)}。`,
        columns,
        rows: [["回收前的拟用量", usage, range(usage)], ["回收后估算", after, range(after)]],
      };
    },
  },
  "network-hop-crosscheck": {
    title: "按包号对照两跳事件",
    fields: [
      { label: "包数", initial: 3, min: 1, max: 8 },
      { label: "AB 丢包率（%）", initial: 0, min: 0, max: 100 },
      { label: "BD 丢包率（%）", initial: 100, min: 0, max: 100 },
      { label: "AB 延迟（毫秒）", initial: 10, min: 1, max: 60 },
    ],
    evaluate: ([packets, abLoss, bdLoss, abDelay]) => {
      const preset = networkEngine.preset(101);
      const result = networkEngine.run({
        ...preset,
        packets,
        links: {
          ...preset.links,
          AB: { delay: abDelay, loss: abLoss },
          BD: { ...preset.links.BD, loss: bdLoss },
        },
      });
      const rows = Array.from({ length: packets }, (_, index) => {
        const number = index + 1;
        return [number, ...result.route.map((link) => {
          const event = result.events.find((entry) => entry.packet === number && entry.link === link);
          if (!event) return "未到达本跳";
          const state = { forwarded: "转发", delivered: "送达", dropped: "丢弃" }[event.state];
          return `${state} · ${event.at} ms`;
        })];
      });
      return {
        caption: `路径 ${result.route.join(" → ")}。送达 ${result.delivered}/${packets}。`,
        columns: ["包号", ...result.route], rows,
      };
    },
  },
  "liveness-diamond": {
    title: "从返回点向前推活跃值",
    fields: [
      { label: "末块返回表达式", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "x" }, { value: 1, label: "y" }, { value: 2, label: "x + y" },
      ] },
    ],
    evaluate: ([terminal]) => {
      const returns = [["x"], ["y"], ["x", "y"]][terminal];
      const blocks = [
        { name: "A", instruction: "x = 1, y = 2；择 B 或 C", use: [], def: ["x", "y"], successors: [1, 2] },
        { name: "B", instruction: "x = y + 1", use: ["y"], def: ["x"], successors: [3] },
        { name: "C", instruction: "y = x + 1", use: ["x"], def: ["y"], successors: [3] },
        { name: "D", instruction: `return ${returns.join(" + ")}`, use: returns, def: [], successors: [] },
      ];
      const states: { in: string[]; out: string[] }[] = [];
      for (let i = blocks.length - 1; i >= 0; i--) {
        const { use, def, successors } = blocks[i];
        const out = [...new Set(successors.flatMap((next) => states[next].in))].sort();
        const input = [...new Set([...use, ...out.filter((name) => !def.includes(name))])].sort();
        states[i] = { in: input, out };
      }
      const label = (names: readonly string[]) => names.length ? `{${names.join(", ")}}` : "∅";
      return {
        caption: `D 读 ${label(returns)}。B 的入口活跃集为 ${label(states[1].in)}。`,
        columns: ["块", "操作", "入口活跃", "出口活跃"],
        rows: blocks.map(({ name, instruction }, i) => [name, instruction, label(states[i].in), label(states[i].out)]),
      };
    },
  },
  "database-buffer-pool": {
    title: "对照页命中、读入和换出",
    fields: [
      { label: "缓冲页框数", initial: 2, min: 1, max: 4 },
      { label: "引用序列", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "查询重复访问 7 和 8" }, { value: 1, label: "连续扫描 6 页" },
      ] },
    ],
    evaluate: ([frames, scenario]) => {
      const result = pageReplacementEngine.run({
        frameCount: frames, goalLabel: "对照缓冲池读取。", references: [...queryTraces[scenario]],
      });
      const lru = result.policies[pagePolicies.indexOf("LRU")];
      return {
        caption: `命中 ${lru.hits} 次。缓冲池需读入 ${lru.faults} 页次。`,
        columns: ["第几次", "请求页", "结果", "换出", "当前驻留页"],
        rows: lru.steps.map(({ page, hit, evicted, frames: resident }, i) => [
          i + 1, page, hit ? "命中" : "读入", evicted ?? "—", resident.map((value) => value ?? "空").join("、"),
        ]),
      };
    },
  },
  "knn-axis-scale": {
    title: "改特征尺度，再用同一规则找邻居",
    fields: [
      { label: "x 轴的数值倍率", initial: 1, min: 1, max: 5 },
      { label: "y 轴的数值倍率", initial: 1, min: 1, max: 2 },
    ],
    evaluate: ([xScale, yScale]) => {
      const samples = [{ x: 2 * xScale, y: 0, label: "A" }, { x: 0, y: 4 * yScale, label: "B" }] as const;
      const result = knnEngine.run({
        goalLabel: "比较同一个欧氏距离的尺度效应。", k: samples.length, metric: "euclidean",
        samples: [...samples], query: { x: 0, y: 0 },
      });
      return {
        caption: `仍用欧氏距离。最近样本为 ${result.neighbors[0].label}。`,
        columns: ["名次", "样本", "变换后坐标", "距离"],
        rows: result.neighbors.map(({ index, label, distance }, rank) =>
          [rank + 1, label, `(${samples[index].x}, ${samples[index].y})`, displayNumber(distance, 3)]),
      };
    },
  },
  "unknown-sigma-t-interval": {
    title: "从样本量取自由度及临界值",
    fields: [
      { label: "样本均值", initial: 50, min: -100, max: 100 },
      { label: "样本标准差", initial: 10, min: 1, max: 100 },
      { label: "样本量", initial: 5, min: 2, max: 25, choices: [2, 5, 10, 25].map((value) => ({ value, label: String(value) })) },
    ],
    evaluate: ([mean, sd, size]) => {
      const critical = tCritical[size as keyof typeof tCritical];
      const error = sd / Math.sqrt(size);
      const margin = critical * error;
      return {
        caption: `95% 区间 [${displayNumber(mean - margin)}, ${displayNumber(mean + margin)}]。半宽 ${displayNumber(margin)}。`,
        columns: ["环节", "数值"],
        rows: [["自由度", size - 1], ["估计标准误", displayNumber(error, 4)], ["t 临界值", displayNumber(critical, 4)],
          ["半宽", displayNumber(margin)]],
      };
    },
  },
} satisfies Record<string, Model>;
