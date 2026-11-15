import type { DeepLesson } from "./types";

export const workingSetLesson: DeepLesson = {
  title: "工作集与分页抖动",
  intro: "程序都有八次访问。一个只缺四次，另一个次次缺页。固定两框，看看变化从哪里来。",
  goals: ["跟着引用窗口算工作集。", "比较分阶段与循环访问。", "解释持续缺页和性能代价。"],
  blocks: [
    { id: "window", kind: "explain", title: "用最近引用估计活跃页", paragraphs: [
      "工作集看一段时间内活跃过哪些页。本课把窗口定义为最近 Δ 次引用，包含当前访问。",
      "对窗口内的页号去重。还没累积满 Δ 次时，只看已经发生的访问。",
      "工作集随程序阶段变化。窗口扩大能留下更久的历史，也可能把两个阶段混进去。它是局部性指标。",
    ], formula: "W(t, Δ) = {第 max(1,t−Δ+1) 次到第 t 次引用涉及的页}" },
    { id: "trace", kind: "steps", title: "两条引用串，只给两框", steps: [
      { label: "先跑分阶段模式", text: "序列是 1、2、1、2、3、4、3、4。前四次围绕页 1、2。两次装入后，两次命中。" },
      { label: "看阶段切换", text: "改读 3、4 时各缺一次。窗口在第 6 次包含 {1,2,3,4}。到第 8 次只剩 {3,4}。全程缺 4 次。" },
      { label: "换成循环模式", text: "序列是 1、2、3、4、1、2、3、4。第 4 次起，四引用窗口总有四个不同页。两框下，每次复访都已换出，共缺 8 次。" },
      { label: "让容量匹配循环", text: "把页框增加到 4。循环的四个页可以同时留下。前四次仍冷缺页，后四次全部命中。" },
    ] },
    { id: "diagnose", kind: "explain", title: "把计数和性能证据分开", paragraphs: [
      "缺页若需要从慢存储取回，频繁淘汰和复访会挤占程序运行时间。持续到几乎只忙于换页时，才是典型分页抖动。",
      "一次阶段切换也会出现缺页高峰。判断持续影响，可对照缺页是否迅速回落、回收后是否频繁复访，以及等待时间是否上升。",
      "改窗口只改变统计范围。改页框才改变此处的置换结果。本面板调用站内 LRU，未计磁盘时延或真实内核停顿。",
    ] },
  ],
  demo: "lru-working-set",
  exercises: [
    { id: "deep-working-window", level: "基础", kind: "single", prompt: "窗口内同一页访问两次，工作集计几个页？", options: ["一个", "两个", "零个"], answer: 0,
      explanation: "工作集是不同页的集合。出现多次也只占一个元素。", wrong: "数集合大小。", review: "window" },
    { id: "deep-working-cycle", level: "应用", kind: "integer", prompt: "默认循环模式用两框，共缺几次页？", answer: 8,
      explanation: "前四次是首次访问。后四次的目标页也已被淘汰。", wrong: "复访前已轮过三个别页。", review: "trace" },
    { id: "deep-working-diagnose", level: "挑战", kind: "multiple", prompt: "哪些说法和实验一致？",
      options: ["改窗口不会改变置换轨迹", "一次缺页高峰即可确认分页抖动", "四框能容纳本例循环页", "还需看缺页实际代价"],
      answer: [0, 2, 3], explanation: "窗口是统计工具。置换由访问和容量决定。持续缺页的性能影响要另看等待。", wrong: "分清统计、执行和计时。", review: "diagnose" },
  ],
  recap: ["窗口估计活跃页。", "容量不足可导致反复复访。", "缺页数需结合等待解读。"],
  extension: "在循环模式下先改窗口，再改页框。比较两次修改影响了哪些列。",
  next: "linux-reclaim-refault-working-set",
  sources: [{ title: "OSTEP · Replacement Policies and Thrashing", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf" }],
};
