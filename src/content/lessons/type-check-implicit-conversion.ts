import type { DeepLesson } from "./types";

export const implicitConversionLesson: DeepLesson = {
  title: "隐式转换与静态类型检查",
  intro: "同样的 260，存进不同目标会怎样？顺着表达式走一遍，就能看见转换发生在哪一步。",
  goals: ["先推表达式类型，再推赋值。", "区分整数缩窄和浮点越界。", "识别需要诊断的赋值。"],
  blocks: [
    { id: "checker", kind: "explain", title: "类型检查要走两层", paragraphs: [
      "先给字面量和变量定类型。小整数可能先提升。二元算术再选共同类型。",
      "表达式成形后，才检查能否赋给左边的目标。允许赋值也可能改变数值。",
      "这里按八位 unsigned char 和常见的 int 范围解释。正式分析时，应以目标编译器的数据模型为准。",
    ], formula: "源操作数 → 提升与共同类型 → 表达式值 → 目标赋值转换" },
    { id: "trace", kind: "steps", title: "跟踪三种源表达式", steps: [
      { label: "从 unsigned char 开始", text: "u 为 250。u + 10 中，u 提升成 int。表达式得 260。赋给 unsigned char 时再缩窄，存成 4。" },
      { label: "让一个操作数成为 double", text: "int 值 250 加 10.5。加法用 double，得到 260.5。赋给 int 时向零截断，得 260。" },
      { label: "把同一浮点值赋给窄目标", text: "若目标是 unsigned char，截掉小数仍有 260，超出目标范围。C 在此规定行为未定义，不能沿用上一步的取模。" },
      { label: "试试赋一个指针", text: "若右边是 int *，直接赋给面板的算术目标违反赋值约束。符合标准的实现须给出诊断。诊断后是否继续编译由实现决定。" },
    ] },
    { id: "code", kind: "code", title: "只运行有定义的路径", language: "C",
      source: `#include <limits.h>
#include <stdio.h>

_Static_assert(CHAR_BIT == 8, "The example uses 8-bit char.");

int main(void) {
    unsigned char u = 250;
    int sum = u + 10;
    unsigned char narrow = sum;
    double total = sum + 0.5;
    int truncated = total;
    printf("%d %u %.1f %d\\n", sum, (unsigned int)narrow, total, truncated);
    return 0;
}`,
      notes: [{ lines: "4–9", text: "固定八位前提。先求 int，再转回窄类型。" },
        { lines: "10–12", text: "算浮点和，再向零截断成 int。输出 260、4、260.5、260。" }] },
    { id: "limits", kind: "explain", title: "能通过静态检查也要验值域", paragraphs: [
      "静态检查依据类型。它通常无法知道运行时输入的范围。因此允许的数值转换也可能失真或越界。",
      "图中越界分支只报告风险。它不会执行未定义运算。好例子应先验范围，再做向窄类型的赋值。",
      "显式强转能表达意图。它不会替程序检查范围。加上强转后，仍应说明原值可能如何变化。",
    ] },
  ],
  demo: "c-conversion-stages",
  exercises: [
    { id: "deep-implicit-stage", level: "基础", kind: "single", prompt: "先检查哪一项？", options: ["右侧表达式的类型", "输出文件名", "默认将结果变成左类型再加"],
      answer: 0, explanation: "先推操作数类型及运算结果，再判断赋值允许的转换。", wrong: "用完右侧，才轮到赋值。", review: "checker" },
    { id: "deep-implicit-sum", level: "应用", kind: "integer", prompt: "案例 u + 10 在存回前是多少？", answer: 260,
      explanation: "八位 u 先提升为 int，250 与 10 在 int 中相加，得到 260。", wrong: "暂时不做窄化。", review: "trace" },
    { id: "deep-implicit-rules", level: "挑战", kind: "multiple", prompt: "哪些判断和本例一致？",
      options: ["转给 int 时小数向零截断", "浮点越界转无符号也保证取模", "左类型可能改变最终数值", "隐式指针赋给这类目标需要诊断"],
      answer: [0, 2, 3], explanation: "赋值仍有独立语义。实浮点转窄整数超范围时，不能套用整数到无符号的规则。", wrong: "分开算术转换和赋值规则。", review: "limits" },
  ],
  recap: ["先推表达式类型。", "再核对赋值目标。", "类型允许也要查范围。"],
  extension: "把源改成 int + 10.5，交替选 int 和 unsigned char。下一节看编译器如何依这些规则折叠常量。",
  next: "constant-folding-language-rules",
  sources: [{ title: "WG14 N1570 · §6.3.1, §6.5.16.1", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" }],
};
