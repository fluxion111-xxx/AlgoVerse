import type { DeepLesson } from "./types";

export const tcpCongestionLesson: DeepLesson = {
  title: "TCP 拥塞控制",
  intro: "发送方先收到一串重复确认。下一次却等到超时。两种信号会怎样改变发送窗口？",
  goals: ["分清拥塞窗口与接收窗口。", "跟踪慢启动、拥塞避免和快恢复。", "比较三次重复 ACK 与超时。"],
  blocks: [
    { id: "windows", kind: "explain", title: "两扇窗口各管什么", paragraphs: [
      "拥塞窗口 cwnd 约束发送方。它反映发送方估计的网络容量。接收窗口 rwnd 由接收方通告。",
      "发送要同时满足两种限制。先取两者较小值。再扣除在途数据。余额就是还能发送的数据量。",
      "实验只算拥塞窗口。它以 MSS 为单位。一个 MSS 是单段最大数据长度。模型设每个新 ACK 确认一段。",
    ], formula: "两个窗口给出的在途上限 = min(cwnd, rwnd)" },
    { id: "growth", kind: "steps", title: "窗口先快长，再慢长", steps: [
      { label: "从 4 起步", text: "初始窗口是 4 MSS。阈值是 8 MSS。窗口低于阈值时，每个新 ACK 加 1。" },
      { label: "到达阈值", text: "前四个新 ACK 让窗口变为 5、6、7、8。模型在 8 切到拥塞避免。" },
      { label: "继续确认", text: "第五个新 ACK 只加 1/8。窗口到 8.125。回放显示两位小数。" },
    ] },
    { id: "loss", kind: "steps", title: "丢包信号怎样减窗", steps: [
      { label: "等到第三个重复 ACK", text: "前两个重复 ACK 不改窗口。第三个触发快重传。模型用当前窗口近似在途量。窗口折半取整得到阈值 4。快恢复窗口暂设为 4 + 3 = 7。" },
      { label: "退出快恢复", text: "额外一个重复 ACK 把窗口推到 8。收到新 ACK 后，窗口回到阈值 4。课内只模拟单次丢包恢复。新 ACK 表示本次恢复结束。" },
      { label: "再遇到超时", text: "从窗口 4 超时。阈值降为 2。窗口回到 1，进入慢启动。下一个新 ACK 让窗口到 2。" },
      { label: "用相同起点比较", text: "把初始窗口设成 8。输入三次 dup，窗口变为 7。换成单个 timeout，窗口回到 1。两种信号都把阈值设成 4。" },
    ] },
  ],
  demo: "tcp-congestion",
  exercises: [
    { id: "deep-tcp-window", level: "基础", kind: "single", prompt: "cwnd 是 8 MSS，rwnd 是 3 MSS。哪个值限制当前在途上限？",
      options: ["3 MSS", "8 MSS", "11 MSS"], answer: 0,
      explanation: "同时满足两扇窗口。较小值 3 MSS 更紧。", wrong: "先看哪扇窗口更小。", review: "windows" },
    { id: "deep-tcp-recovery", level: "应用", kind: "integer", prompt: "初始窗口为 8 MSS。收到第三个连续的重复 ACK。快恢复窗口是多少？",
      answer: 7, explanation: "模型将阈值设为 4，再加 3 得到窗口 7。",
      wrong: "先算阈值。快恢复窗口比阈值多 3。", review: "loss" },
    { id: "deep-tcp-ack-modes", level: "挑战", kind: "multiple", prompt: "课内 Reno 模型里，哪些描述正确？",
      options: ["慢启动中每个新 ACK 加 1 MSS", "拥塞避免每个新 ACK 加 1/cwnd", "第一次重复 ACK 就快重传", "超时后窗口回到 1 MSS"], answer: [0, 1, 3],
      explanation: "增长量由阶段决定。此模型累计三次重复 ACK 才快重传。超时则把窗口设为 1。",
      wrong: "分清新 ACK、重复 ACK 与超时。", review: "loss" },
  ],
  recap: ["接收窗口和拥塞窗口都能限制发送。", "阈值决定增长阶段。", "超时和快恢复的窗口不同。"],
  extension: "只保留三次 dup，再改成单次 timeout。接着看超时如何退避。",
  next: "tcp-rto-backoff",
  sources: [{ title: "IETF RFC 5681 · TCP Congestion Control", href: "https://www.rfc-editor.org/rfc/rfc5681.html" }],
};
