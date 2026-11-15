import type { DeepLesson } from "./types";

export const constantFoldingLesson: DeepLesson = {
  title: "常量折叠的语义约束",
  intro: "编译器看见两个常量，就能提前计算。若按错误的位宽或除法规则算，优化反而会改掉程序结果。",
  goals: ["用类型和位宽判定可折叠结果。", "区分回绕与无定义运算。", "验证整数除法的取整方向。"],
  blocks: [
    { id: "rule", kind: "explain", title: "先问目标规则，再做计算", paragraphs: [
      "折叠用已经知道的值代替表达式。替换必须遵守源语言规则，也要符合目标类型。",
      "先判运算类型、位宽与符号。再计算结果，检查它在该语义下是否有定义。",
      "面板用宽精度列出数学候选。这个候选只是辅助检查。超出目标范围后，要继续看语义。",
    ] },
    { id: "trace", kind: "steps", title: "用三个表达式测试规则", steps: [
      { label: "先算有符号加法", text: "32 位上限是 2147483647。再加 1，宽精度候选是 2147483648。它超出范围；普通 C 有符号溢出没有规定数值。" },
      { label: "切成无符号加法", text: "同样的两个输入可得 2147483648。若左值再设为 4294967295，加 1 刚好等于 2³²。目标余数是 0。" },
      { label: "换成有符号除法", text: "把输入设为 −7 与 3。C 整数商向零截断为 −2。若向下取整，会误算为 −3。" },
      { label: "检查两个坏边界", text: "除数为 0，没有定义。最小有符号整数除以 −1 时，商超出目标范围，也没有规定的数值。" },
    ] },
    { id: "code", kind: "code", title: "对照三条合法表达式", language: "C",
      source: `#include <limits.h>
#include <stdio.h>

int main(void) {
    int ok = 10 + 20 / 3;
    int negative = -7 / 3;
    unsigned int wrapped = UINT_MAX + 1u;
    printf("%d %d %u\\n", ok, negative, wrapped);
    return 0;
}`,
      notes: [{ lines: "5–7", text: "按优先级先除。两条有符号运算都在范围内。无符号加法则回绕。" },
        { lines: "8–9", text: "输出 16、−2、0。可比较不同优化级别的结果。" }] },
    { id: "boundary", kind: "explain", title: "不能用宿主语言替代目标规则", paragraphs: [
      "LLVM 的普通 add 可回绕。若带 nsw 标记，有符号溢出会产生 poison。中间表示的标记也会改变折叠依据。",
      "遇到浮点要再考虑舍入模式、特殊值和允许的优化。遇到函数调用，也要确认有无可观察的副作用。",
      "面板只给三种整数运算的判定。它不会执行出错表达式。完整编译器对无定义路径的处理还取决于上下文。",
    ] },
  ],
  demo: "constant-folding-integer",
  exercises: [
    { id: "deep-fold-first", level: "基础", kind: "single", prompt: "试算前先核对什么？", options: ["运算类型与位宽", "变量名长短", "宿主机的默认输出"],
      answer: 0, explanation: "同一数学结果在不同位宽和语义下可能给不同目标值。", wrong: "先确定程序使用的运算规则。", review: "rule" },
    { id: "deep-fold-division", level: "应用", kind: "integer", prompt: "按 C 整数除法，−7 除以 3 得多少？", answer: -2,
      explanation: "商向零截断，−2.333… 变成 −2。", wrong: "注意向零截断。", review: "trace" },
    { id: "deep-fold-edge", level: "挑战", kind: "multiple", prompt: "对课内规则，哪些判断成立？",
      options: ["无符号 32 位最大值加一得 0", "有符号加法溢出也保证回绕", "除数为 0 时无合法数值", "有符号最小值除以 −1 越界"],
      answer: [0, 2, 3], explanation: "有符号和无符号规则不同。除法检查分母，结果还要能用目标类型表示。", wrong: "分别判断加法和除法的边界。", review: "boundary" },
  ],
  recap: ["先判类型，再求值。", "无符号回绕有明确定义。", "常量也会遇到无定义运算。"],
  extension: "用 int32 最小值除以 −1，再用 1 除以 0。下一节检查副作用何时能删除。",
  next: "dead-code-side-effects",
  sources: [
    { title: "WG14 N1570 · §6.5, §6.5.5", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" },
    { title: "LLVM Language Reference · add Instruction", href: "https://llvm.org/docs/LangRef.html#add-instruction" },
  ],
};
