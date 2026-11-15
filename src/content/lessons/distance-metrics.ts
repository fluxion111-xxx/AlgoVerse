import type { DeepLesson } from "./types";

export const distanceMetricsLesson: DeepLesson = {
  title: "欧氏距离与曼哈顿距离",
  intro: "查询点在原点。一个样本在正右方，另一个在斜上方。换一种距离，最近邻会换吗？",
  goals: ["用坐标差算两种距离。", "复现最近邻排序反转。", "判断选距离前要核对的尺度。"],
  blocks: [
    { id: "formula", kind: "explain", title: "对同一组差值用两套规则", paragraphs: [
      "两点先逐坐标相减。欧氏距离将差值平方、求和、开方。二维中它等于直线距离。",
      "曼哈顿距离先取绝对值，再求和。二维中可把它看成只沿坐标轴移动的最短长度。",
      "仅在用欧氏距离排序时，可比较平方距离省去开方。若要显示距离，仍要给出开方后的值。",
    ], formula: "d₂=√(Δx²+Δy²)\nd₁=|Δx|+|Δy|" },
    { id: "trace", kind: "steps", title: "用两个样本做反例", steps: [
      { label: "设定坐标与分类", text: "查询点 Q=(0,0)。A 类样本在 (3,0)，B 类样本在 (2,2)。K 取 1 时，由最近样本决定类别。" },
      { label: "先算欧氏距离", text: "A 的距离为 3。B 的平方和为 8，开方约为 2.828。B 先入榜，所以选择 B。" },
      { label: "换成曼哈顿距离", text: "A 的绝对差之和为 3，B 的和为 4。此时 A 先入榜，所以选择 A。" },
      { label: "移动查询点", text: "把 Q 移到 (2,2)。B 与它重合，两种距离都为零。此时两种规则都把 B 排到第一。" },
    ] },
    { id: "scope", kind: "explain", title: "先定单位和并列规则", paragraphs: [
      "一列若从秒换成毫秒，数值扩大千倍，可能主导距离。先判断特征单位、尺度与业务含义。",
      "面板调用站内 KNN 对两个样本排序。K=1 时拿首名；若距离相同，引擎按样本输入顺序。",
      "排序时用计算值，表格只在展示时取小数。同样的显示值仍可能来自不同距离。",
    ] },
  ],
  demo: "knn-metric-neighbor",
  exercises: [
    { id: "deep-metric-sum", level: "基础", kind: "single", prompt: "曼哈顿距离怎样合并坐标差？", options: ["绝对值相加", "平方后相加再开方", "保留一个坐标差"],
      answer: 0, explanation: "沿各轴移动的长度不能抵消，所以分别取绝对值再求和。", wrong: "想一想负方向也要行走。", review: "formula" },
    { id: "deep-metric-b-distance", level: "应用", kind: "integer", prompt: "原点到 B 的曼哈顿距离是多少？", answer: 4,
      explanation: "两轴各差 2，绝对差相加得 4。", wrong: "这个问题不要求开方。", review: "trace" },
    { id: "deep-metric-rank", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["两种度量可排出不同首名", "某些单位差异必然不影响排名", "查询点移动可改变距离", "显示舍入不应决定排序"],
      answer: [0, 2, 3], explanation: "排名依赖度量、单位和点位置。计算距离应在展示舍入前比较。", wrong: "先核对公式输入，再核对排序键。", review: "scope" },
  ],
  recap: ["欧氏距离看直线。", "曼哈顿距离按轴相加。", "尺度会影响最近邻。"],
  extension: "把查询点移动到 (3,0)。再学习如何用特征缩放控制单位差异。",
  next: "knn-feature-scaling",
  sources: [{ title: "scikit-learn · Nearest Neighbors", href: "https://scikit-learn.org/stable/modules/neighbors.html" }],
};
