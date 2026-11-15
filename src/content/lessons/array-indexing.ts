import type { DeepLesson } from "./types";

export const arrayIndexingLesson: DeepLesson = {
  title: "数组下标与连续存储",
  intro: "一帧图像有数百万个像素。读取某个像素时，为什么不用从头找？关键在于每个元素占多宽。",
  goals: ["从元素下标推导字节地址。", "区分元素下标和字节偏移。", "判断越界并比较访问成本。"],
  blocks: [
    { id: "layout", kind: "explain", title: "把数组看成等宽槽", paragraphs: [
      "先看一维数组。它包含 N 个同类型元素。它们按次序挨着放。元素宽度由该类型决定。请用 sizeof 查询实际宽度。",
      "B 表示第一个元素的地址。W 表示每个元素的字节数。零号元素就在 B。每向后一个元素，地址加 W。",
      "字节可以单独编号。一个元素可能跨多个字节。所以元素下标与字节偏移有区别。想访问元素，先把下标乘宽度。",
    ], formula: "0 ≤ i < N\n字节偏移 = i × W\n首地址 = B + i × W\n元素 i 的字节范围为 [B+iW, B+(i+1)W)" },
    { id: "trace", kind: "steps", title: "手算读取下标 2", steps: [
      { label: "读出已知量", text: "假设 B 是 1000。每项占 4 字节。数组有 4 项。合法下标为 0 到 3。" },
      { label: "先查范围", text: "2 小于 4，可以访问。把 2 乘 4，得到字节偏移 8。首地址便是 1008。" },
      { label: "看半开区间", text: "该元素占用 1008 到 1011。区间右端是 1012。它属于下一项。用半开区间能让相邻项不重叠。" },
      { label: "换宽度再算", text: "宽度改成 8。下标依然是 2。偏移变成 16。这里变化的是布局，元素次序保持原样。" },
    ] },
    { id: "code", kind: "code", title: "先检查，再用下标", language: "C++",
      source: "#include <array>\n#include <iostream>\nint main() {\n    std::array<int, 4> samples{20, 35, 50, 65};\n    std::size_t i = 2;\n    if (i < samples.size())\n        std::cout << samples[i] << '\\n';\n}",
      notes: [{ lines: "1–4", text: "创建 4 个同类型元素。" }, { lines: "5–6", text: "把下标与元素个数比较。" },
        { lines: "7", text: "下标 2 对应第三项，输出 50。" }] },
    { id: "cost", kind: "explain", title: "为什么随机访问快", paragraphs: [
      "地址只需乘和加。在常用成本模型里，这两步是常量操作。数组变长也无需多经过元素。访问代价为 Θ(1)。",
      "链表的后继地址可能散开。只知道头结点时，要沿链接走到第 i 项。扩展到访问后部元素时，代价会随 i 增长。",
      "读取和插入有不同成本。中间插入可能要移动后续元素。顺序扫描常能复用缓存行。随机跳转仍可能遇到缓存未命中。",
      "访问下标 N 会越界。算式得到的地址只是尾后位置。也别假定 int 总是 4 字节。",
    ] },
  ],
  demo: "array-address",
  exercises: [
    { id: "deep-array-range", level: "基础", kind: "single", prompt: "长度为 4。最后一项的下标是几？", options: ["2", "3", "4"], answer: 1,
      explanation: "下标从 0 起。四项依次是 0、1、2、3。", wrong: "先写出第一个下标。", review: "layout" },
    { id: "deep-array-byte", level: "应用", kind: "integer", prompt: "基址 1000。每项 8 字节。下标 2 的首地址是多少？", answer: 1016,
      explanation: "字节偏移为 2×8=16。再加基址得到 1016。", wrong: "需要把下标乘以宽度。", review: "trace" },
    { id: "deep-array-cost", level: "挑战", kind: "multiple", prompt: "讨论固定宽度的数组。哪些结论成立？", options: ["可用公式直接定位", "中间插入也一定是常量时间", "下标 N 不能读取", "int 宽度应以 sizeof 为准"], answer: [0, 2, 3],
      explanation: "定位只需一次地址计算。插入可能移动后续元素。下标和元素宽度各按自身规则判断。",
      wrong: "把地址计算与元素搬移分开。", review: "cost" },
  ],
  recap: ["先判断下标是否合法。", "下标乘宽度才是字节偏移。", "访问快也可能搬移慢。"],
  extension: "试试同一地址对应几个元素。下一节分析动态数组的扩容。",
  next: "dynamic-array-amortization",
  sources: [{ title: "MIT 6.006 · Data Structures", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/" }],
};
