import type { DeepLesson } from "./types";

export const knownSigmaIntervalLesson: DeepLesson = {
  title: "已知标准差时的均值区间",
  intro: "样本均值为 50。已知总体标准差为 10。怎样造出 95% 区间，又该怎样解释它？",
  goals: ["由标准误和临界值算半宽。", "核对样本量和置信水平的影响。", "解释固定均值与随机区间。"],
  blocks: [
    { id: "derive", kind: "explain", title: "从标准正态界限移回来", paragraphs: [
      "假设独立抽取同一正态总体。总体标准差 σ 已知且大于零。样本均值标准化后服从标准正态。",
      "双侧留出总概率 α。两端各留 α/2。中间范围的端点为 ±z₁₋α/₂。",
      "把标准化式移项，总体均值落进样本均值左右各一个半宽的区间。重复同一流程，区间覆盖总体均值的概率为 1−α。",
    ], formula: "Z=(X̄−μ)/(σ/√n)\n半宽 h=z₁₋α/₂·σ/√n\n区间 [x̄−h, x̄+h]" },
    { id: "trace", kind: "steps", title: "跟着 25 个样本算端点", steps: [
      { label: "先算标准误", text: "样本量 25，σ 为 10。标准误是 10/5=2。" },
      { label: "用双侧临界值", text: "95% 意味着两端各留 2.5%。查正态分位点 0.975，得约 1.96。半宽为 3.92。" },
      { label: "从均值左右展开", text: "均值 50 的两个端点为 46.08 与 53.92。全宽为 7.84，是半宽的两倍。" },
      { label: "扩大样本或覆盖目标", text: "若样本量改为 100，半宽缩到 1.96。若改为 99%，临界值增大，在同等数据条件下区间会更宽。" },
    ] },
    { id: "code", kind: "code", title: "用正态分位点复算", language: "Python",
      source: `from math import sqrt
from statistics import NormalDist

def mean_interval(mean, sigma, n, confidence):
    if sigma <= 0 or n < 1 or not 0 < confidence < 1:
        raise ValueError("Invalid interval parameters")
    z = NormalDist().inv_cdf((1 + confidence) / 2)
    half = z * sigma / sqrt(n)
    return mean - half, mean + half

print(tuple(round(v, 2) for v in mean_interval(50, 10, 25, 0.95)))`,
      notes: [{ lines: "4–7", text: "输入置信水平的小数。将中间概率换成右侧分位点。" },
        { lines: "8–11", text: "从标准误得半宽，再求端点。输出 (46.08, 53.92)。" }] },
    { id: "meaning", kind: "explain", title: "覆盖率描述重复构造", paragraphs: [
      "频率学派把真实 μ 固定。随机的是样本和区间端点。95% 描述长期覆盖比例。",
      "区间是为了估计总体均值。单条新观测还带有个体波动，不能用这个区间来断言落点。",
      "正态前提下公式可精确成立。非正态时要另核对抽样与近似。若 σ 未知，应重新选方法，下一节讨论 t 区间。",
    ] },
  ],
  demo: "known-sigma-z-interval",
  exercises: [
    { id: "deep-z-multiplier", level: "基础", kind: "single", prompt: "半宽如何从标准误得到？", options: ["乘正态临界值", "再除一次样本量", "在均值上加置信百分比"],
      answer: 0, explanation: "临界值给出标准误的倍数，二者相乘得到同单位半宽。", wrong: "先找两侧尾部给出的倍数。", review: "derive" },
    { id: "deep-z-halfwidth", level: "应用", kind: "text", prompt: "σ=10、n=100、95% 时，半宽是多少？保留两位小数。",
      answer: ["1.96"], explanation: "标准误为 10/10=1，95% 双侧临界值约为 1.96。", wrong: "只算半宽，不再乘二。", review: "trace" },
    { id: "deep-z-interpretation", level: "挑战", kind: "multiple", prompt: "对于本节方法，哪些判断成立？",
      options: ["其他条件相同，较高置信水平会加宽区间", "95% 指已得到区间中的真实均值仍随机", "σ 未知要重新核对方法", "同法重复抽样会得到不同端点"],
      answer: [0, 2, 3], explanation: "端点随样本变。分布、标准差和置信水平共同决定覆盖性质。", wrong: "分清总体参数与抽样结果。", review: "meaning" },
  ],
  recap: ["半宽等于临界值乘标准误。", "端点随样本而变。", "覆盖率要看重复过程。"],
  extension: "先把样本量翻四倍，再把置信水平调成 99%。下一节将已知 σ 改成由样本估计。",
  next: "ci-t-unknown-sigma-df",
  sources: [{ title: "NIST · Sample Sizes and Known-σ Confidence Limits", href: "https://itl.nist.gov/div898/handbook/prc/section2/prc222.htm" }],
};
