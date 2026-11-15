import type { DeepLesson } from "./types";

export const captureVantageLesson: DeepLesson = {
  title: "单侧抓包与观测边界",
  intro: "发送端在一秒后重发。它没看到确认。问题会在发送方向，还是确认返回的路径？",
  goals: ["用序号对齐两端记录。", "辨别正向丢失和回程失联。", "区分漏采与网络事件。"],
  blocks: [
    { id: "evidence", kind: "explain", title: "每份抓包只看见一处", paragraphs: [
      "用连接两端地址和端口定位同一条 TCP 流。再比序号、数据长度和累计确认号。",
      "本例数据从序号 1000 起，占 100 字节。ACK 1100 表示接收方接下来期望序号 1100。",
      "发送侧抓到出站包，只证明该观察点记录了它。包在后续路径的状态，还需要到另一处验证。",
      "分析器会依据可见序号推断重传。记录丢失、起点太晚或网卡聚合，都可能改变它看到的证据。",
    ] },
    { id: "timeline", kind: "steps", title: "两条路径，同一份发送侧记录", steps: [
      { label: "先看发送端", text: "从同一时钟起算。0 毫秒发 Seq=1000。1000 毫秒重发。1040 毫秒收到 ACK=1100。两种场景完全相同。" },
      { label: "切到首次数据段未到达", text: "接收侧在 20 毫秒没有该段的记录。到 1020 毫秒，才收到重发的数据。随后发出 ACK。" },
      { label: "切到首次 ACK 未返回", text: "接收侧在 20 毫秒已记录首次数据和 ACK。发送侧没收到这个 ACK。1020 毫秒再收重复段，接收侧再次发确认。" },
      { label: "故意晚点开始记录", text: "将接收侧记录起点改到 50 毫秒。早期到达和 ACK 会消失。两条记录此时都从后续一轮开始。单靠晚到的记录不能排除漏采。" },
    ] },
    { id: "diagnose", kind: "explain", title: "从端点缩小范围", paragraphs: [
      "核对两端网卡与过滤条件。保留完整连接标识。只截报文头时，也要确认序号和长度还在。",
      "真实机器时钟未必同步。可用两边都出现的请求对齐顺序。时钟误差未知时，别直接相减估单程延迟。",
      "检查采集工具的丢包统计，并考虑卸载导致的分段差异。同一段字节可能在两份记录里分成不同的帧。",
      "双端证据能缩小故障范围。要指认一台中间设备，需它附近的计数器、日志或额外观察点。",
      "面板用预设事件演示可观测性。它不打开网卡。真实抓包应在有授权的测试流上进行。",
    ] },
  ],
  demo: "capture-vantage",
  exercises: [
    { id: "deep-capture-side", level: "基础", kind: "single", prompt: "发送侧没见 ACK，能确认什么？",
      options: ["该记录未见 ACK", "接收侧一定没发 ACK", "一定是交换机丢包"], answer: 0,
      explanation: "结论只限于该观察点及其记录范围。", wrong: "分开发送、传输和采集。", review: "evidence" },
    { id: "deep-capture-sequence", level: "应用", kind: "integer", prompt: "从序号 1000 起收到完整 100 字节。累计 ACK 是多少？",
      answer: 1100, explanation: "该例没有前置缺口且不含 SYN 或 FIN。下一期待序号是 1100。", wrong: "ACK 指向下一字节。", review: "evidence" },
    { id: "deep-capture-compare", level: "挑战", kind: "multiple", prompt: "哪些证据和判断与本节一致？",
      options: ["两种场景的发送侧记录相同", "单侧重传可定位具体路由器", "晚开始会隐藏早期记录", "比对时要核对采集丢包"], answer: [0, 2, 3],
      explanation: "两种故障在单侧可有相同表现。抓包漏采与记录窗口也会影响结论。", wrong: "先问每条记录实际覆盖了哪里。", review: "diagnose" },
  ],
  recap: ["用序号对齐字节范围。", "先核对采集质量。", "故障定位需要多点证据。"],
  extension: "分别切换两端和抓包起点。找出最早能区分两种情况的记录。",
  next: "capture-select-loopback-or-egress",
  sources: [{ title: "Wireshark · TCP Analysis", href: "https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html" }],
};
