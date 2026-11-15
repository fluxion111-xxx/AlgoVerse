import type { DeepLesson } from "./types";

export const captureFilterLesson: DeepLesson = {
  title: "采集过滤与显示过滤的边界",
  intro: "抓包时只收 443。事后想回看 DNS。删去显示条件，能找回多少原始报文？",
  goals: ["区分记录阶段和查看阶段。", "读懂两种简单过滤条件。", "从保留的文件判断遗漏范围。"],
  blocks: [
    { id: "stages", kind: "explain", title: "先决定写入，再决定可见", paragraphs: [
      "采集过滤在记录前决定哪些包写入。文件只保存通过的包。过滤只影响记录，网络流量仍照常传输。",
      "显示过滤在查看已记录的包时生效。删去它，可以重新看到文件中的包。",
      "libpcap 的采集语法与 Wireshark 的显示语法不同。前者可用 tcp port 443，后者可用 tcp.port == 443。",
    ], formula: "可见集合 = 通过显示条件的已记录报文\n已记录集合 ⊆ 抓包点经过的报文" },
    { id: "trace", kind: "steps", title: "跟着四条预设报文走", steps: [
      { label: "检查原始事件", text: "预设一条 UDP DNS 查询、一条 TCP DNS 回复，以及两条 443 握手报文。前两条都由解析器识别为 DNS。" },
      { label: "采集只收 TCP 的 443", text: "文件只写入两条 443 报文。显示过滤若为 dns，屏幕上是零条。清除显示过滤，只能重见这两条。" },
      { label: "重新采集，只限制 TCP", text: "文件加入 TCP DNS 回复，共三条。保留 dns 显示过滤时，可见一条。UDP DNS 查询仍不在文件中。" },
      { label: "再观察一次全量", text: "关闭采集过滤再记录，四条都进入文件。用 dns 显示过滤后，可见两条。以后可以换条件查看别的包。" },
    ] },
    { id: "boundary", kind: "explain", title: "零条要追溯原因", paragraphs: [
      "排查时，先区分文件里有没有。显示列表为空，还要清除筛选，并核对采集接口、采集条件和时间窗口。",
      "dns 指解析出的协议。端口 53 只是线索。隧道、加密或解析限制都会改变可识别范围。",
      "面板按给定元数据演示集合筛选。它不会打开网卡或执行任意过滤表达式。",
    ] },
  ],
  demo: "capture-display-stages",
  exercises: [
    { id: "deep-capture-filter-missing", level: "基础", kind: "single", prompt: "包从未写入，清除显示过滤后怎样？", options: ["仍看不到", "一定找回", "会自动重新采集"],
      answer: 0, explanation: "显示过滤只读取已记录的集合，无法恢复从未写入的数据。", wrong: "先问文件有没有这个包。", review: "stages" },
    { id: "deep-capture-filter-tcp", level: "应用", kind: "integer", prompt: "采集用 tcp，显示用 dns。案例中可见几条？", answer: 1,
      explanation: "三条 TCP 已记录，其中只有 TCP DNS 回复符合显示条件。", wrong: "先过采集关，再从记录里筛。", review: "trace" },
    { id: "deep-capture-filter-scope", level: "挑战", kind: "multiple", prompt: "哪些结论成立？",
      options: ["清除显示过滤可以显示已记录的包", "只看端口就能确认 DNS", "换采集条件要重新记录", "空列表还需核对采集接口"],
      answer: [0, 2, 3], explanation: "文件内容由采集决定。协议识别与端口匹配也各有边界。", wrong: "分别考虑记录、解析和显示。", review: "boundary" },
  ],
  recap: ["采集控制能否写入。", "显示控制能否看见。", "空列表要查来源。"],
  extension: "固定采集条件，多换几次显示条件。下一节看写入后为何还可能截断报文。",
  next: "capture-snaplen-truncated-bytes",
  sources: [
    { title: "Wireshark · Capture Filters", href: "https://www.wireshark.org/docs/wsug_html_chunked/ChCapCaptureFilterSection.html" },
    { title: "Wireshark · Display Filter Expressions", href: "https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html" },
  ],
};
