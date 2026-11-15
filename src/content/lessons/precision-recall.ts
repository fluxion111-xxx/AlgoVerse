import type { DeepLesson } from "./types";

export const precisionRecallLesson: DeepLesson = {
  title: "精确率与召回率",
  intro: "告警系统报了 24 次。只有 18 次是真的。还有 12 个真实事件漏报。该看哪一个指标？",
  goals: ["从混淆计数找出两种分母。", "把错误类型映射到运营成本。", "识别零分母与小样本问题。"],
  blocks: [
    { id: "counts", kind: "explain", title: "先确定正类是谁", paragraphs: [
      "先约定正类。本例以真实事件为正。报了且确有事件，是 TP。报了却没事件，是 FP。漏掉真实事件，是 FN。",
      "精确率问：我报出来的有多少是真的？它只看预测正类这组。召回率问：实际发生的有多少被我找到？它只看实际正类。",
      "真负例 TN 指未发生且没报。它不进入这两个分母。类别不平衡时，准确率高也可能漏掉很多正类。",
    ], formula: "精确率 P = TP / (TP + FP)\n召回率 R = TP / (TP + FN)\n二分类 F1 = 2TP / (2TP + FP + FN)" },
    { id: "trace", kind: "steps", title: "算出这次告警的表现", steps: [
      { label: "从报出集合计算", text: "报出 24 次，其中 TP 有 18 次。精确率就是 18/24，等于 75%。" },
      { label: "从真实集合计算", text: "真实事件有 18+12=30 次。召回率是 18/30，等于 60%。漏报率为 40%。" },
      { label: "只改一种错误", text: "把 FP 从 6 调到 12。保持 TP 和 FN。精确率从 75% 降到 60%。召回率仍为 60%。" },
      { label: "读实际代价", text: "人手少时，误报会挤占复核时间。安全告警更关注漏检。先定代价，再选阈值。" },
    ] },
    { id: "edge", kind: "explain", title: "空分母怎样报告", paragraphs: [
      "如果系统从不报，预测正例为零。此时精确率没有分母。模型显示未定义。报表工具可另设约定，但要写清楚。",
      "若评估集没有真实正例，召回率同样未定义。别把这种结果读成模型完美。",
      "两个系统也可能同为 75%。若一个只报 4 个，另一个报 400 个，波动和复核量很不同。报告指标时同时列出原始计数。",
      "调阈值会改变样本归类。用同一批数据拟合并调阈值，结果会偏乐观。阈值先在验证集选择。",
    ] },
  ],
  demo: "classification-metrics",
  exercises: [
    { id: "deep-metrics-denom", level: "基础", kind: "single", prompt: "精确率的分母是哪组？", options: ["预测正例", "真实正例", "预测负例"], answer: 0,
      explanation: "预测正例由真正例和假正例组成。", wrong: "先把视角放在报出的样本上。", review: "counts" },
    { id: "deep-metrics-recall", level: "应用", kind: "integer", prompt: "TP 为 18，FN 为 12。召回率的百分数是多少？", answer: 60,
      explanation: "真实正例有 30 个，找回 18 个。18/30 等于 60%。", wrong: "总数需要包含漏报。", review: "trace" },
    { id: "deep-metrics-edge", level: "挑战", kind: "multiple", prompt: "针对本节二分类。哪些结论正确？", options: ["只增加 FP 不改变召回率", "没报出正例时精确率必为 100%", "没实际正例时召回率未定义", "应同时记录原始计数"], answer: [0, 2, 3],
      explanation: "召回率公式中没有 FP。遇到零分母要声明处理规则。原始计数能解释样本规模。",
      wrong: "检查分母是否存在，再读百分比。", review: "edge" },
  ],
  recap: ["两个指标分母不同。", "看指标也看原始计数。", "阈值要按实际代价选。"],
  extension: "清空预测正例。再读混淆矩阵里的两种错误。",
  next: "confusion-matrix-miss-types",
  sources: [{ title: "scikit-learn · Precision, recall and F-measure", href: "https://scikit-learn.org/stable/modules/model_evaluation.html#precision-recall-f-measure-metrics" }],
};
