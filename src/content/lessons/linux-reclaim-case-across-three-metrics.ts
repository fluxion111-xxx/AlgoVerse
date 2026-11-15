import type { DeepLesson } from "./types";

export const reclaimMetricsLesson: DeepLesson = {
  title: "综合排查回收、复访与停顿",
  intro: "两段观测的回收速度一样。后一段却更卡。把扫描、复访和停顿放到同一张表里看看。",
  goals: ["统一计数和观测窗口。", "区分回收效率与复访压力。", "说清指标支持哪类推断。"],
  blocks: [
    { id: "scope", kind: "explain", title: "先对齐同一组任务", paragraphs: [
      "先固定 cgroup 和窗口。累计字段取末值减初值。窗口不同长时，页计数可除以秒数。",
      "用 pgscan 与 pgsteal 看扫描和回收。用 workingset_refault 的同类字段看已换出的页是否被重新访问。",
      "PSI 的 memory some 看至少有任务因内存受阻的时间份额。total 是累计微秒，先换单位再除以窗口时长。",
    ], formula: "扫描率=扫描页增量/秒数\n回收比=回收页增量/扫描页增量\nsome 占比=停顿时间增量/窗口时长" },
    { id: "trace", kind: "steps", title: "把两个窗口换成同一单位", steps: [
      { label: "记录基准窗口", text: "20 秒中扫描 800 页、回收 200 页、文件页复访 40 次。some total 增量为 400 毫秒。算出扫描 40 页/秒、回收 10 页/秒、复访 2 次/秒、停顿 2%。" },
      { label: "换算当前窗口", text: "10 秒中扫描 400、回收 100、复访 60。停顿 1200 毫秒。扫描和回收速率仍为 40 与 10，但复访和停顿变成 6 次/秒与 12%。" },
      { label: "并排读三种现象", text: "回收比均为 25%。仅凭这一列会错过变化。复访变多且停顿占比上升，支持检查热页是否反复被逐出。" },
      { label: "留出另一种解释", text: "若同一时段工作变多，复访也可能变多。接着核对请求量、内存上限和页来源，再重复同样的采样。" },
    ] },
    { id: "limits", kind: "explain", title: "保留统计口径才能复查", paragraphs: [
      "扫描与回收可能来自不同回收路径。跨窗口、跨层级或混用字段，会使比值失去解释意义。",
      "扫描为零时，回收比显示未定义。若计数回退，要核对采样对象是否重建。不能直接拿负增量解释。",
      "做现场观测时，在测试任务的 cgroup 目录读取 memory.stat 与 memory.pressure。记录起止时间，再做差。",
      "本课面板用手填增量做推演。关联实验展示单条引用的缺页和复访。内核计数还需现场采集。",
    ] },
  ],
  demo: "reclaim-evidence-window",
  exercises: [
    { id: "deep-reclaim-window", level: "基础", kind: "single", prompt: "比较不同长度的窗口，先怎么做？", options: ["把计数换成速率", "直接比较总量", "只保留峰值"],
      answer: 0, explanation: "先取同口径增量，再除以窗口时长，避免把窗口长短当成变化。", wrong: "让两列使用相同单位。", review: "scope" },
    { id: "deep-reclaim-stall", level: "应用", kind: "integer", prompt: "当前 10 秒窗口里，some 占比是百分之几？", answer: 12,
      explanation: "1200 毫秒除以 10000 毫秒，得 12%。", wrong: "分子和分母用同一单位。", review: "trace" },
    { id: "deep-reclaim-cause", level: "挑战", kind: "multiple", prompt: "哪些排查方法成立？", options: [
      "同回收比也可能有不同停顿", "复访增加必能直接定位故障", "对齐 cgroup 后再算差值", "比较时核对业务量和窗口",
    ], answer: [0, 2, 3], explanation: "回收比无法单独涵盖复访与停顿。相关指标需要与工作量一起解释。", wrong: "分别核对速率、压力与因果。", review: "limits" },
  ],
  recap: ["计数比较前先换单位。", "三类指标要合看。", "证据需要同一窗口。"],
  extension: "把复访改回每秒 2 次，保留高停顿。想想还需查什么。下一节看 memory.high 的节流。",
  next: "cgroup-memory-high-reclaim-throttle",
  sources: [
    { title: "Linux Kernel · cgroup v2 memory.stat", href: "https://docs.kernel.org/admin-guide/cgroup-v2.html" },
    { title: "Linux Kernel · Pressure Stall Information", href: "https://docs.kernel.org/accounting/psi.html" },
  ],
};
