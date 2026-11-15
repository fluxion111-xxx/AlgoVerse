import type { DeepLesson } from "./types";

export const kMeansLesson: DeepLesson = {
  title: "K-Means 分配与更新",
  intro: "四个测量点散在坐标纸上。先放两个中心。每个点选最近的中心。再让中心走向那组点的平均位置。",
  goals: ["算一轮样本分配和均值更新。", "读懂簇内平方距离和。", "对比初值和迭代上限的影响。"],
  blocks: [
    { id: "assign", kind: "explain", title: "先固定中心", paragraphs: [
      "一个簇是一组点。K 是预先选好的簇数。中心可以取任意坐标。",
      "比较两个中心时，可以省去开方。距离平方更小，距离也更小。平局时，本模型取靠前的中心。",
      "平方距离和体现点离所属中心多远。尺度相差大时，数值范围大的特征会更影响距离。",
    ], formula: "d²(x, c) = (x₁ − c₁)² + (x₂ − c₂)²\nJ = Σᵢ d²(xᵢ, cₐᵢ)（aᵢ 为第 i 个样本的簇）" },
    { id: "update", kind: "steps", title: "手算两轮聚类", steps: [
      { label: "写下四个点", text: "横坐标是 0、2、8、10。纵坐标都取 1。初始中心的横坐标取 0 和 10。第一个中心得到 0、2。第二个得到 8、10。" },
      { label: "移动到均值", text: "固定分组。两个中心的横坐标变成 1 和 9。四个点离各自中心都差 1。平方距离和为 4。纵坐标仍为 1。" },
      { label: "再分一次", text: "第二轮的分组没变。中心也没变。本模型在这一轮停止。把上限设为 1，就只完成前两步。" },
      { label: "只换一个初值", text: "让第二个初始中心从 (10, 1) 移到 (2, 1)。第一轮变成 1 点对 3 点。三点簇中心的横坐标变为 20/3。继续回放，对照两次试跑。" },
    ] },
    { id: "loss", kind: "explain", title: "均值为什么合适", paragraphs: [
      "先看一条数轴。固定一组含 m 个点。把中心写成 均值 + δ。展开平方后，交叉项相加为零。偏离均值会多出 m × δ²。",
      "二维的两个坐标可以分开最小化。把中心移到坐标均值，这组的平方距离和最小。",
      "分配步骤固定中心。每点选最近的。更新步骤固定分组。两步都不会增大目标值。",
      "目标下降不保证找到全局最优。初值可能影响结局。空簇没有均值，本模型会保留它的中心。",
    ], formula: "Σ (xᵢ − c)² = Σ (xᵢ − x̄)² + m(c − x̄)²" },
  ],
  demo: "k-means",
  exercises: [
    { id: "deep-kmeans-assign", level: "基础", kind: "single", prompt: "样本在 (2, 1)。中心是 (0, 1) 和 (10, 1)。它归哪一簇？",
      options: ["第一个中心", "第二个中心", "两个中心都归"], answer: 0,
      explanation: "平方距离分别为 4 和 64。选择 4 对应的中心。",
      wrong: "先分别算横、纵坐标差。", review: "assign" },
    { id: "deep-kmeans-loss", level: "应用", kind: "integer", prompt: "默认样本做完第一轮。更新中心后，平方距离和是多少？",
      answer: 4, explanation: "中心在 (1, 1) 和 (9, 1)。四个点各贡献 1。",
      wrong: "先更新中心，再算距离。", review: "update" },
    { id: "deep-kmeans-guarantee", level: "挑战", kind: "multiple", prompt: "对于课内模型，以下哪些说法成立？",
      options: ["分配步不会增大目标值", "固定分组时，用均值使平方距离和最小", "中心必须是某个原始样本", "迭代停止就达到了全局最优"], answer: [0, 1],
      explanation: "两个局部步骤都能保持或降低目标。中心可在样本之间，停止也只满足本模型的停止条件。",
      wrong: "分清一次更新最优和整个问题最优。", review: "loss" },
  ],
  recap: ["先按距离分配，再更新均值。", "损失应在同一数据集上比较。", "初始中心会影响迭代路径。"],
  extension: "固定数据与 K，换一组初始中心。对比最后的目标值。再读 K-Means++ 的起点选择。",
  next: "kmeans-plus-plus-distance",
  sources: [{ title: "scikit-learn · K-Means", href: "https://scikit-learn.org/stable/modules/clustering.html#k-means" }],
};
