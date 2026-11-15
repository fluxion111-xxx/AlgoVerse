import type { DeepLesson } from "./types";

export const silhouetteScoreLesson: DeepLesson = {
  title: "聚类轮廓系数",
  intro: "点 6 被分进左簇。画出来却靠近右边。能否用距离检查这一分组？",
  goals: ["算簇内和邻簇的平均距离。", "解释负分和零分。", "区分单点诊断与整体评估。"],
  blocks: [
    { id: "definition", kind: "explain", title: "列出两个平均距离", paragraphs: [
      "先算 a。它是样本到同簇其他样本的平均距离。样本自己不参与这项平均。",
      "再算 b。对每个其他簇，分别算到簇中所有点的平均距离。b 取这些平均值中最小的一个。",
      "先平均，再找最小。单个最近点或最近质心都不能直接代替 b。距离度量也要和任务对齐。",
      "最后用较大的距离归一化。结果在 −1 到 1 之间。正分表示本簇相对更近。",
    ], formula: "a = 同簇其他样本的平均距离\nb = min(到每个其他簇的平均距离)\ns = (b − a) / max(a, b)" },
    { id: "trace", kind: "steps", title: "把点 6 分到两边试试", steps: [
      { label: "先设置样本和标签", text: "左簇是 {0,2,6}。右簇是 {8,10}。本例用数轴上的绝对距离。只追踪坐标 6 的点。" },
      { label: "留在左边时算一次", text: "簇内距离为 6 和 4，平均 5。右簇距离为 2 和 4，平均 3。所以轮廓系数是 (3−5)/5，也就是 −0.4。" },
      { label: "切到右边再算一次", text: "同一组距离互换角色。新 a 为 3，新 b 为 5，得 +0.4。样本位置未动，变的是标签和比较对象。" },
      { label: "查看全体结果", text: "改标签也会改变其他点的邻居。不能只把边界点涨的 0.8 加到全体均值上。演示会重算每个样本。" },
    ] },
    { id: "code", kind: "code", title: "从分组距离算系数", language: "Python",
      source: `def silhouette_at(points, labels, index):
    group = labels[index]
    def mean(values):
        return sum(values) / len(values)
    within = [abs(points[index] - x) for j, x in enumerate(points)
              if j != index and labels[j] == group]
    if not within:
        return 0.0
    a = mean(within)
    other_groups = set(labels) - {group}
    b = min(mean([abs(points[index] - x) for x, label in zip(points, labels)
                  if label == other]) for other in other_groups)
    return (b - a) / max(a, b) if max(a, b) else 0.0

points = [0, 2, 6, 8, 10]
print(silhouette_at(points, [0, 0, 0, 1, 1], 2))
print(silhouette_at(points, [0, 0, 1, 1, 1], 2))`,
      notes: [{ lines: "1–8", text: "输入至少两个有效簇。排除自己。单成员簇约定记零。" },
        { lines: "9–13", text: "先按每个其他簇分组求平均。归一化分母为零时记零。" },
        { lines: "15–17", text: "只改点 6 所在的簇，输出 −0.4 和 0.4。" }] },
    { id: "limits", kind: "explain", title: "怎样读高分和低分", paragraphs: [
      "零分常见于 a 和 b 接近。也可能来自计算约定。若簇只有一个样本，先看实现如何标记它。",
      "评价整个聚类至少需要两个簇。全是单成员簇时，整体比较也失去意义。",
      "换特征尺度或距离，会改变 a 和 b。看全体均值时，也要查看各簇分布。少数负分可能被均值掩盖。",
      "本例按给定标签评分。分组来自业务还是算法，要用额外证据判断。",
    ] },
  ],
  demo: "silhouette-point",
  exercises: [
    { id: "deep-silhouette-neighbor", level: "基础", kind: "single", prompt: "b 要选哪个距离？",
      options: ["其他簇的最小平均距离", "其他簇中最近单点距离", "当前簇的质心距离"], answer: 0,
      explanation: "每个其他簇先算全员平均，再在簇之间取最小。", wrong: "先求一簇的均值。", review: "definition" },
    { id: "deep-silhouette-example", level: "应用", kind: "text", prompt: "点 6 原属左簇，它的轮廓系数是多少？",
      answer: ["-0.4", "−0.4", "-2/5", "−2/5"], explanation: "簇内均距 5，另一簇均距 3。用 5 作分母，得到 −0.4。",
      wrong: "分母取两段均距的较大者。", review: "trace" },
    { id: "deep-silhouette-limits", level: "挑战", kind: "multiple", prompt: "怎样解释轮廓系数更稳妥？",
      options: ["全体均值可能掩盖负分", "高分证明簇对应真实类别", "换距离度量可能改变结果", "改一项标签可能影响其他点"], answer: [0, 2, 3],
      explanation: "轮廓系数依赖距离和已给标签。均值压缩了个体差异，也无法单独验证类别。",
      wrong: "看分数的输入和聚合范围。", review: "limits" },
  ],
  recap: ["簇内平均排除自己。", "其他簇先平均再取最小。", "均分要配合分布看。"],
  extension: "保持标签，将点 6 向左挪。找出系数过零的边界。",
  next: "adjusted-rand-label-permutation",
  sources: [{ title: "scikit-learn · silhouette_samples", href: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.silhouette_samples.html" }],
};
