import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const ml = { title: "scikit-learn · User Guide", href: "https://scikit-learn.org/stable/user_guide.html" };
const llm = { title: "Hugging Face · LLM Course", href: "https://huggingface.co/learn/llm-course/chapter1/1" };

export const aiDepth = [
  topic(["supervised-learning", "nearest-neighbors"], ["knn-feature-scaling", "KNN 特征尺度与邻居排序", "基础"], ["distance-metrics", "train-test-split"], ml,
    "数值范围大的特征可能支配距离。", "逐特征缩放会改变各方向的权重，可能改变邻居顺序。用训练数据估计缩放参数，再应用于验证与测试。",
    "判断单位变化为何会换邻居。", "身高用厘米，评分仅 1 到 5。直接算距离时，身高差可能压过评分差。", "缩放不是总能提高效果。要结合特征意义与验证结果。",
    ["标准化所用均值和方差从哪里拟合？", ["训练集", "测试集", "先合并全部数据"], 0, "只用训练数据拟合。验证与测试套用训练参数，避免信息泄漏。"], undefined,
    [{ engineId: "knn-classification", label: "用 KNN 核对近邻排序", prompt: "比较同一种距离下，两组坐标的邻居排序。" }]),
  topic(["model-evaluation", "metrics"], ["roc-pr-rare-positive", "稀有正例下的 PR 曲线", "进阶"], ["precision-recall"], ml,
    "正例很少时，误报容易淹没正确告警。", "PR 曲线跟踪各阈值的精确率和召回率。ROC 的假正率用全部负例作分母，可能掩盖告警里的误报比例。",
    "用正负例数量解释两条曲线的差异。", "10 个正例、990 个负例。报对 8 个，另报错 20 个。精确率约 29%，假正率约 2%。", "低假正率不代表大多数告警都准。部署要结合基准率和代价。",
    ["报对 8 个、报错 20 个。精确率是多少？", ["8/10", "8/28", "20/990"], 1, "精确率以所有预测正例作分母，正确告警占 8÷28。"]),
  topic(["deep-learning", "optimization"], ["mini-batch-gradient-noise", "小批量梯度的估计波动", "进阶"], ["gradient-descent-step", "variance-independent-sum"], { title: "Goodfellow et al. · Deep Learning", href: "https://www.deeplearningbook.org/" },
    "一批样本只估计全量梯度。", "小批量更新降低每步成本。不同批次的样本差异会带来梯度波动。批量变大常降低估计方差。",
    "区分单步稳定性与每步成本。", "先后抽两批图像。其类别比例不同，梯度方向也可能不同。", "大批量每步更稳定，不保证总训练更快或泛化更好。",
    ["两批样本的梯度不同，最合理的解释是？", ["必然是代码故障", "小批量完全不能训练", "样本不同可产生不同估计"], 2, "每批只观察部分数据。批次变化会使估计自然波动。"]),
  topic(["nlp-transformer", "attention"], ["attention-padding-mask", "注意力中的填充掩码", "基础"], ["scaled-dot-product-attention", "subword-tokenization"], llm,
    "填充项只用来对齐批次。", "把短序列补到统一长度。对填充键施加掩码，使其不参与有效注意力归一化。",
    "标出哪几个位置不该参与注意力。", "真实序列有 3 项，补了 2 个空位。计算有效词元注意力时排除两个补位。", "填充掩码排除无内容位置。因果掩码控制能否看未来。",
    ["填充键被正确掩码后，在有效查询里的权重应是什么？", ["零", "一定与有效键等权", "高于所有真实键"], 0, "填充不是实际输入。掩码让有效归一化只考虑允许的键。"]),
  topic(["large-language-models", "inference"], ["llm-top-p-sampling", "Top-p 采样的累计概率", "进阶"], ["causal-next-token-training", "expected-value"], { title: "Holtzman et al. · The Curious Case of Neural Text Degeneration", href: "https://arxiv.org/abs/1904.09751" },
    "先留下累计概率足够的候选。", "按概率降序取最短候选前缀，直到累计至少为 p。随后把这些候选重新归一化，再随机抽取。",
    "用一组概率求核采样候选。", "概率为 0.5、0.3、0.2。p=0.7 时保留前两项，累计 0.8。", "Top-p 允许候选数随分布变化。Top-k 固定保留个数。",
    ["概率 0.6、0.25、0.15，p=0.8。保留几项？", ["1", "2", "3"], 1, "首项只有 0.6。前两项累计 0.85，已达到门槛。"]),
  topic(["large-language-models", "rag"], ["rag-chunk-overlap-boundary", "RAG 切块边界与重叠", "基础"], ["rag-retrieval-grounding"], llm,
    "切块可能把答案拆到两段。", "按语义边界或长度切分资料。少量重叠可保住跨边界上下文。评估时同时查看召回和重复片段。",
    "判断何时需要跨段重叠。", "正文把限制条件写在下一句。固定长度恰好切开时，重叠可把条件与结论放在同段。", "重叠越大，索引越冗余。还可能让重复片段占满结果。",
    ["相关句子常被切成两段。先尝试哪种改动？", ["只增大生成温度", "删除来源字段", "按语义切分或适度重叠"], 2, "问题发生在进入索引之前，应先保住相关上下文，再评估召回。"]),
  topic(["recommender-systems", "measurement"], ["ndcg-discounted-position", "NDCG 的位置折扣", "进阶"], ["recall-at-k"], { title: "scikit-learn · ndcg_score", href: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.ndcg_score.html" },
    "相关结果排得越靠前，通常得分越高。", "DCG 对靠后位置打折。NDCG 再除以理想排序的 DCG，以便和该查询可达到的分数比较。",
    "区分找回数量和排序位置。", "两个列表都找到一个相关项。第一项出现通常比第五项出现获得更高分。", "召回率可相同，排序质量仍不同。位置敏感指标能区分。",
    ["两个列表找回同样一个相关项，哪种排序通常 NDCG 更高？", ["把它放第一", "把它放最后", "位置绝对不影响"], 0, "位置折扣使靠前的相关项贡献更大。"]),
];
