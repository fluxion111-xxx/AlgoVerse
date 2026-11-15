import type { DeepLesson } from "./types";

export const pageReplacementLesson: DeepLesson = {
  title: "FIFO 与 LRU 页面置换",
  intro: "只剩两个页框。新页要进来。刚读过的旧页该不该被换走？",
  goals: ["区分命中、缺页和淘汰。", "读懂三种策略的淘汰记录。", "复现 FIFO 的 Belady 异常。"],
  blocks: [
    { id: "policies", kind: "explain", title: "三种策略各看什么", paragraphs: [
      "页框是内存里的一个槽。已经装入的页再次访问，算命中。页不在内存里，才算缺页。",
      "有空框就直接装入。页框满时，才挑一页淘汰。首次装入也计缺页。",
      "FIFO 换出最早装入的页。LRU 换出最久没访问的页。OPT 先找不再用的页。都还会用，就换最晚再用的页。",
      "OPT 用来当理论基准。真实系统事先看不到完整访问序列。",
    ] },
    { id: "trace", kind: "steps", title: "用两个页框走四步", steps: [
      { label: "访问 1 和 2", text: "空框依次装入 1、2。两次都计缺页。页 1 先装，页 2 后装。" },
      { label: "再访问页 1", text: "这次命中。FIFO 仍把页 1 排在最前。LRU 更新页 1 的访问时间。页 2 成了最久没访问的页。" },
      { label: "访问页 3", text: "此时缺页。FIFO 淘汰页 1。LRU 淘汰页 2。四步走完，两者都缺页 3 次。" },
      { label: "加一次对页 1 的访问", text: "FIFO 已换出页 1，再缺一次。LRU 仍有页 1，这次命中。缺页数现在是 4 比 3。" },
    ] },
    { id: "anomaly", kind: "explain", title: "页框更多也可能多缺页", paragraphs: [
      "复跑默认序列。FIFO 用 3 框时缺页 9 次。改为 4 框后缺页 10 次。",
      "多一框会改变装入顺序。第 7 次访问页 5 后，小队列里还有页 1 和页 2。大队列却刚换出页 1。第 8 次访问由此分叉。",
      "这叫 Belady 异常。保持引用序列不变。LRU 多加页框也不会多缺页。每一步，小容量的页也都在大容量里。",
    ], formula: "缺页数 + 命中数 = 引用次数\n缺页率 = 缺页数 ÷ 引用次数" },
  ],
  demo: "page-replacement",
  exercises: [
    { id: "deep-page-hit", level: "基础", kind: "single", prompt: "访问一个已经驻留的页。LRU 会更新什么？",
      options: ["该页的最近访问时间", "该页的装入时间", "缺页计数"], answer: 0,
      explanation: "命中也会刷新最近访问时间。该页的装入时间不变。", wrong: "区分何时装入与何时使用。", review: "policies" },
    { id: "deep-page-faults", level: "应用", kind: "integer", prompt: "两个空页框走 1、2、1、3、1。FIFO 共缺页几次？",
      answer: 4, explanation: "第 1、2、4、5 次缺页。第 4 次淘汰了最早装入的页 1。",
      wrong: "命中页 1 不会改变 FIFO 次序。", review: "trace" },
    { id: "deep-page-anomaly", level: "挑战", kind: "multiple", prompt: "引用序列固定。哪些说法成立？",
      options: ["FIFO 增加页框可能多缺页", "LRU 增加页框不会多缺页", "首次装入空框算命中", "OPT 通过未来引用作选择"], answer: [0, 1, 3],
      explanation: "默认序列能复现 FIFO 异常。LRU 有包含关系。OPT 的基准依赖未来序列。",
      wrong: "分别检查策略依据与首次访问。", review: "anomaly" },
  ],
  recap: ["命中会更新 LRU 的访问顺序。", "比较时固定引用序列。", "OPT 需要未来信息。"],
  extension: "把默认页框从 3 改成 4。对照第 7、8 步。再读 Belady 异常。",
  next: "fifo-belady-anomaly",
  sources: [{ title: "OSTEP · Beyond Physical Memory: Policies", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf" }],
};
