import type { DeepLesson } from "./types";

export const adjustedRandLesson: DeepLesson = {
  title: "调整兰德指数与标签换号",
  intro: "同一组样本，簇 0 与簇 1 互换了名字。逐项比标签会说全错。怎样只比较分组？",
  goals: ["把标签转成样本对关系。", "从列联表算出机会基线。", "解释 1、0 和负分。"],
  blocks: [
    { id: "pairs", kind: "explain", title: "先数同簇样本对", paragraphs: [
      "每对样本在一种分组中要么同簇，要么分开。标签换名字时，这个关系不变。",
      "交叉列出参考簇与预测簇。每格记录交集大小。某格有 k 个样本，就贡献 k(k−1)/2 个共同同簇对。",
      "记所有格子的贡献和为 S。按行边缘计参考同簇对 R。按列边缘计预测同簇对 C。全部可选样本对共有 T。",
      "固定两边簇大小而随机打乱配对。一对参考同簇样本在预测中同簇的概率为 C/T。所以共同同簇的期望为 RC/T。",
    ], formula: "T = n(n−1)/2\n机会基线 E = RC/T\nARI = (S−E) / ((R+C)/2−E)" },
    { id: "trace", kind: "steps", title: "在四个样本上核对两种预测", steps: [
      { label: "给出参考分组", text: "参考标签为 0、0、1、1。参考同簇对是 {1,2} 和 {3,4}。R=2，全部样本对 T=6。" },
      { label: "把簇号互换", text: "预测标签为 1、1、0、0。两对仍在一起。列联表非零格是两个 2。S=2，C=2。" },
      { label: "算出满分", text: "机会基线 E=2×2/6=2/3。分子和分母同为 4/3。ARI 等于 1，换号不影响得分。" },
      { label: "切到交叉分组", text: "预测 0、1、0、1。列联表四格都是 1。同簇对完全拆开，S=0。R 与 C 仍是 2。ARI 变为 −1/2。" },
    ] },
    { id: "code", kind: "code", title: "直接从计数得到 ARI", language: "Python",
      source: `from collections import Counter

def count_pairs(counts):
    return sum(k * (k - 1) // 2 for k in counts)

def adjusted_rand(reference, prediction):
    if len(reference) != len(prediction):
        raise ValueError("Use two labels for each sample.")
    t = count_pairs([len(reference)])
    r = count_pairs(Counter(reference).values())
    c = count_pairs(Counter(prediction).values())
    s = count_pairs(Counter(zip(reference, prediction)).values())
    denominator = (r + c) * t - 2 * r * c
    return 2 * (s * t - r * c) / denominator if denominator else 1.0

print(adjusted_rand([0, 0, 1, 1], [1, 1, 0, 0]))
print(adjusted_rand([0, 0, 1, 1], [0, 1, 0, 1]))`,
      notes: [{ lines: "3–8", text: "用整数数对。先核对两份标签长度。" }, { lines: "9–12", text: "分别计全体、行、列和交集中的同簇对。" },
        { lines: "13–14", text: "上下同乘 2T，避免先算分数。退化的等价分组按约定记 1。" },
        { lines: "16–17", text: "输出 1.0 与 −0.5。" }] },
    { id: "limits", kind: "explain", title: "把相似度和正确性分开", paragraphs: [
      "ARI 为零表示共同同簇数正好等于基线。负分表示它比这个基线还低。",
      "比较的两份标签必须对齐到相同样本。打乱一份样本顺序时，关系就可能真的变了。",
      "ARI 比较有参考的两份分组。若没有参考簇，前一节的轮廓系数可以从样本距离给另一种视角。",
    ] },
  ],
  demo: "adjusted-rand-pairs",
  exercises: [
    { id: "deep-ari-label-names", level: "基础", kind: "single", prompt: "只互换两个簇的标签名，ARI 怎么变？", options: ["保持原值", "一定归零", "变成负数"], answer: 0,
      explanation: "换名只交换列。样本是否同簇完全没变。", wrong: "按样本对判断，别逐项比数字。", review: "pairs" },
    { id: "deep-ari-cross-pairs", level: "应用", kind: "integer", prompt: "案例交叉分组后，共同同簇有几对？", answer: 0,
      explanation: "四格都只有一个样本，任一格都凑不成同簇对。", wrong: "每格用 k(k−1)/2。", review: "trace" },
    { id: "deep-ari-limits", level: "挑战", kind: "multiple", prompt: "哪些描述成立？", options: ["交换簇名可保留得分", "ARI 不会是负数",
      "基线与两边簇大小有关", "对齐样本后才能比较两份标签"], answer: [0, 2, 3],
      explanation: "样本对关系不依赖标签名称。较差的共同同簇数可低于基线。基线依赖两边簇大小。", wrong: "核对输入、机会基线和负分案例。", review: "limits" },
  ],
  recap: ["分组比较基于样本对。", "换号不会改变分组。", "负分低于机会基线。"],
  extension: "只改一个样本的预测簇，观察共同同簇数和基线怎样一起变。",
  next: "dbscan-core-border-noise",
  sources: [{ title: "scikit-learn · adjusted_rand_score", href: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.adjusted_rand_score.html" }],
};
