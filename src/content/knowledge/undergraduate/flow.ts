import { fullTopic as topic } from "@/content/knowledge/coverage/types";
const flow = { title: "MIT 6.046J · Network Flow", href: "https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2012/7c2927794e61bd70c14c07728fa54375_MIT6_046JS12_lec13.pdf" };
const matching = { title: "MIT 18.200 · Network Flows and Matching", href: "https://ocw.mit.edu/courses/18-200-principles-of-discrete-applied-mathematics-spring-2024/mit18_200_s24_lec11-12.pdf" };

export const flowTopics = [
  topic(["graph-algorithms", "network-flow"], ["flow-conservation-feasibility", "可行流的容量与守恒", "基础"], ["adjacency-list"], flow,
    "先判断一组流量是否合法。", "每条边的流量介于零和容量之间。除源与汇外，每个顶点的总入流等于总出流。这样中转点既不积存，也不产生流。",
    "按容量和守恒检查给定流量。", "边 s→a 容量 3，a→t 容量 5。前一条流 3，后一条流 4。两边都没超容量，但 a 多送了一单位。", "逐条边不超容量，还不能推出流可行。",
    ["某中转点入流 2 与 3，共只有一条出边。出流应是多少？", ["3", "5", "2"], 1, "中转点的流量守恒。总入流为 2+3=5。"]),
  topic(["graph-algorithms", "network-flow"], ["edmonds-karp-bfs-augment", "Edmonds–Karp 的增广路径", "进阶"], ["residual-network", "bfs-unweighted-distance"], flow,
    "在残量图里选边数最少的路径。", "每轮只看正残量边，用广度优先搜索找源到汇的路径。沿路增广的数量是最小残量。找不到路径时达到最大流。",
    "区分选路标准和增广量。", "路径甲两条边，瓶颈 1。路径乙三条边，瓶颈 9。算法本轮选甲，并增加一单位流量。", "不能直接在原图上搜索。残量图中的反向边也可撤回旧流。",
    ["两条候选路径分别有 2 条边和 4 条边。后者容量更大。本轮按什么选择？", ["优先 2 条边的路径", "优先容量大的 4 条边", "优先原图中带权最小的路径"], 0, "BFS 按边数展开。容量只影响这条路径能增广多少。"]),
  topic(["graph-algorithms", "network-flow"], ["bipartite-matching-unit-flow", "用单位容量求二分图匹配", "进阶"], ["flow-conservation-feasibility", "edmonds-karp-bfs-augment"], matching,
    "把配对转成从源到汇的流。", "从源连到左边顶点，从右边顶点连到汇。允许配对的边从左指向右。所有边容量设为 1，整数最大流中的配对边给出最大匹配。",
    "构造配对网络并读出匹配。", "A 可配 X 或 Y，B 只可配 X。最大流为 2，对应 A→Y 和 B→X。", "不能只限制中间边。源端和汇端的容量保证每人最多用一次。",
    ["若三名候选人都只接受同一岗位，最大匹配大小是多少？", ["2", "1", "3"], 1, "该岗位到汇只有一单位容量，所以只能匹配一人。"]),
  topic(["graph-algorithms", "network-flow"], ["hall-matching-obstruction", "Hall 条件与配对不足的证据", "拓展"], ["bipartite-matching-unit-flow"], matching,
    "一组人的可选岗位至少和人数一样多。", "二分图能匹配全部左侧顶点，当且仅当左侧每个子集 S 都满足邻居数不小于 S 的大小。违反条件的子集就是不可能满配的证据。",
    "找出阻碍满配的小子集。", "A、B、C 都只能配 X 或 Y。D 只配 Z 或 W。两边各有四个点，但前三人只共享两个选择。", "整体人数相同、每人有选择，都不能保证满配。",
    ["上例中，哪组左侧顶点已能否定满配？", ["{A,B,C}", "{D}", "{A,B}"], 0, "三人只连接 X、Y，两份岗位不够用。"]),
];
