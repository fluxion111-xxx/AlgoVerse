import type { DeepLesson } from "./types";

export const unsignedModularLesson: DeepLesson = {
  title: "C 无符号整数的模运算",
  intro: "把 250 加 10。表达式可能得到 260。存回八位变量后，却只剩 4。两步各发生了什么？",
  goals: ["根据位宽算出模数。", "区分表达式类型与目标类型。", "识别有意回绕和错误大小。"],
  blocks: [
    { id: "type", kind: "explain", title: "先看表达式用哪种类型", paragraphs: [
      "若表达式以无符号类型运算，结果按其模数取余。模数是该类型最大值加一。有 b 个值位时，模数为 2ᵇ。",
      "小整数先做整数提升。如果 int 能表示其全部值，就提升为 int。再确定二元运算的共同类型。",
      "窄化到无符号目标又是一步。该步骤取目标范围内的同余值。宽表达式的结果可以先存在，直到赋值才缩窄。",
    ], formula: "M = UMAX + 1 = 2ᵇ\n目标余数 = (数学结果 mod M)，范围 0 到 M−1" },
    { id: "trace", kind: "steps", title: "把 260 放进八位变量", steps: [
      { label: "算宽表达式", text: "假定 char 为八位。unsigned char 的 250 提升为 int。加上整数字面量 10，得到 int 值 260。" },
      { label: "转回窄类型", text: "八位无符号的模数为 256。260=1×256+4，所以存回得到 4。这里的原表达式仍是 260。" },
      { label: "试一次减法", text: "在面板输入 0 减 1。数学结果为 −1。它与 255 相差 256，转成八位无符号值就是 255。" },
      { label: "直接用 unsigned int", text: "UINT_MAX 和 1u 参与无符号加法。加到模数整倍时，结果直接为 0。无需存入更窄变量。" },
    ] },
    { id: "code", kind: "code", title: "看清打印出的三个值", language: "C",
      source: `#include <limits.h>
#include <stdio.h>

_Static_assert(CHAR_BIT == 8, "This example uses 8-bit char.");

int main(void) {
    unsigned char small = 250;
    int promoted = small + 10;
    unsigned char narrowed = (unsigned char)promoted;
    unsigned int wrapped = UINT_MAX + 1u;
    printf("%d %u %u\\n", promoted, (unsigned int)narrowed, wrapped);
    return 0;
}`,
      notes: [{ lines: "4", text: "明确八位字节这个条件。" }, { lines: "7–9", text: "先算 int，再显式转回八位。" },
        { lines: "10–11", text: "宽无符号加法直接回到零。输出 260、4、0。" }] },
    { id: "limits", kind: "explain", title: "大小计算要保留原意", paragraphs: [
      "回绕可用于某些环形计数器。大小和索引通常要先检查上限，避免把错误请求变小。",
      "普通有符号运算溢出时，不能套用无符号模规则。混合类型也要按实际转换顺序分析。",
      "面板只展示数学结果转成目标无符号值。具体 C 表达式中途是否溢出，要由其运算类型判断。",
    ] },
  ],
  demo: "unsigned-result-modulus",
  exercises: [
    { id: "deep-modulus-width", level: "基础", kind: "single", prompt: "8 个值位的无符号模数是多少？", options: ["255", "256", "257"], answer: 1,
      explanation: "最大值是 255，模数等于最大值加一。", wrong: "数一共能表示多少个值。", review: "type" },
    { id: "deep-modulus-extra", level: "应用", kind: "integer", prompt: "260 转成八位无符号值，结果是多少？", answer: 4,
      explanation: "减去一个 256 后，余数为 4。", wrong: "先找到目标位宽的模数。", review: "trace" },
    { id: "deep-modulus-rules", level: "挑战", kind: "multiple", prompt: "哪些说法成立？", options: ["小类型可能先提升成 int", "有符号溢出也保证取模",
      "目标位宽影响存回值", "大小计算仍应先检查"], answer: [0, 2, 3],
      explanation: "先判断运算类型，再检查目标转换。用来表示大小时，应提前验证计算范围。", wrong: "分清运算阶段与赋值阶段。", review: "limits" },
  ],
  recap: ["模数比最大值多一。", "先判类型，再求值。", "存回可能再次缩窄。"],
  extension: "把 260 分别存入八位和十六位目标。再看编译器如何处理隐式转换。",
  next: "type-check-implicit-conversion",
  sources: [{ title: "WG14 N1570 · §6.2.5, §6.3.1.1, §6.3.1.3", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" }],
};
