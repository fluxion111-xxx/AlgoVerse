import type { DeepLesson } from "./types";

export const captureKernelDropsLesson: DeepLesson = {
  title: "抓包程序丢帧与链路丢包",
  intro: "记录少了第 2 号包。它可能没到，也可能到了却没写入。怎样把线索分开？",
  goals: ["区分链路传输和抓包记录。", "用多观察点核对同一个包。", "说明采集丢帧计数的限制。"],
  blocks: [
    { id: "path", kind: "explain", title: "经过网卡与进入文件是两步", paragraphs: [
      "链路丢失使报文没有到达下游。采集丢帧时，报文可到达观察点，但记录过程没保留下来。",
      "libpcap 的 ps_drop 可表示系统采集缓冲没空位造成的丢帧。它是采集侧的数据，不能直接替代链路丢包数。",
      "下游文件里的相同缺口，可能来自这两种原因。应先核对观察点、过滤和保存统计。",
    ] },
    { id: "trace", kind: "steps", title: "给四个报文加已知编号", steps: [
      { label: "只看下游文件", text: "两个案例都只留下 1、3、4。此时不要立刻判断包 2 在哪里消失。" },
      { label: "切到链路丢失", text: "上游文件有 1 到 4。下游采集前的独立观察点没见到 2。教学假定捕获统计可用。下游缓冲丢帧增量为 0。" },
      { label: "换成采集缓冲满", text: "独立观察点能见到 2，下游文件却没记下。采集缓冲丢帧增量为 1。文件缺口仍与上一种情况相同。" },
      { label: "检查编号和记录窗口", text: "独立观测只在可按报文编号对齐、范围覆盖充分时有用。仅凭一个累计丢帧数无法指定丢的是哪一帧。" },
    ] },
    { id: "limits", kind: "explain", title: "零读数也需要核对来源", paragraphs: [
      "不是所有系统都提供相同的捕获统计。字段为零，也可能表示系统不支持。先查环境和文档。",
      "实测可收窄流量范围或提高采集处理能力，再用同样条件验证。若排查链路，结合接口计数或更多独立观察点。",
      "面板只计算预设证据。它不打开网卡。下一课可在站内用已知逐跳事件对照两侧观测。",
    ] },
  ],
  demo: "capture-drop-vantage",
  exercises: [
    { id: "deep-kerneldrop-file", level: "基础", kind: "single", prompt: "只看下游文件少了 2，能判断什么？", options: ["仅能确定该文件缺记录", "一定是链路丢包", "一定是采集丢帧"],
      answer: 0, explanation: "两个案例的文件相同，缺少其他观察点不能定位。", wrong: "先区分到达和写入。", review: "path" },
    { id: "deep-kerneldrop-counter", level: "应用", kind: "integer", prompt: "缓冲满的案例中，ps_drop 增量是多少？", answer: 1,
      explanation: "案例设定有一次采集缓冲丢帧。独立观察点仍见到了包 2。", wrong: "切换到双端文件和统计。", review: "trace" },
    { id: "deep-kerneldrop-evidence", level: "挑战", kind: "multiple", prompt: "哪些做法有助于定位？",
      options: ["核对采集统计是否可用", "统计为零就排除本机丢帧", "按同一编号配对记录", "检查记录时间和过滤规则"],
      answer: [0, 2, 3], explanation: "统计支持、范围和编号都影响判断。零值没有脱离上下文的证明力。", wrong: "从文件追溯到采集点。", review: "limits" },
  ],
  recap: ["缺记录要分环节。", "计数先看支持情况。", "多点才能缩小范围。"],
  extension: "切换来源，先只看下游，再看双端。下一节用站内逐跳事件练习配对。",
  next: "capture-model-hop-event-crosscheck",
  sources: [{ title: "libpcap · pcap_stats(3pcap)", href: "https://www.man7.org/linux/man-pages/man3/pcap_stats.3pcap.html" }],
};
