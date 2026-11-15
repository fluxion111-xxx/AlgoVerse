import type { DeepLesson } from "./types";

export const memoryHighLesson: DeepLesson = {
  title: "memory.high 与施加回收压力",
  intro: "任务用量到了 900 MiB。高线是 800，硬线是 1000。它可能开始变慢，却继续运行。",
  goals: ["区分高线与硬上限。", "根据拟用量和回收量做推演。", "用内存事件验证可能的节流。"],
  blocks: [
    { id: "limits", kind: "explain", title: "两道线有不同用途", paragraphs: [
      "memory.high 是施加回收压力的界限。超过后，任务可被节流，并承受较强回收压力。用量可暂时越线。",
      "memory.max 是硬上限。若用量到线且无法回收，可能触发组内 OOM。内核在特定条件下允许用量暂时越过它。",
      "同样超过某条线，能回收的页量也会不同。仅凭一次用量读数，不能判断实际回收耗时或进程是否会被终止。",
    ] },
    { id: "trace", kind: "steps", title: "用拟用量和回收量做两次估算", steps: [
      { label: "先看 900 MiB", text: "高线 800，硬线 1000。900 仅超过高线。实验先检查节流和直接回收指标。" },
      { label: "假定收回 80 MiB", text: "估算剩 820，仍比高线高 20。若能收回 120，则估算剩 780，已落回高线以内。" },
      { label: "尝试触到硬线外", text: "把拟用量改 1060，只假定收回 20。估算还需 1040，超过硬线。实际能否满足申请，要看后续回收及分配条件。" },
      { label: "查时间窗中的事件", text: "在同一组内记录 high、max、oom 与 oom_kill 增量。再对照 memory.pressure 和业务时延，确认节流与失败是否发生。" },
    ] },
    { id: "measure", kind: "explain", title: "把模型和现场证据接起来", paragraphs: [
      "面板做用量减法，并标出所在范围。假定回收量由你输入。它不会计算 Linux 回收量或 OOM 结果。",
      "memory.events 的 high 计数可反映高线后的节流和直接回收。max 表示用量即将越过硬线上限的事件。",
      "内存读数和计数应对齐同一路径。父组的层级事件也可能来自子组。下一节区分 memory.events 与 memory.events.local。",
    ], formula: "回收后估算用量 = 拟用量 − 本轮假定回收量" },
  ],
  demo: "cgroup-high-thresholds",
  exercises: [
    { id: "deep-high-mechanism", level: "基础", kind: "single", prompt: "仅跨过高线时，先查什么？", options: ["节流和回收压力", "必然已发生 OOM", "仅看主机磁盘容量"],
      answer: 0, explanation: "高线对应回收压力和节流。应另看实际事件再判断失败。", wrong: "区分高线的作用和硬上限。", review: "limits" },
    { id: "deep-high-after", level: "应用", kind: "integer", prompt: "900 MiB 假定回收 80 后，还剩多少 MiB？", answer: 820,
      explanation: "900−80=820。它仍超过高线 800。", wrong: "先算用量，再比阈值。", review: "trace" },
    { id: "deep-high-evidence", level: "挑战", kind: "multiple", prompt: "哪些排查判断有依据？",
      options: ["回收后可回到高线内", "超过高线就一定被终止", "比较计数时要对齐 cgroup 和窗口", "硬线下仍可能有停顿"],
      answer: [0, 2, 3], explanation: "两道线分别影响回收压力和硬限制。停顿要结合计数与时序解释。", wrong: "分别看限速、回收和实际终止证据。", review: "measure" },
  ],
  recap: ["高线施加回收压力。", "硬线约束最高用量。", "现场判断需看事件。"],
  extension: "固定拟用量，改变假定回收量。再检查父组和子组的事件来源。",
  next: "cgroup-memory-events-local-scope",
  sources: [{ title: "Linux Kernel · cgroup v2 Memory Interface Files", href: "https://docs.kernel.org/admin-guide/cgroup-v2.html#memory-interface-files" }],
};
