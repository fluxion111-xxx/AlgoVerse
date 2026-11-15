import type { DeepLesson } from "./types";

export const totalProbabilityLesson: DeepLesson = {
  title: "从分组算全概率",
  intro: "两座仓库的迟发率分别是 1% 和 6%。总体迟发率要看各自发了多少单。",
  goals: ["检查分组是否互斥且完备。", "用联合事件推导全概率。", "区分组内变化和份额变化。"],
  blocks: [
    { id: "partition", kind: "explain", title: "先把样本空间切干净", paragraphs: [
      "从所有订单中等概率抽一单。用 D 表示迟发。用 A、B 表示这单由哪座仓发出。",
      "假设每单只归一座仓。A、B 不重叠，且覆盖全部订单。这两条条件让它们构成一个划分。",
      "迟发也随之分成互斥的两支。把两支联合概率相加。每支联合概率可改写为组内迟发率乘该组份额。",
    ], formula: "P(D) = P(D∩A) + P(D∩B)\n     = P(D|A)P(A) + P(D|B)P(B)" },
    { id: "orders", kind: "steps", title: "对照两份万单账本", steps: [
      { label: "分出每组订单", text: "A 仓占八成，有 8000 单。B 仓有 2000 单。两仓迟发率分别是 1% 和 6%。" },
      { label: "分别换算迟发量", text: "A 仓贡献 80 单。B 仓贡献 120 单。共 200 单迟发，占全部订单的 2%。" },
      { label: "改派一半订单", text: "保持组内率，改为各 5000 单。现在分别迟发 50 和 300 单。总率变成 3.5%。" },
      { label: "解释总率上升", text: "两仓组内率完全没变。高迟发组占比上升，就能推高总体率。分开报告这两类变化。" },
    ] },
    { id: "failure", kind: "explain", title: "两个组能直接加吗？", paragraphs: [
      "按加急和跨境分组时，一单可能进入两组。直接相加会重数交集。可以先按两个标记切出互斥子组。",
      "如果还存在第三方仓，用 A、B 就漏了一支。要补进第三组，也可以明确只讨论 A、B 的子人群。",
      "空组的联合贡献为零。它的条件率不能用零单相除。本课模型在占比为零时把这组贡献显示为零。",
      "真实调度可能改变各仓拥堵，也会改变组内率。面板固定组内率，演示的是份额变化的单独影响。",
    ] },
  ],
  demo: "weighted-groups",
  exercises: [
    { id: "deep-total-partition", level: "基础", kind: "single", prompt: "要直接按组相加。分组应满足什么？", options: ["互斥且覆盖全部", "可以相互重叠", "必须同样大"], answer: 0,
      explanation: "互斥防止重数。覆盖防止漏数。", wrong: "逐单检查是否恰好落一组。", review: "partition" },
    { id: "deep-total-count", level: "应用", kind: "integer", prompt: "占比各半时，本课万单样本迟发几单？", answer: 350,
      explanation: "5000×1% 为 50。5000×6% 为 300。合计 350。", wrong: "先算两个组内人数。", review: "orders" },
    { id: "deep-total-boundary", level: "挑战", kind: "multiple", prompt: "关于这套分组模型，哪些说法成立？", options: ["组内率相同则份额不影响总率", "重叠组可以直接求和", "空组的联合贡献为零", "遗漏第三组会漏计它的贡献"], answer: [0, 2, 3],
      explanation: "同率的加权平均仍等于该率。空组没有样本。相加前要检查划分是否完整。",
      wrong: "核查份额总和及交集。", review: "failure" },
  ],
  recap: ["划分必须互斥且完备。", "组内率乘组份额。", "组间变化能推高总率。"],
  extension: "把 A 仓份额调到 0%。再看分组会怎样改变独立性判断。",
  next: "conditional-independence-groups",
  sources: [{ title: "MIT 6.041SC · Total Probability Theorem", href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/337c2b848282f31191196653a3fd7a45_MIT6_041SCF13_quiz01_revi.pdf" }],
};
