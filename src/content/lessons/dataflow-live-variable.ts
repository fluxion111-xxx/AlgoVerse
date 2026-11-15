import type { DeepLesson } from "./types";

export const liveVariablesLesson: DeepLesson = {
  title: "活跃变量的逆向数据流",
  intro: "分支汇合后会读 x。沿一条路，旧 x 还要留下。沿另一条路，它会先被覆盖。",
  goals: ["找出块中每个值的读写。", "从后继推导入口和出口集合。", "解释并集与覆盖的含义。"],
  blocks: [
    { id: "rule", kind: "explain", title: "活跃性描述值的后续用途", paragraphs: [
      "若某条后续路径会读当前值，且途中没有先重写它，这个值就在该点活跃。",
      "USE 是块内先读后写的变量，或只读变量。DEF 记录该块写入的变量。本例按普通标量分析。",
      "块出口合并所有后继入口。再删掉块内会覆盖的旧值，并补上进入本块时就要读的值。",
    ], formula: "OUT[B] = ∪ IN[S]，S 遍历 B 的后继\nIN[B] = USE[B] ∪ (OUT[B] − DEF[B])" },
    { id: "trace", kind: "steps", title: "从 D 逆着走到 A", steps: [
      { label: "列出四个块", text: "A 写 x=1、y=2，按外部条件择 B 或 C。B 写 x=y+1。C 写 y=x+1。两路都进入 D，默认返回 x。" },
      { label: "回推 D 和 B", text: "D 入口要 x，出口为空。B 出口因此要 x。B 写了新的 x，旧 x 不必进入 B；为算新值，入口只要 y。" },
      { label: "回推 C", text: "C 出口也要 x。C 只写 y，x 仍需传给 D。C 的右式也读 x。C 入口是 {x}。" },
      { label: "取两个后继的并集", text: "A 出口需 {x,y}，以应付任一分支。A 自己写出这两个值，所以入口活跃集为空。这里不追踪外部条件。" },
    ] },
    { id: "code", kind: "code", title: "用逆序遍历核对集合", language: "Python",
      source: `def live_sets(return_names):
    blocks = [
        (set(), {"x", "y"}, [1, 2]),
        ({"y"}, {"x"}, [3]),
        ({"x"}, {"y"}, [3]),
        (set(return_names), set(), []),
    ]
    live_in = [set() for _ in blocks]
    live_out = [set() for _ in blocks]
    for i in reversed(range(len(blocks))):
        use, define, successors = blocks[i]
        live_out[i] = set().union(*(live_in[j] for j in successors))
        live_in[i] = use | (live_out[i] - define)
    return [(sorted(entry), sorted(exit)) for entry, exit in zip(live_in, live_out)]

print(live_sets("x"))`,
      notes: [{ lines: "2–9", text: "按 A 到 D 放块，分别记录读、写与后继。" },
        { lines: "10–14", text: "从汇合点开始，用并集减去定义。这个无环图一遍可解。" },
        { lines: "16", text: "输出各块入口和出口。B 的那组是 y、x。" }] },
    { id: "boundary", kind: "explain", title: "有环时继续传播", paragraphs: [
      "本图没有回边，逆序一遍就能使用已知后继结果。若有循环，某块结果可能改变前面算过的集合。",
      "循环图可从空集合开始反复传播，直到各集合稳定。去掉语句后，读写集合也需重新求。",
      "活跃性帮助发现未用的赋值。删除前还要检查存储、异常或其他可观察效果。",
    ] },
  ],
  demo: "liveness-diamond",
  exercises: [
    { id: "deep-live-union", level: "基础", kind: "single", prompt: "有两个后继，出口要怎样合并？", options: ["取后继入口的并集", "取交集", "只看先写的变量"],
      answer: 0, explanation: "任一后继需要旧值，该值就可能从本块传出。", wrong: "不必每条分支都用它。", review: "rule" },
    { id: "deep-live-count", level: "应用", kind: "integer", prompt: "默认场景中，A 出口有几个活跃变量？", answer: 2,
      explanation: "B 入口要 y，C 入口要 x。并集为 {x,y}。", wrong: "先分别求两个后继入口。", review: "trace" },
    { id: "deep-live-limit", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["B 的写入可杀死旧 x 的传递需求", "所有循环只扫一次就必定正确", "USE 会把入口需要的值补回来", "删代码前还要判断副作用"],
      answer: [0, 2, 3], explanation: "DEF 挡住以前的值，USE 保留本块先读的值。环需要迭代。", wrong: "把新旧值和控制流分开。", review: "boundary" },
  ],
  recap: ["出口合并后继入口。", "写入会覆盖旧值。", "循环要迭代至稳定。"],
  extension: "将返回切换为 y，再切到 x+y，查看入口与出口。下一节把方程用于寄存器分配。",
  next: "reg-liveness-backward-equations",
  sources: [{ title: "Cornell CS 4120 · Live Variable Analysis", href: "https://www.cs.cornell.edu/courses/cs4120/2026sp/notes/livevar/" }],
};
