import type { DeepLesson } from "./types";

export const bayesRuleLesson: DeepLesson = {
  title: "条件概率与贝叶斯公式",
  intro: "检测能发现九成事件。一次判阳后，事件就有九成可能发生吗？先把两类判阳放进同一张表。",
  goals: ["把条件概率读成缩小样本空间。", "由联合概率推出贝叶斯公式。", "用频数解释低基准率。"],
  blocks: [
    { id: "condition", kind: "explain", title: "条件放在竖线右边", paragraphs: [
      "用 E 表示有事件，用 T 表示判阳。给定 T 后，只在判阳集合中统计。T 的概率必须大于零。",
      "先算两个条件写法的联合概率。正反两个写法相等。用 P(T) 除开，得到贝叶斯公式。",
      "总判阳率来自两组。事件组有判阳。对照组也会误判阳。两条来源互斥，按各组占比加权求和。",
    ], formula: "P(E|T) = P(E∩T) / P(T)\nP(E∩T) = P(T|E) P(E)\nP(T) = P(T|E)P(E) + P(T|非E)P(非E)" },
    { id: "counts", kind: "steps", title: "用 1000 人讲清楚", steps: [
      { label: "先给基准人数", text: "1000 人中，有事件的 10 人。其余 990 人为对照组。事件的先验概率为 1%。" },
      { label: "各组分别判阳", text: "事件组的判阳率为 90%。期望判阳人数为 9。对照组的判阳率为 10%。期望误报 99 人。" },
      { label: "缩到判阳人群", text: "共有 108 人判阳。其中有事件的只有 9 人。后验为 9/108，约 8.33%。" },
      { label: "改变基准率", text: "把事件人数调到 100。两组判阳分别为 90、90。检测规则没变，后验已变为 50%。" },
    ] },
    { id: "application", kind: "explain", title: "什么会改变后验？", paragraphs: [
      "误判率的分母是对照组。判阳后有事件的分母是整个判阳组。这个区别也见于告警、推荐和质量检验。",
      "罕见事件通常面对大量对照样本。少量误报率乘上大量对照，也会在判阳集合中占大头。",
      "期望人数可以有小数。它表示重复抽样的平均，不必等于一次抽样的实测人数。",
      "若两组的判阳率都为零，观察不到 T。此时模型显示未定义。多个检测结果也不能随便当成独立事件。",
    ] },
  ],
  demo: "bayes-counts",
  exercises: [
    { id: "deep-bayes-denom", level: "基础", kind: "single", prompt: "已知判阳。求有事件的概率。分母是哪组？", options: ["所有判阳者", "所有有事件者", "所有判阴者"], answer: 0,
      explanation: "条件是判阳，样本空间缩到判阳组。", wrong: "先读竖线右边的条件。", review: "condition" },
    { id: "deep-bayes-positive", level: "应用", kind: "integer", prompt: "默认千人案例中，两组加起来有多少期望判阳者？", answer: 108,
      explanation: "事件组为 9 人，对照组为 99 人，合计 108。", wrong: "真阳性和误报都进判阳组。", review: "counts" },
    { id: "deep-bayes-limits", level: "挑战", kind: "multiple", prompt: "根据本节的概率模型判断。哪些说法成立？", options: ["基准率变化会影响后验", "判阳后概率总等于检测灵敏度", "判阳概率为零时该后验未定义", "两组人数都能影响总判阳率"], answer: [0, 2, 3],
      explanation: "后验依赖先验及两组判阳率。条件事件若概率为零就无法按本式计算。",
      wrong: "分别找出分子与两条判阳来源。", review: "application" },
  ],
  recap: ["给定条件先缩小样本空间。", "用总概率补齐分母。", "后验要看基准率。"],
  extension: "先改基准率，再改误报率。下一节细看怎样对分组加权。",
  next: "total-probability-partition",
  sources: [{ title: "MIT 6.041SC · Conditional Probability", href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/" }],
};
