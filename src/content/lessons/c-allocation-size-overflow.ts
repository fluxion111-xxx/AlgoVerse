import type { DeepLesson } from "./types";

export const allocationSizeOverflowLesson: DeepLesson = {
  title: "分配大小的乘法溢出",
  intro: "你要放 3000 条记录。每条占 24 字节。若大小上限只有 65535，按什么顺序算才安全？",
  goals: ["区分项数和请求字节数。", "先用除法检查上限。", "分别处理范围错误和分配失败。"],
  blocks: [
    { id: "derive", kind: "explain", title: "先推上限，再做乘法", paragraphs: [
      "分配器收的是字节数。调用方知道项数 n 和单项宽度 w。若 w 大于零，就可把乘积约束改写为商。",
      "整数除法对非负数向下取整。只要 n 不超过这个商，数学乘积就在大小类型的范围内。",
      "先验完再在正确的大小类型中运算。若计数来自有符号输入，应先拒绝负数，并检查能否转换到 size_t。",
    ], formula: "n × w ≤ SIZE_MAX 且 w > 0\n等价于 n ≤ ⌊SIZE_MAX / w⌋" },
    { id: "trace", kind: "steps", title: "在 16 位上限下算三遍", steps: [
      { label: "先算最多放多少项", text: "65535÷24 向下取整得 2730。2730 条要 65520 字节。还剩 15 字节，放不下下一条。" },
      { label: "恰好多请求一项", text: "2731 条要 65544 字节。超出上限，所以在乘法前拒绝。等于商时可以通过，超过一项就不行。" },
      { label: "回到 3000 条", text: "数学乘积是 72000。若缩到 16 位无符号大小，只剩 6464。分配器若收到 6464，不会替你找回真实需求。" },
      { label: "换到 32 位上限", text: "同样的 3000×24 已在范围内。这个检查能通过。分配器仍可能因内存或其他限制失败。" },
    ] },
    { id: "code", kind: "code", title: "写一个检查函数", language: "C",
      source: `#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

static bool checked_size(size_t count, size_t width, size_t *out) {
    if (count == 0 || width == 0) return false;
    if (count > SIZE_MAX / width) return false;
    *out = count * width;
    return true;
}

int main(void) {
    size_t bytes;
    if (checked_size(10, 24, &bytes)) printf("%zu\\n", bytes);
    printf("%d\\n", checked_size(SIZE_MAX / 24 + 1, 24, &bytes));
}`,
      notes: [{ lines: "5–7", text: "约定输出指针有效。拒绝空请求，避免除以零。" },
        { lines: "8–9", text: "通过除法检查才算乘积。失败时保留旧输出。" },
        { lines: "12–16", text: "普通请求得到 240。越界请求返回 false，打印 0。" }] },
    { id: "boundary", kind: "explain", title: "大小通过以后做什么", paragraphs: [
      "检查函数只验证请求大小。本例没有实际分配。调用 malloc 后仍需检查返回值。",
      "若还要增加头部大小，要另验加法。比较头部大小与 SIZE_MAX−bytes，再决定能否相加。",
      "无符号结果可能按模缩窄。有符号乘法溢出则可能导致未定义行为。不要先乘再依靠负数检查。",
    ] },
  ],
  demo: "checked-allocation-size",
  exercises: [
    { id: "deep-size-divisor", level: "基础", kind: "single", prompt: "先除以单项大小前，要确认什么？",
      options: ["单项大小大于零", "乘积已经计算", "分配器已成功"], answer: 0,
      explanation: "除数要非零。先得到安全上界，再判断能否乘。", wrong: "先保护除法本身。", review: "derive" },
    { id: "deep-size-maximum", level: "应用", kind: "integer", prompt: "上限 65535，每条 24 字节，最多能放几条？",
      answer: 2730, explanation: "向下取整得到 2730。余下的 15 字节放不下整条记录。", wrong: "不要把商向上取整。", review: "trace" },
    { id: "deep-size-boundaries", level: "挑战", kind: "multiple", prompt: "准备调用分配器。哪些处理有依据？",
      options: ["拒绝负输入再转换", "乘法通过就保证分配成功", "附加头部还要检查加法", "分配后继续检查返回值"], answer: [0, 2, 3],
      explanation: "数值可表示和实际资源够用是两次检查。加头部可能重新越界。",
      wrong: "分开验证输入、运算和分配结果。", review: "boundary" },
  ],
  recap: ["用商限制元素数。", "通过后再计算字节数。", "再检查实际分配结果。"],
  extension: "将项数调到 2730 和 2731。比较边界两侧。接着看无符号算术规则。",
  next: "c-unsigned-modular-arithmetic",
  sources: [{ title: "WG14 N1570 · §6.2.5 Types, §7.20 Integer types", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" }],
};
