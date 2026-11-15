import { knnEngine } from "@/lib/experiments/knn";
import type { Model } from "./teachingModels";

const rounded = (value: number, digits = 2) => Number(value.toFixed(digits));
const percentage = (part: number, whole: number) => whole ? `${rounded(part * 100 / whole)}%` : "未定义";
const zCritical = { 90: 1.6448536269514722, 95: 1.959963984540054, 99: 2.5758293035489004 } as const;
const samples = [{ x: 3, y: 0, label: "A" }, { x: 2, y: 2, label: "B" }] as const;

export const analysisCaseModels = {
  "divide-recurrence-levels": {
    title: "按层数节点和合并成本",
    fields: [
      { label: "二分层数 k", initial: 3, min: 0, max: 8 },
      { label: "每个节点的合并成本", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "线性 m" }, { value: 1, label: "平方 m²" },
      ] },
    ],
    evaluate: ([depth, quadratic]) => {
      const size = 2 ** depth;
      const rows = Array.from({ length: depth + 1 }, (_, level) => {
        const nodes = 2 ** level;
        const subproblem = size / nodes;
        const cost = subproblem ** (quadratic ? 2 : 1);
        return [level, nodes, subproblem, cost, nodes * cost];
      });
      const total = rows.reduce((sum, row) => sum + row[4], 0);
      return {
        caption: `n = ${size}。叶子 ${size} 个。总成本 ${total}。`,
        columns: ["层", "节点数", "单个规模 m", "单点成本", "本层总量"], rows,
      };
    },
  },
  "reclaim-evidence-window": {
    title: "把回收、复访与停顿对齐",
    fields: [
      { label: "观测秒数", initial: 10, min: 1, max: 60 },
      { label: "扫描页增量", initial: 400, min: 0, max: 2000 },
      { label: "回收页增量", initial: 100, min: 0, max: 2000 },
      { label: "复访页增量", initial: 60, min: 0, max: 1000 },
      { label: "some 停顿增量（毫秒）", initial: 1200, min: 0, max: 60000 },
    ],
    evaluate: ([seconds, scan, reclaimed, refaults, stalled]) => {
      const columns = ["指标", "参考窗口（20 秒）", "当前窗口"];
      if (stalled > seconds * 1000) return { caption: "同一窗口的停顿时间不能超过窗口长度。", columns, rows: [] };
      const stallRatio = percentage(stalled, seconds * 1000);
      const refaultRate = rounded(refaults / seconds);
      return {
        caption: `当前复访 ${refaultRate} 页/秒。some 停顿占 ${stallRatio}。`,
        columns,
        rows: [["每秒扫描页", 40, rounded(scan / seconds)], ["每秒回收页", 10, rounded(reclaimed / seconds)],
          ["回收/扫描", "25%", percentage(reclaimed, scan)], ["每秒复访页", 2, refaultRate],
          ["some 停顿占比", "2%", stallRatio]],
      };
    },
  },
  "capture-drop-vantage": {
    title: "让同一个缺口来自不同环节",
    fields: [
      { label: "案例来源", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "链路丢失" }, { value: 1, label: "下游采集缓冲满" },
      ] },
      { label: "查看记录", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "仅下游文件" }, { value: 1, label: "双端文件加统计" },
      ] },
    ],
    evaluate: ([cause, evidence]) => {
      const records = [1, 2, 3, 4];
      const downstream = records.filter((id) => id !== 2);
      return evidence ? {
        caption: `下游文件少第 2 号。此案例缓冲丢帧增量 ${cause}。`,
        columns: ["证据", "观测结果"],
        rows: [["上游文件", records.join("、")], ["下游文件", downstream.join("、")], ["下游 ps_drop 增量", cause],
          ["下游采集前独立观察点是否见 2", cause ? "见到" : "未见到"]],
      } : {
        caption: "下游文件少第 2 号。单凭该文件无法定位。",
        columns: ["证据", "观测结果"],
        rows: [["下游文件", downstream.join("、")]],
      };
    },
  },
  "dead-code-observations": {
    title: "分别检查值的用途和副作用",
    fields: [
      { label: "常量分支", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "永不进入" }, { value: 1, label: "总会进入" },
      ] },
      { label: "写入目标", initial: 1, min: 0, max: 1, choices: [
        { value: 0, label: "无后续读取的局部量" }, { value: 1, label: "volatile 对象" },
      ] },
      { label: "返回表达式", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "常量 0" }, { value: 1, label: "scratch" },
      ] },
    ],
    evaluate: ([branch, volatileStore, used]) => ({
      caption: `输出 ${branch ? "extra、ready" : "ready"}。返回 ${used ? 5 : 0}。`,
      columns: ["操作", "必要的行为", "依据"],
      rows: [
        ["scratch = 2 + 3", used ? "返回值依赖它，可直接折为 5" : "可删", used ? "返回需要这个值" : "纯计算且值未用"],
        ["分支内 puts(\"extra\")", branch ? "保留输出" : "可删", branch ? "可达的输出" : "分支不可达"],
        ["目标 = 7", volatileStore ? "保留访问" : "可删", volatileStore ? "volatile 访问可观察" : "局部值不再用"],
        ["puts(\"ready\")", "保留输出", "有可观察的输出"],
      ],
    }),
  },
  "columnar-scan-budget": {
    title: "算出投影实际涉及的原始字节",
    fields: [
      { label: "记录行数", initial: 1000, min: 1, max: 100000 },
      { label: "每行附注字节数", initial: 120, min: 0, max: 1000 },
      { label: "查询所需字段", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "日期过滤和金额聚合" }, { value: 1, label: "整行读取" },
      ] },
    ],
    evaluate: ([rows, payload, all]) => {
      const totalWidth = 4 + 4 + 8 + payload;
      const selectedWidth = all ? totalWidth : 4 + 8;
      const before = rows * totalWidth;
      const after = rows * selectedWidth;
      return {
        caption: `行式全扫 ${before} 字节。列式读取所需字段 ${after} 字节。`,
        columns: ["字段或合计", "行式字节", "列式字节"],
        rows: [["客户 ID（每行）", 4, all ? 4 : 0], ["日期（每行）", 4, 4], ["金额（每行）", 8, 8],
          ["附注（每行）", payload, all ? payload : 0], ["每行合计", totalWidth, selectedWidth], ["扫描合计", before, after]],
      };
    },
  },
  "knn-metric-neighbor": {
    title: "切换距离，重排两个邻居",
    fields: [
      { label: "距离度量", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "欧氏距离" }, { value: 1, label: "曼哈顿距离" },
      ] },
      { label: "查询点 x", initial: 0, min: 0, max: 10 },
      { label: "查询点 y", initial: 0, min: 0, max: 10 },
    ],
    evaluate: ([metric, x, y]) => {
      const result = knnEngine.run({
        goalLabel: "比较距离度量对最近邻的影响。", k: samples.length, metric: metric === 0 ? "euclidean" : "manhattan",
        samples: [...samples], query: { x, y },
      });
      return {
        caption: `最近的是 ${result.neighbors[0].label}。K = 1 时选对应类别。`,
        columns: ["名次", "样本", "坐标", "距离"],
        rows: result.neighbors.map(({ index, label, distance }, rank) =>
          [rank + 1, label, `(${samples[index].x}, ${samples[index].y})`, rounded(distance, 3)]),
      };
    },
  },
  "known-sigma-z-interval": {
    title: "调样本量或置信水平看半宽",
    fields: [
      { label: "样本均值", initial: 50, min: -100, max: 100 },
      { label: "已知总体标准差", initial: 10, min: 1, max: 100 },
      { label: "样本量", initial: 25, min: 1, max: 1000 },
      { label: "置信水平（%）", initial: 95, min: 90, max: 99,
        choices: [90, 95, 99].map((value) => ({ value, label: `${value}%` })) },
    ],
    evaluate: ([mean, sigma, size, confidence]) => {
      const critical = zCritical[confidence as keyof typeof zCritical];
      const error = sigma / Math.sqrt(size);
      const halfWidth = critical * error;
      return {
        caption: `${confidence}% 区间 [${rounded(mean - halfWidth)}, ${rounded(mean + halfWidth)}]。半宽 ${rounded(halfWidth)}。`,
        columns: ["环节", "数值"],
        rows: [["样本均值", mean], ["标准误", rounded(error, 4)], ["正态临界值", rounded(critical, 4)], ["半宽", rounded(halfWidth)]],
      };
    },
  },
} satisfies Record<string, Model>;
