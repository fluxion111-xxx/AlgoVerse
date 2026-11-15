import type { DeepLesson } from "./types";

export const hierarchicalLinkageLesson: DeepLesson = {
  title: "层次聚类的连接规则",
  intro: "两个点已经合并成簇。它到下一个点的距离该看最近、最远，还是所有配对的平均？",
  goals: ["计算单连接、全连接和平均连接。", "追踪第二轮合并为何改变。", "正确解释合并高度和平局。"],
  blocks: [
    { id: "rule", kind: "explain", title: "先有点距离，再定簇距离", paragraphs: [
      "凝聚式层次聚类从单点簇开始。每轮找距离最小的两个簇，合并后再更新候选。",
      "单连接取跨簇点对的最小距离。全连接取最大。平均连接对全部跨簇点对取平均。",
      "平均连接里每个点对等权。它与直接算两个簇中心的距离是不同的定义。",
    ], formula: "D(A,B)：逐个记录所有 d(a,b)，其中 a∈A、b∈B\n单连接=min D，全连接=max D，平均连接=sum D/(|A|·|B|)" },
    { id: "trace", kind: "steps", title: "把 0、2、5、9 合并到底", steps: [
      { label: "第一轮都选 A 和 B", text: "A=0、B=2、C=5、D=9。各簇只有一点时三种规则一致。A、B 的距离 2 最小。" },
      { label: "比较 AB 与 C", text: "C 到 A 是 5，到 B 是 3。因此单连接为 3，全连接为 5，平均连接为 4。C 到 D 的距离仍是 4。" },
      { label: "第二轮分出两种路线", text: "单连接在 3 合并 AB 和 C。全连接的最佳距离是 4，合并 C 和 D。平均连接遇到两个 4，本面板先取 AB 与 C。" },
      { label: "核对最后一轮", text: "单连接的末轮距离为 4。全连接合并 AB 与 CD，最远点对距 9。按面板平局规则，平均连接末轮为 (9+7+4)/3。" },
    ] },
    { id: "limits", kind: "explain", title: "高度和并列要写清", paragraphs: [
      "合并高度记录选中簇对的连接距离。固定在某一高度截断，可以得到一组簇。换规则后，树形和截断结果都可能变化。",
      "单连接容易沿一串近邻把疏松的形状串起。全连接会受最远跨簇点对影响。选择应符合数据与距离的含义。",
      "并列时可能有多种合并顺序。本面板按当前列表中先遇到的簇对处理。不同实现的平局结果可以不同。",
    ] },
  ],
  demo: "hierarchical-merge-trace",
  exercises: [
    { id: "deep-linkage-full", level: "基础", kind: "single", prompt: "全连接看哪个跨簇点对？", options: ["最远点对", "最近点对", "只看质心"],
      answer: 0, explanation: "全连接取跨簇点对距离的最大值。", wrong: "先分清取最大还是最小。", review: "rule" },
    { id: "deep-linkage-pair", level: "应用", kind: "integer", prompt: "默认点集，AB 与 C 的全连接距离是多少？", answer: 5,
      explanation: "两条距离为 5 和 3。取最大为 5。", wrong: "别把两条距离相加再平分。", review: "trace" },
    { id: "deep-linkage-limits", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["单连接与全连接可选出不同簇对", "平局时所有实现必输出相同树", "平均连接用所有跨簇点对", "改坐标会改变后续合并"],
      answer: [0, 2, 3], explanation: "三种规则用不同的跨簇统计。坐标决定距离。平局还需约定处置顺序。", wrong: "用第二轮的两个候选并排核对。", review: "limits" },
  ],
  recap: ["三种规则先比跨簇点对。", "规则会改变合并顺序。", "并列须说明处置方式。"],
  extension: "把 D 改成 6。先预测第一次合并，再用演示核对。下一节比较不同的距离度量。",
  next: "distance-metrics",
  sources: [{ title: "SciPy · Hierarchical Clustering Linkage", href: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html" }],
};
