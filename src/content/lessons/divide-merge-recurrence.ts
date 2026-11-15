import type { DeepLesson } from "./types";

export const divideMergeRecurrenceLesson: DeepLesson = {
  title: "分治递推式",
  intro: "问题每次分成两半。只改每个节点的合并成本，为什么总工作量会差这么多？",
  goals: ["把递推式翻译成树。", "按层计节点和工作量。", "用求和核对两种增长速度。"],
  blocks: [
    { id: "derive", kind: "explain", title: "每层先数节点", paragraphs: [
      "设 n=2ᵏ。规模为 m 的子问题分成两个 m/2。内部节点做 f(m) 次工作。规模为 1 时只做一次。",
      "第 ℓ 层有 2ˡ 个节点，每个规模 n/2ˡ。本层成本是节点数乘单点成本。不要把递归调用重复算进 f。",
      "最后一层有 n 个叶子。一共 k 层内部节点，外加一层叶子。求总量时别漏掉底层。",
    ], formula: "T(1)=1，T(n)=2T(n/2)+f(n)\n内部第 ℓ 层：2ˡ·f(n/2ˡ)\n叶子层：n" },
    { id: "trace", kind: "steps", title: "把规模 8 分到底", steps: [
      { label: "写出节点和大小", text: "从根到叶，各层节点数依次为 1、2、4、8。单个规模依次为 8、4、2、1。" },
      { label: "选择线性合并", text: "根做 8 次。下一层做 2×4 次。再下一层做 4×2 次。叶子合计也为 8。总量为 32。" },
      { label: "选择平方合并", text: "根做 64 次。下一层做 2×16=32 次。再下一层做 4×4=16 次。加上 8 次叶子，合计 120。" },
      { label: "核对 n=1", text: "层数设为 0，树只有一个叶子。两种模式都得到 1，满足递推底界。" },
    ] },
    { id: "growth", kind: "explain", title: "看哪几层贡献最多", paragraphs: [
      "线性工作让每个内部层都花 n。把 k 个 n 与叶子的 n 相加，得到 n(k+1)。层数随对数增长。",
      "平方工作让每个内部层降为上层的一半。各层总量形成几何级数。连上叶子后，和为 2n²−n。",
      "实际任务若分得不均，不能照抄这些层数和规模。应先用题目的子问题大小重新写递推式。",
    ], formula: "线性：n(log₂n+1)\n平方：n²·Σ(1/2)ˡ = 2n²−n（ℓ 从 0 到 k）" },
  ],
  demo: "divide-recurrence-levels",
  exercises: [
    { id: "deep-recurrence-nodes", level: "基础", kind: "single", prompt: "第 ℓ 层的代价该怎样算？", options: ["节点数乘单点代价", "只算一个子问题", "只看树高"],
      answer: 0, explanation: "一层有多个子问题。它们各自的本层工作要加在一起。", wrong: "同时数节点和每点做的工作。", review: "derive" },
    { id: "deep-recurrence-square", level: "应用", kind: "integer", prompt: "n=8 且平方合并时，总成本是多少？", answer: 120,
      explanation: "各层是 64、32、16、8，合计 120。", wrong: "记得加上叶子层。", review: "trace" },
    { id: "deep-recurrence-assumptions", level: "挑战", kind: "multiple", prompt: "按本节的递推树，哪些判断成立？", options: [
      "线性模式内部各层等重", "平方模式所有层仍等重", "n=1 只有叶子成本", "拆分规则改变后需重写递推式",
    ], answer: [0, 2, 3], explanation: "平方模式逐层减半。底界不能从内部节点公式中随意删掉。", wrong: "对照两列层代价。", review: "growth" },
  ],
  recap: ["先求每层总量。", "总成本还含叶子。", "合并项决定层间比例。"],
  extension: "将 k 改为 4。分别预测两种成本，再用主定理确认量级。",
  next: "master-theorem-balanced-case",
  sources: [{ title: "MIT 6.1200J · Recurrences", href: "https://live.ocw.mit.edu/courses/6-1200j-mathematics-for-computer-science-spring-2024/mit6_1200j_s24_lec07.pdf" }],
};
