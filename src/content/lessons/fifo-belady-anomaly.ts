import type { DeepLesson } from "./types";

export const fifoBeladyAnomalyLesson: DeepLesson = {
  title: "FIFO 的 Belady 异常",
  intro: "给同一程序多一个页框，缺页一定会少吗？用同一访问串回放两次，看看哪一步扭转了结果。",
  goals: ["用固定输入复现缺页反增。", "从队列顺序找到分叉点。", "用栈包含关系解释 LRU。"],
  blocks: [
    { id: "queue", kind: "explain", title: "只让容量变化", paragraphs: [
      "FIFO 让缺页装入的页进队尾。内存满时淘汰队头。命中只增加命中数，页的入队次序不变。",
      "两轮使用相同访问串。每轮都从空页框开始。只把容量由 3 改成 4。首次装入同样计为缺页。",
      "如果容量增加后缺页反而更多，就观察到了 Belady 异常。某一时刻大容量缺得更多，还不能替代整轮计数。",
    ] },
    { id: "trace", kind: "steps", title: "按队头到队尾推演", steps: [
      { label: "先过第 1 到 6 步", text: "访问 1、2、3、4、1、2。三框队列变成 [4,1,2]，累计缺页 6 次。四框仍为 [1,2,3,4]，只有 4 次缺页。" },
      { label: "第 7 步访问页 5", text: "三框淘汰 4，得到 [1,2,5]。四框淘汰 1，得到 [2,3,4,5]。四框没有包含三框中的页 1。" },
      { label: "第 8 到 9 步重读 1、2", text: "三框两次命中。四框先为页 1 换出页 2，然后又要装回页 2。到这里，两轮都累计缺页 7 次。" },
      { label: "第 10 到 12 步读 3、4、5", text: "三框先换出 1 和 2，最后命中 5。四框依次缺 3、4、5。总缺页 9 比 10。" },
    ] },
    { id: "checkpoints", kind: "explain", title: "找出决定结果的一步", paragraphs: [
      "回放表按物理槽位摆放页号。队列按装入时间排列。可以结合淘汰栏还原队头，别直接取表中最左一格。",
      "在第 11 步停住，两轮都缺页 9 次。四框刚换走了 5，三框还留着它。最后一次访问使累计缺页数反转。",
      "删去序列末尾的页 5 再跑。第 11 步就是全程结束。这时只有队列分叉，没有出现整轮缺页反增。",
    ], formula: "访问位置       6   7   9  11  12\n3 框 FIFO      6   7   7   9   9\n4 框 FIFO      4   5   7   9  10" },
    { id: "stack", kind: "explain", title: "为什么 LRU 没有反转", paragraphs: [
      "把所有访问过的不同页按最近访问时间排序。每读一次，就把该页移到最前。这个顺序只由访问串决定。",
      "LRU 容量为 k 时，对应前 k 个页。前 k 项总能落在前 k+1 项里。小容量能命中的页，大容量也能命中。",
      "在本案例里，LRU 的缺页从 10 次降到 8 次。FIFO 和 LRU 的优劣仍要对照同一串和同一容量。",
      "这项试跑只计命中和缺页。实际耗时还要看脏页写回、后备存储和系统开销。",
    ] },
  ],
  demo: "page-replacement",
  exercises: [
    { id: "deep-belady-evict", level: "基础", kind: "single", prompt: "第四个页框启用后，第 7 步装入页 5 会淘汰谁？",
      options: ["页 1", "页 2", "页 4"], answer: 0,
      explanation: "页 1 装入最早。中途命中没有改变 FIFO 次序。", wrong: "核对前六次访问后的队头。", review: "trace" },
    { id: "deep-belady-prefix", level: "应用", kind: "integer", prompt: "删去序列末尾的页 5。四框 FIFO 全程缺页几次？",
      answer: 9, explanation: "原串四框最后一次缺页。删去它就从 10 降到 9。", wrong: "看第 11 步的累计数。", review: "checkpoints" },
    { id: "deep-belady-stack", level: "挑战", kind: "multiple", prompt: "同一访问串、空框起步。哪些判断成立？",
      options: ["第 7 步后四框 FIFO 不含页 1", "第 9 步后四框已比三框多缺页", "LRU 的小容量驻留集合包含于大容量集合", "删去最后一项后两轮 FIFO 缺页相等"],
      answer: [0, 2, 3], explanation: "第 9 步后都缺页 7 次。最后一步才让四框缺页反超。LRU 由栈包含关系保证单调性。",
      wrong: "分清累计缺页数与驻留页集合。", review: "checkpoints" },
  ],
  recap: ["FIFO 命中不换队序。", "多一框可以改写淘汰轨迹。", "LRU 有栈包含关系。"],
  extension: "删掉最后一个 5 再试跑。下一节用重用距离提前判断 LRU 的命中。",
  next: "lru-stack-distance",
  sources: [{ title: "OSTEP · Belady’s Anomaly", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf" }],
};
