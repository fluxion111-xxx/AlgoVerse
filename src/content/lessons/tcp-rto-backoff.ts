import type { DeepLesson } from "./types";

export const tcpRtoBackoffLesson: DeepLesson = {
  title: "TCP 重传超时与退避",
  intro: "发送端发出一段数据。确认迟迟没来。该何时重发？若重发后仍没回应，又要等多久？",
  goals: ["区分往返时间与超时期限。", "根据首个往返样本算出 RTO。", "从重发间隔推出绝对时刻。", "解释确认为什么可能无法采样。"],
  blocks: [
    { id: "estimate", kind: "explain", title: "先定一个愿意等的期限", paragraphs: [
      "RTT 是观测到的往返时间。这里从发段时起算。匹配的确认到达时结束。",
      "RTO 是发送端的等待期限。它需要照顾延迟波动。只取最新 RTT，容易追着抖动来回改。",
      "规范用 SRTT 跟踪平滑时间。再用 RTTVAR 跟踪偏差。这里的波动量指平滑的绝对偏差。",
      "第一次取得有效样本 R 时，先把 SRTT 设为 R。把 RTTVAR 设为 R 的一半。时钟粒度 G 也要纳入期限。",
      "后续样本先更新波动量。偏差用旧 SRTT 算。然后再更新平滑时间。顺序换了，结果就会变。",
      "本课采用建议的 1 秒下限。演示固定 G 为 1 毫秒。还选用规范允许的 60 秒上限。",
    ], formula: "首个样本：SRTT = R，RTTVAR = R/2\n后续样本 R'：RTTVAR ← ¾ RTTVAR + ¼ |SRTT − R'|\n随后：SRTT ← ⅞ SRTT + ⅛ R'\n重新计算：RTO = SRTT + max(G, 4 × RTTVAR)" },
    { id: "timeline", kind: "steps", title: "在时间线上走三次超时", steps: [
      { label: "取到 400 毫秒样本", text: "SRTT 是 400。RTTVAR 是 200。算得 RTO 为 1200 毫秒。它高于下限。" },
      { label: "从新数据段开始计时", text: "把这段的发送记为第 0 毫秒。第 1200 毫秒仍无确认。发送端超时并重发。下一段等待变成 2400 毫秒。" },
      { label: "累计第二段等待", text: "从第 1200 毫秒再等 2400 毫秒。第 3600 毫秒触发第二次重发。下一段等待翻到 4800 毫秒。" },
      { label: "对照第三次到期", text: "再加 4800 毫秒。第三次重发在第 8400 毫秒。此刻定下的下一段等待为 9600 毫秒。" },
    ] },
    { id: "ack", kind: "explain", title: "收到迟来的确认怎么办", paragraphs: [
      "若所有在途数据都获确认，就关掉重传计时器。若仍有未确认数据，新进展可重启计时。",
      "一个 ACK 可能来自原发送。也可能来自重发。缺少区分证据时，不能从这两次发送中随便选一次算 RTT。",
      "这就是 Karn 采样原则。TCP 时间戳可消除这类歧义。新的有效 RTT 样本也可让退避后的期限降下来。",
      "抓到重发只说明发送端采取了恢复动作。丢数据、丢确认、排队，都可能让发送端等不到及时确认。",
      "演示只追踪一个未确认段。它先接收一个样本，然后只有超时。它不模拟完整 TCP 连接或快重传。",
    ] },
  ],
  demo: "rto-backoff",
  exercises: [
    { id: "deep-rto-earliest", level: "基础", kind: "single", prompt: "RTO 到期后，先重发哪段？",
      options: ["最近发送的数据段", "最早未确认的数据段", "已经确认的数据段"], answer: 1,
      explanation: "重传计时器驱动最早未确认段重发。其他未确认段未必全部丢失。",
      wrong: "先找到确认还没推进到的最早位置。", review: "timeline" },
    { id: "deep-rto-expiration-time", level: "应用", kind: "integer", prompt: "默认案例第三次重发时，距首次发送多少毫秒？",
      answer: 8400, explanation: "三段等待分别是 1200、2400、4800。时间线上要把它们相加。",
      wrong: "把等待时长和累计时刻分开。", review: "timeline" },
    { id: "deep-rto-diagnosis", level: "挑战", kind: "multiple", prompt: "没有时间戳。下列关于超时与恢复的叙述，哪些成立？",
      options: ["迟来的 ACK 可能确认原发送", "增加退避间隔会增加重试频率", "有新有效样本时可重算 RTO", "无法辨别发送时刻时，应跳过该 RTT 样本"], answer: [0, 2, 3],
      explanation: "确认无法区分原发送与重发时，不用于 RTT 采样。更长的间隔会降低重试频率。",
      wrong: "分别看确认来源、重试间隔和取样条件。", review: "ack" },
  ],
  recap: ["RTT 是观测值。RTO 是期限。", "连续超时会拉长等待。", "歧义确认不能直接用于采样。"],
  extension: "把首个样本调为 100 毫秒。再看多次退避如何触及上限。下一节用单侧抓包判断重发。",
  next: "tcpdump-one-sided-capture",
  sources: [{ title: "IETF RFC 6298 · Computing TCP's Retransmission Timer", href: "https://www.rfc-editor.org/rfc/rfc6298.html" }],
};
