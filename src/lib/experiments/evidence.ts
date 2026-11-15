import type { ExperimentResults } from "../experimentEngines";

export function experimentEvidence(results: ExperimentResults): Record<string, string> {
  if ("dijkstra" in results) {
    const { dijkstra, astar } = results;
    return {
      visited: `${dijkstra.visited.length} / ${astar.visited.length}`,
      pathLength: `${dijkstra.pathLength?.toFixed(2) ?? "无路径"} / ${astar.pathLength?.toFixed(2) ?? "无路径"}`,
      elapsedMs: `${dijkstra.elapsedMs.toFixed(2)} / ${astar.elapsedMs.toFixed(2)} ms`,
    };
  }
  switch (results.kind) {
    case "sorting": return { comparisons: `${results.bubble.comparisons} / ${results.quick.comparisons}`,
      swaps: `${results.bubble.swaps} / ${results.quick.swaps}`, sorted: results.bubble.sorted.join("、") };
    case "cpu-scheduling": return { waiting: results.averageWaiting.toFixed(2), turnaround: results.averageTurnaround.toFixed(2),
      response: results.averageResponse.toFixed(2), switches: String(results.switches) };
    case "network-transmission": return { route: `A → ${results.route[0][1]} → D`, delivered: String(results.delivered),
      dropped: String(results.dropped), lossRate: `${(results.lossRate * 100).toFixed(1)}%`, latency: results.averageLatency === null ? "无送达" : `${results.averageLatency.toFixed(1)} ms` };
    case "memory-visualization": return { factorial: String(results.value), stackDepth: String(results.maxDepth), calls: String(results.calls) };
    case "b-plus-tree": return { treeHeight: String(results.height), splits: String(results.splits), visitedNodes: String(results.visitedCount),
      matches: results.matches.join("、") || "无匹配键" };
    case "knn-classification": return { prediction: results.prediction, votes: `A ${results.votes.A} / B ${results.votes.B}`,
      neighbors: results.neighbors.map(({ index, label, distance }) => `${index + 1} 号 ${label} · ${distance.toFixed(2)}`).join("、") };
    case "page-replacement": return {
      pageFaults: results.policies.map(({ policy, faults }) => `${policy} ${faults}`).join(" / "),
      pageHits: results.policies.map(({ policy, hits }) => `${policy} ${hits}`).join(" / "),
    };
    case "hash-collisions": return {
      hashChecks: `${results.chainingChecks} / ${results.probingChecks}`,
      hashConflicts: `${results.chainingConflicts} / ${results.probingConflicts}`,
      fullInsertions: String(results.fullInsertions),
    };
    case "k-means": return {
      iterations: String(results.steps.length), convergence: results.converged ? "中心不再变化" : "达到轮次上限",
      clusterSizes: results.final.sizes.join(" / "), squaredError: String(results.final.loss),
    };
    case "gradient-descent": return {
      iterations: String(results.steps.length), convergence: results.converged ? "梯度已接近零" : "达到步数上限",
      lossChange: `${results.initial.loss} → ${results.final.loss}`, finalPosition: String(results.final.position),
    };
    case "tree-traversal": return {
      treeOrder: results.traversals.map(({ order, values }) => `${({ preorder: "先序", inorder: "中序", postorder: "后序", level: "层序" })[order]} ${values.join(" → ")}`).join(" / "),
      treeNodes: String(results.traversals[0].steps.length),
    };
    case "graph-traversal": return {
      bfsOrder: results.bfs.map(({ vertex }) => vertex).join(" → "),
      dfsOrder: results.dfs.map(({ vertex }) => vertex).join(" → "),
      unreachable: results.unreachable.join("、") || "无",
    };
    case "deadlock-avoidance": return {
      initialSafety: results.initial.safe ? "安全" : "无安全序列",
      bankDecision: ({ grant: "批准", wait: "资源不足，等待", unsafe: "试分配不安全，撤销", "exceeds-need": "超出声明需求" })[results.decision],
      safeSequence: results.trial?.safe ? results.trial.sequence.map((p) => `P${p}`).join(" → ") : "无获批序列",
    };
    case "tcp-congestion": return {
      finalWindow: `${results.final.cwnd.toFixed(2)} MSS`, finalThreshold: `${results.final.threshold} MSS`,
      fastRetransmits: String(results.fastRetransmits), timeouts: String(results.timeouts),
    };
    case "dynamic-routing": return {
      pathBefore: results.before.destination.path.join(" → ") || "不可达",
      pathAfter: results.after.destination.path.join(" → ") || "不可达",
      routeCostChange: `${results.before.destination.cost ?? "不可达"} → ${results.after.destination.cost ?? "不可达"}`,
    };
    case "memory-allocation": return {
      allocationFailures: `${results.first.failures} / ${results.best.failures}`,
      largestFree: `${results.first.final.largest} / ${results.best.final.largest}`,
      fragmentedFree: `${results.first.final.fragmentedUnits} / ${results.best.final.fragmentedUnits}`,
    };
    case "transaction-concurrency": return {
      finalCommitted: `${results.readCommitted.committed.map(({ value }) => value).join(", ")} / ${results.snapshot.committed.map(({ value }) => value).join(", ")}`,
      writeConflicts: `${results.readCommitted.conflicts} / ${results.snapshot.conflicts}`,
      observedReads: [results.readCommitted, results.snapshot].map(({ steps }) => steps.flatMap(({ operation, read }) =>
        read ? [`${operation.tx} 读到 ${read.value}`] : []).join("、") || "无读取").join(" / "),
    };
  }
}

export const evidenceLabels: Record<string, string> = {
  visited: "访问节点", pathLength: "路径长度", elapsedMs: "耗时", comparisons: "比较次数", swaps: "交换次数", sorted: "排序结果",
  waiting: "平均等待", turnaround: "平均周转", response: "平均响应", switches: "进程切换", route: "所选路由", delivered: "送达", dropped: "丢包", lossRate: "实测丢包率", latency: "平均送达延迟",
  factorial: "阶乘结果", stackDepth: "最大栈深", calls: "调用次数", treeHeight: "树高（层）", splits: "分裂次数", visitedNodes: "查询访问节点", matches: "命中键",
  prediction: "分类结果", votes: "投票", neighbors: "邻居及距离",
  pageFaults: "缺页次数", pageHits: "页命中次数",
  hashChecks: "检查次数（链地址 / 探测）", hashConflicts: "插入遇到异键（链地址 / 探测）", fullInsertions: "探测因满表失败",
  iterations: "执行轮步数", convergence: "停止原因", clusterSizes: "各簇样本数", squaredError: "簇内平方距离和",
  lossChange: "初始 / 最终损失", finalPosition: "最终位置",
  treeOrder: "二叉树访问顺序", treeNodes: "树节点数", bfsOrder: "BFS 访问顺序", dfsOrder: "DFS 访问顺序", unreachable: "不可达顶点",
  initialSafety: "原状态", bankDecision: "请求决策", safeSequence: "试分配安全序列",
  finalWindow: "最终拥塞窗口", finalThreshold: "最终慢启动阈值", fastRetransmits: "快重传次数", timeouts: "超时次数",
  pathBefore: "原路径", pathAfter: "变更后路径", routeCostChange: "路径成本变化",
  allocationFailures: "空间分配失败（首次 / 最佳）", largestFree: "最大空块（首次 / 最佳）",
  fragmentedFree: "最大空块外的空闲量（首次 / 最佳）",
  finalCommitted: "最终提交值（读已提交 / 快照）", writeConflicts: "写冲突（读已提交 / 快照）", observedReads: "读取记录（读已提交 / 快照）",
};
