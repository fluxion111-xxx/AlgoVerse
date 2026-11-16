import { defineCurriculumLab, gapText, sequenceText } from "./curriculumLab";

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
