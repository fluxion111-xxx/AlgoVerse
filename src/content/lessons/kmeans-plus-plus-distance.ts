import type { DeepLesson } from "./types";

export const kMeansPlusPlusLesson: DeepLesson = {
  title: "K-Means++ 的初始中心",
  intro: "四个点分成两团。两个初始中心却挤在左边。能不能让没覆盖的点更容易被选中？",
  goals: ["计算到最近中心的平方距离。", "用累计区间复现一次加权抽样。", "区分选初值与更新均值。"],
  blocks: [
    { id: "weights", kind: "explain", title: "给离中心远的点更多机会", paragraphs: [
      "原算法从样本里等概率选第一个中心。知道了第一个中心，再为后续中心计算权重。",
      "对每个样本，先找已选中心中最近的一个。把这段距离平方，记作 D²。已有中心的权重为零。",
      "权重除以总权重，就得到抽中概率。给每个点分一段区间。区间长度等于权重。抽签落到哪一段，就选哪个点。",
      "选中新中心后，要更新最近距离。原先很远的点现在可能已被覆盖。后续各轮需要重新抽样。",
    ], formula: "D²(x) = min₍c∈C₎ ‖x − c‖²\nP(下个中心为 x | C) = D²(x) / Σ D²(xⱼ)" },
    { id: "draw", kind: "steps", title: "在四个点上抽两次", steps: [
      { label: "从中心 0 出发", text: "四个样本在 0、2、6、8。权重分别为 0、4、36、64。总权重是 104。" },
      { label: "把权重排成区间", text: "从左到右排。点 2 占 [0,4)。点 6 占 [4,40)。点 8 占 [40,104)。点 0 的区间为空。" },
      { label: "给出一次抽签", text: "抽到比例 60%，落点是 62.4。这落在点 8 的区间。若抽到 3%，落点是 3.12，仍可能选中近处的点 2。" },
      { label: "按最近中心重新算", text: "若还需第三个中心，先用 0 与 8 更新权重。点 2、6 各得 4。再次抽到 60% 时，落点变为 4.8，选中点 6。" },
      { label: "把种子交给聚类", text: "只选两个中心时，用 0 和 8 启动 Lloyd 更新。两组是 {0,2} 与 {6,8}。均值为 1、7。一轮后的损失为 4。" },
    ] },
    { id: "sampler", kind: "code", title: "重现一次 D² 抽样", language: "Python",
      source: `def choose_next(points, centers, proportion):
    if not 0 <= proportion < 1:
        raise ValueError("Use a number in [0, 1).")
    weights = [min((x - c)**2 for c in centers) for x in points]
    total = sum(weights)
    if total == 0:
        return None
    ticket = proportion * total
    upper = 0
    for x, weight in zip(points, weights):
        upper += weight
        if ticket < upper:
            return x
    return points[max(i for i, w in enumerate(weights) if w > 0)]

points = [0, 2, 6, 8]
print(choose_next(points, [0], 0.60))
print(choose_next(points, [0, 8], 0.60))`,
      notes: [{ lines: "1–4", text: "输入非空中心。给每个样本算最近的平方距离。" },
        { lines: "5–8", text: "总权重为零就结束。其余情况换算抽签落点。" },
        { lines: "9–14", text: "逐段比较累计端点。浮点数舍入到最右端时，取最后一段非空区间。" },
        { lines: "16–18", text: "复用同一比例来比较分布。两次输出 8 和 6。" }] },
    { id: "practice", kind: "explain", title: "看清它优化了哪一步", paragraphs: [
      "面板用手选比例展示一次抽签。教科书算法每轮要重新取均匀随机数。相同数据也可能选出不同种子。",
      "面板调用站内执行器跑一轮。比较结果时，请固定样本与 K。只改抽签位置，观察初值对损失的影响。",
      "总权重为零，表示每个点已与某个中心重合。没有可按 D² 抽取的新位置。若 K 超过独立位置数，需另定重复中心策略。",
      "原论文给出期望代价界。单次抽样仍可能选得差。工程比较可固定多个种子，报告损失分布。",
    ] },
  ],
  demo: "kmeans-plus-plus-seeding",
  exercises: [
    { id: "deep-kpp-nearest", level: "基础", kind: "single", prompt: "新中心的权重根据什么计算？",
      options: ["到最近已选中心的距离平方", "到最远中心的距离", "到最早中心的距离平方"], answer: 0,
      explanation: "取最近距离，才能看出该样本还有多少未覆盖的代价。", wrong: "想想离它最近的中心能提供多少覆盖。", review: "weights" },
    { id: "deep-kpp-total", level: "应用", kind: "integer", prompt: "本例只选了 0。四个点的总权重是多少？", answer: 104,
      explanation: "平方距离分别是 0、4、36、64。相加得 104。", wrong: "先把每个距离平方，再相加。", review: "draw" },
    { id: "deep-kpp-redraw", level: "挑战", kind: "multiple", prompt: "选中 8 后还要继续抽。哪些做法成立？",
      options: ["把点 6 的权重更新为 4", "沿用旧总权重 104", "给已选的点 8 零权重", "给点 2 和 6 相同概率"], answer: [0, 2, 3],
      explanation: "现在 0、8 都是中心。权重变成 0、4、4、0。另两点各占一半。", wrong: "分别比较到 0 和到 8 的距离。", review: "draw" },
  ],
  recap: ["先看最近中心。", "按平方距离加权抽样。", "中心变动后重算权重。"],
  extension: "固定数据，比较抽签 3% 与 60%。再了解轮廓系数怎样评估聚类。",
  next: "silhouette-cluster-score",
  sources: [{ title: "Arthur 与 Vassilvitskii · k-means++ 原论文", href: "https://theory.stanford.edu/~sergei/papers/kMeansPP-soda.pdf" }],
};
