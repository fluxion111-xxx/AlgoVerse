import type { DeepLesson } from "./types";

export const recursionStackLesson: DeepLesson = {
  title: "递归与调用栈",
  intro: "算 4! 时，最先调用的是 4。最先返回的却是 0 那一层。看看中间发生了什么。",
  goals: ["找出基例和递减参数。", "分别跟踪压栈和返回。", "从输入推算结果与栈深。"],
  blocks: [
    { id: "base", kind: "explain", title: "函数在哪里停？", paragraphs: [
      "算 n! 时，先求 (n−1)!。每次让参数减 1。到 0 时，直接返回 1。",
      "每次调用有自己的栈帧。帧里保留本次参数。外层等里层给出结果，再继续乘。",
      "本课用固定阶乘模型。允许输入 0 到 10 的整数。",
    ] },
    { id: "trace", kind: "steps", title: "跟着 4! 走完一圈", steps: [
      { label: "先压栈", text: "依次调用 4、3、2、1、0。各帧同时在栈上。最深处共有 5 层。" },
      { label: "在基例返身", text: "栈顶的 0 帧返回 1。单步时先看到返回值。下一步读取上一帧时，0 帧已经退出。" },
      { label: "一层一层乘回去", text: "参数 1 的帧拿到 1。它乘出 1。参数 2 的帧再乘出 2。接下来返回 6，最后返回 24。" },
      { label: "看结束状态", text: "所有帧退出后，栈是空的。最大栈深仍是 5。它记录曾经达到的深度。" },
    ] },
    { id: "code", kind: "code", title: "把两种情况写入函数", language: "Python",
      source: "def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)",
      notes: [{ lines: "1", text: "假定 n 是非负整数。" }, { lines: "2–3", text: "0 到了基例，直接返回 1。" },
        { lines: "4", text: "等下一层返回，再乘当前的 n。" }] },
    { id: "depth", kind: "explain", title: "为什么要多算一层？", paragraphs: [
      "从 n 数到 0，共 n + 1 个参数。0 帧也在栈上。它只是不会再调用自己。",
      "改输入为 0。回放只有一次调用和一次返回。结果为 1，最大栈深也是 1。",
      "输入越大，等待返回的帧越多。此递归的额外栈空间随 n 线性增长。",
    ] },
  ],
  demo: "recursion-stack",
  exercises: [
    { id: "deep-recursion-base", level: "基础", kind: "single", prompt: "本课阶乘的基例返回什么？",
      options: ["0", "1", "还要再调用一次"], answer: 1,
      explanation: "0! 等于 1。这里直接返回。",
      wrong: "找到 if n == 0 的那一行。", review: "code" },
    { id: "deep-recursion-depth", level: "应用", kind: "integer", prompt: "计算 4! 时，最大栈深是多少？",
      answer: 5, explanation: "4、3、2、1、0 各占一帧。五帧会同时存在。",
      wrong: "算上最末层的 0 帧。", review: "trace" },
    { id: "deep-recursion-zero", level: "挑战", kind: "multiple", prompt: "把输入改为 0。哪些结果符合回放？",
      options: ["只调用一次", "最大栈深是 0", "最终结果为 1", "完成后栈为空"], answer: [0, 2, 3],
      explanation: "0 仍进入函数。该帧直接返回 1，随后退出。",
      wrong: "即使走基例，也先有一帧。", review: "depth" },
  ],
  recap: ["先找基例，再找递减参数。", "返回顺序与入栈相反。", "最大栈深要算基例帧。"],
  extension: "试试 0 和 5。比较栈深。再看局部对象何时失效。",
  next: "c-pointer-lifetime",
  sources: [{ title: "CMU 15-121 · Recursion and the Run-Time Stack", href: "https://www.cs.cmu.edu/~mrmiller/15-121/Slides/14-recursion.pdf" }],
};
