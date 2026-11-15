import type { DeepLesson } from "./types";

export const knnFeatureScalingLesson: DeepLesson = {
  title: "KNN 特征尺度与邻居排序",
  intro: "距离公式没换。把一列的单位改了，最近邻却换了。先分清数据变化和尺度变化。",
  goals: ["说明不同倍率怎样改变距离。", "用真实引擎重现排名变化。", "避免用测试集拟合尺度。"],
  blocks: [
    { id: "weights", kind: "explain", title: "尺度会给特征不同的权重", paragraphs: [
      "欧氏距离把每一轴的差平方后相加。若 x 乘以 a，x 的平方差贡献就乘以 a²。",
      "若所有轴都乘同一个正数，所有距离一起放大，排序保持。只改变一个轴，排名就可能变。",
      "要按相同变换处理训练样本与查询点。只改其中一边，会把样本放到两套坐标系。",
    ], formula: "变换后距离² = a²(Δx)²+b²(Δy)²" },
    { id: "trace", kind: "steps", title: "用两条数据重排最近邻", steps: [
      { label: "先看原数值", text: "查询点为 (0,0)。A 在 (2,0)，B 在 (0,4)。倍率都为 1 时，A 距离 2，B 距离 4，首名是 A。" },
      { label: "只放大 x 三倍", text: "查询点仍在原点。A 变成 (6,0)，B 不动。欧氏距离变成 6 与 4，首名改为 B。" },
      { label: "找到并列的边界", text: "x 只放大两倍时，两点距离均为 4。站内引擎按输入次序破同距，A 在前。其他系统可能采用别的约定。" },
      { label: "让 y 也变化", text: "x 为三倍，y 为两倍。A 距离 6，B 距离 8。首名又是 A。计算时仍用同一条距离公式。" },
    ] },
    { id: "fit", kind: "explain", title: "缩放参数只从训练集估计", paragraphs: [
      "若采用标准化，可以用训练集的均值与标准差做逐轴变换。验证集、测试集和线上查询共用这些参数。",
      "标准差为零的列不能直接相除。可按任务删除恒定列或选择安全处理。尺度是否有利，应在验证数据上评估。",
      "本面板用可控倍率展示变化，并调用同一个 KNN 执行器。它只比较示例排名，没有测任务整体准确率。",
    ] },
  ],
  demo: "knn-axis-scale",
  exercises: [
    { id: "deep-scale-factor", level: "基础", kind: "single", prompt: "x 放大三倍，x 的平方差贡献变几倍？", options: ["九倍", "三倍", "不变"],
      answer: 0, explanation: "先乘 3 再平方，相当于平方项乘 9。", wrong: "注意变化发生在平方之前。", review: "weights" },
    { id: "deep-scale-a-distance", level: "应用", kind: "integer", prompt: "x 三倍、y 一倍时，A 到原点的距离是多少？", answer: 6,
      explanation: "A 变成 (6,0)，到原点的欧氏距离就是 6。", wrong: "用变换后的坐标计算。", review: "trace" },
    { id: "deep-scale-scope", level: "挑战", kind: "multiple", prompt: "哪些做法或结论成立？",
      options: ["训练样本与查询共用同一尺度", "用测试集拟合尺度才公平", "同一正倍率乘所有轴可保序", "放大单轴可能改变最近邻"],
      answer: [0, 2, 3], explanation: "训练集拟合避免泄漏。统一正倍率只同比缩放距离，单轴倍率会改变相对贡献。", wrong: "核对哪些数据可以参与拟合。", review: "fit" },
  ],
  recap: ["尺度会改变特征贡献。", "变换要在两边一致。", "参数从训练集估计。"],
  extension: "将两轴都设为两倍，再比较单轴两倍。下一节再决定近邻的票是否等权。",
  next: "knn-distance-weighted-vote",
  sources: [{ title: "scikit-learn · Importance of Feature Scaling", href: "https://scikit-learn.org/stable/auto_examples/preprocessing/plot_scaling_importance.html" }],
};
