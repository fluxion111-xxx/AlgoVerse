import { defineCurriculumLab, gapText, sequenceText } from "./curriculumLab";

export const monotonicStackLab = defineCurriculumLab({
  id: "monotonic-stack", domain: "algorithms", title: "单调栈找下一个更大值",
  description: "同一组数。对照逐项扫描和单调栈。",
  comparison: "逐项扫描 / 单调栈",
  topics: ["monotonic-stack-next-greater"],
  input: {
    greaterNumbers: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 24, label: "待查序列", hint: "1–24 个整数，每项 -99–99" },
  },
  defaults: { goalLabel: "找每个数右侧第一个更大的数", greaterNumbers: [6, 5, 4, 3, 2, 1] },
  columns: ["下标", "值", "向右扫描找到", "扫描比较", "本步解答的下标", "待解栈"],
  metricLabels: { greaterScanChecks: "逐项扫描比较数", greaterStackChecks: "单调栈比较数", greaterFound: "有解的位置数",
    greaterPositions: "各位置答案下标", greaterStackPeak: "待解栈峰值" },
  focusMetric: "greaterScanChecks", alternateTrial: "保留这 6 个数。把顺序改成升序。",
  run({ greaterNumbers }) {
    const stack: number[] = [];
    const answers = greaterNumbers.map(() => -1);
    let scanChecks = 0;
    let stackChecks = 0;
    let peak = 0;
    const steps = greaterNumbers.map((value, index) => {
      let next = index + 1;
      let comparisons = 0;
      for (; next < greaterNumbers.length; next++) {
        comparisons++;
        if (greaterNumbers[next] > value) break;
      }
      scanChecks += comparisons;
      const resolved: number[] = [];
      while (stack.length) {
        stackChecks++;
        const top = stack[stack.length - 1];
        if (greaterNumbers[top] >= value) break;
        stack.pop();
        answers[top] = index;
        resolved.push(top);
      }
      stack.push(index);
      peak = Math.max(peak, stack.length);
      return [index, value, next < greaterNumbers.length ? next : "无", comparisons, sequenceText(resolved), sequenceText(stack)] as const;
    });
    const found = answers.filter((answer) => answer >= 0).length;
    return { steps, metrics: { greaterScanChecks: scanChecks, greaterStackChecks: stackChecks, greaterFound: found,
      greaterPositions: answers.map((index) => index < 0 ? "无" : index).join("、"), greaterStackPeak: peak }, report: {
      conclusion: `有 ${found} 个位置找到答案。${gapText(scanChecks, stackChecks, "逐项扫描", "单调栈", "次比较")}`,
      detail: `本轮输入 ${greaterNumbers.length} 个数。逐项扫描比较 ${scanChecks} 次。单调栈比较 ${stackChecks} 次。栈里最多等着 ${peak} 项。最后有 ${stack.length} 项无解。下标从 0 计数。`,
      explanation: "栈保存还没找到答案的下标。新值比栈顶大，就解答栈顶。值相等时继续等待。每项最多进栈和出栈各一次。扫描可能反复查看同一位置。",
      suggestion: "保留数值，只反转输入。对比两种比较数。再放入两个相等的值。",
    } };
  },
});

export const bellmanFordLab = defineCurriculumLab({
  id: "bellman-ford", domain: "algorithms", title: "Bellman–Ford 与负权环",
  description: "逐轮松弛有向边。圈出负环影响范围。",
  topics: ["bellman-ford-negative-cycle"],
  input: {
    bellmanNodes: { kind: "integer", min: 1, max: 10, label: "顶点数", hint: "1–10 个点，从 0 编号" },
    bellmanEdges: { kind: "rows", columns: [[0, 9], [0, 9], [-30, 30]], minItems: 0, maxItems: 24, label: "有向边",
      hint: "每行填起点、终点、权重。允许负权和自环。" },
    bellmanSource: { kind: "integer", min: 0, max: 9, label: "源点", hint: "填写有效顶点编号" },
    bellmanTarget: { kind: "integer", min: 0, max: 9, label: "目标点", hint: "填写有效顶点编号" },
  },
  defaults: { goalLabel: "验证负环会影响哪些顶点", bellmanNodes: 5, bellmanSource: 0, bellmanTarget: 3,
    bellmanEdges: [[0, 1, 4], [0, 2, 5], [1, 2, -2], [2, 3, 3], [3, 1, -3]] },
  check: ({ bellmanNodes, bellmanEdges, bellmanSource, bellmanTarget }) =>
    bellmanSource < bellmanNodes && bellmanTarget < bellmanNodes &&
    bellmanEdges.every(([from, to]) => from < bellmanNodes && to < bellmanNodes),
  columns: ["阶段", "边或顶点", "本步变化", "各点暂定距离"],
  metricLabels: { bellmanPasses: "松弛轮数", bellmanUpdates: "有效更新次数", bellmanAffected: "负环影响点数",
    bellmanUnreachable: "不可达点数", bellmanDistance: "目标最短距离" },
  focusMetric: "bellmanAffected", alternateTrial: "把 3 到 1 的边权改为 0。",
  run({ bellmanNodes, bellmanEdges, bellmanSource, bellmanTarget }) {
    let distances = Array<number>(bellmanNodes).fill(Infinity);
    distances[bellmanSource] = 0;
    const show = (values = distances) => values.map((distance) => Number.isFinite(distance) ? distance : "∞").join("、");
    const steps: [string, string | number, string, string][] = [["起点", bellmanSource, "源点距离置 0", show()]];
    let passes = 0;
    let updates = 0;
    for (let pass = 1; pass < bellmanNodes; pass++) {
      const next = [...distances];
      let changed = 0;
      for (const [from, to, weight] of bellmanEdges) {
        const candidate = distances[from] + weight;
        if (candidate >= next[to]) continue;
        next[to] = candidate;
        changed++;
        steps.push([`第 ${pass} 轮`, `${from}→${to}`, `暂定值降为 ${candidate}`, show(next)]);
      }
      distances = next;
      passes++;
      updates += changed;
      steps.push([`第 ${pass} 轮结束`, "—", `更新 ${changed} 次`, show()]);
      if (!changed) break;
    }
    const affected = new Set<number>();
    for (const [from, to, weight] of bellmanEdges) {
      if (distances[from] + weight >= distances[to]) continue;
      affected.add(to);
      steps.push(["额外检查", `${from}→${to}`, "仍可缩短", show()]);
    }
    for (const node of affected) {
      for (const [from, to] of bellmanEdges) {
        if (from !== node || affected.has(to)) continue;
        affected.add(to);
        steps.push(["沿边传播", `${from}→${to}`, "受负环影响", show()]);
      }
    }
    if (!affected.size) steps.push(["额外检查", "—", "无可达负权环影响", show()]);
    const unreachable = distances.filter((distance) => distance === Infinity).length;
    const target = affected.has(bellmanTarget) ? "无有限下界" :
      distances[bellmanTarget] === Infinity ? "不可达" : distances[bellmanTarget];
    return { steps, metrics: { bellmanPasses: passes, bellmanUpdates: updates, bellmanAffected: affected.size,
      bellmanUnreachable: unreachable, bellmanDistance: target }, report: {
      conclusion: `目标 ${bellmanTarget} 的距离为 ${target}。负环影响 ${affected.size} 个点。`,
      detail: `从顶点 ${bellmanSource} 出发。跑了 ${passes} 轮松弛。成功更新 ${updates} 次。有 ${unreachable} 个点不可达。受影响下标为 ${sequenceText([...affected].sort((left, right) => left - right))}。回放按顶点编号显示距离。`,
      explanation: "本轮用上一轮距离试算。每轮多允许走一条边。额外一轮还能缩短，就查负环影响。沿有向边继续标记下游。源点够不着的环不影响结果。",
      suggestion: "只调高负环中的一条边权。观察目标是否恢复有限距离。",
    } };
  },
});

export const stackQueueLab = defineCurriculumLab({
  id: "stack-queue", domain: "algorithms", title: "栈与队列",
  description: "给栈和队列相同的进出操作。观察取出顺序和空取次数。",
  comparison: "同一操作序列下的栈与队列",
  topics: ["stack-lifo", "ring-queue"],
  input: {
    queueItems: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 16, label: "放入的数字", hint: "1–16 个整数，每个 −99 至 99。" },
    takeAfter: { kind: "list", min: 0, max: 16, minItems: 0, maxItems: 20, label: "何时取出", hint: "整数数组。2 表示放入两项后取。0 表示最开始。可重复。" },
  },
  defaults: { goalLabel: "比较先取与后取。", queueItems: [4, 7, 2, 9], takeAfter: [2, 4, 4, 4] },
  check: ({ queueItems, takeAfter }) => takeAfter.every((count) => count <= queueItems.length),
  columns: ["操作", "栈（底到顶）", "队列（头到尾）", "栈取出", "队列取出"],
  metricLabels: { stackOrder: "栈取出顺序", queueOrder: "队列取出顺序", takeDifferences: "取出值不同的次数", emptyTakes: "空取次数" },
  focusMetric: "takeDifferences",
  alternateTrial: "把取出移到最开始。观察空取记录。",
  run({ queueItems, takeAfter }) {
    const stack: number[] = [];
    const queue: number[] = [];
    const stackTaken: number[] = [];
    const queueTaken: number[] = [];
    const steps: [string, string, string, string | number, string | number][] = [];
    let takeDifferences = 0;
    let emptyTakes = 0;
    let firstDifferent: { take: number; fromStack: number; fromQueue: number } | undefined;
    for (let inserted = 0; inserted <= queueItems.length; inserted++) {
      if (inserted > 0) {
        const item = queueItems[inserted - 1];
        stack.push(item);
        queue.push(item);
        steps.push([`放入 ${item}`, sequenceText(stack), sequenceText(queue), "—", "—"]);
      }
      for (const when of takeAfter) {
        if (when !== inserted) continue;
        const fromStack = stack.pop();
        const fromQueue = queue.shift();
        if (fromStack === undefined || fromQueue === undefined) emptyTakes++;
        else {
          stackTaken.push(fromStack);
          queueTaken.push(fromQueue);
          if (fromStack !== fromQueue) {
            takeDifferences++;
            firstDifferent ??= { take: stackTaken.length + emptyTakes, fromStack, fromQueue };
          }
        }
        steps.push(["取出", sequenceText(stack), sequenceText(queue), fromStack ?? "空取", fromQueue ?? "空取"]);
      }
    }
    return { steps, metrics: { stackOrder: sequenceText(stackTaken), queueOrder: sequenceText(queueTaken), takeDifferences, emptyTakes }, report: {
      conclusion: takeAfter.length ? `有 ${takeDifferences} 次取出值不同。空取 ${emptyTakes} 次。` : "本轮只放入。两边都未取出。",
      detail: `两边各放入 ${queueItems.length} 项。各试取 ${takeAfter.length} 次。成功取出 ${stackTaken.length} 次。最后各剩 ${stack.length} 项。`,
      explanation: (firstDifferent ? `第 ${firstDifferent.take} 次取出先不同。栈取 ${firstDifferent.fromStack}。队列取 ${firstDifferent.fromQueue}。` : "本轮取出值没有差异。") +
        "栈从刚放入的一端取。队列从最早一端取。两边都空时会记空取。",
      suggestion: "保留放入顺序。只改取出的时机。再看取出序列。",
    } };
  },
});

export const binarySearchLab = defineCurriculumLab({
  id: "binary-search", domain: "algorithms", title: "二分查找",
  description: "在同一有序序列找首个目标。统计二分和顺序查找读取的元素。",
  comparison: "有序数组上的顺序查找与左边界二分",
  topics: ["binary-search", "binary-search-lower-bound"],
  input: {
    sortedItems: { kind: "list", min: -999, max: 999, minItems: 1, maxItems: 32, label: "升序整数", hint: "1–32 个非递减整数。可重复。" },
    searchValue: { kind: "integer", min: -999, max: 999, label: "目标值", hint: "−999 至 999 的整数。" },
  },
  defaults: { goalLabel: "用二分定位重复值的左边界。", sortedItems: [1, 3, 5, 7, 9, 9, 9, 12, 15, 18, 21], searchValue: 9 },
  check: ({ sortedItems }) => sortedItems.every((item, index) => index === 0 || item >= sortedItems[index - 1]),
  columns: ["方法", "比较下标", "发现的值", "本次动作"],
  metricLabels: { searchIndex: "首次命中的下标", linearReads: "顺序查找比较", binaryReads: "二分查找比较", insertionIndex: "目标插入下标" },
  focusMetric: "binaryReads",
  alternateTrial: "改成一个不存在的值。对照两种查找次数。",
  run({ sortedItems, searchValue }) {
    const steps: [string, number, number, string][] = [];
    let low = 0;
    let high = sortedItems.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const value = sortedItems[middle];
      if (value < searchValue) low = middle + 1;
      else high = middle;
      steps.push(["二分", middle, value, `区间 [${low}, ${high})`]);
    }
    const index = low < sortedItems.length && sortedItems[low] === searchValue ? low : -1;
    if (low < sortedItems.length) steps.push(["二分核对", low, sortedItems[low], index < 0 ? "目标不存在" : "找到首项"]);
    const binaryReads = steps.length;
    for (const [position, value] of sortedItems.entries()) {
      steps.push(["顺序", position, value, value === searchValue ? "找到首项" : "继续"]);
      if (value === searchValue) break;
    }
    const linearReads = steps.length - binaryReads;
    return { steps, metrics: { searchIndex: index < 0 ? "未找到" : index, linearReads, binaryReads, insertionIndex: low }, report: {
      conclusion: index < 0 ? "两种方法都未找到目标。" : `首个命中在下标 ${index}。`,
      detail: `在 ${sortedItems.length} 项中找 ${searchValue}。顺序比较 ${linearReads} 次。二分比较 ${binaryReads} 次。` +
        gapText(linearReads, binaryReads, "顺序", "二分", "次"),
      explanation: "二分每次读取中间项。遇到相等仍往左收窄。最后核对候选值。" +
        `目标的左插入点为 ${low}。计数包含末次核对。下标从 0 算起。`,
      suggestion: "固定有序序列。把目标改成首项。再比两种方法的次数。",
    } };
  },
});

export const topologicalSortLab = defineCurriculumLab({
  id: "topological-sort", domain: "algorithms", title: "拓扑排序与环检测",
  description: "按依赖安排任务。逐步移除入度为零的节点，并检查剩余依赖。",
  topics: ["topological-sort"],
  input: {
    taskNodes: { kind: "integer", min: 1, max: 16, label: "任务数", hint: "1–16 个任务。编号从 0 开始。" },
    taskDependencies: { kind: "rows", columns: [[0, 15], [0, 15]], minItems: 0, maxItems: 32, label: "先做, 后做", hint: "每行 [先做, 后做]。编号须有效。边不可重复，可试自环。" },
  },
  defaults: { goalLabel: "按依赖排任务。", taskNodes: 6, taskDependencies: [[0, 2], [1, 2], [2, 3], [1, 4], [4, 5]] },
  check: ({ taskNodes, taskDependencies }) => taskDependencies.every(([from, to]) => from < taskNodes && to < taskNodes) &&
    new Set(taskDependencies.map(([from, to]) => `${from},${to}`)).size === taskDependencies.length,
  columns: ["可先做的任务", "本步选中", "已排顺序", "剩余任务"],
  metricLabels: { topoScheduled: "已安排任务数", topoBlocked: "未安排任务数", topoCycle: "是否有环", topoOrder: "任务顺序" },
  focusMetric: "topoBlocked",
  alternateTrial: "加一条从 5 到 1 的依赖。观察剩下谁。",
  run({ taskNodes, taskDependencies }) {
    const incoming = Array<number>(taskNodes).fill(0);
    const outgoing: number[][] = Array.from({ length: taskNodes }, () => []);
    for (const [from, to] of taskDependencies) {
      outgoing[from].push(to);
      incoming[to]++;
    }
    const order: number[] = [];
    const steps: [string, string | number, string, number][] = [];
    let removed = 0;
    while (order.length < taskNodes) {
      const ready = incoming.flatMap((count, node) => count === 0 ? [node] : []);
      const next = ready[0];
      if (next === undefined) {
        steps.push(["无", "卡住", sequenceText(order), taskNodes - order.length]);
        break;
      }
      order.push(next);
      incoming[next] = -1;
      for (const to of outgoing[next]) {
        incoming[to]--;
        removed++;
      }
      steps.push([sequenceText(ready), next, sequenceText(order), taskNodes - order.length]);
    }
    const blocked = taskNodes - order.length;
    return { steps, metrics: { topoScheduled: order.length, topoBlocked: blocked, topoCycle: blocked ? "有环" : "无环", topoOrder: sequenceText(order) }, report: {
      conclusion: blocked ? `发现有向环。${blocked} 个任务未排入。` : `全部 ${taskNodes} 个任务都能排入。`,
      detail: `共有 ${taskNodes} 个任务。录入 ${taskDependencies.length} 条依赖。消去 ${removed} 条依赖。安排 ${order.length} 个任务。`,
      explanation: "先找没有前置任务的点。平局时取编号最小的。排入后划掉它的出边。" +
        (blocked ? "还有任务却找不到起点。环也会卡住下游任务。" : "记录的是一种合法顺序。"),
      suggestion: "保留任务数。只加或删一条依赖。再看能否排完。",
    } };
  },
});

function parentPath(parents: number[], start: number) {
  const path = [start];
  for (let node = start; parents[node] !== node;) {
    node = parents[node];
    path.push(node);
  }
  return path;
}

export const unionFindLab = defineCurriculumLab({
  id: "union-find", domain: "algorithms", title: "并查集路径压缩",
  description: "先合并集合。再用同一批查询比较普通查根和路径压缩。",
  comparison: "同一初始父链上的普通查根与路径压缩",
  topics: ["disjoint-set-path-compression"],
  input: {
    setNodes: { kind: "integer", min: 2, max: 16, label: "元素数", hint: "2–16 个元素。编号从 0 开始。" },
    setMerges: { kind: "rows", columns: [[0, 15], [0, 15]], minItems: 0, maxItems: 32, label: "合并对", hint: "每行两个有效编号。将前根挂到后根。" },
    setLookups: { kind: "list", min: 0, max: 15, minItems: 1, maxItems: 24, label: "查询编号", hint: "1–24 个有效编号。可重复查询。" },
  },
  defaults: { goalLabel: "比较重复查询的跳数。", setNodes: 6, setMerges: [[0, 1], [1, 2], [2, 3], [3, 4]], setLookups: [0, 0, 1, 0] },
  check: ({ setNodes, setMerges, setLookups }) => setMerges.every(([a, b]) => a < setNodes && b < setNodes) && setLookups.every((node) => node < setNodes),
  columns: ["查询节点", "普通路径", "压缩前路径", "压缩后路径", "共同根"],
  metricLabels: { setComponents: "集合数", plainRootHops: "普通查根跳数", compressedRootHops: "压缩查根跳数", parentRewrites: "父指针改写数" },
  focusMetric: "compressedRootHops",
  alternateTrial: "换成只查根节点。观察跳数差是否消失。",
  run({ setNodes, setMerges, setLookups }) {
    const parents = Array.from({ length: setNodes }, (_, node) => node);
    let setComponents = setNodes;
    for (const [a, b] of setMerges) {
      const rootA = parentPath(parents, a).at(-1)!;
      const rootB = parentPath(parents, b).at(-1)!;
      if (rootA === rootB) continue;
      parents[rootA] = rootB;
      setComponents--;
    }
    const compressed = [...parents];
    let plainRootHops = 0;
    let compressedRootHops = 0;
    let parentRewrites = 0;
    const steps = setLookups.map((node) => {
      const plain = parentPath(parents, node);
      const shortened = parentPath(compressed, node);
      const root = shortened.at(-1)!;
      plainRootHops += plain.length - 1;
      compressedRootHops += shortened.length - 1;
      for (const member of shortened.slice(0, -1)) {
        if (compressed[member] === root) continue;
        compressed[member] = root;
        parentRewrites++;
      }
      return [node, plain.join(" → "), shortened.join(" → "), parentPath(compressed, node).join(" → "), root] as const;
    });
    return { steps, metrics: { setComponents, plainRootHops, compressedRootHops, parentRewrites }, report: {
      conclusion: gapText(plainRootHops, compressedRootHops, "普通查根", "路径压缩", "跳"),
      detail: `合并后有 ${setComponents} 个集合。两边各查 ${setLookups.length} 次。普通查根共 ${plainRootHops} 跳。压缩查根共 ${compressedRootHops} 跳。`,
      explanation: "普通查根沿父链走。压缩把经过的点挂到根。两边返回同一个根。" +
        `本轮共改写 ${parentRewrites} 个父指针。改写次数单列。`,
      suggestion: "保留合并对。重复查询同一节点。对比前后父链。",
    } };
  },
});

export const kmpSearchLab = defineCurriculumLab({
  id: "kmp-search", domain: "algorithms", title: "KMP 与重叠匹配",
  description: "比较逐起点匹配和 KMP。分开统计前缀表准备与正文比较。",
  comparison: "同一文本中的朴素匹配与 KMP",
  topics: ["kmp-prefix-function", "kmp-overlap-continue"],
  input: {
    kmpText: { kind: "text", maxLength: 36, label: "正文", hint: "1–36 个英文字母或数字。区分大小写。" },
    kmpPattern: { kind: "text", maxLength: 12, label: "查找模式", hint: "1–12 个英文字母或数字。" },
  },
  defaults: { goalLabel: "看 KMP 怎样继续找重叠项。", kmpText: "ababababa", kmpPattern: "aba" },
  check: ({ kmpText, kmpPattern }) => /^[A-Za-z0-9]+$/.test(kmpText) && /^[A-Za-z0-9]+$/.test(kmpPattern),
  columns: ["阶段", "当前位置", "对照位置", "比较结果或动作"],
  metricLabels: { kmpMatches: "匹配数", kmpStarts: "匹配起点", kmpBodyChecks: "KMP 正文比较数", kmpTableChecks: "前缀表比较数", naiveStringChecks: "朴素匹配比较数" },
  focusMetric: "kmpMatches",
  alternateTrial: "只把模式改成 abab。看看仍有几处重叠。",
  run({ kmpText, kmpPattern }) {
    const prefix = Array<number>(kmpPattern.length).fill(0);
    const steps: [string, number, number, string][] = [];
    let kmpBodyChecks = 0;
    // `matched` remains the longest reusable prefix after falling back.
    const advance = (character: string, position: number, matched: number, stage: string) => {
      for (;;) {
        const equal = character === kmpPattern[matched];
        steps.push([stage, position, matched, equal ? "字符相等" : matched ? `回退到 ${prefix[matched - 1]}` : "移到下一位"]);
        if (equal) return matched + 1;
        if (!matched) return 0;
        matched = prefix[matched - 1];
      }
    };
    for (let i = 1; i < prefix.length; i++) prefix[i] = advance(kmpPattern[i], i, prefix[i - 1], "构造前缀表");
    const kmpTableChecks = steps.length;
    const starts: number[] = [];
    let matched = 0;
    for (let i = 0; i < kmpText.length; i++) {
      const before = steps.length;
      matched = advance(kmpText[i], i, matched, "KMP 查找");
      kmpBodyChecks += steps.length - before;
      if (matched === prefix.length) {
        const start = i + 1 - prefix.length;
        starts.push(start);
        matched = prefix[matched - 1];
        steps.push(["完整匹配", i, start, `保留前缀长度 ${matched}`]);
      }
    }
    let naiveStringChecks = 0;
    for (let i = 0; i <= kmpText.length - kmpPattern.length; i++) {
      for (let j = 0; j < kmpPattern.length; j++) {
        naiveStringChecks++;
        const equal = kmpText[i + j] === kmpPattern[j];
        steps.push(["逐起点查找", i + j, j, equal ? "字符相等" : "换起点"]);
        if (!equal) break;
      }
    }
    return { steps, metrics: { kmpMatches: starts.length, kmpStarts: sequenceText(starts), kmpBodyChecks, kmpTableChecks, naiveStringChecks }, report: {
      conclusion: starts.length ? `找到 ${starts.length} 处匹配。首处从 ${starts[0]} 开始。` : "正文中没有完整匹配。",
      detail: `正文有 ${kmpText.length} 个字符。模式有 ${kmpPattern.length} 个字符。匹配起点从 0 数。起点为 ${sequenceText(starts)}。朴素比较 ${naiveStringChecks} 次。KMP 正文比较 ${kmpBodyChecks} 次。计入准备共 ${kmpBodyChecks + kmpTableChecks} 次。`,
      explanation: `前缀表另用 ${kmpTableChecks} 次比较。` + "失配时复用已对齐前缀。正文下标不用倒退。匹配后保留可复用前缀。这样能接着找重叠项。",
      suggestion: "固定正文。只改模式。对照匹配起点和比较次数。",
    } };
  },
});

export const kruskalLab = defineCurriculumLab({
  id: "kruskal-mst", domain: "algorithms", title: "Kruskal 最小生成树",
  description: "按权重检查无向边。每次连接两个不同分量，拒绝会形成环的边。",
  topics: ["kruskal-cycle-rejection", "spanning-tree-cut"],
  input: {
    mstVertices: { kind: "integer", min: 1, max: 12, label: "顶点数", hint: "1–12 个顶点。下标从 0 起。" },
    mstEdges: { kind: "rows", columns: [[0, 11], [0, 11], [-99, 99]], minItems: 0, maxItems: 24, label: "无向边（两端, 权重）", hint: "每行 [起点, 终点, 权重]。端点有效。不允许自环或重复边。" },
  },
  defaults: { goalLabel: "观察轻边入选和成环边跳过。", mstVertices: 5, mstEdges: [[0, 1, 1], [1, 2, 2], [0, 2, 3], [2, 3, 4], [3, 4, 5], [1, 4, 9]] },
  check: ({ mstVertices, mstEdges }) => mstEdges.every(([a, b]) => a < mstVertices && b < mstVertices && a !== b) &&
    new Set(mstEdges.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`)).size === mstEdges.length,
  columns: ["无向边", "权重", "处理结果", "当前总权重", "分量数"],
  metricLabels: { mstWeight: "选中边权重和", mstAccepted: "入选边数", mstSkipped: "拒环边数", mstComponents: "剩余连通分量", mstSelected: "入选边" },
  focusMetric: "mstWeight",
  alternateTrial: "删去连向 4 的边。看结果是否变成森林。",
  run({ mstVertices, mstEdges }) {
    const parents = Array.from({ length: mstVertices }, (_, node) => node);
    const ordered = mstEdges.map(([a, b, weight]) => ({ a: Math.min(a, b), b: Math.max(a, b), weight }))
      .sort((a, b) => a.weight - b.weight || a.a - b.a || a.b - b.b);
    const selected: string[] = [];
    let mstWeight = 0;
    let mstComponents = mstVertices;
    const steps = ordered.map(({ a, b, weight }) => {
      const rootA = parentPath(parents, a).at(-1)!;
      const rootB = parentPath(parents, b).at(-1)!;
      const accept = rootA !== rootB;
      const name = `${a}—${b}`;
      if (accept) {
        parents[rootA] = rootB;
        selected.push(name);
        mstWeight += weight;
        mstComponents--;
      }
      return [name, weight, accept ? "连接两个分量" : "形成环，跳过", mstWeight, mstComponents] as const;
    });
    const mstSkipped = ordered.length - selected.length;
    return { steps: steps.length ? steps : [["无边", "—", "保留孤立顶点", 0, mstComponents]],
      metrics: { mstWeight, mstAccepted: selected.length, mstSkipped, mstComponents, mstSelected: selected.join("、") || "无" }, report: {
        conclusion: mstComponents === 1 ? `得到生成树。总权重 ${mstWeight}。` : `图不连通。得到 ${mstComponents} 个分量的森林。`,
        detail: `共有 ${mstVertices} 个顶点。检查 ${ordered.length} 条边。选中 ${selected.length} 条。总权重为 ${mstWeight}。`,
        explanation: "边按权重从小到大处理。平局按端点编号排。同一分量内加边会成环。" +
          `本轮拒绝 ${mstSkipped} 条边。孤立顶点单独计一个分量。`,
        suggestion: "固定其他边。只改一个边权。观察哪条边进入结果。",
      } };
  },
});
