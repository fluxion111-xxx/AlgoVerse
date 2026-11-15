import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const ml = { title: "scikit-learn · User Guide", href: "https://scikit-learn.org/stable/user_guide.html" };
const dl = { title: "Goodfellow et al. · Deep Learning", href: "https://www.deeplearningbook.org/" };

export const advancedAI = [
  topic(["supervised-learning", "linear-models"], ["linear-regression-residual-mse", "线性回归的残差与均方误差", "基础"], ["least-squares-normal-equation", "empirical-loss"], ml,
    "先算预测偏差，再平方取平均。", "残差常定义为观测减预测。均方误差对每个残差平方再取平均，因此大偏差贡献更大。",
    "从两条预测求均方误差。", "残差为 −1 与 3。平方为 1 与 9，均方误差为 5。", "直接平均残差可能正负抵消，无法代表预测误差大小。",
    ["两条残差分别为 −2 和 2。均方误差是多少？", ["4", "0", "2"], 0, "两项平方都为 4。平均仍是 4。"]),
  topic(["supervised-learning", "tree-models"], ["random-forest-feature-subsampling", "随机森林的特征子采样", "进阶"], ["decision-tree-impurity", "bootstrap-resampling-interval"], ml,
    "让不同树别总选同一批特征。", "随机森林常用重抽样训练各树。每个切分只考虑随机特征子集，可降低树间相关，再汇总预测。",
    "区分样本随机与特征随机。", "特征 A 很强，所有树都优先选它。随机限制候选后，有些节点会尝试其他特征。", "单树变弱并不一定降低集成质量。还要看误差相关性。",
    ["随机森林每个分裂点抽取部分特征，主要想改变什么？", ["让所有树完全相同", "减少树间预测的相似性", "让每棵树拥有所有相同候选"], 1, "不同候选可产生不同切分，从而减少错误一起出现的机会。"]),
  topic(["model-evaluation", "resampling"], ["time-series-forward-validation", "时序数据的前向验证", "进阶"], ["train-test-split"], ml,
    "用过去拟合，用未来检查。", "按时间排列样本。每一折用较早窗口训练，较晚窗口验证。若标签或特征跨时间，还可留出间隔。",
    "选出没有未来泄漏的切分。", "用一到三月训练，四月验证。下一折可加入四月训练，再验证五月。", "随机打散可能把未来事件送到训练中，导致过高评估。",
    ["预测下月需求。验证集一般应位于训练集何处？", ["更早", "随意混合", "时间上更晚"], 2, "验证应模拟用已经发生的数据预测未来。"]),
  topic(["deep-learning", "optimization"], ["gradient-clipping-global-norm", "按全局范数裁剪梯度", "进阶"], ["gradient-descent-step", "dot-product-projection"], dl,
    "梯度太大时，一起缩短。", "若梯度整体范数超过阈值，将各分量同乘一个小于一的系数。方向保持，长度降到上限。",
    "计算给定阈值的缩放。", "梯度为 (3,4)，长度 5。阈值 2 时乘 0.4，得到 (1.2,1.6)。", "逐分量截断会改变方向。全局范数裁剪使用同一比例。",
    ["梯度范数 8，阈值 2。应同乘多少？", ["1/4", "2", "4"], 0, "目标长度是原来的 2÷8=1/4，方向保持不变。"]),
  topic(["large-language-models", "rag"], ["rag-evidence-recall-at-k", "RAG 的证据召回率", "进阶"], ["rag-retrieval-grounding", "recall-at-k"], { title: "Stanford · Evaluation in Information Retrieval", href: "https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-in-information-retrieval-1.html" },
    "逐段标出回答真正需要的证据。", "对固定问题标记相关证据段。前 K 个结果命中的不同相关段数，除以标注相关段总数，得到证据 Recall@K。",
    "区分找回部分证据与完整覆盖。", "比较两项政策需要两段。前五项只找到其中一段，证据 Recall@5 为 1/2。", "同一段的重复结果只算一次。找回一条正确片段，也未必足以回答多条件问题。",
    ["标注有 3 个相关段，前 5 项命中其中 2 个。Recall@5 是多少？", ["2/5", "2/3", "3/5"], 1, "召回率以全部标注相关段为分母，衡量需要的证据找回了多少。"]),
  topic(["recommender-systems", "signals"], ["position-bias-click-feedback", "点击反馈的位置偏差", "进阶"], ["impression-implicit-feedback", "selection-bias-sample"], { title: "Joachims et al. · Unbiased Learning-to-Rank with Biased Feedback", href: "https://arxiv.org/abs/1608.04468" },
    "排得靠前，更容易先被看见。", "点击同时受相关性和曝光位置影响。若直接用点击训练，模型可能重复偏爱旧排序里的靠前项。",
    "区分位置带来的点击与偏好。", "同一商品从第八移到第一，点击增加。商品本身没有变化。", "原始点击率不是独立相关性评分。应考虑可见性或做受控对照。",
    ["商品仅换到更前位置，点击变多。能直接断定更相关吗？", ["能，点击永远只由相关性决定", "能，只要同一天", "不能，位置也影响点击"], 2, "可见性提高可带来更多点击，需控制位置后再判断偏好。"]),
];
