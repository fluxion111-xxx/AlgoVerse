import type { DeepLesson } from "./types";

export const memoryAllocationLesson: DeepLesson = {
  title: "连续内存分配与外部碎片",
  intro: "堆里空出了 8 格。程序申请 7 格，却失败了。把地址排成一条线，看看空间去了哪。",
  goals: ["读出每块的起始地址和长度。", "推演拆块与相邻空块合并。", "区分容量不足与外部碎片。"],
  blocks: [
    { id: "holes", kind: "explain", title: "空闲总量和最大空块", paragraphs: [
      "把堆想成一排连续地址。每个块记录起始地址、长度和归属。没有归属的块可以分配。",
      "一次申请要拿到连续地址。空块分散时，总量和最大块不同。最大块不够大，就可能遇到外部碎片。",
      "本课按格分配固定大小的堆。占用块不会移动。实用分配器还要处理对齐和元数据。",
    ], formula: "F = 所有空块长度之和\nM = 最大空块长度（没有空块时为 0）\n请求 k > F → 容量不足\nM < k ≤ F → 外部碎片" },
    { id: "strategies", kind: "steps", title: "两种策略怎么选块", steps: [
      { label: "先铺满 24 格", text: "A、B、C、D 依次占 8、4、5、7 格。起始地址是 0、8、12、17。" },
      { label: "释放 A 和 C", text: "留下长度 8 和 5 的空块。B 还在中间。两块不能合并。" },
      { label: "给 E 分 5 格", text: "首次适配选地址 0。余下地址 5 起的 3 格。最佳适配选地址 12 的 5 格。地址 0 的 8 格留着。" },
      { label: "再给 F 分 7 格", text: "首次适配还有 3 + 5 格。最大块是 5，F 失败。最佳适配还有连续 8 格。F 在地址 0 成功。" },
    ] },
    { id: "coalesce", kind: "explain", title: "释放与合并的顺序", paragraphs: [
      "先标记块为空闲。再检查左右邻居。相邻且都空闲，就能合并。合并不会改变空闲总量。它可能增大最大空块。",
      "把释放 B 放在释放 C 之后。地址 [0, 8)、[8, 12)、[12, 17) 都空。两次合并得到 [0, 17)。",
      "最佳适配在本例中保留了大块。后续请求不同，结果也可能不同。比较时要固定请求顺序。",
    ] },
  ],
  demo: "memory",
  exercises: [
    { id: "deep-heap-fit", level: "基础", kind: "single", prompt: "两个空块按地址排序，长度是 8 和 5。申请 5 格时，最佳适配选哪块？",
      options: ["长 8 的块", "长 5 的块", "把两块合起来"], answer: 1,
      explanation: "两个块都够大。最佳适配选较小的那块。", wrong: "先筛掉放不下的块，再比较长度。", review: "strategies" },
    { id: "deep-heap-coalesce", level: "应用", kind: "integer", prompt: "在分配 E 之前，A、C、B 都已释放。最大空块有几格？",
      answer: 17, explanation: "A、B、C 地址相邻。长度相加为 8 + 4 + 5 = 17。D 仍占 7 格。",
      wrong: "释放 B 后，它的两边都空闲。", review: "coalesce" },
    { id: "deep-heap-fragmentation", level: "挑战", kind: "multiple", prompt: "默认案例中，首次适配处理 F 前，哪些描述正确？",
      options: ["空闲总量是 8", "最大空块是 8", "申请 7 格会遇到外部碎片", "拆成两次独立申请 3 和 4 格都能成功"], answer: [0, 2, 3],
      explanation: "两块长 3 和 5。连续 7 格放不下。独立请求 3 格和 4 格可各用一块。",
      wrong: "分清一次连续申请和两次独立申请。", review: "holes" },
  ],
  recap: ["用地址判断空块能否合并。", "分配要看最大空块。", "策略好坏取决于请求序列。"],
  extension: "在两种策略上复跑同一组请求。试着只改释放顺序。再读分页与页表。",
  next: "virtual-pages",
  sources: [{ title: "OSTEP · Free-Space Management", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf" }],
};
