import type { DeepLesson } from "./types";

export const snaplenLesson: DeepLesson = {
  title: "抓包快照长度与截断",
  intro: "抓包列表看得到 TCP。应用协议却无法重组。先比一比报告帧长和实际保存长度。",
  goals: ["区分报告帧长和捕获长度。", "在固定报文结构下计算可见字节。", "判断提高上限能解决什么。"],
  blocks: [
    { id: "lengths", kind: "explain", title: "快照限制单帧保留字节", paragraphs: [
      "采集过滤决定包是否进入记录。快照长度则限制每个已捕获包最多保留多少字节。",
      "记录的报告帧长来自采集接口。捕获长度是文件实际保留的字节数。前者更长时，帧尾可能已截断。",
      "本例固定以太网头 14 字节、IPv4 头 20 字节、TCP 头 20 字节。不含 VLAN、选项和帧校验尾部。",
    ], formula: "保留长度 = min(报告帧长, 快照上限)\n例中可见 TCP 负载 = max(保留长度−54, 0)" },
    { id: "trace", kind: "steps", title: "一帧 96 字节，三档上限", steps: [
      { label: "以 64 字节记录", text: "文件保存前 64 字节。三个头共 54 字节，所以可见负载 10 字节。最后 32 字节没写入。" },
      { label: "将上限改为 48", text: "以太网和 IPv4 头共 34 字节，剩 14 字节给 TCP 头。TCP 头也截断，负载为零。" },
      { label: "将上限改为 128", text: "上限超过帧长。原帧只有 96 字节，实际仍保存 96。例中 42 字节负载都保留。" },
      { label: "重开原文件验证", text: "清除显示筛选，文件仍只有原先写入的字节。要获取尾部，需在能重放的场景扩大上限再采。" },
    ] },
    { id: "boundary", kind: "explain", title: "实际报文先核对头长", paragraphs: [
      "链路类型、VLAN 与协议选项都会改变头长。抓包点还可能受网卡卸载影响。别把面板的 54 套给所有包。",
      "看见报文头不代表可还原应用消息。还要考虑 TCP 分段、缺失记录和重组所需数据。",
      "面板只对预设帧计算字节预算。它使用正上限。工具参数值为 0 时，应按所用工具文档解释。",
    ] },
  ],
  demo: "snaplen-frame-budget",
  exercises: [
    { id: "deep-snaplen-compare", level: "基础", kind: "single", prompt: "怎么看末尾可能没保存？", options: ["报告帧长大于捕获长度", "两者必定相等", "清除显示过滤即可判断"],
      answer: 0, explanation: "实际保留字节短于报告长度，是存在截断的证据。", wrong: "先比较两个长度。", review: "lengths" },
    { id: "deep-snaplen-payload", level: "应用", kind: "integer", prompt: "默认案例可见 TCP 负载有几字节？", answer: 10,
      explanation: "保存 64 字节，固定头部占 54 字节，剩下 10 字节负载。", wrong: "先扣掉三个头部。", review: "trace" },
    { id: "deep-snaplen-limit", level: "挑战", kind: "multiple", prompt: "以下哪些判断成立？",
      options: ["上限 48 会截断案例的 TCP 头", "显示过滤可以恢复旧文件的尾部", "实际头长可随选项变化", "上限再大也不会补出额外字节"],
      answer: [0, 2, 3], explanation: "截断发生在写入时。实测头部结构先按协议解析。", wrong: "分开采集、记录和显示。", review: "boundary" },
  ],
  recap: ["保存字节可能少于帧长。", "计算负载先扣掉头部。", "尾部缺失要重新采集。"],
  extension: "在 53 与 54 字节之间切换。再比较全帧漏采和单帧截断。",
  next: "capture-kernel-drops-visibility",
  sources: [{ title: "Wireshark · dumpcap Snapshot Length", href: "https://www.wireshark.org/docs/man-pages/dumpcap.html" }],
};
