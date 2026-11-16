import type { EngineId, ExperimentConfig, ExperimentResults } from "../experimentEngines";
import { evidenceLabels, experimentEvidence } from "./evidence";

const followUps: Record<EngineId, Record<string, string>> = {
  pathfinding: { obstacles: "调整障碍密度，比较访问节点数。", endpoints: "移动起点或终点，再比路径长度。" },
  sorting: { order: "保持数值不变。只改输入顺序。各试升序和倒序。再比比较与交换。", duplicates: "固定序列长度。用重复值替换几项。再比比较与交换。" },
  "cpu-scheduling": { policy: "保持进程不变，切换调度策略。再看等待时间。", arrivals: "只改到达时刻，再看响应时间。" },
  "network-transmission": { delay: "调整一条链路的延迟，再看选路。", loss: "只改一条链路的丢包率，比较送达数。" },
  "memory-visualization": { depth: "换个阶乘输入，再看栈深和调用次数。" },
  "b-plus-tree": { capacity: "改变节点容量，再比树高与分裂次数。", bounds: "改变查询区间，再看命中键。" },
  "knn-classification": { neighbors: "调整邻居数，再看投票。", distance: "切换距离算法，再看邻居顺序。" },
  "page-replacement": { frames: "保持页号序列不变，调整页框数。再比缺页次数。", references: "改访问次序，再比命中次数。" },
  "hash-collisions": { capacity: "改变表容量，再比冲突次数。", order: "改变插入顺序，再比探测次数。" },
  "k-means": { centers: "改变初始中心，再比簇内平方距离和。" },
  "gradient-descent": { rate: "只改学习率，再看损失变化。", start: "改变起点，再看最终位置。" },
  "tree-traversal": { tree: "挪动一个叶节点，再比遍历顺序。" },
  "graph-traversal": { start: "换起点，再比两种遍历顺序。" },
  "deadlock-avoidance": { request: "调整请求量，再看是否有安全序列。" },
  "tcp-congestion": { signals: "调整确认或超时信号，再看拥塞窗口。" },
  "dynamic-routing": { cost: "只改链路的新成本，再比变更前后路径。" },
  "memory-allocation": { heap: "只改堆大小，再比分配失败次数。" },
  "transaction-concurrency": { order: "调整操作交错顺序，再比读取与写冲突。" },
};

const engineNotes: Record<EngineId, string> = {
  pathfinding: "两种搜索在同一张地图上运行。",
  sorting: "冒泡比较相邻项。快排用末项作基准。",
  "cpu-scheduling": "等待是周转时间减去运行时间。",
  "network-transmission": "模型先按延迟选路。送达和丢包来自该路径。",
  "memory-visualization": "每次递归调用先压栈，再逐层返回。",
  "b-plus-tree": "先沿索引找到下界，再沿叶节点查范围。",
  "knn-classification": "模型按距离选邻居，再用类别投票。",
  "page-replacement": "缺页时，策略决定换出哪一页。",
  "hash-collisions": "两种冲突处理使用相同的操作序列。",
  "k-means": "样本按最近中心分组，中心按簇内均值更新。",
  "gradient-descent": "每步按梯度和学习率更新位置。",
  "tree-traversal": "不同遍历方式访问根节点的时机不同。",
  "graph-traversal": "BFS 按层走。DFS 沿分支深入。",
  "deadlock-avoidance": "安全序列要求剩余资源能让进程依次完成。",
  "tcp-congestion": "拥塞窗口随确认或丢包信号变化。",
  "dynamic-routing": "两次选路分别使用变更前后的链路成本。",
  "memory-allocation": "首次适配取首个够大的空块。最佳适配取最小的合适空块。",
  "transaction-concurrency": "两种隔离级别对同一操作序列分别计算。",
};

function compare(left: number, right: number, leftLabel: string, rightLabel: string, metric: string) {
  if (left === right) return `${leftLabel}与${rightLabel}的${metric}相同。`;
  return `${left > right ? leftLabel : rightLabel}的${metric}更多。`;
}

function measuredComparisons(results: ExperimentResults) {
  if ("dijkstra" in results) {
    const { dijkstra, astar } = results;
    const pathLength = dijkstra.pathLength !== null && astar.pathLength !== null
      && dijkstra.pathLength.toFixed(2) === astar.pathLength.toFixed(2)
      ? "Dijkstra 与 A* 的显示路径长度相同。" : undefined;
    return {
      visited: compare(dijkstra.visited.length, astar.visited.length, "Dijkstra", "A*", "访问节点数"),
      pathLength,
    };
  }
  if (results.kind === "sorting") return {
    comparisons: compare(results.bubble.comparisons, results.quick.comparisons, "冒泡排序", "快速排序", "比较次数"),
    swaps: compare(results.bubble.swaps, results.quick.swaps, "冒泡排序", "快速排序", "交换次数"),
  };
  return {};
}

function schedulingNote(config: ExperimentConfig, results: ExperimentResults, metric: string) {
  if ("dijkstra" in results || results.kind !== "cpu-scheduling" || !("processes" in config)) return undefined;
  const times = metric === "waiting" ? results.processes.map(({ process, waiting }) => `P${process + 1} 等待 ${waiting}`).join("，") : "";
  const context = config.policy === "rr"
    ? `时间片为 ${config.quantum}。运行时长超过它的进程有 ${config.processes.filter(({ burst }) => burst > config.quantum).length} 个。`
    : "本轮使用先来先服务。";
  const meaning: Record<string, string> = {
    waiting: `${times}。以上取平均。`, turnaround: "周转时间从到达算到完成。",
    response: "响应时间从到达算到首次运行。", switches: "切换次数只统计相邻的不同进程。",
  };
  return `${meaning[metric] ?? ""}${context}`;
}

export function diagnosisChoices(engineId: EngineId, config: ExperimentConfig, results: ExperimentResults) {
  const evidence = experimentEvidence(results);
  const comparisons: Record<string, string | undefined> = measuredComparisons(results);
  const steps = { ...followUps[engineId] };
  if (engineId === "cpu-scheduling" && "processes" in config && config.policy === "rr") {
    steps.quantum = "保持进程不变，只改时间片。再看等待和响应。";
  }
  return {
    observations: Object.entries(evidence).map(([id, value]) => ({
      id, value, label: evidenceLabels[id] ?? id,
      conclusion: `${comparisons[id] ?? ""}本轮${evidenceLabels[id] ?? id}为 ${value}。`,
      explanation: schedulingNote(config, results, id) ?? engineNotes[engineId],
    })),
    steps: Object.entries(steps).map(([id, suggestion]) => ({ id, suggestion })),
  };
}
