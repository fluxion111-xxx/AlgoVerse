import type { DeepLesson } from "./types";

export const knnClassificationLesson: DeepLesson = {
  title: "KNN 分类与邻居投票",
  intro: "离新点最近的是 B 类。再看两个邻居，结果却成了 A 类。票数怎么变的？",
  goals: ["用距离找最近的 K 个点。", "跟踪投票和平票处理。", "比较 K 和距离公式的影响。"],
  blocks: [
    { id: "distance", kind: "explain", title: "先量距离，再投票", paragraphs: [
      "样本带标签。新点没有标签。先量新点到每个样本的距离。",
      "排好距离，取前 K 个。每个邻居投一票。票数多的类就是预测类。",
      "实验遇同距按输入次序排。票数相同则选最近邻的类别。这是本实验的规则。",
    ], formula: "欧氏距离 = √(dx² + dy²)\n曼哈顿距离 = |dx| + |dy|" },
    { id: "votes", kind: "steps", title: "给默认点投三票", steps: [
      { label: "先找最近的一票", text: "新点是 (5, 4)。最近的是 4 号样本 (6, 4)，标签 B。欧氏距离为 1。取 K = 1 就预测 B。" },
      { label: "加上第二票", text: "2 号样本 (4, 3) 投 A。距离为 √2。此时 A、B 各一票。按实验规则，K = 2 仍预测 B。" },
      { label: "用第三票决胜", text: "3 号和 5 号距离同为 √8。3 号先输入，成为第三个邻居。它投 A。K = 3 时，A 两票，B 一票。" },
      { label: "再换一把尺", text: "把新点改成 (0, 0)，取 K = 1。只留样本 (2, 2) A 和 (3, 0) B。按欧氏距离预测 A。换曼哈顿距离，预测 B。" },
    ] },
    { id: "limits", kind: "explain", title: "为什么结果会变？", paragraphs: [
      "K 决定拿几张票。距离公式决定谁来投票。比较时一次只改一项。",
      "默认案例中，同距点标签不同。输入次序可能影响预测。要先读清平局规则。",
      "坐标尺度也会改变距离。实际选 K 时用验证集。测试集留到最后。",
    ] },
  ],
  demo: "knn-classification",
  exercises: [
    { id: "deep-knn-k", level: "基础", kind: "single", prompt: "KNN 中的 K 表示什么？",
      options: ["参与投票的邻居数", "可预测的类别数", "样本点有几个坐标"], answer: 0,
      explanation: "排序后选出 K 个邻居。每个邻居投一票。",
      wrong: "想想要从排序结果取多少行。", review: "distance" },
    { id: "deep-knn-votes", level: "应用", kind: "integer", prompt: "默认案例取 K = 3。A 类得到几票？",
      answer: 2, explanation: "4、2、3 号依次投 B、A、A。A 拿到两票。",
      wrong: "不要只看最近的一个点。", review: "votes" },
    { id: "deep-knn-metric", level: "挑战", kind: "multiple", prompt: "新点在原点。样本是 (2, 2) A 与 (3, 0) B。取 K = 1，哪些说法正确？",
      options: ["欧氏距离下预测 A", "曼哈顿距离下预测 A", "曼哈顿距离下预测 B", "改变距离公式可改变邻居"], answer: [0, 2, 3],
      explanation: "欧氏距离是 √8 和 3。曼哈顿距离是 4 和 3。哪个近随尺子而变。",
      wrong: "为每把尺分别算两条距离。", review: "distance" },
  ],
  recap: ["先排序，再按 K 取邻居。", "同距和平票有各自规则。", "比较时只改一个参数。"],
  extension: "试 K = 1、2、3。再保留 K，只换距离公式。下一节会细讲两把尺。",
  next: "distance-metrics",
  sources: [{ title: "scikit-learn · Nearest Neighbors Classification", href: "https://scikit-learn.org/stable/modules/neighbors.html#nearest-neighbors-classification" }],
};
