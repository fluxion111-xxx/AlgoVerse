import type { DeepLesson } from "./types";

export const dynamicRoutingLesson: DeepLesson = {
  title: "链路变化与动态路由",
  intro: "路由表原来指向 R1。它后面的一条线断了。R0 接下来该让谁转发？",
  goals: ["从拓扑推算路径成本。", "分清前驱和第一跳。", "改链路成本后对比路由表。"],
  blocks: [
    { id: "map", kind: "explain", title: "先有拓扑，再算路", paragraphs: [
      "链路状态路由器汇总链路信息。然后从拓扑图算最短路。",
      "本实验从同步后的拓扑开始。一次只改一条双向链路。新成本填 0 表示断开。",
      "这里重放最短路计算。不模拟报文交换或协议收敛的时间。",
    ] },
    { id: "trace", kind: "steps", title: "断开 R1 到 R4", steps: [
      { label: "先从 R0 扩展", text: "R0 到 R1 的当前成本是 2。到 R2 是 3。先确认 R1，再用它更新其他候选。" },
      { label: "读原来的路径", text: "经 R1 可到 R4。总成本为 2 + 2 = 4。转发表要发给第一跳 R1。" },
      { label: "用默认设置断链", text: "第 1 号链路断开。编号从 0 起。R0 重算后，最短路改走 R2、R3 到 R4。总成本为 3 + 2 + 2 = 7。" },
      { label: "改为调价", text: "把新成本换成 3。原路线还能走，总代价为 5。它比另一路的 7 小。第一跳重新选 R1。" },
    ] },
    { id: "next-hop", kind: "explain", title: "前驱和下一跳怎么看？", paragraphs: [
      "回放中途，表格显示前驱。断链后，R4 的前驱是 R3。这样可从目标倒推整条路。",
      "结束后，表格改看下一跳。对 R0 而言，改变后的第一跳是 R2。",
      "可把目标改成 3。再改拓扑来隔离它。找不到路时，会显示不可达。",
    ] },
  ],
  demo: "dynamic-routing",
  exercises: [
    { id: "deep-routing-first-hop", level: "基础", kind: "single", prompt: "原路径是 R0 → R1 → R4。R0 应发给谁？",
      options: ["R1", "R4", "R2"], answer: 0,
      explanation: "沿路径看离 R0 最近的下一个路由器。这里是 R1。",
      wrong: "转发时先选路径上的第一跳。", review: "next-hop" },
    { id: "deep-routing-cost", level: "应用", kind: "integer", prompt: "默认案例断开 R1 到 R4。R0 到 R4 的最短路成本是多少？",
      answer: 7, explanation: "改走 R0、R2、R3、R4。三条链路成本相加为 7。",
      wrong: "先绕开断边，再加沿途成本。", review: "trace" },
    { id: "deep-routing-change", level: "挑战", kind: "multiple", prompt: "把新成本改为 3。哪些结论符合实验？",
      options: ["R1 到 R4 仍然连通", "R0 到 R4 的最短成本是 5", "R0 仍应选 R2 为第一跳", "调价需要重新比较路径成本"], answer: [0, 1, 3],
      explanation: "新权重非零。R0 经 R1 花 5，经过 R2 和 R3 则花 7。",
      wrong: "分别把两条候选路径加一遍。", review: "trace" },
  ],
  recap: ["链路变化会触发路径重算。", "最短路按链路成本求和。", "转发使用路径上的第一跳。"],
  extension: "改目标或断开更多必经路径。再学跨自治系统如何按策略选路。",
  next: "bgp-policy",
  sources: [{ title: "IETF RFC 2328 · Shortest-path tree calculation", href: "https://www.rfc-editor.org/rfc/rfc2328.html#section-16.1" }],
};
