import type { DeepLesson } from "./types";

export const pathfindingLesson: DeepLesson = {
  title: "Dijkstra 与 A* 寻路",
  intro: "同一张地图，两种寻路法。先猜哪种会多看几格。再比最后的花费。",
  goals: ["分清已走代价和剩余估价。", "用同一张图比较访问量。", "编辑障碍，解释路径变化。"],
  blocks: [
    { id: "priority", kind: "explain", title: "下一格怎么选？", paragraphs: [
      "g 是起点到当前格的已知代价。Dijkstra 每次取 g 最小的候选。",
      "A* 还算剩余估价 h。它先取 g + h 最小的格子。h 提供方向。最终路径仍按边权计费。",
      "本图可走八个方向。直走花 1，斜走花 √2。斜走只检查落脚格。",
    ], formula: "Dijkstra 排序键 = g\nA* 排序键 = g + h\nh = max(dx, dy) + (√2 − 1) × min(dx, dy)" },
    { id: "trace", kind: "steps", title: "读一次默认回放", steps: [
      { label: "先看起点", text: "两种搜索从同一格出发。较短的已知走法会更新邻格。墙格不会加入候选。" },
      { label: "再看扩展范围", text: "Dijkstra 按花费向外扩展。A* 还看离终点多远。到达终点时，默认回放分别访问 39 和 21 格。" },
      { label: "最后比路径", text: "这张图的最优代价是 4 + 4√2。两种方法都得到约 9.66。访问量和最优代价是两个指标。" },
      { label: "换个起点", text: "把起点移到第 4 行第 9 列。终点仍在第 1 行第 9 列。沿列直走 3 步，代价为 3。" },
    ] },
    { id: "heuristic", kind: "explain", title: "为什么这把尺合适？", paragraphs: [
      "先想象没有墙。斜走能同时缩短两个方向。先走能走的斜步，再走剩下的直步。",
      "无墙最短代价就是本课的 h。加墙只会删除可走的边。真实最短代价不会更低。",
      "相邻格的 h 差值也受边权约束。这叫一致。本实现无需重开已扩展的格。",
      "曼哈顿距离把斜邻格算成 2。本图只需 √2。直接换成它就可能高估。",
    ] },
  ],
  demo: "pathfinding",
  exercises: [
    { id: "deep-path-priority", level: "基础", kind: "single", prompt: "A* 在本实验按哪项选择候选格？",
      options: ["只看已走代价 g", "只看剩余估价 h", "看 g 与 h 的和"], answer: 2,
      explanation: "g 记录路上已花的代价。h 估计剩下的代价。A* 按两者之和选格。",
      wrong: "把起点到当前格的花费也算上。", review: "priority" },
    { id: "deep-path-cost", level: "应用", kind: "integer", prompt: "按案例把起点移到第 4 行第 9 列。沿最短路径走到终点。总代价是多少？",
      answer: 3, explanation: "两点在同一列，中间无墙。每次直走花 1，一共走 3 次。",
      wrong: "留意两点的行差和列差。", review: "trace" },
    { id: "deep-path-heuristic", level: "挑战", kind: "multiple", prompt: "本图允许八方向移动。哪些说法成立？",
      options: ["无墙的最短代价可作为剩余估价", "曼哈顿距离可能高估", "访问格数较少就代表路径更短", "两种算法可以得到相同最优代价"], answer: [0, 1, 3],
      explanation: "墙会限制走法。曼哈顿距离会高估一步斜走。比较最优性要看总代价。",
      wrong: "分别比较估价、访问量和总代价。", review: "heuristic" },
  ],
  recap: ["两种搜索都累计实际边权。", "A* 用 h 调整扩展次序。", "同一地图才方便比较。"],
  extension: "换墙或移起点再跑。对照访问量与代价。接着检查估价的一致性。",
  next: "astar-admissible-consistent",
  sources: [
    { title: "NIST · Dijkstra’s algorithm", href: "https://xlinux.nist.gov/dads/HTML/dijkstraalgo.html" },
    { title: "UC Berkeley CS188 · Informed Search", href: "https://inst.eecs.berkeley.edu/~cs188/textbook/search/informed.html" },
  ],
};
