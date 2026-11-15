import type { DeepLesson } from "./types";

export const balancedMasterTheoremLesson: DeepLesson = {
  title: "主定理的平衡情形",
  intro: "下一层的子问题更多，但每个都更小。两个变化刚好抵消时，总成本会增长多少？",
  goals: ["算出相邻层工作量的比值。", "验证主定理的平衡条件。", "用精确层和检查量级。"],
  blocks: [
    { id: "balance", kind: "explain", title: "让两个倍率相乘", paragraphs: [
      "本例取 n=bᵏ。每个节点产生 a 个子问题，每个规模是原来的 1/b。节点本身的工作量取 mᵈ。",
      "下一层节点数变为 a 倍。单点工作量变为 1/bᵈ。两者相乘，整层总工作量的倍率是 a/bᵈ。",
      "若 a=bᵈ，整层工作量保持不变。此时 log_b a=d，递归分支规模与本地工作量的指数相同。",
      "子问题可以重叠。递推中的 a 个调用不等于把输入分成 a 块互不重叠的记录。",
    ], formula: "T(1)=1\nT(n)=aT(n/b)+nᵈ\n内层工作量=nᵈ·(a/bᵈ)ˡ\n平衡时 T(n)=nᵈ(log_b n+1)" },
    { id: "trace", kind: "steps", title: "把 27 代入九分支案例", steps: [
      { label: "选好三个参数", text: "令 b=3、d=2、k=3。规模为 27。为使每层等重，取 a=3²=9。" },
      { label: "算根和下一层", text: "根成本为 27²=729。下一层有 9 个节点，每个规模 9。9×9² 仍是 729。" },
      { label: "算到底层", text: "再下一层有 81 个规模 3 的节点，总成本也是 729。叶层有 729 个节点，各耗 1。四层合计 2916。" },
      { label: "只改分支数", text: "a 降为 8 时，层间比为 8/9，逐层变轻。a 增为 10 时，层间比为 10/9，逐层变重。" },
    ] },
    { id: "scope", kind: "explain", title: "先核对成本函数的形状", paragraphs: [
      "在本节模型中，平衡时有约 log_b n 层等重。总量因此是 Θ(nᵈ log n)。对数来自需要把多层相加。",
      "精确等式依赖 n 是 b 的整次幂和课内底界。若题目有取整或常数倍，通常需要按递推重新给出精确值。",
      "若 f(n) 额外乘上 log n，层工作量要再乘随层数变化的项。只比较指数还不足以套用本课的精确公式。",
    ] },
  ],
  demo: "master-balanced-levels",
  exercises: [
    { id: "deep-master-condition", level: "基础", kind: "single", prompt: "本课哪项表示整层等重？", options: ["a 等于 bᵈ", "a 总等于 b", "只有 d=0"],
      answer: 0, explanation: "把节点倍率和单点倍率相乘，结果恰好为 1。", wrong: "先求 a/bᵈ。", review: "balance" },
    { id: "deep-master-total", level: "应用", kind: "integer", prompt: "默认参数的总工作量是多少？", answer: 2916,
      explanation: "三层内部节点加一层叶子，每层 729，合计 2916。", wrong: "叶层也要计成本。", review: "trace" },
    { id: "deep-master-layer", level: "挑战", kind: "multiple", prompt: "哪些判断符合本节模型？",
      options: ["a=8 时层工作量递减", "a=10 时各层仍相同", "加对数因子后需重算层工作量", "平衡时对数因子来自层数"],
      answer: [0, 2, 3], explanation: "层间比控制方向。额外非幂因子会改变层代价。", wrong: "把节点数、点成本、层数分别算。", review: "scope" },
  ],
  recap: ["层间倍率是 a/bᵈ。", "等重时乘上层数。", "先核对本地成本形状。"],
  extension: "令 b=2、d=2。预测平衡所需的 a。接着看分割后只保留一侧的选择算法。",
  next: "quickselect-rank-partition",
  sources: [{ title: "MIT 6.1200J · Recurrences and the Master Theorem", href: "https://live.ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/mit6_1200j_s24_lec07.pdf" }],
};
