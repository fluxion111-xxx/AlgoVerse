import type { DeepLesson } from "./types";

export const deadlockAvoidanceLesson: DeepLesson = {
  title: "银行家算法的安全序列",
  intro: "现在够发一笔资源。发完后，大家还能陆续做完吗？先在纸上试分配。",
  goals: ["按资源类别比较请求和余量。", "手算一次完成与归还。", "区分资源不足和试分配不安全。"],
  blocks: [
    { id: "rules", kind: "explain", title: "审批分三关", paragraphs: [
      "每种资源单独比较。某类多出的量只能供同类需求。",
      "先查请求是否超出尚需。再看当前可用量够不够。两关都过，才做试分配。",
      "用一份临时可用量做检查。找尚需都能满足的进程。假设它完成，归还已分配资源。反复找，直到全完成或卡住。",
      "临时借出的尚需会一起归还。因此净增量是原有分配。可用量只加当时的已分配量。",
    ], formula: "尚需 = 最大需求 − 已分配\n试分配后可用量 = 原可用量 − 本次请求" },
    { id: "trace", kind: "steps", title: "让 P1 先做完", steps: [
      { label: "读三类资源", text: "可用量是 [3, 3, 2]。P1 原来的尚需是 [1, 2, 2]。它申请 [1, 0, 2]。两关都通过。" },
      { label: "试着发出去", text: "临时可用量降为 [2, 3, 0]。P1 的尚需变为 [0, 2, 0]。它现在就能完成。" },
      { label: "模拟 P1 归还", text: "P1 归还已分配的 [3, 0, 2]。临时可用量变为 [5, 3, 2]。现在 P3 也能完成。" },
      { label: "继续检查余下进程", text: "此后轮到 P0、P2、P4。完整顺序是 P1、P3、P0、P2、P4。找到一条完整顺序即可批准。" },
    ] },
    { id: "unsafe", kind: "explain", title: "够发也可能不安全", paragraphs: [
      "改成 P4 申请 [3, 3, 0]。原可用量足够。试发后只剩 [0, 0, 2]。",
      "P4 还缺第一类资源。其他进程也有资源缺口。没有谁能先完成，试分配就撤销。",
      "不安全表示无法保证全部完成。实际请求未必都达到上限。因此它不等于已经死锁。",
    ] },
  ],
  demo: "deadlock-avoidance",
  exercises: [
    { id: "deep-banker-need", level: "基础", kind: "single", prompt: "最大需求 [5, 3]。已分配 [2, 1]。尚需多少？",
      options: ["[3, 2]", "[7, 4]", "[2, 3]"], answer: 0,
      explanation: "逐项相减。第一类还缺 3，第二类还缺 2。", wrong: "按资源类别分别相减。", review: "rules" },
    { id: "deep-banker-release", level: "应用", kind: "integer", prompt: "默认试分配后，P1 模拟完成。第一类资源可用量是多少？",
      answer: 5, explanation: "试发后剩 2。P1 归还这一类的 3 份资源。合计为 5。",
      wrong: "从试发后的 2 份开始算。", review: "trace" },
    { id: "deep-banker-unsafe", level: "挑战", kind: "multiple", prompt: "P4 申请 [3, 3, 0]。关于课内案例，哪些说法正确？",
      options: ["原可用量够发", "试发后可用量为 [0, 0, 2]", "试发后存在安全序列", "算法撤销试分配"], answer: [0, 1, 3],
      explanation: "试发后，所有进程都至少缺一类资源。第一轮就找不到可完成者。",
      wrong: "先算余额。再找一个能做完的进程。", review: "unsafe" },
  ],
  recap: ["按资源类别检查。", "安全序列是一种完成保证。", "找不到序列就撤销试分配。"],
  extension: "换个请求，区分暂缓和撤销。再看数据库如何处理死锁。",
  next: "database-deadlock-retry",
  sources: [{ title: "Colorado State University · CS370 Deadlocks", href: "https://cs.colostate.edu/~cs370/Fall21/lectures/8DeadlockL15.pdf" }],
};
