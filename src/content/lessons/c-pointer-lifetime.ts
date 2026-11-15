import type { DeepLesson } from "./types";

export const pointerLifetimeLesson: DeepLesson = {
  title: "C 指针与对象生命周期",
  intro: "两个函数都返回 int*。一个指向调用者的变量。另一个指向自己的局部变量。退出后，能读哪一个？",
  goals: ["分开追踪指针和目标对象。", "判断离开作用域后的访问。", "改写无效的返回地址。"],
  blocks: [
    { id: "objects", kind: "explain", title: "先找到指向谁", paragraphs: [
      "指针变量本身也是对象。它的值可以指向另一个对象。两者的生命周期要分别判断。",
      "块内普通局部变量通常具有自动存储期。执行离开对应的块时，该对象寿命终止。调用者的变量不会因被调函数退出而结束。",
      "作用域说的是名字可见范围。生命周期说的是对象何时存在。一个名字不在当前作用域，对象仍可能活着。例如通过参数访问调用者的对象。",
    ] },
    { id: "trace", kind: "steps", title: "推演两个返回值", steps: [
      { label: "局部对象路线", text: "被调函数创建局部变量 x。函数内可读 x。把 &x 当返回值并不能延长 x 的寿命。" },
      { label: "退出后先停", text: "被调函数退出，局部 x 已结束。不能再用那个地址访问它。某次看似读到旧值，也无法说明写法合法。" },
      { label: "调用者路线", text: "调用者先创建 value，再传入 &value。被调函数返回同一地址。回到调用者时，value 仍然存活。" },
      { label: "再退出一层", text: "若 value 的作用域也结束，指针就失去有效目标。保存地址的变量还活着也无济于事。" },
    ] },
    { id: "code", kind: "code", title: "让调用者拥有对象", language: "C",
      source: "#include <stdio.h>\n\nstatic int *keep(int *p) { return p; }\n\nint main(void) {\n    int value = 7;\n    int *alias = keep(&value);\n    printf(\"%d\\n\", *alias);\n    return 0;\n}",
      notes: [{ lines: "3", text: "返回调用者传入的指针。" }, { lines: "6–7", text: "value 由 main 创建。alias 指向它。" },
        { lines: "8", text: "value 还在生存期内，因此输出 7。" }] },
    { id: "ownership", kind: "explain", title: "接口怎样写更稳", paragraphs: [
      "若只要一个整数，直接返回值。若要写回结果，可把目标对象的指针传给函数。",
      "若使用动态内存，需要约定谁释放。释放后，其他别名也无法继续有效访问。只清空一个变量不会保护所有别名。",
      "调试时先把创建、借用、释放画成时间线。别靠地址看起来相同来判断对象还在。",
      "演示只判断两种借用情境。它不会执行越界或寿命结束后的访问。",
    ] },
  ],
  demo: "pointer-life",
  exercises: [
    { id: "deep-pointer-return", level: "基础", kind: "single", prompt: "被调函数能延长其自动局部对象的寿命吗？", options: ["返回地址就能", "返回地址不会延长", "只有地址非零才能"], answer: 1,
      explanation: "自动局部对象在离开其块时结束。返回地址不会改变存储期。", wrong: "区分返回值和目标对象。", review: "objects" },
    { id: "deep-pointer-output", level: "应用", kind: "integer", prompt: "运行本节安全示例。printf 输出哪个整数？", answer: 7,
      explanation: "alias 仍指向调用者的 value。value 还活着且等于 7。", wrong: "追踪地址来自哪一层。", review: "code" },
    { id: "deep-pointer-alias", level: "挑战", kind: "multiple", prompt: "分析返回指针的代码。哪些判断成立？", options: ["指针和目标可有不同寿命", "指针非零就能读取", "调用者可传入自己的对象", "释放后其他别名也不能继续读取"], answer: [0, 2, 3],
      explanation: "访问要以目标对象仍存活为前提。指针数值不能证明这一点。",
      wrong: "先标出对象何时结束。", review: "ownership" },
  ],
  recap: ["先找对象，再看它的寿命。", "返回地址不会延长寿命。", "多个别名共享同一有效期。"],
  extension: "切换指针来源和观察时机。接着看谁负责释放内存。",
  next: "c-allocation-ownership",
  sources: [{ title: "WG14 N1570 · §6.2.4 Storage durations", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" }],
};
