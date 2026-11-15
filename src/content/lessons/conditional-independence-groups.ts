import type { DeepLesson } from "./types";

export const conditionalIndependenceLesson: DeepLesson = {
  title: "条件独立与分组效应",
  intro: "两种告警经常一起出现。它们在同一型号内独立。为什么合看设备却发现关联？",
  goals: ["检验同一组内的独立性。", "用全概率合成联合率。", "区分共同因素与因果链。"],
  blocks: [
    { id: "independence", kind: "explain", title: "先定观察范围", paragraphs: [
      "随机抽一台设备。用 A 表示温度报警。用 B 表示电源报警。用 G 表示设备组别。",
      "先限定在某个组 g。再比较两种数。一个是同时报警率。一个是两种报警率的乘积。这两数相等时，两事件在该组内独立。",
      "分组时只考虑占比大于零的组。总体独立要用总体概率再验一次。两次检验用的样本空间不同。",
    ], formula: "组内独立：P(A∩B | G=g) = P(A | G=g)P(B | G=g)\n总体独立：P(A∩B) = P(A)P(B)" },
    { id: "worked", kind: "steps", title: "沿着两组设备算一遍", steps: [
      { label: "算两张组内表", text: "旧设备占一半。两类告警各有 80% 概率。组内独立，故同时报警率为 64%。新设备两率各为 20%，同时报警率为 4%。" },
      { label: "先合并真正的联合率", text: "两组各占一半。总体同时报警率为 (64%+4%)/2，也就是 34%。每种告警的总体率都是 50%。" },
      { label: "再合并两种边际率", text: "用总体告警率相乘。50%×50% 得 25%。它与真实的 34% 不同。两告警在总体中相关。" },
      { label: "解释知道 A 后的变化", text: "出现 A 时，旧设备更可能在眼前。旧设备本就更易出现 B。故 P(B|A)=34%÷50%=68%，高于 P(B)=50%。" },
    ] },
    { id: "derive", kind: "explain", title: "把差值拆成三项", paragraphs: [
      "用 w 表示旧组占比。两组的 A 率为 a₁、a₂。B 率为 b₁、b₂。",
      "先用组内独立算联合率。再展开两条边际率的乘积。相减后，整式可以因式分解。",
      "两种告警随组别同向变化，差值为正。反向变化时，差值为负。若任一种告警率两组相同，差值为零。组别只有一个时也为零。",
    ], formula: "P(A∩B) − P(A)P(B)\n= wa₁b₁ + (1−w)a₂b₂ − [wa₁+(1−w)a₂][wb₁+(1−w)b₂]\n= w(1−w)(a₁−a₂)(b₁−b₂)" },
    { id: "scope", kind: "explain", title: "排障时先分开看", paragraphs: [
      "若在全量日志中看到共现，先按型号画各自的四格表。检查组内关联还在不在。别把 34% 的共现当作证据，断定一种告警触发另一种。",
      "这个演示将组内独立作为输入假设。真实日志需核对样本量与观测误差。样本比例略有差距时，不能只看一次相等判断。",
    ] },
  ],
  demo: "conditional-group-mixture",
  exercises: [
    { id: "deep-group-criterion", level: "基础", kind: "single", prompt: "验旧组内独立，该用哪些概率？", options: ["都用旧组内概率", "都用总体概率", "只比较两组的占比"], answer: 0,
      explanation: "两边必须来自同一个条件范围。比较旧组联合率与旧组边际率的乘积。", wrong: "题目限定了设备组别。", review: "independence" },
    { id: "deep-group-posterior", level: "应用", kind: "integer", prompt: "案例中，已知 A 告警。B 的条件概率是百分之几？", answer: 68,
      explanation: "用同时告警率 34% 除以 A 的告警率 50%，得到 68%。", wrong: "分母取 A 告警率。", review: "worked" },
    { id: "deep-group-factor", level: "挑战", kind: "multiple", prompt: "本课的两组模型中，哪些设置会让总体也独立？",
      options: ["两组的 A 告警率相同", "两组各占一半就够了", "两组的 B 告警率相同", "全部样本都来自旧组"], answer: [0, 2, 3],
      explanation: "只要任意一个因子为零，联合率和边际率乘积就相等。份额各半不能单独使差值为零。",
      wrong: "看看哪个因子归零。", review: "derive" },
  ],
  recap: ["先验算组内乘积。", "用全概率合并联合率。", "共同因素能带来关联。"],
  extension: "先让两组 B 率相同。再让 B 与 A 随组别反向变化。",
  next: "joint-table-marginalize",
  sources: [
    { title: "MIT 6.041SC · Conditioning and Independence", href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/" },
    { title: "Penn State STAT 414 · Independent Events", href: "https://online.stat.psu.edu/stat414/Lesson05" },
  ],
};
