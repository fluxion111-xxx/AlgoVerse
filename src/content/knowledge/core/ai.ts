import { concept as topic } from "./types";

const ml = { title: "scikit-learn · User Guide", href: "https://scikit-learn.org/stable/user_guide.html" };
const ai = { title: "UC Berkeley · CS188", href: "https://inst.eecs.berkeley.edu/~cs188/" };
const deep = { title: "Goodfellow et al. · Deep Learning", href: "https://www.deeplearningbook.org/" };
const llm = { title: "Hugging Face · LLM Course", href: "https://huggingface.co/learn/llm-course/chapter1/1" };
const vision = { title: "Stanford · CS231n", href: "https://cs231n.stanford.edu/" };
const rl = { title: "MIT Press · Sutton and Barto, Reinforcement Learning", href: "https://mitpress.mit.edu/9780262039246/reinforcement-learning/" };
const google = { title: "Google · Recommendation Systems", href: "https://developers.google.com/machine-learning/recommendation" };

export const aiTopics = [
  topic("ai-foundations", "state-space-search", "search-state-action-cost", "状态空间与路径代价", "基础", "先明确状态、动作和目标。", "不同动作可到达不同后继。路径代价是动作代价的累计，搜索策略决定扩展顺序。", ai, ["adjacency-list"]),
  topic("ai-foundations", "adversarial-search", "minimax-game-tree", "极大极小搜索", "进阶", "假设对手会选对自己最有利的动作。", "MAX 层取最大后继值。MIN 层取最小后继值。根节点据此选择动作。", ai, ["search-state-action-cost"]),
  topic("ai-foundations", "probabilistic-reasoning", "bayesian-network-factorization", "贝叶斯网络的因式分解", "进阶", "用有向图表达局部概率依赖。", "联合概率等于各节点在其父节点条件下的概率乘积。局部条件独立减少参数量。", ai, ["bayes-rule"]),
  topic("supervised-learning", "training-objectives", "empirical-loss", "损失函数与经验风险", "基础", "用训练样本估计预测误差。", "经验风险通常取训练损失的平均。加入正则项可以惩罚某些复杂模型。", ml, ["expected-value"]),
  topic("supervised-learning", "linear-models", "logistic-regression", "逻辑回归与分类阈值", "进阶", "先算概率，再按阈值分类。", "逻辑回归用 sigmoid 映射线性得分。阈值影响预测类别，调整阈值不会改变已有概率。", ml, ["empirical-loss", "dot-product-projection"]),
  topic("supervised-learning", "tree-models", "decision-tree-impurity", "决策树的不纯度下降", "进阶", "选能让子节点更纯的划分。", "比较划分前的不纯度与按样本数加权的子节点不纯度。深度过大会增加过拟合风险。", ml, ["empirical-loss"]),
  topic("unsupervised-learning", "clustering", "kmeans-assignment-update", "K-means 分配与更新", "基础", "先找最近中心，再更新均值。", "固定中心时分配最近簇。固定分配时取各簇均值。两步都不会增加平方距离和。", ml, ["distance-metrics"],
    [{ engineId: "k-means", label: "运行 K-Means 聚类", prompt: "换一组起点。比较分组和平方距离和。" }]),
  topic("unsupervised-learning", "dimension-reduction", "pca-variance", "PCA 与最大方差方向", "进阶", "找投影后方差最大的方向。", "对中心化数据，第一主成分对应协方差矩阵的最大特征值方向。", ml, ["covariance", "eigenvectors"]),
  topic("model-evaluation", "resampling", "stratified-cross-validation", "分层交叉验证", "基础", "各折尽量保留原类别比例。", "每折轮流作验证集。预处理应在该折的训练子集拟合，避免验证信息流入训练。", ml, ["train-test-split"]),
  topic("model-evaluation", "metrics", "precision-recall", "精确率与召回率", "基础", "看报得准，也看找得全。", "精确率以预测正例为分母。召回率以真实正例为分母。分母为零时须明确约定。", ml, ["train-test-split"]),
  topic("deep-learning", "neural-networks", "nonlinear-activation", "激活函数与非线性", "基础", "层间非线性让模型更灵活。", "多个仿射变换连续复合仍是仿射变换。激活函数使网络能表达更复杂关系。", deep, ["dot-product-projection"]),
  topic("deep-learning", "backpropagation", "reverse-mode-gradients", "反向传播与梯度累加", "进阶", "沿计算图从输出向输入传梯度。", "每条边应用局部链式法则。变量影响多个下游分支时，要把各分支的贡献相加。", deep, ["chain-rule", "nonlinear-activation"]),
  topic("deep-learning", "optimization", "gradient-descent-step", "梯度下降与学习率", "进阶", "沿负梯度方向迈一小步。", "梯度给出局部变化。学习率过大可能越过低点，让损失增加。", deep, ["gradient-direction", "empirical-loss"],
    [{ engineId: "gradient-descent", label: "运行梯度下降", prompt: "把学习率改成 1.25。观察损失怎么变。" }]),
  topic("computer-vision", "visual-features", "convolution-receptive-field", "卷积与感受野", "进阶", "同一组权重滑过不同位置。", "输出位置只依赖输入的局部区域。堆叠卷积可扩大该位置的理论感受野。", vision, ["array-indexing", "dot-product-projection"]),
  topic("computer-vision", "detection", "intersection-over-union", "交并比 IoU", "基础", "重叠面积除以并集面积。", "重合越多，IoU 越大。两个完全分离的框交集为空，IoU 为零。", vision),
  topic("nlp-transformer", "text-units", "subword-tokenization", "子词分词与词表", "基础", "生词也可拆成已知单位。", "子词编码在短序列和有限词表之间取舍。词元数与字符数通常不同。", llm),
  topic("nlp-transformer", "attention", "scaled-dot-product-attention", "缩放点积注意力", "进阶", "按查询与键的匹配给值加权。", "先点积，再除以键维度的平方根。沿键归一化后，对值向量作加权和。", { title: "Vaswani et al. · Attention Is All You Need", href: "https://arxiv.org/abs/1706.03762" }, ["dot-product-projection"]),
  topic("nlp-transformer", "transformer", "causal-attention-mask", "因果注意力掩码", "进阶", "生成时只能看当前与更早位置。", "掩码把未来位置的权重置零。训练可并行处理位置，同时维持因果约束。", llm, ["scaled-dot-product-attention"]),
  topic("large-language-models", "inference", "llm-kv-cache", "KV 缓存", "进阶", "重用已处理词元的键和值。", "自回归解码可缓存历史位置的键和值。这样减少重复计算，但占用随序列增长的内存。", llm, ["causal-attention-mask"]),
  topic("large-language-models", "rag", "rag-retrieval-grounding", "RAG 的检索与依据", "进阶", "先找资料，再带资料生成。", "先评估是否召回相关资料，再检查答案是否得到资料支持。给了上下文也可能答错。", { title: "Lewis et al. · Retrieval-Augmented Generation", href: "https://ai.meta.com/research/publications/retrieval-augmented-generation-for-knowledge-intensive-nlp-tasks" }, ["subword-tokenization"]),
  topic("large-language-models", "agent-tools", "agent-tool-contract", "Agent 的工具边界", "进阶", "模型提出调用，程序核对权限。", "用结构化参数表达操作。执行前验证参数、授权和限制，工具输出仍当作不可信数据。", { title: "Hugging Face · Agents Course", href: "https://huggingface.co/learn/agents-course/en/unit1/introduction" }, ["server-side-validation"]),
  topic("reinforcement-learning", "markov-decisions", "discounted-return", "折扣回报", "基础", "把未来奖励按时间折扣。", "回报是折扣后的奖励和。折扣因子小于一时，更远的奖励权重更小。", rl, ["expected-value"]),
  topic("reinforcement-learning", "value-functions", "bellman-expectation", "贝尔曼期望方程", "进阶", "把价值拆成眼前奖励和后续价值。", "固定策略下，对动作、奖励和下一状态求期望。下一状态价值乘折扣因子。", rl, ["discounted-return"]),
  topic("recommender-systems", "collaborative-filtering", "collaborative-filtering-sparse", "协同过滤与稀疏反馈", "基础", "从相似交互推断潜在偏好。", "交互矩阵往往稀疏。未交互可能只是没曝光，不能直接当作不喜欢。", google),
  topic("recommender-systems", "measurement", "recall-at-k", "推荐召回率 Recall@K", "基础", "检查前 K 项找回多少相关项。", "分子为前 K 项中的相关项数，分母为全部相关项数。应明确无相关项时的处理方式。", google, ["precision-recall"]),
  topic("ai-safety", "prompt-injection", "indirect-prompt-injection", "间接提示注入", "进阶", "外部文本可能混入指令。", "把检索资料当作数据。对工具做独立授权和参数校验，限制模型输入能触发的动作。", { title: "OWASP · LLM01 Prompt Injection", href: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/" }, ["agent-tool-contract"]),
];
