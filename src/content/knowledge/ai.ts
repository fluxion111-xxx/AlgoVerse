import type { KnowledgeDomain } from "../../lib/knowledge";

export const artificialIntelligence = {
  id: "ai",
  title: "人工智能基础",
  courses: [{
    id: "supervised-learning",
    title: "监督学习",
    chapters: [{
      id: "nearest-neighbors",
      title: "最近邻分类",
      topics: [{
        id: "knn-voting",
        title: "KNN 邻居投票",
        summary: "给新点找邻居，用标签投票。",
        sections: [
          { title: "先算距离，再投票", paragraphs: ["给每个训练点算距离。取最近的 K 个。", "数一数各标签的票数。实验让票数多的类胜出。"] },
          { title: "换一个 K", paragraphs: ["最近一点是 A。再往外两点都是 B。", "取 K 为 1，预测是 A。取 K 为 3，预测变成 B。"] },
        ],
        sources: [{ title: "scikit-learn · Nearest Neighbors", href: "https://scikit-learn.org/stable/modules/neighbors.html" }],
        relatedTopicIds: ["distance-metrics", "train-test-split"],
        experiments: [{ engineId: "knn-classification", label: "打开分类实验", prompt: "改 K 值，观察邻居和票数。" }],
      }, {
        id: "distance-metrics",
        title: "欧氏距离与曼哈顿距离",
        summary: "同一对坐标，可以换把尺子。",
        sections: [
          { title: "从原点量起", paragraphs: ["目标坐标是 (3, 4)。直线距离是 5。", "横竖各走一段。曼哈顿距离是 7。"] },
          { title: "换尺子会怎样", paragraphs: ["换距离公式，邻居排名可能变。", "坐标量纲也会影响距离。先想清每个轴的单位。"] },
        ],
        sources: [{ title: "scikit-learn · DistanceMetric", href: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.DistanceMetric.html" }],
        relatedTopicIds: ["knn-voting", "weighted-paths"],
        experiments: [{ engineId: "knn-classification", label: "比较距离公式", prompt: "换距离公式，对比邻居排名。" }],
      }],
    }],
  }, {
    id: "model-evaluation",
    title: "模型评估",
    chapters: [{
      id: "holdout-evaluation",
      title: "留出数据",
      topics: [{
        id: "train-test-split",
        title: "训练集、验证集与测试集",
        summary: "留一份没见过的数据做测验。",
        sections: [
          { title: "分三份来用", paragraphs: ["训练集给模型学。验证集用来选参数。", "测试集留到最后。用它估计新数据上的效果。"] },
          { title: "别用测试集挑 K", paragraphs: ["用测试分数选 K，会泄漏信息。", "先在验证集上选 K。定下来，再做最终测试。"] },
        ],
        sources: [{ title: "scikit-learn · Cross-validation", href: "https://scikit-learn.org/stable/modules/cross_validation.html" }],
        relatedTopicIds: ["knn-voting"],
        experiments: [],
      }],
    }],
  }],
} satisfies KnowledgeDomain;
