import type { DeepLesson } from "./types";

export const stratifiedSamplingLesson: DeepLesson = {
  title: "分层抽样与总体加权",
  intro: "高负载用户在总体中只占一成。为了看清这组，抽样却给了它一半名额。怎样估计全体延迟？",
  goals: ["区分总体占比和抽样占比。", "算分层加权均值。", "识别估计缺层和偏差的来源。"],
  blocks: [
    { id: "weights", kind: "explain", title: "抽多少与代表谁分开", paragraphs: [
      "把总体分成互不重叠的层。每个用户恰好属于一层。在各层内按设计抽样。",
      "样本给各层均值提供估计。合并时，需要让每层代表它在总体中的真实份额。抽样名额可以刻意不按份额安排。",
      "总体中某层有 Nₕ 人，总人数 N，权重就是 Nₕ/N。用该权重乘该层样本均值，再把各层相加。",
    ], formula: "总体加权估计 = Σₕ (Nₕ/N)·样本层均值ₕ\n直接合并样本使用的权重则为 nₕ/Σₖ nₖ" },
    { id: "example", kind: "steps", title: "二十人样本代表一千人", steps: [
      { label: "先写总体与样本规模", text: "总体一千人。常规用户 900 人，高负载用户 100 人。为两层各抽十人，样本份额各半。" },
      { label: "分别求层内均值", text: "常规十个样本共 100 毫秒，高负载十个共 400 毫秒。层均值是 10 和 40 毫秒。" },
      { label: "直接合并试一次", text: "样本共 500 毫秒，除以 20 得 25 毫秒。此值让高负载组占了一半权重。" },
      { label: "改用总体份额", text: "用 0.9×10+0.1×40，得到 13 毫秒。把抽样比例改成 18 比 2，若层均值不变，直接平均也会得到 13。" },
    ] },
    { id: "coverage", kind: "explain", title: "权重无法修复层内偏差", paragraphs: [
      "若每层做等概率抽样，每个单位的期望入样机会相同。层样本均值的期望等于层总体均值。",
      "加权是线性求和。把层均值各自的期望代入，就得到总体均值。因此层内无偏时，这个加权估计无偏。",
      "只测容易联系的用户，层内均值仍可能偏。总体加权也无法补救。正权重的层没有样本时，先报告缺层。",
      "权重固定且层均值没变时，调抽样数只改变直接合并及精度。实际重复抽样会使层均值波动。",
    ] },
  ],
  demo: "stratified-population-mean",
  exercises: [
    { id: "deep-stratified-source", level: "基础", kind: "single", prompt: "合并时用哪种权重？", options: ["总体各层份额", "各层抽样个数排名", "两层总是各半"],
      answer: 0, explanation: "样本估计层均值。总体份额说明每层代表多少人。", wrong: "先看要代表的是哪个总体。", review: "weights" },
    { id: "deep-stratified-mean", level: "应用", kind: "integer", prompt: "默认案例的总体加权均值是多少毫秒？", answer: 13,
      explanation: "常规贡献 9，高负载贡献 4，合计 13。", wrong: "常规层在总体中占九成。", review: "example" },
    { id: "deep-stratified-scope", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["相同层均值下，改抽样数不必改变总体加权值", "总体权重能消除一切层内偏差", "正权重的空样本层需报告缺失", "样本比例匹配总体比例时，两种合并一致"],
      answer: [0, 2, 3], explanation: "总体估计取决于层均值和总体权重。缺层或有偏层均值需要另行处理。", wrong: "分开估计值、覆盖与权重。", review: "coverage" },
  ],
  recap: ["样本决定层均值。", "总体份额决定权重。", "缺层时先报告缺失。"],
  extension: "把两层抽样数改为 18 和 2，再清空高负载层。接着看样本均值的标准误。",
  next: "standard-error-mean-sqrt",
  sources: [{ title: "Penn State STAT 506 · Stratified Sampling", href: "https://online.stat.psu.edu/stat506/Lesson06" }],
};
