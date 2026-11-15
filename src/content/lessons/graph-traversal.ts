import type { DeepLesson } from "./types";

export const graphTraversalLesson: DeepLesson = {
  title: "图遍历与无权距离",
  intro: "从顶点 0 可以直接到 2。深度优先却会绕路才到。两种走法差在哪？",
  goals: ["分别跟踪 BFS 队列与 DFS 调用栈。", "从 BFS 层数读出最少边数。", "改变边方向，判断哪些点可达。"],
  blocks: [
    { id: "frontiers", kind: "explain", title: "队列先走哪边？", paragraphs: [
      "BFS 用队列。从队首取一个点。把新邻居放到队尾。邻居入队时就标记。这样环里也不会重复入队。",
      "DFS 进入顶点时就标记。再递归进入第一个未访问邻居。走不下去时，才返回上一个调用。",
      "回放按邻居编号升序走。换个邻居次序，访问顺序可能变。",
    ] },
    { id: "trace", kind: "steps", title: "从 0 开始走默认图", steps: [
      { label: "BFS 先走第一层", text: "0 出队后，1、2 入队。它们的距离都是 1。接着取出 1，把 3、4 排在 2 后面。" },
      { label: "看见邻居就标记", text: "处理 2 时又遇到 4。4 已经在队列里，无需再排。BFS 顺序是 0、1、2、3、4。" },
      { label: "DFS 先走到底", text: "从 0 进 1，再进 3。退回 1 后，沿 4 走到 2。访问顺序是 0、1、3、4、2。" },
      { label: "读两种深度", text: "顶点 2 的 BFS 距离是 1。DFS 搜索树深度是 3。顶点 5 从起点 0 不可达。" },
    ] },
    { id: "direction", kind: "explain", title: "箭头会改变可达点", paragraphs: [
      "把起点设为 4。无向图可沿边到 1 和 2。改成有向图后，原有的箭头都指向 4。它没有出边。",
      "此时两种走法都只访问 4。再添一条 4→5。现在两种走法都能到 5。",
      "BFS 按边数逐层扩展。首次抵达的层数就是最少边数。边的代价若不同，还要另算总价。",
    ] },
  ],
  demo: "graph-traversal",
  exercises: [
    { id: "deep-graph-bfs-queue", level: "基础", kind: "single", prompt: "BFS 发现新邻居。它先做什么？",
      options: ["标记后放到队尾", "插到队首，马上访问", "沿这条边一直递归"], answer: 0,
      explanation: "队尾保留逐层次序。入队即标记可防止重复排队。",
      wrong: "BFS 让先排队的点先出队。", review: "frontiers" },
    { id: "deep-graph-distance", level: "应用", kind: "integer", prompt: "默认图从 0 出发。BFS 到顶点 2 最少走几条边？",
      answer: 1, explanation: "0 与 2 直接相连。DFS 查到 2 时的深度为 3。",
      wrong: "看无权距离，别用 DFS 的深度。", review: "trace" },
    { id: "deep-graph-direction", level: "挑战", kind: "multiple", prompt: "沿用默认边列表。改为有向图，从 4 出发。哪些说法成立？",
      options: ["原图只访问 4", "可以沿 1→4 反向访问 1", "增加 4→5 后可访问 5", "此时 5 的 BFS 距离为 1"], answer: [0, 2, 3],
      explanation: "默认边没有从 4 出发的箭头。加边后，4 一步就到 5。",
      wrong: "逐条看箭头的起点和终点。", review: "direction" },
  ],
  recap: ["BFS 用队列逐层扩展。", "DFS 用调用栈深入再返回。", "可达性要看起点和方向。"],
  extension: "给可达的两条路径标上代价。再学习怎样比较总代价。",
  next: "weighted-paths",
  sources: [{ title: "MIT 6.006 · BFS and DFS", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/pages/lecture-notes/" }],
};
