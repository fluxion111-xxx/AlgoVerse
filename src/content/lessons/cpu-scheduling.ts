import type { DeepLesson } from "./types";

export const schedulingLesson: DeepLesson = {
  title: "先来先服务与时间片轮转",
  intro: "长任务刚开始跑。短任务随后到了。它要等多久，才能第一次用到 CPU？",
  goals: ["用就绪队列推演两种策略。", "从时间轴算出三个指标。", "比较时间片和切换次数。"],
  blocks: [
    { id: "queue", kind: "explain", title: "谁已经能运行？", paragraphs: [
      "先看单核。一个时刻只跑一个进程。每个进程有到达时刻。它也有一段 CPU 用时。",
      "到达后，进程进入就绪队列。队里都是能跑的进程。CPU 空了，就取队首。",
      "先来先服务（FCFS）让队首一直跑。它跑完才换人。轮转（RR）给每次运行限时。用完时间片还没结束，就回队尾。",
    ] },
    { id: "timeline", kind: "steps", title: "画出轮转时间轴", steps: [
      { label: "先给 P1 两格", text: "P1 在 0 到达，需要 6 格。P2 在 1 到达，需要 4 格。P3 在 2 到达，需要 3 格。时间片是 2。" },
      { label: "先接纳新成员", text: "P1 占用 [0, 2)。模型先把已到达的进程入队。时刻 2 的队列为 P2、P3、P1。P1 还剩 4 格。" },
      { label: "出队、运行、归队", text: "P2 跑 [2, 4)。P3 跑 [4, 6)。P1 接着跑 [6, 8)。P2 在 [8, 10) 跑完。P3 只剩一格，在 11 结束。P1 最后在 13 结束。" },
      { label: "把时间轴对齐", text: "切到先来先服务。P1 跑到 6。P2 接着跑到 10。P3 最后跑到 13。总用时相同，三人的等待却变了。" },
    ] },
    { id: "metrics", kind: "explain", title: "区分等待与响应", paragraphs: [
      "首次运行前的等待叫响应时间。周转时间覆盖到达至结束。总等待还要算中途排队。",
      "在轮转案例里，P3 在 2 到达。它在 4 首跑，在 11 结束。响应为 2，周转为 9。扣掉 3 格运行，总等待为 6。",
      "想让后到的短任务早些开跑？先比响应。想看任务何时做完？再比周转。模型统计切换次数。它未计入切换耗时。",
    ], formula: "响应 = 首次运行 − 到达\n周转 = 完成 − 到达\n等待 = 周转 − CPU 用时（本课无 I/O 阻塞）" },
  ],
  demo: "scheduling",
  exercises: [
    { id: "deep-cpu-queue", level: "基础", kind: "single", prompt: "轮转时间片用完，P1 还没完成。它该去哪？",
      options: ["就绪队列的队尾", "就绪队列的队首", "等待 I/O 的队列"], answer: 0,
      explanation: "时间片到期只交还 CPU。P1 仍可运行，排到就绪队尾。", wrong: "先判断 P1 是否还能运行。", review: "queue" },
    { id: "deep-cpu-wait", level: "应用", kind: "integer", prompt: "默认轮转案例中，P2 总共等几格？",
      answer: 5, explanation: "P2 在 1 到达，在 10 完成。用时 4 格，等待为 10 − 1 − 4 = 5。",
      wrong: "首跑前只等了 1 格。还要计入中途排队。", review: "metrics" },
    { id: "deep-cpu-compare", level: "挑战", kind: "multiple", prompt: "默认进程切到先来先服务。哪些描述正确？",
      options: ["P3 响应时间变为 8", "P1 在时刻 13 完成", "三个进程都在时刻 13 前或当时完成", "P2 在时刻 6 首次运行"], answer: [0, 2, 3],
      explanation: "先来先服务的完成时刻是 6、10、13。P3 首跑在 10，响应为 10 − 2 = 8。",
      wrong: "策略变了，要重画时间轴。", review: "timeline" },
  ],
  recap: ["时间片会改变就绪队列。", "首跑时间和完成时间各有用途。", "用同一批进程公平对比。"],
  extension: "把时间片改成 6。再和先来先服务比。接着用指标衡量差异。",
  next: "cpu-turnaround-response",
  sources: [{ title: "OSTEP · Scheduling: Introduction", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf" }],
};
