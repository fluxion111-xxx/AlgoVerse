import type { DeepLesson } from "./types";

export const perHopDeliveryLesson: DeepLesson = {
  title: "逐跳丢包与端到端送达率",
  intro: "一个包在 A 送出。它得经过 B 才能到 D。两段都可能丢包，有多少包能走完全程？",
  goals: ["拆出两种互斥的丢包路径。", "算理论送达率和期望送达数。", "用固定种子的实验解释偏差。"],
  blocks: [
    { id: "events", kind: "explain", title: "成功要求两跳都过", paragraphs: [
      "先假定路由固定，包丢了就停止。首跳过了，第二跳才会收到该包。把送达写成两次成功的交集。",
      "乘法法则总能用条件概率。若次跳概率按到达该跳的包定义，可直接乘。若手上是独立链路的单测数据，需要用到独立假设。",
      "若两跳受同一拥塞影响，首跳能过的包未必代表所有包。此时要用条件成功率。",
    ], formula: "P(送达) = P(首跳成功) × P(次跳成功 | 首跳成功)\n独立模型：P(送达) = (1−p₁)(1−p₂)" },
    { id: "trace", kind: "steps", title: "两跳都设 20% 丢包", steps: [
      { label: "先算首跳", text: "100 包中期望 80 包通过。余下 20 包在第一跳结束。" },
      { label: "再算第二跳", text: "次跳对这 80 包再丢两成。期望丢 16 包，送达 64 包。端到端丢包率为 36%。" },
      { label: "排除重复计数", text: "首跳丢的包不会二次丢。直接加 20% 和 20% 会误算。正确的两部分为 20% 与 16%。" },
      { label: "在原实验核对", text: "保持默认延迟。将 AB、BD 丢包率都设为 20%。逐包检查失败位置。试着把包数从 6 调到 30。" },
    ] },
    { id: "limits", kind: "explain", title: "曲线外还有什么？", paragraphs: [
      "理论送达率是模型里的概率。有限样本比例会波动。6 包的比例只能按六分之一跳动。",
      "课内固定种子用于复现。相同配置会得到相同的轨迹。重复点击相同输入不会增加独立样本。",
      "把任意必经跳调成必丢，理论送达率马上为零。若改变延迟使路线切走，就要按新路线计算。",
      "工程里要区分路径变动和链路误差。记录选路、丢包位置与包数，才能解释结果。",
    ] },
  ],
  demo: "network",
  exercises: [
    { id: "deep-hop-event", level: "基础", kind: "single", prompt: "包在首跳已丢。模型会在下一跳再算它吗？", options: ["会继续", "不会继续", "仅当丢包率相同"], answer: 1,
      explanation: "包在首跳损失后不会进入次跳。", wrong: "先检查包是否到达次跳。", review: "events" },
    { id: "deep-hop-delivery", level: "应用", kind: "integer", prompt: "两跳都丢两成。独立时送达率的百分数是多少？", answer: 64,
      explanation: "两跳都过才算送达。0.8×0.8=0.64。", wrong: "要乘通过率。", review: "trace" },
    { id: "deep-hop-limits", level: "挑战", kind: "multiple", prompt: "关于本节丢包模型，哪些说法成立？", options: ["相同种子可复现", "有限样本一定与理论值相同", "收到次跳的包已通过首跳", "相关链路应考虑条件概率"], answer: [0, 2, 3],
      explanation: "固定种子用于复现。理论概率和单次比例有别。次跳的样本取决于首跳。",
      wrong: "分清理论概率、条件样本和一次试跑。", review: "limits" },
  ],
  recap: ["送达要经过所有必经跳。", "丢包按互斥路径计数。", "理论与实测要分别报告。"],
  extension: "把 BD 调成 100% 丢包。再看 TCP 如何应对丢包。",
  next: "tcp-cwnd-rwnd",
  sources: [{ title: "MIT 6.041SC · Conditioning and Independence", href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/" }],
};
