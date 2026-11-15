import type { DeepLesson } from "./types";

export const dbscanNeighborhoodLesson: DeepLesson = {
  title: "DBSCAN 的核心点与边界点",
  intro: "五个点排在数轴上。点 0 的邻居不够多，为什么它仍能留在簇里？",
  goals: ["列出包含自身的邻域。", "区分三种点的判定。", "追踪半径和门槛如何改结果。"],
  blocks: [
    { id: "rule", kind: "explain", title: "先数邻域，再分三类", paragraphs: [
      "以每个点为中心，找距离不超过 ε 的样本。邻域包含该点自己，也包含恰好在半径边界的点。",
      "邻域个数至少为 MinPts 的点叫核心点。若某点不是核心，却落入至少一个核心点的邻域，就是边界点。",
      "剩余点为噪声。扩展簇时，核心点可以继续向邻域扩展。边界点能加入，但不能继续把别处的核心连在一起。",
    ], formula: "Nε(p) = {q | d(p,q) ≤ ε}\n核心点条件为 |Nε(p)| ≥ MinPts" },
    { id: "trace", kind: "steps", title: "在数轴上圈出五个邻域", steps: [
      { label: "选定样本和门槛", text: "点为 0、1、2、3、8。半径为 1，门槛为 3。用绝对距离，按点逐个计数。" },
      { label: "找核心点", text: "点 1 的邻域是 {0,1,2}。点 2 的邻域是 {1,2,3}。两者都满足门槛，而且互为邻居。" },
      { label: "处理两端和孤点", text: "点 0 与 3 各只有两个邻居，但各邻接一个核心点。两者为边界，和核心点形成一簇。点 8 仅见自身，归为噪声。" },
      { label: "提高门槛再比较", text: "半径固定 1，把门槛提到 4。没有点达到门槛。失去核心后，原边界点也变成噪声。五点全为噪声。" },
    ] },
    { id: "code", kind: "code", title: "先判核心，再判边界", language: "Python",
      source: `def point_roles(points, eps, min_samples):
    neighbors = [[j for j, other in enumerate(points)
                  if abs(x - other) <= eps] for x in points]
    core = {i for i, nearby in enumerate(neighbors)
            if len(nearby) >= min_samples}
    return ["core" if i in core else
            "border" if any(j in core for j in nearby) else "noise"
            for i, nearby in enumerate(neighbors)]

print(point_roles([0, 1, 2, 3, 8], 1, 3))`,
      notes: [{ lines: "2–5", text: "枚举邻接关系。按样本下标计数，重合样本仍是独立观测。" },
        { lines: "6–10", text: "用核心集合决定边界。输出两边界、两核心和一个噪声。" }] },
    { id: "limits", kind: "explain", title: "边界点只加入，不扩展", paragraphs: [
      "两组核心若没有核心邻接路径，仅靠一个共享边界点不会合并。边界归属可能随遍历顺序改变。",
      "半径或尺度变化会改变全部邻域。把本例半径增到 2，前四点都达到门槛，点 8 仍是噪声。",
      "面板和代码计算点的角色。完整 DBSCAN 还会遍历核心邻接关系并赋簇号。",
    ] },
  ],
  demo: "dbscan-neighborhood",
  exercises: [
    { id: "deep-dbscan-self", level: "基础", kind: "single", prompt: "计邻居数时，本课是否计入当前点？", options: ["计入", "从不计入", "只对噪声计入"],
      answer: 0, explanation: "自身距离为零，所以在邻域内。", wrong: "先算点与自己的距离。", review: "rule" },
    { id: "deep-dbscan-core-count", level: "应用", kind: "integer", prompt: "默认案例共有几个核心点？", answer: 2,
      explanation: "只有点 1 和点 2 的邻域达到三个样本。", wrong: "逐个数邻域，别漏自身。", review: "trace" },
    { id: "deep-dbscan-border", level: "挑战", kind: "multiple", prompt: "关于案例和扩展规则，哪些判断成立？",
      options: ["点 0 邻接核心点，所以是边界", "共享边界必能合并两个簇", "门槛升至 4 后本例全是噪声", "距离等于半径的点计入邻域"],
      answer: [0, 2, 3], explanation: "边界能归簇但不扩展。门槛升高后本例无核心。半径条件包含等号。", wrong: "分别检查邻域、门槛和扩展。", review: "limits" },
  ],
  recap: ["先确定全部核心点。", "边界点可附着。", "噪声没有核心可附着。"],
  extension: "把半径增到 2，查点 0 的变化。再去比较层次聚类怎样合并簇。",
  next: "hierarchical-linkage-distance",
  sources: [{ title: "scikit-learn · DBSCAN", href: "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.DBSCAN.html" }],
};
