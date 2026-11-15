import type { DeepLesson } from "./types";

export const gradientDescentLesson: DeepLesson = {
  title: "梯度下降与学习率",
  intro: "目标就在谷底。你知道往哪走。跨得太大，会更近还是更远？",
  goals: ["从当前位置算梯度和更新。", "用误差乘子判断固定步长。", "区分越过谷底与发散。"],
  blocks: [
    { id: "update", kind: "explain", title: "方向和步幅分开看", paragraphs: [
      "损失越小越好。把损失画成抛物线。最低点在 b，曲率 a 控制弯曲程度。",
      "梯度是此处的斜率。梯度为正就往左走。梯度为负就往右走。学习率 α 决定走多远。",
      "每步都从旧位置算梯度。到新位置后，再重算梯度和损失。",
    ], formula: "L(w) = a(w − b)² / 2\n梯度 g = a(w − b)\n新位置 = w − αg" },
    { id: "trace", kind: "steps", title: "固定起点，只换学习率", steps: [
      { label: "先算初始损失", text: "取 a = 2，b = 0。起点 4，梯度是 8。此时损失为 16。" },
      { label: "学习率取 0.25", text: "第一步到 4 − 0.25 × 8 = 2。损失降为 4。第二步到 1，损失降为 1。" },
      { label: "学习率取 0.75", text: "第一步到 −2。损失仍降为 4。第二步折回 1。它来回跨过谷底，距离却越来越短。" },
      { label: "学习率取 1.25", text: "第一步到 −6。损失升至 36。第二步跳到 9，损失升至 81。方向没算错，步子太大。" },
    ] },
    { id: "stability", kind: "explain", title: "看误差每步乘了几", paragraphs: [
      "设 e = w − b。把更新式两边都减 b。就得到误差的倍数。",
      "想缩小非零误差？乘子绝对值要小于 1。于是要满足 0 < αa < 2。",
      "乘子为负会换边。绝对值小于 1 时仍可收敛。等于 1 时距离不变，大于 1 就发散。",
      "边界适用本课的固定曲率模型。回放用对数压缩损失轴。表格列出实际值。",
    ], formula: "eₖ₊₁ = (1 − αa)eₖ\n当 eₖ ≠ 0 时，Lₖ₊₁ / Lₖ = (1 − αa)²" },
  ],
  demo: "gradient-descent",
  exercises: [
    { id: "deep-gradient-direction", level: "基础", kind: "single", prompt: "当前位置梯度为正。学习率也为正。下一步往哪走？",
      options: ["往左，位置变小", "往右，位置变大", "保持原位"], answer: 0,
      explanation: "更新要减去正数 αg，因此新位置更小。", wrong: "更新式里是减梯度。", review: "update" },
    { id: "deep-gradient-position", level: "应用", kind: "integer", prompt: "默认起点是 4。曲率 2，谷底 0。学习率 0.25。第一步的位置是多少？",
      answer: 2, explanation: "梯度为 2 × 4 = 8。新位置为 4 − 0.25 × 8 = 2。",
      wrong: "先算旧位置的梯度。答案填位置。", review: "trace" },
    { id: "deep-gradient-stable", level: "挑战", kind: "multiple", prompt: "曲率是 2，起点不在谷底。固定步长下哪些说法正确？",
      options: ["α=0.75 时跨谷底，距离变小", "α=1 时距离每步不变", "α=1.25 时损失逐步减小", "α=0.5 时一步到谷底"], answer: [0, 1, 3],
      explanation: "四个误差乘子依次为 −0.5、−1、−1.5、0。看绝对值就能判断距离怎样变。",
      wrong: "翻过谷底只表示乘子为负。还要看其绝对值。", review: "stability" },
  ],
  recap: ["负梯度决定方向。", "学习率和曲率一起决定稳定性。", "越过谷底仍可能收敛。"],
  extension: "把起点设为谷底。看看为什么无需再走。再用步长区间练习反推曲率。",
  next: "quadratic-gradient-stable-step",
  sources: [{ title: "Stanford EE364b · Minimizing a quadratic", href: "https://see.stanford.edu/materials/lsocoee364b/hw3sol.pdf" }],
};
