import { fullTopic as topic } from "@/content/knowledge/coverage/types";
const svm = { title: "Stanford CS229 · Kernel Methods and SVM Loss", href: "https://cs229.stanford.edu/notes_archive/cs229-notes-all/representer-function.pdf" };
const metrics = { title: "scikit-learn · Model Evaluation", href: "https://scikit-learn.org/stable/modules/model_evaluation.html" };
const thresholds = { title: "scikit-learn · Decision Threshold Tuning", href: "https://scikit-learn.org/stable/modules/classification_threshold.html" };

export const machineLearningTopics = [
  topic(["supervised-learning", "margin-models"], ["hinge-loss-score-margin", "铰链损失与分类间隔", "进阶"], ["svm-soft-margin-c"], svm,
    "分类正确也可能有损失。", "令标签 y 为 ±1，实数预测分数为 f。单个样本的铰链损失是 max(0, 1−yf)。样本分对但间隔不足时，损失仍大于零。",
    "用标签和分数算一次铰链损失。", "y=1 且 f=0.4。符号预测正确，但损失为 0.6。", "不能把符号正确直接当成损失为零。",
    ["y=−1、f=−2 时，损失是多少？", ["1", "3", "0"], 2, "yf=2，大于 1，截断后损失为零。"]),
  topic(["supervised-learning", "margin-models"], ["rbf-kernel-distance-similarity", "RBF 核的距离与相似度", "进阶"], ["svm-margin-support-vectors", "dot-product-projection"], svm,
    "距离越远，核相似度越低。", "RBF 核 K(x,z)=exp(−γ·‖x−z‖²)，其中 γ>0。它可直接计算隐式特征空间的内积，无需展开所有坐标。γ 大时，距离稍增就会明显压低相似度。",
    "解释 γ 和特征尺度对核值的影响。", "两点平方距离为 4。γ 从 0.25 改为 1，核值由 e⁻¹ 降到 e⁻⁴。", "特征不在同一量纲时，数值大的维度可能主导距离。",
    ["同一个输入与自身的 RBF 核值是多少？", ["0", "1", "取决于特征数"], 1, "平方距离为零，所以 exp(0)=1。"]),
  topic(["model-evaluation", "metrics"], ["balanced-accuracy-class-recall", "平衡准确率与各类召回", "基础"], ["precision-recall"], metrics,
    "每个类别的召回率同权。", "多分类的平衡准确率是各类召回率的算术平均。二分类时，它是正类召回率与负类召回率的平均。",
    "比较类别失衡时的两种准确率。", "100 条记录中有 98 条负例。全判负得到 98% 普通准确率。正类召回为 0，平衡准确率只有 50%。", "平衡准确率不等于精确率平均，也不表示各类样本数变了。",
    ["三类召回率为 90%、60%、30%。平衡准确率是多少？", ["60%", "90%", "30%"], 0, "三个类别同权，取 (90+60+30)/3。"]),
  topic(["model-evaluation", "metrics"], ["brier-binary-probability-error", "Brier 分数与概率平方误差", "进阶"], ["probability-calibration-bins"], metrics,
    "用平方误差给概率预测评分。", "二分类中，以事件发生为 1。Brier 分数取预测概率与真实值之差的平方平均，越低越好。它同时受校准和区分能力影响。",
    "计算一组二分类概率的 Brier 分数。", "真实值为 [1,0]，预测为 [0.8,0.4]。分数为 (0.04+0.16)/2=0.10。", "高准确率不能保证低概率误差。也不能只用 Brier 分数证明校准良好。",
    ["真实值为 0，预测概率为 0.9。单条损失是多少？", ["0.81", "0.09", "0.9"], 0, "事件没发生，真实值为 0，平方误差是 (0.9−0)²。"]),
  topic(["model-evaluation", "error-analysis"], ["choose-decision-threshold-validation", "用验证集选择分类阈值", "进阶"], ["train-test-split", "precision-recall"], thresholds,
    "阈值可调，测试集留作最后评估。", "固定模型后，可在验证集上按业务损失或指标选择阈值。选择阈值属于模型选择。最终评估需要独立数据，否则结果可能偏乐观。",
    "把拟合、阈值选择和评估分开。", "漏检代价比误报高。验证集上把告警阈值从 0.50 降到 0.30，可提高或保持召回。代价是可能多报。", "默认 0.5 不是业务最优。也不要反复看最终测试集再改阈值。",
    ["在哪份数据上选择阈值？", ["最终测试集", "只使用模型拟合后的训练预测", "独立验证集"], 2, "验证集可用于挑阈值。最终测试集应只评估选定方案。"]),
];
