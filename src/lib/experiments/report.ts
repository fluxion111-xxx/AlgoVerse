import type { ExperimentConfig, ExperimentResults } from "../experimentEngines";
import type { SearchResult } from "../pathfinding";

const paragraph = (...sentences: (string | undefined)[]) => sentences.join("");
const displayNumber = (value: number) => String(Number(value.toPrecision(5)));

function difference(left: number, right: number, leftName: string, rightName: string, action: string) {
  return left === right ? `${action}次数相同。` :
    `${left < right ? leftName : rightName}少${action} ${Math.abs(left - right)} 次。`;
}

export function pathfindingReport(walls: number | undefined, { dijkstra, astar }: { dijkstra?: SearchResult; astar?: SearchResult }) {
  const searches = [["Dijkstra", dijkstra], ["A*", astar]] as const;
  const available = searches.flatMap(([name, result]) => result ? [{ name, result }] : []);
  const length = (result: SearchResult) => result.pathLength?.toFixed(2) ?? "无路径";
  const single = available[0];
  let conclusion = !single ? "当前没有运行结果。" : single.result.pathLength === null
    ? `${single.name} 未找到路。` : `找到路径。路长 ${length(single.result)}。`;
  if (dijkstra && astar) {
    const count = dijkstra.visited.length - astar.visited.length;
    const path = dijkstra.pathLength === null && astar.pathLength === null ? "两种算法都未找到路。" :
      length(dijkstra) === length(astar) ? "显示路长相同。" : "显示路长有差异。";
    conclusion = `${count === 0 ? "访问节点数相同。" : `${count > 0 ? "A*" : "Dijkstra"}少访问 ${Math.abs(count)} 个。`}${path}`;
  }
  return {
    conclusion,
    detail: paragraph(dijkstra && astar ? "两种算法走同一地图。" : undefined, walls === undefined ? undefined : `图上有 ${walls} 格障碍。`,
      ...available.flatMap(({ name, result }) => [`${name} 访问 ${result.visited.length} 个。`,
        result.pathLength === null ? `${name} 没走到终点。` : `${name} 路长 ${length(result)}。`])),
    explanation: paragraph(dijkstra ? "Dijkstra 按已走成本选点。" : undefined, astar ? "A* 也估算剩余路程。" : undefined,
      "取到终点或无点可搜就停。", ...available.map(({ name, result }) => `${name} 耗时 ${result.elapsedMs.toFixed(2)} ms。`),
      "单次计时会有波动。"),
    suggestion: "固定起点和终点。改障碍布局，再比节点数。",
  };
}

export function experimentReport(config: ExperimentConfig, results: ExperimentResults) {
  if ("dijkstra" in results) return pathfindingReport("walls" in config ? config.walls.length : undefined, results);
  switch (results.kind) {
  case "sorting": {
    const { bubble, quick } = results;
    const values = "values" in config ? config.values : bubble.frames[0].values;
    const pivot = values[values.length - 1];
    const firstComparisons = values.length - 1;
    const left = values.slice(0, -1).filter((value) => value <= pivot).length;
    const same = bubble.sorted.length === quick.sorted.length && bubble.sorted.every((value, index) => value === quick.sorted[index]);
    const ascending = bubble.sorted.every((value, index) => index === 0 || value >= bubble.sorted[index - 1]);
    const output = !same ? "两种输出有差异。" : ascending ? "两种升序结果一致。" : "两种结果一致，但未升序。";
    const earlyStop = bubble.comparisons < values.length * firstComparisons / 2;
    return {
      conclusion: difference(bubble.comparisons, quick.comparisons, "冒泡", "快排", "比较") +
        difference(bubble.swaps, quick.swaps, "冒泡", "快排", "交换"),
      detail: [`两种算法都处理 ${values.length} 项。`, `冒泡比较 ${bubble.comparisons} 次。`, `快排比较 ${quick.comparisons} 次。`,
        `冒泡交换 ${bubble.swaps} 次。`, `快排交换 ${quick.swaps} 次。`, output].join(""),
      explanation: ["冒泡逐对比较相邻项。", "每趟让剩余最大项归位。", earlyStop ? "一趟无交换后提前结束。" : "本轮未提前收尾。",
        "快排每段取末项作基准。", `首个基准是 ${pivot}。`, `首轮划分比较 ${firstComparisons} 次。`, `基准左侧有 ${left} 项。`,
        `右侧有 ${firstComparisons - left} 项。`, `两侧又比较 ${quick.comparisons - firstComparisons} 次。`,
        "同一位置不计交换。", "本实验统计操作次数。"].join(""),
      suggestion: "保留同一组数。分别试升序和倒序。再比比较与交换次数。",
    };
  }

  case "cpu-scheduling": {
    const scheduling = "processes" in config ? config : undefined;
    const longestWait = Math.max(...results.processes.map(({ waiting }) => waiting));
    return {
      conclusion: `平均等待 ${results.averageWaiting.toFixed(2)}。最长等待 ${longestWait}。`,
      detail: paragraph(scheduling?.policy === "rr" ? `轮转时间片为 ${scheduling.quantum}。` : "本轮使用先来先服务。",
        `本轮安排 ${results.processes.length} 个进程。`, `平均周转 ${results.averageTurnaround.toFixed(2)}。`,
        `平均响应 ${results.averageResponse.toFixed(2)}。`, `进程切换 ${results.switches} 次。`),
      explanation: paragraph("等待是排队的总时间。", ...results.processes.map(({ process, waiting }) => `P${process + 1} 等待 ${waiting}。`),
        "周转从到达算到完成。", "响应算到首次运行。", "模型不扣切换耗时。"),
      suggestion: scheduling?.policy === "rr" ? "保留原来的进程。只改时间片，再比等待。" : "保留原来的进程。换成轮转，再比等待。",
    };
  }
  case "network-transmission": {
    const { route, events, delivered, dropped, lossRate, averageLatency } = results;
    const links = "links" in config ? config.links : undefined;
    return {
      conclusion: `走 A→${route[0][1]}→D。送达 ${delivered} 个，丢包 ${dropped} 个。`,
      detail: paragraph(`共发送 ${delivered + dropped} 个包。`, `模拟丢包率 ${(lossRate * 100).toFixed(1)}%。`,
        averageLatency === null ? "没有包送达。" : `送达平均延迟 ${averageLatency.toFixed(1)} ms。`,
        ...route.map((link) => `${link} 丢包 ${events.filter((event) => event.link === link && event.state === "dropped").length} 个。`)),
      explanation: paragraph(links ? `经 B 总延迟 ${links.AB.delay + links.BD.delay} ms。` : undefined,
        links ? `经 C 总延迟 ${links.AC.delay + links.CD.delay} ms。` : undefined,
        "模型选总延迟较小的路。", "同延迟优先走 B。", "包丢失后就停止转发。", "延迟只统计送达的包。"),
      suggestion: "固定链路延迟和种子。只改一跳的丢包率。再比送达数。",
    };
  }
  case "memory-visualization": {
    const { steps, value, calls, maxDepth } = results;
    const input = steps[0].stack[0].n;
    const next = steps.findIndex(({ kind }) => kind === "return") + 1;
    return {
      conclusion: `${input}! = ${value}。最大栈深 ${maxDepth} 层。`,
      detail: paragraph(`共进入函数 ${calls} 次。`, "每次进入都新开一层。", "调用到 0 时停止向下。", "最后一层也已释放。"),
      explanation: paragraph("0! 先返回 1。", steps[next]?.kind === "return" ? `上一层接着返回 ${steps[next].value}。` : undefined,
        "每层接到结果后再相乘。", "返回一层就释放一层。", "最深时保留所有调用。"),
      suggestion: "把输入改成 0，再试 1。看栈深和调用次数。",
    };
  }
  case "b-plus-tree": {
    const { height, splits, visitedCount, matches, steps } = results;
    const firstSplit = steps.find(({ splits }) => splits > 0);
    const query = "lower" in config ? `查询区间为 [${config.lower}, ${config.upper}]。` : undefined;
    return {
      conclusion: `查询命中 ${matches.length} 个键。查询走过 ${visitedCount} 个节点。`,
      detail: paragraph(query, `树高 ${height} 层。`, `插入共分裂 ${splits} 次。`,
        firstSplit ? `插入 ${firstSplit.key} 时首次分裂。` : "本轮插入未触发分裂。"),
      explanation: paragraph("先沿索引定位区间下界。", "到叶节点后按序找键。", "范围够长就走到下一叶。", "查询包含区间的两端。",
        "order" in config ? `每个节点最多存 ${config.order * 2} 个键。` : undefined, "插入放不下时才分裂。"),
      suggestion: "固定插入顺序和区间。只改节点容量。比较树高与分裂次数。",
    };
  }
  case "knn-classification": {
    const { neighbors, votes, prediction } = results;
    const nearest = neighbors[0];
    return {
      conclusion: `本轮判为 ${prediction} 类。A 类 ${votes.A} 票。B 类 ${votes.B} 票。`,
      detail: paragraph(`共有 ${neighbors.length} 个邻居投票。`, `最近的是 ${nearest.index + 1} 号。`,
        `它属于 ${nearest.label} 类。`, `距离为 ${nearest.distance.toFixed(2)}。`,
        votes.A === votes.B ? "平票时取最近邻的类别。" : "票数多的类别获胜。"),
      explanation: paragraph("metric" in config ? `本轮用${config.metric === "euclidean" ? "欧氏" : "曼哈顿"}距离。` : undefined,
        "按距离从近到远排序。", "同距离按输入顺序。", "入选邻居各投一票。", "样本位置会影响入选。"),
      suggestion: "保留样本与待分类点。只改邻居数。看票数和分类会不会变。",
    };
  }
  case "page-replacement": {
    const { policies } = results;
    const minimum = Math.min(...policies.map(({ faults }) => faults));
    const best = policies.filter(({ faults }) => faults === minimum).map(({ policy }) => policy);
    const first = policies[0];
    const different = first.steps.findIndex((step, i) => policies.some(({ steps }) => steps[i].evicted !== step.evicted));
    return {
      conclusion: best.length === policies.length ? `三种策略均缺页 ${minimum} 次。` : `${best.join("、")}缺页最少。共 ${minimum} 次。`,
      detail: paragraph(`共访问 ${first.steps.length} 次。`, "frameCount" in config ? `使用 ${config.frameCount} 个页框。` : undefined,
        ...policies.flatMap(({ policy, faults, hits }) => [`${policy} 缺页 ${faults} 次。`, `命中 ${hits} 次。`])),
      explanation: paragraph("FIFO 换最早进来的页。", "LRU 换最久没用的页。", "OPT 会查看未来访问。",
        different < 0 ? "各步淘汰结果一致。" : `第 ${different + 1} 次访问出现分歧。`,
        different < 0 ? undefined : `当时访问页 ${first.steps[different].page}。`, "首次装入也计缺页。"),
      suggestion: "保留页号访问顺序。只改页框数。逐个策略重比缺页。",
    };
  }
  case "hash-collisions": {
    const { steps, chainingChecks, probingChecks, chainingConflicts, probingConflicts, fullInsertions } = results;
    const different = steps.findIndex(({ chaining, probing }) => chaining.visits.length !== probing.visits.length);
    return {
      conclusion: difference(chainingChecks, probingChecks, "链地址", "线性探测", "检查") + `探测满表失败 ${fullInsertions} 次。`,
      detail: paragraph(`两种方法各做 ${steps.length} 项操作。`, `链地址检查 ${chainingChecks} 次。`, `探测检查 ${probingChecks} 次。`,
        `链地址插入遇异键 ${chainingConflicts} 次。`, `探测插入遇异键 ${probingConflicts} 次。`),
      explanation: paragraph("链地址在同一个桶内找。", "探测沿相邻槽往后找。", "探测遇删除标记仍向后找。",
        different < 0 ? "每项操作检查数都相同。" : `第 ${different + 1} 项检查数先分开。`,
        different < 0 ? undefined : `这一步处理键 ${steps[different].operation.key}。`, "遇异键只统计插入。"),
      suggestion: "保持操作序列不变。只改槽数。再比检查和满表失败。",
    };
  }
  case "k-means": {
    const { steps, final, converged } = results;
    const empty = final.sizes.filter((size) => size === 0).length;
    return {
      conclusion: converged ? `第 ${steps.length} 轮中心不再变动。` : `跑满 ${steps.length} 轮。中心仍在变动。`,
      detail: paragraph(`分了 ${final.sizes.length} 组。`, `首轮误差 ${displayNumber(steps[0].loss)}。`, `最终误差 ${displayNumber(final.loss)}。`,
        ...final.sizes.map((size, index) => `第 ${index + 1} 组有 ${size} 个点。`)),
      explanation: paragraph("先把点分给最近的中心。", "再用组内均值更新中心。", "误差是到中心的平方距之和。",
        empty ? `末轮有 ${empty} 个空组。` : "末轮每组都有样本。", empty ? "空组沿用原来的中心。" : undefined),
      suggestion: "固定样本和中心数量。只换初始中心。再比误差与停止轮数。",
    };
  }
  case "gradient-descent": {
    const { initial, steps, final, converged } = results;
    const change = final.loss < initial.loss ? "损失下降。" : final.loss > initial.loss ? "损失上升。" : "损失未变。";
    return {
      conclusion: change + (converged ? "梯度已接近零。" : "达到步数上限。"),
      detail: paragraph(`一共更新 ${steps.length} 步。`, `起点 ${displayNumber(initial.position)}。`, `末点 ${displayNumber(final.position)}。`,
        `初始损失 ${displayNumber(initial.loss)}。`, `最终损失 ${displayNumber(final.loss)}。`),
      explanation: paragraph("每步用梯度决定方向。", "学习率控制步子大小。",
        "learningRate" in config ? `本轮学习率 ${config.learningRate}。` : undefined,
        steps.length ? `第一步走到 ${displayNumber(steps[0].position)}。` : "起点已满足停止条件。",
        `末步梯度 ${displayNumber(final.gradient)}。`, "梯度绝对值够小才早停。"),
      suggestion: "固定起点和步数上限。只改学习率。再对比损失的变化。",
    };
  }
  case "tree-traversal": {
    const { traversals } = results;
    const [preorder, , , level] = traversals;
    const names = { preorder: "先序", inorder: "中序", postorder: "后序", level: "层序" };
    const root = preorder.values[0];
    return {
      conclusion: `四种方法各访问 ${preorder.steps.length} 个节点。`,
      detail: paragraph(`根节点值为 ${root}。`, ...traversals.map(({ order, steps }) => `${names[order]}第 ${steps.findIndex(({ node }) => node === 0) + 1} 位访问根。`)),
      explanation: paragraph("先序进来就访问根。", "中序走完左边再访问根。", "后序走完两边再访问根。", "层序先走近的层。",
        `层序最后访问 ${level.values.at(-1)}。`, "根的位置按节点编号核对。"),
      suggestion: "只挪动一个叶节点。比较四种访问顺序。留意根的位置。",
    };
  }
  case "graph-traversal": {
    const { bfs, dfs, unreachable } = results;
    const different = bfs.findIndex(({ vertex }, index) => vertex !== dfs[index].vertex);
    return {
      conclusion: `两种方法都访问 ${bfs.length} 点。${unreachable.length} 点不可达。`,
      detail: paragraph(`同从 ${bfs[0].vertex} 号点出发。`, `BFS 最远走 ${bfs.at(-1)!.depth} 条边。`,
        different < 0 ? "两种访问顺序一致。" : `第 ${different + 1} 个访问点有差别。`,
        different < 0 ? undefined : `BFS 先到 ${bfs[different].vertex}。DFS 先到 ${dfs[different].vertex}。`),
      explanation: paragraph("BFS 一层层取队列。", "DFS 沿一条分支向下。", "相邻点按编号选。", "已经到过的点会跳过。",
        "directed" in config && config.directed ? "有向边只能顺箭头走。" : undefined),
      suggestion: "保持原图。只换起点。再看访问顺序与不可达点。",
    };
  }
  case "deadlock-avoidance": {
    const { initial, trial, decision, need } = results;
    const conclusion = { grant: "批准请求。试分配后仍有安全序列。", unsafe: "撤回试分配。试分配后无安全序列。",
      wait: "请求暂等。当前可用量不足。", "exceeds-need": "拒绝请求。请求超过声明的剩余需求。" }[decision];
    return {
      conclusion,
      detail: paragraph(`共有 ${need.length} 个进程。`, initial.safe ? "原状态存在安全序列。" : "原状态无安全序列。",
        "process" in config ? `本轮由 P${config.process} 请求。` : undefined,
        trial ? `试分配后可完成 ${trial.sequence.length} 个。` : "请求未进入试分配。",
        trial?.blocked.length ? `有 ${trial.blocked.length} 个进程卡住。` : undefined),
      explanation: paragraph("先核对剩余需求和库存。", "满足两项才试着分配。", "模拟完成后归还资源。", "能排完所有进程才批准。",
        trial?.steps[0] ? `试算先完成 P${trial.steps[0].process}。` : undefined),
      suggestion: "保留初始资源和进程。只改一类请求量。再看能否批准。",
    };
  }
  case "tcp-congestion": {
    const { steps, final, fastRetransmits, timeouts } = results;
    const fast = steps.findIndex(({ retransmit }) => retransmit === "fast");
    const timeout = steps.findIndex(({ retransmit }) => retransmit === "timeout");
    return {
      conclusion: `快重传 ${fastRetransmits} 次。超时 ${timeouts} 次。`,
      detail: paragraph(`共处理 ${steps.length} 个信号。`, `初始窗口 ${displayNumber(steps[0].before)} MSS。`,
        `最终窗口 ${final.cwnd.toFixed(2)} MSS。`, `最终阈值 ${final.threshold} MSS。`),
      explanation: paragraph("进入恢复前先数重复确认。", "连续三次就快重传。", fast < 0 ? undefined : `第 ${fast + 1} 步首次快重传。`,
        fast < 0 ? undefined : `它将阈值设为 ${steps[fast].threshold}。`, "超时后窗口回到 1。",
        timeout < 0 ? undefined : `第 ${timeout + 1} 步首次超时。`, "窗口来自教学模拟。"),
      suggestion: "固定起始窗口和阈值。把一次重复确认改成超时。再看窗口。",
    };
  }
  case "dynamic-routing": {
    const { before, after } = results;
    const original = before.destination;
    const updated = after.destination;
    const link = "topology" in config ? config.topology[config.changedLink] : undefined;
    const conclusion = updated.cost === null ? original.cost === null ? "变更前后都不可达。" : "变更后目标不可达。" :
      original.cost === null ? "变更后目标可达。" : original.path.join() === updated.path.join() ? "最短路仍走原路径。" : "最短路改走新路径。";
    return {
      conclusion,
      detail: paragraph(original.cost === null ? "原先没有可走路径。" : `原路径成本 ${original.cost}。`,
        updated.cost === null ? "变更后找不到路径。" : `新路径成本 ${updated.cost}。`,
        original.cost === null || updated.cost === null ? undefined : original.cost === updated.cost ? "总成本相同。" :
          `总成本${updated.cost > original.cost ? "增加" : "减少"} ${Math.abs(updated.cost - original.cost)}。`),
      explanation: paragraph(link ? `调整链路 ${link.from}↔${link.to}。` : undefined,
        link ? `原链路成本 ${link.cost}。` : undefined, "newCost" in config ? config.newCost ? `新链路成本 ${config.newCost}。` : "本轮断开此链路。" : undefined,
        "沿剩余链路重算最短路。", updated.path.length > 1 ? `重算后下一跳为 ${updated.path[1]}。` : undefined),
      suggestion: "保留原拓扑和起终点。只改这条链路成本。再看路径与下一跳。",
    };
  }
  case "memory-allocation": {
    const { first, best } = results;
    const different = first.steps.findIndex((step, index) => step.address !== best.steps[index].address || step.outcome !== best.steps[index].outcome);
    return {
      conclusion: difference(first.failures, best.failures, "首次适配", "最佳适配", "失败"),
      detail: paragraph(`各执行 ${first.steps.length} 个操作。`, `首次适配失败 ${first.failures} 次。`, `最佳适配失败 ${best.failures} 次。`,
        `首次最大空块 ${first.final.largest}。`, `最佳最大空块 ${best.final.largest}。`),
      explanation: paragraph("首次取首个够大的空块。", "最佳取最小的合适空块。", "释放后合并相邻空块。", "失败只计空块放不下。",
        different < 0 ? "各步地址与结果相同。" : `第 ${different + 1} 步先出现差异。`,
        `首次碎片失败 ${first.steps.filter(({ outcome }) => outcome === "fragmented").length} 次。`,
        `最佳碎片失败 ${best.steps.filter(({ outcome }) => outcome === "fragmented").length} 次。`),
      suggestion: "固定分配与释放顺序。只改堆大小。再比分配失败和最大空块。",
    };
  }
  case "transaction-concurrency": {
    const { readCommitted, snapshot } = results;
    const changedRows = readCommitted.committed.filter(({ value }, index) => value !== snapshot.committed[index].value).length;
    const read = readCommitted.steps.findIndex((step, index) => step.read?.value !== snapshot.steps[index].read?.value);
    const conflict = [readCommitted, snapshot].find(({ conflicts }) => conflicts > 0)?.steps.find(({ conflictRow }) => conflictRow !== null);
    return {
      conclusion: changedRows ? `最终有 ${changedRows} 行值不同。` : "两种模式最终提交值相同。",
      detail: paragraph(`各执行 ${readCommitted.steps.length} 步。`, `读已提交冲突 ${readCommitted.conflicts} 次。`,
        `快照模式冲突 ${snapshot.conflicts} 次。`, read < 0 ? "两种模式读值一致。" : `第 ${read + 1} 步读值先分开。`,
        read < 0 ? undefined : `读已提交读到 ${readCommitted.steps[read].read?.value}。快照读到 ${snapshot.steps[read].read?.value}。`),
      explanation: paragraph("读已提交看当时的提交值。", "快照沿用事务开始时的值。", "两种模式都能读自身暂存。", "提交时对比行版本。",
        conflict ? `一次冲突出现在第 ${conflict.conflictRow} 号行。` : undefined, "写冲突会撤回整笔事务。"),
      suggestion: "保留初始数据。只挪动提交时机。再比读值和写冲突。",
    };
  }
  }
}
