import type { DeepLesson } from "./types";

export const hopCrosscheckLesson: DeepLesson = {
  title: "双观察点定位仿真丢包",
  intro: "终点没收到包。沿同一个包号往前翻，能找到它是在哪一跳停止的吗？",
  goals: ["用同一包号配对逐跳事件。", "区分未到达与本跳丢弃。", "重新选路后核对正确的链路。"],
  blocks: [
    { id: "method", kind: "explain", title: "先确认路由，再配对包号", paragraphs: [
      "站内引擎从两条候选路径选总延迟低的一条。路径固定后，每个包依次走两跳。",
      "第一跳可转发或丢弃。若已丢弃，后续一跳不会产生该包事件。第二跳成功时才送达终点。",
      "把事件按编号对齐。看到首跳转发、次跳丢弃，才能在仿真中把原因定位到第二条链路。",
    ] },
    { id: "trace", kind: "steps", title: "同三包，比较两种掉法", steps: [
      { label: "先走 AB 与 BD", text: "默认 AB 10 毫秒、BD 15 毫秒。另一条经 C 的路径共 35 毫秒。引擎选择 25 毫秒路径。" },
      { label: "在第二跳丢失", text: "AB 丢包率 0%，BD 100%。三个包都在 AB 的 10 毫秒处转发，又在 BD 的 25 毫秒处丢弃。送达 0 个。" },
      { label: "让第一跳必丢", text: "把 AB 改成 100%。同样送达 0 个，但三个包都在 AB 丢弃。BD 表示未到达，没有丢弃事件。" },
      { label: "换掉整条路线", text: "把 AB 延迟改为 21 毫秒，原路径总延迟为 36。引擎改走 AC 与 CD。两条链路都无丢包，三个包都送达。" },
    ] },
    { id: "scope", kind: "explain", title: "说明这些证据从哪来", paragraphs: [
      "面板复用站内传输引擎。表中毫秒数是各包从发出算起的路径累计时间，包与包之间没有共享发包时钟。",
      "固定种子可复现中间丢包率的结果。不同丢包设定可能改变取样顺序。极端的 0% 与 100% 适合先检查因果。",
      "真实抓包还需验证采集完整性，并按可用字段配对。真实文件中的缺口无法直接当作引擎的丢弃事件。",
    ] },
  ],
  demo: "network-hop-crosscheck",
  exercises: [
    { id: "deep-hop-crosscheck-stop", level: "基础", kind: "single", prompt: "首跳已丢弃，次跳应显示什么？", options: ["未到达本跳", "次跳也丢弃一次", "已送达"],
      answer: 0, explanation: "引擎在丢弃处停止该包。后续链路没有这个包的事件。", wrong: "跟同一个包号向后看。", review: "method" },
    { id: "deep-hop-crosscheck-time", level: "应用", kind: "integer", prompt: "默认案例在 BD 丢弃时，累计时间是多少毫秒？", answer: 25,
      explanation: "先走 AB 的 10 毫秒，再加 BD 的 15 毫秒。", wrong: "第二跳时间从发出算起。", review: "trace" },
    { id: "deep-hop-crosscheck-evidence", level: "挑战", kind: "multiple", prompt: "哪些排查做法成立？",
      options: ["按编号配对两跳事件", "终点零送达就能单独定位链路", "选路变化后对照新的链路", "真实抓包还要检查漏采"],
      answer: [0, 2, 3], explanation: "同样零送达可发生在不同链路。对齐路由、编号和采集范围后才有定位证据。", wrong: "先分清总结果和逐跳记录。", review: "scope" },
  ],
  recap: ["先定路由。", "再按包号比两跳。", "缺事件要区分原因。"],
  extension: "回到 AB 与 BD，试 30% 的丢包率。下一节看双端抓包如何配对和对时。",
  next: "capture-dual-vantage-clock-order",
  sources: [{ title: "Wireshark · TCP Analysis", href: "https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html" }],
};
