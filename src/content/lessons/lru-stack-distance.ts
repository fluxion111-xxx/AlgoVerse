import type { DeepLesson } from "./types";

export const lruStackDistanceLesson: DeepLesson = {
  title: "LRU 重用距离与命中",
  intro: "同一页又来了。两次之间写了三行访问日志。需要三个页框，还是四个？先数不同页。",
  goals: ["手算每次访问的重用距离。", "从 LRU 栈推出命中阈值。", "用回放区分冷缺页和容量缺页。"],
  blocks: [
    { id: "definition", kind: "explain", title: "只数中间的不同页", paragraphs: [
      "本课用零起点定义重用距离 d。对再次访问的页，只数上一次访问之后、这一次之前出现的不同页。",
      "重复页只算一次。两次访问挨在一起时，中间没有页，距离就是零。首次访问没有上一次位置，标为冷访问。",
      "也有人给栈位置从 1 编号。此时位置是 d+1。看清定义后，再对照容量和比较符号。",
    ], formula: "重用距离 d = |两次访问之间的不同页集合|\n空框起步时，LRU 命中 ⇔ 非首次访问且 d < 容量" },
    { id: "trace", kind: "steps", title: "用 1、2、2、3、1 回放", steps: [
      { label: "装入页 1 和页 2", text: "第一、第二次都是冷访问。容量 2 和 3 都先装入两页，各缺页两次。" },
      { label: "连续读页 2", text: "第三次和上一次紧挨着。距离为 0。两种容量都命中。页 2 仍是最近访问的页。" },
      { label: "第一次读页 3", text: "第四次是冷访问。两框已满，淘汰较久未读的页 1。三框还有地方，页 1 仍在。" },
      { label: "再次读页 1", text: "中间出现页 2 两次、页 3 一次。不同页只有 {2,3}，距离为 2。两框缺页，三框命中。全程分别缺 4 次和 3 次。" },
    ] },
    { id: "proof", kind: "explain", title: "为什么阈值要用小于", paragraphs: [
      "把已见过的页从新到旧排成栈。每次访问把当前页移到最前。其余页保持相对顺序。",
      "目标页上次访问后，见到的每一种别页都会排到它之前。重复访问只调整前方的顺序。因此前方恰有 d 页。",
      "容量为 c 的 LRU 只保留栈顶 c 个页。目标的零基位置是 d。d 等于 c 时，它已经位于缓存外。",
      "取同一访问串，每次将有限距离与容量比较。跳过冷访问的阈值判断，就能从一份距离表比较多种容量。",
    ] },
    { id: "limits", kind: "explain", title: "回放的前提要对齐", paragraphs: [
      "把演示的默认访问串改成案例串，只切换页框数。两次均单步到末尾，在 LRU 行读取计数。",
      "这条规则以全相联 LRU 为前提。若是组相联缓存，应在同一组内数相关块。FIFO 的命中也不能直接套用这个阈值。",
      "缓存若已预热，首次出现在截取日志里的页可能命中。使用公式前，先确认起始状态或补齐历史。",
    ] },
  ],
  demo: "page-replacement",
  exercises: [
    { id: "deep-lru-distance-unique", level: "基础", kind: "single", prompt: "中间页 2 出现两次，算几种？",
      options: ["一种", "两种", "零种"], answer: 0,
      explanation: "重用距离按不同页计数，两次读同一页只占一个位置。", wrong: "先把中间页去重。", review: "definition" },
    { id: "deep-lru-distance-capacity", level: "应用", kind: "integer", prompt: "案例最后一步命中，最少需要几框？",
      answer: 3, explanation: "重用距离为 2，容量必须严格大于 2。", wrong: "目标页自己也要占一框。", review: "trace" },
    { id: "deep-lru-distance-limits", level: "挑战", kind: "multiple", prompt: "关于本节算法，哪些说法成立？",
      options: ["空框起步时首次访问会缺页", "容量等于重用距离时命中", "连续复访的距离为 0", "组相联缓存不能直接用全局距离"], answer: [0, 2, 3],
      explanation: "目标的栈位置从 0 起。阈值是严格小于。分组后只看同组竞争。",
      wrong: "先对齐起点、下标和缓存组织。", review: "limits" },
  ],
  recap: ["距离数中间不同页。", "LRU 命中要求 d 小于容量。", "首次访问另行统计。"],
  extension: "在最后一个 1 前再插入页 4。用三框和四框检查阈值。",
  next: "working-set-thrashing",
  sources: [{ title: "OSTEP · Replacement Policies", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf" }],
};
