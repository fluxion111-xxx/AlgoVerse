import type { DeepLesson } from "./types";

export const dynamicArrayLesson: DeepLesson = {
  title: "动态数组与均摊成本",
  intro: "每次追加都要写一个新元素。有时还要搬整段旧数据。为什么翻倍扩容的均摊成本仍然很低？",
  goals: ["分开记录长度、容量与搬移。", "推导两种增长规则的总成本。", "区别均摊代价和单次延迟。"],
  blocks: [
    { id: "capacity", kind: "explain", title: "容量与长度各数什么", paragraphs: [
      "长度是已经写入的元素数。容量是当前缓冲区能容纳的项数。只要还有空位，追加就能直接写入。",
      "缓冲区满后，模型申请更大的连续空间。先搬旧元素，再写新元素。扩容后，旧元素的地址可能变化。",
      "把每次新写入记作 1。搬一个旧元素也记作 1。以下用这个模型比较算法。分配器和硬件的耗时另算。",
    ] },
    { id: "trace", kind: "steps", title: "从容量 1 追加到 9", steps: [
      { label: "先填空位", text: "第 1 次直接写入。第 2 次发现容量已满。翻倍到 2，先搬 1 项。" },
      { label: "记录搬移项数", text: "第 3、5、9 次也触发扩容。分别搬 2、4、8 项。总搬移为 15，还有 9 次新写入。" },
      { label: "换成每次加一", text: "追加 1 项就可能再次填满。第 2 到第 9 次各搬 1 到 8 项。总计 36 项。" },
      { label: "保持次数，再比延迟", text: "同样追加 9 次，翻倍少搬 21 项。但第 9 次仍要搬 8 项。均摊改善没有抹掉这次峰值。" },
    ] },
    { id: "bound", kind: "explain", title: "为什么总搬移是线性的", paragraphs: [
      "翻倍时，搬移项数是 1、2、4 等。最后一次搬移发生在旧容量 c。此前几次一共搬了 c−1 项。",
      "追加总次数为 n 时，c < n。故总搬移为 2c−1，小于 2n。加上 n 次写入，总成本是 Θ(n)。",
      "每次加一的搬移量构成等差数列。求和得到 n(n−1)/2，量级是 Θ(n²)。",
      "均摊分析覆盖整段操作。它无需假定输入有某种随机分布。实时系统还应关注最坏单次延迟。",
    ], formula: "翻倍：1 + 2 + … + c = 2c − 1 < 2n\n加一：1 + 2 + … + (n−1) = n(n−1)/2" },
  ],
  demo: "array-growth-cost",
  exercises: [
    { id: "deep-growth-length", level: "基础", kind: "single", prompt: "长度 3，容量 4。下一次追加如何处理？", options: ["直接用空槽", "搬迁全部元素", "先缩容"], answer: 0,
      explanation: "还有 1 个空位。该次只写入新元素。", wrong: "先检查还有没有空槽。", review: "capacity" },
    { id: "deep-growth-copy", level: "应用", kind: "integer", prompt: "从容量 1 开始。翻倍策略追加 9 次。总搬移几项？", answer: 15,
      explanation: "搬移出现在旧容量 1、2、4、8 满时。相加为 15。", wrong: "新元素写入不计入搬移。", review: "trace" },
    { id: "deep-growth-bound", level: "挑战", kind: "multiple", prompt: "在本节成本模型中，哪些说法成立？", options: ["翻倍的总搬移是线性的", "翻倍保证每次都只写一项", "加一的总搬移是平方级", "均摊分析无需随机输入"], answer: [0, 2, 3],
      explanation: "几何和给出总上界。个别扩容仍会线性搬移。加一的等差和为平方级。",
      wrong: "把单次峰值和总成本分开看。", review: "bound" },
  ],
  recap: ["有空位时直接追加。", "翻倍用额外容量换较少搬移。", "均摊成本不等于最坏单次。"],
  extension: "运行 8 次和 9 次，观察峰值。再学习迭代器何时因搬移失效。",
  next: "cpp-iterator-invalidation",
  sources: [{ title: "MIT 6.006 · Dynamic arrays and amortization", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/" }],
};
