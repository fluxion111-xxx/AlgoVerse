import { registeredEngines, type EngineId } from "./experimentEngines";
import type { CurriculumLabId } from "./experiments/curriculumLabs";

type Observation = { metrics: string; comparison?: string };

// 描述一轮实验实际计算的指标，以及能在同一轮验证的对比。
const existingObservations: Record<Exclude<EngineId, CurriculumLabId>, Observation> = {
  pathfinding: { metrics: "访问节点、路径长度、耗时", comparison: "同一地图上的 Dijkstra 与 A*" },
  sorting: { metrics: "比较次数、交换次数、排序结果", comparison: "同一序列上的冒泡排序与快速排序" },
  "cpu-scheduling": { metrics: "等待、周转、响应时间、进程切换" },
  "network-transmission": { metrics: "路由、送达、丢包、延迟" },
  "memory-visualization": { metrics: "阶乘结果、最大栈深、调用次数" },
  "b-plus-tree": { metrics: "树高、分裂次数、访问节点、命中键" },
  "knn-classification": { metrics: "分类结果、邻居距离、投票" },
  "page-replacement": { metrics: "缺页次数、页命中次数", comparison: "相同页序列上的 FIFO、LRU 与 OPT" },
  "hash-collisions": { metrics: "检查次数、冲突、满表失败", comparison: "同一组操作下的链地址与线性探测" },
  "k-means": { metrics: "迭代轮次、簇大小、簇内平方距离和" },
  "gradient-descent": { metrics: "执行步数、损失变化、最终位置" },
  "tree-traversal": { metrics: "访问顺序、节点数", comparison: "同一树上的先序、中序、后序与层序" },
  "graph-traversal": { metrics: "访问顺序、不可达顶点", comparison: "同一无权图上的 BFS 与 DFS" },
  "deadlock-avoidance": { metrics: "原状态、请求决策、安全序列" },
  "tcp-congestion": { metrics: "拥塞窗口、慢启动阈值、重传" },
  "dynamic-routing": { metrics: "变更前后路径、路由成本", comparison: "单次链路变更前后的路由" },
  "memory-allocation": { metrics: "分配失败次数、空块、碎片", comparison: "同一堆上的首次适配与最佳适配" },
  "transaction-concurrency": { metrics: "提交值、写冲突、读取记录", comparison: "同一调度下的语句级已提交读取与事务级快照" },
};

export const creatorCapabilities = registeredEngines.map((engine) => {
  const { id, version, domain, creator } = engine;
  const observation = "curriculum" in engine
    ? { metrics: Object.values(engine.curriculum.metricLabels).join("、"), comparison: engine.curriculum.comparison }
    : existingObservations[engine.id];
  return { id, version, domain, ...creator, ...observation };
});

export const creatorObservations = Object.fromEntries(creatorCapabilities.map(({ id, metrics, comparison }) =>
  [id, { metrics, comparison }])) as Record<EngineId, Observation>;
