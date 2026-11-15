import type { DeepLesson } from "./types";

export const jointMarginalLesson: DeepLesson = {
  title: "联合表的边缘化",
  intro: "日志记录了时段和是否超时。现在只想得到超时率。该把哪几格相加？分母取多少？",
  goals: ["用联合表定位对应事件。", "分别求行边缘与列边缘。", "区分总体和条件比例。"],
  blocks: [
    { id: "sum", kind: "explain", title: "丢掉一个维度，保留另一个", paragraphs: [
      "用 X 记录时段，Y 记录是否超时。从日志中等概率抽一条。一个格子代表一对明确取值。",
      "只问是否超时时，普通时段超时和高峰时段超时都算。两个格子互斥，因此直接相加。",
      "原表若存计数，要先用全表项数归一化。若原表已是联合概率，按轴加和即可。",
      "边缘分布仍要覆盖其变量的所有值。全部行边缘之和为 1，全部列边缘之和也为 1。",
    ], formula: "P(Y=y) = Σₓ P(X=x, Y=y)\nP(X=x) = Σᵧ P(X=x, Y=y)" },
    { id: "trace", kind: "steps", title: "从 50 条请求日志取值", steps: [
      { label: "填四个交叉格", text: "普通时段有 15 条准时、5 条超时。高峰有 10 条准时、20 条超时。总数为 50。" },
      { label: "消去是否超时", text: "对一行中的两列相加。高峰共 30 条，行边缘 P(高峰)=30/50=60%。普通时段占 40%。" },
      { label: "消去时段", text: "对超时这一列的两行相加。超时共 25 条。列边缘 P(超时)=25/50=50%。" },
      { label: "再问高峰内超时", text: "条件把样本空间缩到高峰行。分母变成 30，分子取该行的 20。组内超时率约 66.67%。" },
    ] },
    { id: "denominators", kind: "explain", title: "同一格可以参与不同问题", paragraphs: [
      "只问既高峰又超时，分母仍是 50。用 20/50 得联合概率 40%。问高峰内超时才除以 30。",
      "若两变量独立，联合格应等于对应边缘概率的乘积。本例两边缘相乘为 30%，小于实得的 40%。",
      "把高峰两格都置零。总体仍有普通记录，可以算边缘。高峰条件事件概率为零，那一行的条件率未定义。",
      "若四格都为零，没有任何观测。此时各比例都未定义。只清空一格时，要重算分母和两个边缘。",
    ], formula: "联合：20/50\n边缘：25/50\n条件：20/30" },
  ],
  demo: "marginal-count-table",
  exercises: [
    { id: "deep-marginal-axis", level: "基础", kind: "single", prompt: "只想知道 Y 是否超时，应怎么做？",
      options: ["对各个 X 的取值求和", "只保留最大的 X", "用超时格除以高峰行"], answer: 0,
      explanation: "为每个 Y 汇总所有时段，先消去 X。", wrong: "把同一种 Y 的格子并在一起。", review: "sum" },
    { id: "deep-marginal-peak", level: "应用", kind: "integer", prompt: "默认样本中，高峰请求占百分之多少？",
      answer: 60, explanation: "高峰行有 10+20 条。除以全表的 50 条，得 60%。",
      wrong: "高峰行的准时和超时都要数。", review: "trace" },
    { id: "deep-marginal-empty", level: "挑战", kind: "multiple", prompt: "修改样本数量时，哪些判断仍成立？",
      options: ["只要总数为正，两行边缘之和为 1", "高峰行为空时其组内超时率为零", "全表为空时无法估计边缘比例", "组内比率与边缘率可能不同"], answer: [0, 2, 3],
      explanation: "分母为零时比例未定义。组内与总体的分母取自不同范围，也可能给出不同结果。",
      wrong: "给每个比例标出分母。", review: "denominators" },
  ],
  recap: ["合计时消去另一变量。", "边缘率用全表分母。", "条件率用组内分母。"],
  extension: "清空高峰两格。对照仍可算出的边缘率与未定义的条件率。",
  next: "conditional-expectation-tower",
  sources: [{ title: "Penn State STAT 414 · Joint and Marginal PMFs", href: "https://online.stat.psu.edu/stat414/Lesson17" }],
};
