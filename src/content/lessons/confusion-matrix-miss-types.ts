import type { DeepLesson } from "./types";

export const confusionMatrixLesson: DeepLesson = {
  title: "混淆矩阵里的误报与漏报",
  intro: "报警器少响了两次。它变准了吗？得先知道少响的是误报，还是真故障。",
  goals: ["按真实与预测两条轴填表。", "判断阈值如何影响错误。", "用失误代价比较阈值。"],
  blocks: [
    { id: "axes", kind: "explain", title: "先确认正类和坐标轴", paragraphs: [
      "把故障设为正类。本课让行表示真实标签，列表示预测标签。读别人的图时先核对轴。",
      "真实故障且报警是 TP。真实故障却没报警是 FN。真实正常却报警是 FP。真实正常也没报警是 TN。",
      "每个样本只落一格。两行合计是各类真实样本数。改变阈值只移动列，不会改变真实标签。",
    ] },
    { id: "trace", kind: "steps", title: "沿六个分数走一遍", steps: [
      { label: "阈值设在 60", text: "故障分数是 90、70、50。正常分数是 85、30、10。分数达到阈值就报警。" },
      { label: "分开数两行", text: "故障行有两次报警和一次漏报。正常行有一次误报和两次正确静默。六个样本都进入矩阵。" },
      { label: "把阈值抬到 86", text: "85 分的误报消失。70 分的故障也不再报警。误报从 1 变成 0，漏报从 1 变成 2。" },
      { label: "按代价比较", text: "每次漏报损失 5 单位。误报损失 1 单位。两个阈值的总代价为 6 和 10。这里抬阈值更贵。" },
    ] },
    { id: "tradeoff", kind: "explain", title: "同一准确率也会漏不同人", paragraphs: [
      "这两个阈值都答对四次。准确率相同，但错误类型不同。告警系统通常需要分别控制两类错误。",
      "固定分数和数据后，升高阈值只会缩小预测正集合。所以误报不会增加，漏报不会减少。若重训模型，应重新评估。",
      "阈值应在验证集上选择，再用留出的测试集报告。也要检查不同群体的样本量和各自的错误率。",
    ], formula: "错误代价 = 漏报代价 × FN + 误报代价 × FP" },
  ],
  demo: "confusion-counts",
  exercises: [
    { id: "deep-matrix-error", level: "基础", kind: "single", prompt: "真实有故障，却没有报警。落在哪一格？", options: ["FN", "FP", "TN"], answer: 0,
      explanation: "真实为正，预测为负，属于漏报。", wrong: "先判真实标签，再判是否报警。", review: "axes" },
    { id: "deep-matrix-cost", level: "应用", kind: "integer", prompt: "阈值 86 时，用本课代价计算，总损失多少？", answer: 10,
      explanation: "两次漏报各损失 5。没有误报。", wrong: "不能只数答错的总次数。", review: "trace" },
    { id: "deep-matrix-fixed", level: "挑战", kind: "multiple", prompt: "固定样本和分数，只抬高阈值。哪些说法成立？", options: ["真实故障数不变", "误报一定增加", "误报不会增加", "准确率可能不变"], answer: [0, 2, 3],
      explanation: "阈值只改变预测。误报和漏报的变化有时正好抵消。", wrong: "对比阈值 60 和 86 的两张表。", review: "tradeoff" },
  ],
  recap: ["先找真实标签。", "阈值改变预测列。", "看清不同错误的代价。"],
  extension: "把阈值调到 70。再想如何定位集中出现错误的样本组。",
  next: "grouped-error-slices",
  sources: [{ title: "scikit-learn · confusion_matrix", href: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.confusion_matrix.html" }],
};
