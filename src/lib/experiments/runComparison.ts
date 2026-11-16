import type { AgentRun } from "../experimentAgent";
import { getCurriculumLab, type CurriculumLabId } from "./curriculumLabs";
import { evidenceLabels } from "./evidence";

export type ComparisonRun = Pick<AgentRun, "id" | "tool" | "version" | "config" | "metrics"> & { round?: number };

function sortingSeries(run: ComparisonRun) {
  return run.tool === "sorting" && "values" in run.config ? run.config.values : null;
}

function sortingCounts(value: string | undefined) {
  const pair = value?.match(/^(\d+) \/ (\d+)$/);
  return pair ? [Number(pair[1]), Number(pair[2])] : [];
}

function quickSummary(metrics: Record<string, string>[], key: "comparisons" | "swaps", action: string) {
  const differences = metrics.flatMap((entry) => {
    const [bubble, quick] = sortingCounts(entry[key]);
    return bubble === undefined || quick === undefined ? [] : [bubble - quick];
  });
  if (differences.length !== metrics.length) return "";
  if (differences.every((gap) => gap === 0)) return `各轮${action}次数都打平。`;
  if (differences.every((gap) => gap > 0)) return `各轮快排${action}都更少。`;
  if (differences.every((gap) => gap < 0)) return `各轮冒泡${action}都更少。`;
  const quick = differences.filter((gap) => gap > 0).length;
  const tied = differences.filter((gap) => gap === 0).length;
  return `${action}次数各轮各有输赢。快排较少 ${quick} 轮。冒泡较少 ${differences.length - quick - tied} 轮。打平 ${tied} 轮。`;
}

function sortingChange(before: number[], after: number[]) {
  if (before.length !== after.length) return `样本从 ${before.length} 项变为 ${after.length} 项。输入规模和内容都变了。两项影响要分开测。`;
  if (before.every((value, index) => value === after[index])) return "输入序列相同。";
  const sortedAfter = [...after].sort((a, b) => a - b);
  return [...before].sort((a, b) => a - b).every((value, index) => value === sortedAfter[index])
    ? "只调整了输入顺序。" : `样本仍有 ${after.length} 项。输入数值有变化。`;
}

function countChange(before: string | undefined, after: string | undefined, action: string) {
  const old = sortingCounts(before);
  const current = sortingCounts(after);
  if (old.length !== 2 || current.length !== 2) return "";
  return ["冒泡", "快排"].map((algorithm, index) => {
    const delta = current[index] - old[index];
    return `${algorithm}${action}${delta === 0 ? "次数相同" : `${delta < 0 ? "少" : "多"} ${Math.abs(delta)} 次`}。`;
  }).join("");
}

export const parameterLabels: Readonly<Record<string, string>> = {
  walls: "障碍布局", start: "起点", goal: "终点", policy: "调度策略", quantum: "时间片", processes: "进程配置",
  packets: "发包量", links: "链路设置", seed: "模拟种子", factorialInput: "阶乘输入", order: "节点阶数", keys: "插入序列",
  lower: "查询下界", upper: "查询上界", k: "邻居数", metric: "距离算法", samples: "样本", query: "待分类点",
  frameCount: "页框数", references: "页号序列", capacity: "槽数", operations: "操作序列", points: "样本点",
  initialCenters: "初始中心", maxIterations: "轮数上限", target: "目标位置", curvature: "曲率", learningRate: "学习率",
  maxSteps: "步数上限", nodes: "树结构", vertexCount: "顶点数", startVertex: "起点", directed: "边的方向规则", edges: "连边",
  available: "可用资源", allocation: "已分配资源", maximum: "需求上限", process: "请求进程", request: "请求量",
  initialWindow: "初始窗口", initialThreshold: "初始阈值", signals: "信号序列", routerCount: "路由器数", source: "源路由器",
  destination: "目标路由器", topology: "拓扑", changedLink: "变更链路", newCost: "新链路成本", heapSize: "堆大小",
  commands: "分配与释放顺序", initialRows: "初始数据", schedule: "事务操作顺序",
};

const focusMetrics: Partial<Record<ComparisonRun["tool"], string>> & Record<Exclude<ComparisonRun["tool"], CurriculumLabId>, string> = {
  pathfinding: "visited", sorting: "comparisons", "cpu-scheduling": "waiting", "network-transmission": "delivered",
  "memory-visualization": "stackDepth", "b-plus-tree": "splits", "knn-classification": "prediction", "page-replacement": "pageFaults",
  "hash-collisions": "hashChecks", "k-means": "squaredError", "gradient-descent": "lossChange", "tree-traversal": "treeOrder",
  "graph-traversal": "unreachable", "deadlock-avoidance": "bankDecision", "tcp-congestion": "finalWindow", "dynamic-routing": "routeCostChange",
  "memory-allocation": "allocationFailures", "transaction-concurrency": "writeConflicts",
};

const seriesLabels: Record<string, string[]> = {
  visited: ["Dijkstra", "A*"], pathLength: ["Dijkstra", "A*"], elapsedMs: ["Dijkstra", "A*"],
  hashChecks: ["链地址", "线性探测"], hashConflicts: ["链地址", "线性探测"], allocationFailures: ["首次适配", "最佳适配"],
  largestFree: ["首次适配", "最佳适配"], fragmentedFree: ["首次适配", "最佳适配"], writeConflicts: ["读已提交", "快照"],
  pageFaults: ["FIFO", "LRU", "OPT"], pageHits: ["FIFO", "LRU", "OPT"],
};

function numericChange(previous: string, value: string, unit = "") {
  const scalar = /^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:\s*(%|ms|MSS))?$/i;
  const left = previous.match(scalar);
  const right = value.match(scalar);
  if (!left || !right || (left[2] && right[2] && left[2] !== right[2])) return null;
  const delta = Number((Number(right[1]) - Number(left[1])).toPrecision(8));
  if (!Number.isFinite(delta)) return null;
  const suffix = (right[2] ?? left[2] ?? unit).replace("%", "百分点");
  return delta === 0 ? null : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}${suffix ? ` ${suffix}` : ""}`;
}

function metricDeltas(key: string, previous: string, value: string) {
  const labels = seriesLabels[key];
  if (!labels) {
    const delta = numericChange(previous, value);
    return delta ? [delta] : [];
  }
  const before = previous.split(" / ");
  const after = value.split(" / ");
  if (before.length !== labels.length || after.length !== labels.length) return [];
  return labels.flatMap((label, index) => {
    const prefix = `${label} `;
    const delta = numericChange(before[index].replace(prefix, ""), after[index].replace(prefix, ""), key === "elapsedMs" ? "ms" : "");
    return delta ? [`${label} ${delta}`] : [];
  });
}

function changedParameters(before: ComparisonRun, after: ComparisonRun) {
  const previous = before.config as Record<string, unknown>;
  const labFields = getCurriculumLab(after.tool)?.curriculum.fields;
  return Object.entries(after.config).flatMap(([key, value]) => {
    const label = labFields?.find(([name]) => name === key)?.[1].label ?? parameterLabels[key];
    if (!label || (after.tool === "pathfinding" && key === "seed") || JSON.stringify(previous[key]) === JSON.stringify(value)) return [];
    if (key === "walls" && "walls" in before.config && "walls" in after.config &&
      before.config.walls.length === after.config.walls.length && before.config.walls.every((cell) => (value as number[]).includes(cell))) return [];
    return [{ label, previous: previous[key], value }];
  });
}

function otherChanges(before: ComparisonRun, after: ComparisonRun) {
  const parameters = changedParameters(before, after);
  const comparable = Object.entries(after.metrics).filter(([key]) => before.metrics[key] !== undefined);
  const metrics = comparable.flatMap(([key, value]) => {
    const previous = before.metrics[key];
    return previous !== value ? [{ key, label: evidenceLabels[key] ?? key, previous, value,
      deltas: metricDeltas(key, previous, value) }] : [];
  });
  const focus = getCurriculumLab(after.tool)?.curriculum.focusMetric;
  const stableFocus = focus && before.metrics[focus] !== undefined && before.metrics[focus] === after.metrics[focus];
  const inputNote = parameters.length === 1 ? `只改了${parameters[0].label}。` :
    parameters.length ? `改了 ${parameters.length} 项参数。` : "两轮使用相同输入。";
  const stableCount = comparable.length - metrics.length;
  return {
    detail: inputNote + (metrics.length ? `有 ${metrics.length} 项指标变化。` : "共同记录的指标相同。") +
      (focus && metrics.length && stableCount ? `另有 ${stableCount} 项相同。` : "") +
      (stableFocus && metrics.length ? `${evidenceLabels[focus]}仍为 ${after.metrics[focus]}。` : "") +
      (parameters.length > 1 ? "各项影响要分开复测。" : after.tool === "pathfinding" && metrics.some(({ key }) => key === "elapsedMs") ? "单次耗时会有波动。" : ""),
    parameters,
    metrics,
  };
}

export function experimentRunComparison(runs: readonly ComparisonRun[], tool: ComparisonRun["tool"], version: number) {
  const rounds = runs.map((run, index) => ({ ...run, round: run.round ?? index + 1, input: sortingSeries(run) }))
    .filter((run) => run.tool === tool && run.version === version);
  const keys = [...new Set(rounds.flatMap(({ metrics }) => Object.keys(metrics)))];
  const metrics = rounds.map((run) => run.metrics);
  const sorting = tool === "sorting" && rounds.length > 0 && rounds.every(({ input }) => input !== null);
  const changes = rounds.slice(1).map((after, index) => {
    const before = rounds[index];
    const notes = before.input && after.input ? {
      detail: sortingChange(before.input, after.input) + countChange(before.metrics.comparisons, after.metrics.comparisons, "比较") +
        countChange(before.metrics.swaps, after.metrics.swaps, "交换"),
      metrics: [], parameters: [],
    } : otherChanges(before, after);
    return { from: before.round, to: after.round, ...notes };
  });
  const focusMetric = getCurriculumLab(tool)?.curriculum.focusMetric ?? focusMetrics[tool];
  const focus = changes.findLast(({ metrics }) => metrics.some(({ key }) => key === focusMetric));
  const focusedMetric = focus?.metrics.find(({ key }) => key === focusMetric);
  const changedCount = new Set(changes.flatMap(({ metrics }) => metrics.map(({ key }) => key))).size;
  const headline = focusedMetric && (focusedMetric.deltas.length === 1 && /^[+−]/.test(focusedMetric.deltas[0])
    ? `${focusedMetric.label}${focusedMetric.deltas[0][0] === "+" ? "增加" : "减少"} ${focusedMetric.deltas[0].slice(1)}。`
    : `${focusedMetric.label}有变化。${focusedMetric.deltas.map((delta) => `${delta}。`).join("")}`);
  const conclusion = (sorting && (quickSummary(metrics, "comparisons", "比较") + quickSummary(metrics, "swaps", "交换"))) ||
    `共对照 ${rounds.length} 轮。${focus ? `第 ${focus.from} → ${focus.to} 轮。${headline}` :
      changedCount ? `有 ${changedCount} 项指标变化。` : "实测指标相同。"}`;
  return { rounds, keys, sorting, conclusion, changes };
}
