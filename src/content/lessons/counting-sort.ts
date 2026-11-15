import type { DeepLesson } from "./types";

export const countingSortLesson: DeepLesson = {
  title: "计数排序",
  intro: "四条记录要按等级排。两条等级都是 2。任务还要求它们保留原来的先后顺序。",
  goals: ["从频数算出输出区间。", "解释同键记录为何保序。", "按值域估算成本。"],
  blocks: [
    { id: "range", kind: "explain", title: "先给每个键一格", paragraphs: [
      "设最小整数键为 L，最大为 H。键 x 放进第 x−L 格。这样负键也能安全索引。",
      "计数表宽度为 H−L+1。空键也占一格。扫一遍输入，得到每个键的频数。",
      "将较小键的频数累计起来，就得到当前键的起点。起点加频数，是该键的右边界。右边界本身不属于这个键。",
    ], formula: "count[x] = 键 x 出现的次数\nstart[x] = Σ count[t]（t < x）\n键 x 的位置区间 = [start[x], start[x] + count[x])" },
    { id: "trace", kind: "steps", title: "排 A、B、C、D 四条记录", steps: [
      { label: "记录原始顺序", text: "输入依次为 A(2)、B(0)、C(2)、D(1)。键 0、1、2 的频数分别为 1、1、2。" },
      { label: "给每个键预留位置", text: "键 0 从位置 0 开始。键 1 从位置 1 开始。键 2 从位置 2 开始，共占两格。" },
      { label: "按输入顺序放回记录", text: "A 放位置 2。键 2 的游标移到 3。B 放位置 0。C 放位置 3。D 放位置 1。" },
      { label: "检查输出与重键", text: "结果为 B、D、A、C。小键的区间天然靠前。A 和 C 共享同一条递增游标，A 会先于 C。" },
    ] },
    { id: "code", kind: "code", title: "用游标保留整条记录", language: "Python",
      source: `def counting_sort(records):
    if not records:
        return []
    low = min(key for key, _ in records)
    high = max(key for key, _ in records)
    slots = [0] * (high - low + 1)
    for key, _ in records:
        slots[key - low] += 1
    start = 0
    for i, count in enumerate(slots):
        slots[i] = start
        start += count
    output = [None] * len(records)
    for record in records:
        i = record[0] - low
        output[slots[i]] = record
        slots[i] += 1
    return output

print(counting_sort([(2, "A"), (0, "B"), (2, "C"), (1, "D")]))`,
      notes: [{ lines: "2–8", text: "空输入先返回。以最小键为偏移，累计每格频数。" },
        { lines: "9–12", text: "把频数表原地改为起点表。每轮先保存原频数。" },
        { lines: "13–18", text: "按输入顺序使用游标。输出保留键和记录名。" },
        { lines: "20", text: "输出顺序为 B、D、A、C。" }] },
    { id: "cost", kind: "explain", title: "稀疏值域会吃掉优势", paragraphs: [
      "设记录数为 n，值域宽度为 k。两次扫记录花 Θ(n)。初始化与前缀计算花 Θ(k)。合计 Θ(n+k)。",
      "这个版本还需要 k 格计数表和 n 格输出。若只排整数值，可按频数回填。带有附加字段的记录则要保留身份。",
      "只有两个键，也可能要开上百万格。值域未知或稀疏时，先估计内存限制。比较排序无需按全部键值开表。",
      "三个重键都放同一格会覆盖前一条。稳定版本的每个键需要自己的游标。输出前也要确认游标不会跨区间。",
    ] },
  ],
  demo: "counting-sort-stability",
  exercises: [
    { id: "deep-counting-start", level: "基础", kind: "single", prompt: "键 2 的起点取什么？",
      options: ["键 2 的频数", "小于 2 的频数之和", "最小键的下标"], answer: 1,
      explanation: "先给所有较小键预留位置，之后才开始写键 2。", wrong: "看谁必须排在键 2 前面。", review: "range" },
    { id: "deep-counting-c-slot", level: "应用", kind: "integer", prompt: "案例中的 C 写入哪个下标？",
      answer: 3, explanation: "键 2 从下标 2 起。A 占了第一个位置，C 写入下一个。", wrong: "沿同一个游标走两步。", review: "trace" },
    { id: "deep-counting-cost", level: "挑战", kind: "multiple", prompt: "关于本节的实现，哪些说法成立？",
      options: ["负键可以通过偏移处理", "值域越宽越省空间", "同键记录保持输入顺序", "扫描空键也有成本"], answer: [0, 2, 3],
      explanation: "下标扣掉最小键即可。前向填充保持同键顺序。计数数组覆盖整个闭区间。", wrong: "区分实际键数和值域宽度。", review: "cost" },
  ],
  recap: ["先数频数，再算起点。", "同键游标保持顺序。", "时间取决于 n 和 k。"],
  extension: "把 A 改成负键，再把 C 改成和 A 一样。检查新起点和同键顺序。",
  next: "radix-lsd-stable-pass",
  sources: [{ title: "MIT 6.006 · Linear Sorting", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/78a3c3444de1ff837f81e52991c24a86_MIT6_006S20_lec5.pdf" }],
};
