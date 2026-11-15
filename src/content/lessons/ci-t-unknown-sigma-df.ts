import type { DeepLesson } from "./types";

export const unknownSigmaIntervalLesson: DeepLesson = {
  title: "标准差未知时的 t 自由度",
  intro: "只有五个样本，总体标准差未知。用样本标准差后，临界值为什么要跟着变？",
  goals: ["从样本量得到 t 自由度。", "用估计标准误计算均值区间。", "识别小样本适用前提。"],
  blocks: [
    { id: "derive", kind: "explain", title: "估计波动会多带来一层不确定性", paragraphs: [
      "总体标准差未知时，用样本标准差 s。计算 s 时，残差围绕本样本的均值。所有残差的和为零。",
      "因此 n 个残差有一条线性约束。残差平方和使用 n−1 自由度。在独立正态抽样下，标准化的均值用 t 分布。",
      "自由度影响尾部。用 95% 双侧区间时，取 t 的 0.975 分位点。再乘 s/√n，得到半宽。",
    ], formula: "s²=Σ(xᵢ−x̄)²/(n−1)\nT=(X̄−μ)/(S/√n) ~ tₙ₋₁（独立正态）\n95% 区间 x̄ ± t₀.₉₇₅,ₙ₋₁·s/√n" },
    { id: "trace", kind: "steps", title: "从五个样本算出区间", steps: [
      { label: "列摘要与自由度", text: "假定 n=5，均值 50，样本标准差 10。自由度为 4，估计标准误约为 4.4721。" },
      { label: "按自由度查临界值", text: "取自由度 4 的双侧 95% 临界值，约 2.7764。与标准误相乘，半宽约 12.42。" },
      { label: "写出两个端点", text: "均值减去和加上半宽，得到约 [37.58, 62.42]。若直接用 1.96，半宽约 8.77，会比本例 t 区间窄。" },
      { label: "把样本量调到 25", text: "固定均值和 s，只看构造变化。自由度变 24，临界值约 2.0639，标准误为 2，半宽约 4.13。" },
    ] },
    { id: "code", kind: "code", title: "查 t 分位点并计算端点", language: "Python",
      source: `from math import sqrt
from scipy.stats import t

def mean_interval(mean, sample_sd, n):
    if n < 2 or sample_sd <= 0:
        raise ValueError("Need n >= 2 and a positive sample SD")
    critical = float(t.ppf(0.975, df=n - 1))
    half = critical * sample_sd / sqrt(n)
    return mean - half, mean + half

print(tuple(round(value, 2) for value in mean_interval(50, 10, 5)))`,
      notes: [{ lines: "4–7", text: "至少需要两个观测。SciPy 按 n−1 查分位点。" },
        { lines: "8–11", text: "临界值乘估计标准误。打印 (37.58, 62.42)。" }] },
    { id: "scope", kind: "explain", title: "小样本先看抽样条件", paragraphs: [
      "精确的 t 结论依赖独立正态抽样。样本小且强偏态、含离群值或有依赖时，应核对能否用该方法。",
      "这里用 s 估计标准误。不能在只知道样本标准差时，把它当成已知总体标准差。",
      "面板只演示固定 95% 和几档样本量。它算的是均值区间。下一节比较均值与单次预测这两种目标。",
    ] },
  ],
  demo: "unknown-sigma-t-interval",
  exercises: [
    { id: "deep-t-df-why", level: "基础", kind: "single", prompt: "为什么残差少一个自由度？", options: ["残差和固定为零", "总要删掉第一个样本", "置信水平只能取 95%"],
      answer: 0, explanation: "用样本均值居中后，最后一个残差由其余残差确定。", wrong: "先把每个观测减去均值，再求和。", review: "derive" },
    { id: "deep-t-df-ten", level: "应用", kind: "integer", prompt: "样本有 10 个，用几自由度查表？", answer: 9,
      explanation: "单样本均值的 t 区间用 n−1，所以是 9。", wrong: "样本均值用掉一条约束。", review: "trace" },
    { id: "deep-t-evidence", level: "挑战", kind: "multiple", prompt: "哪些判断符合本节方法？",
      options: ["精确结论要核对独立正态抽样", "s 就是已知总体 σ", "自由度会影响临界值", "均值区间和预测区间问题不同"],
      answer: [0, 2, 3], explanation: "s 是由样本估计的波动。自由度控制 t 临界值。预测单条观测还有个体变化。", wrong: "分开推断条件、参数与目标。", review: "scope" },
  ],
  recap: ["用 s 估计标准误。", "用 n−1 查 t 分位点。", "小样本核对抽样假设。"],
  extension: "固定均值与 s，将 n 从 5 调到 25。下一节改为预测单条观测。",
  next: "ci-prediction-interval-distinct-target",
  sources: [
    { title: "NIST · Confidence Limits for a Mean", href: "https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/conflimi.htm" },
    { title: "NIST · Student’s t Critical Values", href: "https://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm" },
  ],
};
