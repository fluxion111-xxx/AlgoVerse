import type { DeepLesson } from "./types";

export const reclaimRefaultLesson: DeepLesson = {
  title: "回收后的复访与工作集",
  intro: "缺页有六次。哪些页第一次出现？哪些页刚换出又被访问？这两类事件要分开看。",
  goals: ["从淘汰轨迹定位复访。", "比较帧数与复访计数。", "解释 Linux 指标的证据边界。"],
  blocks: [
    { id: "meaning", kind: "explain", title: "把冷缺页和复访分开", paragraphs: [
      "本课从空框按 LRU 回放。首次访问某页而缺页，计为冷缺页。已见过且被淘汰的页再缺页，计为复访缺页。",
      "复访不一定缺页。页若仍驻留，结果就是命中。要对照该页上次装入和被换出的时刻。",
      "Linux cgroup v2 提供 workingset_refault_anon 和 workingset_refault_file。它们按页面来源记录内核识别的复访。",
    ] },
    { id: "trace", kind: "steps", title: "固定一条八步访问串", steps: [
      { label: "先装两个页", text: "访问串为 1、2、1、3、4、1、2、1。两框下，1 和 2 首次装入。第 3 步读 1 命中。" },
      { label: "跟着两次冷装入", text: "第 4 步页 3 换出 2。第 5 步页 4 换出 1。两步访问的新页都是首次出现，属于冷缺页。" },
      { label: "先后重读 1 和 2", text: "第 6 步再要页 1。它已被换出，计一次复访缺页。第 7 步页 2 同理。最后再读 1 命中。全程六次缺页，复访两次。" },
      { label: "只加一个页框", text: "三框在第 5 步换出 2。第 6 步读 1 命中，第 7 步仍须重装 2。全程五次缺页，复访一次。" },
    ] },
    { id: "evidence", kind: "explain", title: "真实系统看时段差值", paragraphs: [
      "在同一 cgroup 和同一观测窗口里取计数增量。累计值会混入此前负载。不要用两个不同窗口的总数直接比较。",
      "示例采样从 100 到 124，复访增量是 24。若同时看到内存压力上升和停顿增加，才有更多证据排查工作集过大。",
      "内核复访计数与磁盘读次数不同。缓存路径和记录范围都会影响它。面板使用站内 LRU，只算这条引用串中的事件。",
    ], formula: "区间复访次数 = 同口径期末计数 − 期初计数" },
  ],
  demo: "lru-refault-trace",
  exercises: [
    { id: "deep-refault-cold", level: "基础", kind: "single", prompt: "第 4 步首次装入 3，属于哪种缺页？", options: ["冷缺页", "复访缺页", "不是缺页"],
      answer: 0, explanation: "此前从未引用页 3。即便该次同时淘汰了别页，也仍是冷缺页。", wrong: "先看该页是否出现过。", review: "meaning" },
    { id: "deep-refault-count", level: "应用", kind: "integer", prompt: "用两框回放，复访缺页共有几次？", answer: 2,
      explanation: "第 6 步的页 1 和第 7 步的页 2 在重读前都已被换出。", wrong: "不要把首次访问也计入复访。", review: "trace" },
    { id: "deep-refault-evidence", level: "挑战", kind: "multiple", prompt: "要用内核计数排查，哪些做法合理？",
      options: ["取同一窗口的增量", "用复访计数直接代替磁盘读取数", "分别观察文件页和匿名页", "结合内存压力和停顿"],
      answer: [0, 2, 3], explanation: "计数的口径和观测窗口都要对齐。单个复访指标不足以确定真实代价。", wrong: "区分回收事件与实际 I/O。", review: "evidence" },
  ],
  recap: ["先数冷缺页，再数复访。", "复访缺页要追溯淘汰。", "内核计数按时段解读。"],
  extension: "把页框改为四个，复访消失，冷缺页仍在。再看 Linux 如何为回收页分代。",
  next: "linux-mglru-generation-aging",
  sources: [{ title: "Linux Kernel · Control Group v2, memory.stat", href: "https://docs.kernel.org/admin-guide/cgroup-v2.html" }],
};
