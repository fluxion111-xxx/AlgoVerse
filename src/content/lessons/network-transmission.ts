import type { DeepLesson } from "./types";

export const networkTransmissionLesson: DeepLesson = {
  title: "数据包转发与丢包",
  intro: "两条路都能到 D。较快的路中途会丢包。发一批包，看看哪条路入选。再分清首跳转发和最终送达。",
  goals: ["分开看选路、转发和送达。", "用条件概率算端到端送达。", "读懂逐跳日志和延迟指标。"],
  blocks: [
    { id: "routing", kind: "explain", title: "路由与转发各做什么", paragraphs: [
      "路由计算决定去往目的地的路径。转发为每个到来的包查下一跳。",
      "在 IPv4 路由器上，转发会匹配目的地址。多个前缀都能匹配时，先看最长匹配。",
      "课内模型只保留两条候选路。它将各跳延迟相加。相同延迟时走 B。丢包率不参与选路。",
    ] },
    { id: "packets", kind: "steps", title: "跟完一个包", steps: [
      { label: "先算两条路", text: "AB 是 10 ms，BD 是 15 ms。走 B 共 25 ms。走 C 是 20 + 15 = 35 ms。模型选 B。" },
      { label: "先让四条链路全通", text: "所有丢包率置零。包 1 在 10 ms 转发。在累计 25 ms 送达。每包的时钟从 0 单独开始。" },
      { label: "让 BD 必丢", text: "把 BD 的丢包率调成 100%。同一个包先到 B。它在 BD 丢失。它会出现在转发日志里，却不计入送达。" },
      { label: "再切到 C", text: "把 AB 的延迟改成 40 ms。两条路的总延迟变成 55 和 35 ms。模型改走 C。C 路全通，送达延迟为 35 ms。" },
    ] },
    { id: "probability", kind: "explain", title: "为什么概率要相乘", paragraphs: [
      "第二跳只处理第一跳通过的包。要送达，两跳都得过。",
      "设两跳独立丢包。丢包率为 20% 和 25% 时，两个通过率分别是 80% 和 75%。乘积为 60%。端到端丢包率为 40%。",
      "一次十包试跑可能偏离期望。模型固定随机种子，便于复跑。平均延迟只看送达包。全丢时，此指标无值。",
      "本课不模拟拥塞与重传。日志里的累计延迟来自链路设定。换路不需要等待协议收敛。",
    ], formula: "P(送达) = (1 − 首跳丢包率) × (1 − 次跳丢包率)\nP(丢包) = 1 − P(送达)" },
  ],
  demo: "network",
  exercises: [
    { id: "deep-packet-route", level: "基础", kind: "single", prompt: "B 路 25 ms，C 路 35 ms。即使 BD 必丢，课内模型选哪条？",
      options: ["B 路", "C 路", "按包轮流选"], answer: 0,
      explanation: "模型按总延迟选路。BD 必丢会让送达数归零。", wrong: "先用延迟选路。再用丢包率算送达。", review: "routing" },
    { id: "deep-packet-probability", level: "应用", kind: "integer", prompt: "两跳独立丢包。丢包率是 20% 和 25%。端到端送达率是多少？填百分数的整数部分。",
      answer: 60, explanation: "第一跳通过率 80%。第二跳通过率 75%。相乘得 60%。",
      wrong: "要同时通过两跳。直接相加会重复计算。", review: "probability" },
    { id: "deep-packet-trace", level: "挑战", kind: "multiple", prompt: "AB 全通，BD 必丢。仍走 B 路。包 1 的哪些记录合理？",
      options: ["在 AB 转发", "在 BD 丢失", "在 D 送达", "整批包的平均送达延迟无值"], answer: [0, 1, 3],
      explanation: "每个包都通过 AB，再丢在 BD。没有送达样本可用于平均。",
      wrong: "转发成功只说明包过了一跳。", review: "packets" },
  ],
  recap: ["选路与转发是两件事。", "两跳通过率相乘。", "先看同一包的逐跳记录。"],
  extension: "让 BD 必丢，再改延迟触发换路。接着比较 TCP 与 UDP 的丢包处理。",
  next: "tcp-udp",
  sources: [{ title: "IETF RFC 1812 · IPv4 转发要求", href: "https://www.rfc-editor.org/rfc/rfc1812.html#section-5.2.4.3" }],
};
