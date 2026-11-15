import type { DeepLesson } from "./types";

export const conditionalExpectationLesson: DeepLesson = {
  title: "条件期望的迭代法则",
  intro: "轻任务平均 2 分钟，重任务平均 10 分钟。两组不同大。总体均值该怎样合并？",
  goals: ["区分组内均值与组占比。", "从联合分布推出全期望。", "用加权均值复核案例。"],
  blocks: [
    { id: "derive", kind: "explain", title: "先按组算，再合回总体", paragraphs: [
      "用 T 表示用时，G 表示任务类别。给定某个 g，按组内分布求 T 的期望。",
      "各组互斥且覆盖全部。联合概率可拆成组概率与组内条件概率的乘积。",
      "在总体均值的有限求和里，先按 g 分组。固定 g 后，组概率不随 t 变化。可以移到组内求和外。",
      "于是每组只留下一个条件均值。再按组别分布求一次期望，就回到总体。这叫迭代期望。",
    ], formula: "E[T] = Σg Σt t·P(T=t, G=g)\n     = Σg P(G=g) · Σt t·P(T=t | G=g)\n     = Σg P(G=g)·E[T | G=g] = E[E[T | G]]" },
    { id: "trace", kind: "steps", title: "从八笔任务算总体均值", steps: [
      { label: "列出两组用时", text: "轻任务两笔，用时 1 和 3。重任务六笔，用时 6、6、10、10、14、14。" },
      { label: "求各组均值", text: "轻任务共 4 分钟，均值 2。重任务共 60 分钟，均值 10。" },
      { label: "还原抽到各组的概率", text: "等概率抽一笔。轻组概率为 2/8，重组为 6/8。计算 (2/8)×2+(6/8)×10，得到 8 分钟。" },
      { label: "与逐笔相加核对", text: "直接加得 64 分钟。除以 8 也得 8。把 2 和 10 直接平均只得 6，因为这样假设两组等份。" },
    ] },
    { id: "weights", kind: "explain", title: "组权来自你要代表的总体", paragraphs: [
      "面板用各组笔数计算经验权重。若只过采样重任务，却想估计原系统均值，应使用原系统的组占比。",
      "若某组概率为零，就跳过它。在这类组中没有可计算的条件均值。本面板保留空组一行，用横线标记。",
      "把轻组改为六笔，重组仍为六笔。两组均值保持 2 和 10，这时总体是 6。改笔数就改了总体构成。",
      "全期望适用于有意义的期望值。本课只推导有限分布。它可用于计算服务时延或分层抽样的加权估计。",
    ] },
  ],
  demo: "conditional-mean-weights",
  exercises: [
    { id: "deep-expectation-weight", level: "基础", kind: "single", prompt: "合并组均值时，权重来自哪里？", options: ["目标总体的组占比", "各组均值排名", "总是平均分"], answer: 0,
      explanation: "外层期望按组别的概率分布求和。", wrong: "先问随机抽一笔时落入各组的概率。", review: "derive" },
    { id: "deep-expectation-average", level: "应用", kind: "integer", prompt: "案例八笔任务合起来，均值几分钟？", answer: 8,
      explanation: "总用时 4+60=64，除以总笔数 8 得 8。", wrong: "两组份额分别是四分之一和四分之三。", review: "trace" },
    { id: "deep-expectation-scope", level: "挑战", kind: "multiple", prompt: "计算目标总体均值时，哪些判断成立？", options: ["等份组的合并权重相同",
      "过采样后的组占比必是目标占比", "概率为零的组可以略去", "组均值不变时，改份额仍可能改总体均值"],
      answer: [0, 2, 3], explanation: "合并权重由目标总体决定。空组贡献为零。不同均值的组重新加权，结果可能变化。", wrong: "分别核对组内值和混合权重。", review: "weights" },
  ],
  recap: ["先求各组的平均。", "再按目标总体加权。", "合并值可用总和复核。"],
  extension: "将两组笔数调成相同，再清空其中一组。对照总体值与空组提示。",
  next: "stratified-sampling-weighted-mean",
  sources: [{ title: "MIT 6.041SC · Law of Iterated Expectations", href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/8ba4d6a5a579d6bf815d9db3b830f1c3_MIT6_041SCF13_rec13_sol.pdf" }],
};
