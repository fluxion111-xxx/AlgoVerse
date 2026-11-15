import type { DeepLesson } from "./types";

export const sampleMeanErrorLesson: DeepLesson = {
  title: "样本均值的标准误",
  intro: "单次延迟波动为 12 毫秒。一次抽 9 笔或 36 笔，反复测得的均值会抖动多少？",
  goals: ["由方差推出均值标准误。", "用样本量比较精度。", "识别相关样本的反例。"],
  blocks: [
    { id: "derive", kind: "explain", title: "先算均值在重复抽样中的方差", paragraphs: [
      "标准差描述单次取值的波动。标准误描述估计量在重复抽样中的波动。本节的估计量是样本均值。",
      "假设独立同分布，且总体方差有限。独立时协方差为零。n 个值相加，方差变成 n 倍。",
      "均值还要把和缩小为 1/n。方差按比例的平方缩放，再开方，得到标准误。",
    ], formula: "Var(X̄)=(1/n²)·nσ²=σ²/n\nSE(X̄)=σ/√n" },
    { id: "trace", kind: "steps", title: "把样本量从 9 改到 36", steps: [
      { label: "固定总体波动", text: "单次延迟的总体标准差 σ=12 毫秒。选择独立模式。n=9 时，均值方差为 144/9=16。" },
      { label: "为方差开方", text: "方差单位是毫秒平方。开方后标准误为 4 毫秒。" },
      { label: "增加四倍样本量", text: "n=36 时，均值方差变 4，标准误为 2 毫秒。单次延迟的标准差仍是 12。" },
      { label: "重复同一次抽取", text: "同一个结果复制 36 份，均值还是那次抽到的值。它的标准误仍为 12。内容相同并未增加信息。" },
    ] },
    { id: "code", kind: "code", title: "列举两点分布的所有样本", language: "Python",
      source: `from itertools import product
from statistics import pstdev

for n in (1, 2, 4):
    means = [sum(draws) / n
             for draws in product((8, 32), repeat=n)]
    print(n, round(pstdev(means), 3))

repeat_one_draw = [sum([x] * 4) / 4 for x in (8, 32)]
print(round(pstdev(repeat_one_draw), 3))`,
      notes: [{ lines: "4–7", text: "每种独立抽取序列等概率。枚举所有均值，得到 12、8.485、6。" },
        { lines: "9–10", text: "复制同一次结果，只剩两种均值。标准误回到 12。" }] },
    { id: "limits", kind: "explain", title: "应用前要核对独立性", paragraphs: [
      "总体 σ 未知时，可在独立样本下用样本标准差 s 估计。若样本只有一个值，通常无法从样本内估计 s。",
      "同一用户的多次请求可能相关。协方差不为零时，需要按抽样单位和设计估计。不能只按日志行数套公式。",
      "标准误与置信区间还有一步。区间需要分布或近似、合适的临界值和覆盖目标。下节看已知 σ 的规则。",
    ] },
  ],
  demo: "sample-mean-uncertainty",
  exercises: [
    { id: "deep-se-object", level: "基础", kind: "single", prompt: "均值的标准误描述哪个波动？", options: ["重复抽样得到的均值", "单个数据点", "记录的最大值"],
      answer: 0, explanation: "估计量是本次的均值。重复抽样后，各次均值围绕总体均值波动。", wrong: "先明确随机量是哪一个。", review: "derive" },
    { id: "deep-se-fourfold", level: "应用", kind: "integer", prompt: "独立模式下，σ=12、n=36 的标准误是多少？", answer: 2,
      explanation: "36 的平方根是 6。12 除以 6 得 2。", wrong: "分母是样本量的平方根。", review: "trace" },
    { id: "deep-se-dependence", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["独立样本量四倍可让标准误减半", "复制同一个值也能让标准误减半", "相关性会改变均值方差", "单次波动与均值波动是两种量"],
      answer: [0, 2, 3], explanation: "平方根缩放依赖独立方差相加。完全共享时，复制没有增加独立样本。", wrong: "核对每个观测是否提供新信息。", review: "limits" },
  ],
  recap: ["标准误描述估计量波动。", "独立时按平方根缩小。", "相关性会改变计算。"],
  extension: "固定样本量，把独立模式换成重复抽取。下一节用标准误计算区间半宽。",
  next: "ci-z-known-sigma-halfwidth",
  sources: [{ title: "Penn State STAT 505 · Sample Mean", href: "https://online.stat.psu.edu/stat505/Lesson05" }],
};
