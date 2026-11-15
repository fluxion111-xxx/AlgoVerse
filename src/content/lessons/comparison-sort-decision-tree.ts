import type { DeepLesson } from "./types";

export const comparisonSortDecisionTreeLesson: DeepLesson = {
  title: "比较排序的决策树下界",
  intro: "三张卡片各有一个互异的键。只能两两比较，能保证两次排完吗？先数一共有几种答案。",
  goals: ["把一次比较读成二叉分支。", "从排列数推出最坏下界。", "分清试跑次数和最坏保证。"],
  blocks: [
    { id: "model", kind: "explain", title: "比较给出一位信息", paragraphs: [
      "先把键视为黑盒。只能询问哪个更小。用 A、B、C 标记输入位置。每种键的相对顺序要求一种输出下标顺序。",
      "每个节点挑两项比较。键互异时，答案只有两种。不同分支还能挑不同的比较对。走到叶子才确定输出。",
      "同一叶子只会给出一种下标顺序。两个不同的正确顺序不能共用它。算法需要为每种排列留下一个出口。",
    ] },
    { id: "trace", kind: "steps", title: "给三张卡片画出分支", steps: [
      { label: "先比 A 与 B", text: "假设 A 较小。可能顺序只剩 ABC、ACB、CAB。另一个分支同样还剩三种。" },
      { label: "再比 B 与 C", text: "若 B 较小，A<B<C，输出 ABC。两次就够。否则还剩 ACB 和 CAB。" },
      { label: "再比 A 与 C", text: "若 A 较小，输出 ACB。否则输出 CAB。这个分支用了三次比较。" },
      { label: "核对回放中的两组输入", text: "输入 3、1、2，站内快排只比两次。换成 1、2、3，它比较三次。短路径和长路径可以并存。" },
    ] },
    { id: "code", kind: "code", title: "用三键代码读决策树", language: "Python",
      source: "def order_labels(a, b, c):\n    if a < b:\n        if b < c:\n            return \"ABC\"\n        return \"ACB\" if a < c else \"CAB\"\n    if a < c:\n        return \"BAC\"\n    return \"BCA\" if b < c else \"CBA\"\n\nprint(order_labels(3, 1, 2))  # BCA",
      notes: [
        { lines: "1–2", text: "假设键互异。先按 A 和 B 的大小分支。" },
        { lines: "3–5", text: "在 A 小的一侧，先查 B 和 C。必要时再比较 A 和 C。" },
        { lines: "6–8", text: "在 B 小的一侧，先查 A 和 C。最后两种用 B 和 C 分开。" },
        { lines: "10", text: "输出 BCA。按这个顺序读键，得到 1、2、3。" },
      ] },
    { id: "bound", kind: "explain", title: "从叶子数推出下界", paragraphs: [
      "若最坏只比 h 次，二叉树最多放 2ʰ 个叶子。n 个互异键却有 n! 种排列。于是 2ʰ 至少要达到 n!。",
      "只取阶乘最大的 ⌈n/2⌉ 项。每项至少是 n/2。取对数后，有至少约 n/2 项贡献 log₂(n/2)。",
      "下界约束给定长度的最坏输入。它不保证任意输入都需要同样多的比较，也不保证特定算法刚好达到这个下界。",
      "次数只是比较模型的开销。不应直接换算成毫秒。计数排序利用键值范围，可避开这个模型的限制。",
    ], formula: "2ʰ ≥ n!  ⇒  h ≥ ⌈log₂(n!)⌉\nlog₂(n!) ≥ ⌈n/2⌉ log₂(n/2)\n所以 h ∈ Ω(n log n)" },
  ],
  demo: "sorting",
  exercises: [
    { id: "deep-sort-tree-leaf", level: "基础", kind: "single", prompt: "叶子在本课模型中记录什么？",
      options: ["固定的比较对", "一种输出下标顺序", "机器的运行毫秒数"], answer: 1,
      explanation: "比较发生在中间节点。叶子给出按键排列的输入位置。", wrong: "区分问大小与给结果。", review: "model" },
    { id: "deep-sort-tree-five", level: "应用", kind: "integer", prompt: "五个互异键。叶子数给出几次比较的最坏下界？",
      answer: 7, explanation: "5!=120。六次只有 64 个叶子，七次最多 128 个。", wrong: "次数必须向上取整。", review: "bound" },
    { id: "deep-sort-tree-inputs", level: "挑战", kind: "multiple", prompt: "回放 3、1、2 和 1、2、3。哪些现象能与下界共存？",
      options: ["某个快排输入只比较两次", "两次能保证排好所有互异三键", "同一算法有不同路径长度", "某个快排输入比较三次"],
      answer: [0, 2, 3], explanation: "两组输入的快排比较次数为 2、3。下界要求最坏路径至少三次。",
      wrong: "用两组输入分开看短路径和长路径。", review: "trace" },
  ],
  recap: ["互异 n 键需要 n! 种输出。", "二叉树最多有 2ʰ 个叶子。", "最坏下界约束最长路径。"],
  extension: "换成四个互异键，先算下界。再比较两种实现的实际次数。下一节用范围信息做计数排序。",
  next: "counting-sort",
  sources: [{ title: "MIT 6.006 · Linear Sorting", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/78a3c3444de1ff837f81e52991c24a86_MIT6_006S20_lec5.pdf" }],
};
