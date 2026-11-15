import type { DeepLesson } from "./types";

export const deadCodeSideEffectsLesson: DeepLesson = {
  title: "死代码删除与可观察副作用",
  intro: "函数返回值没用到。编译器能整行删掉它吗？先看那行是否打印、写入，或改变返回值。",
  goals: ["区分不可达代码与死值。", "标出要保留的可观察效果。", "判断常量折叠与删除的边界。"],
  blocks: [
    { id: "rule", kind: "explain", title: "先看能否到达，再看做了什么", paragraphs: [
      "不可达表示控制流永远走不到。它的语句在本例不会执行。",
      "可达的计算要看结果是否仍会用到。若计算无可观察效果，结果又无人使用，就有机会删除。",
      "输出与 volatile 访问有可观察效果。它们位于可达路径时，优化仍要保留相应效果。",
    ] },
    { id: "trace", kind: "steps", title: "逐行检查四种操作", steps: [
      { label: "追 scratch 的用途", text: "scratch 算得 5。默认返回 0，后续没有用到 scratch。这项纯计算可以删除。" },
      { label: "检查常量分支", text: "条件为 0，puts(“extra”) 永远走不到。把条件改为 1，输出 extra 就成为可观察效果。" },
      { label: "观察两种写入", text: "普通局部变量若没有后续读取，也没有逃逸，本次写入可删除。换成 volatile 对象后，例中的写入要作为访问保留。" },
      { label: "追返回值", text: "若改为返回 scratch，调用方需要这个值。编译器仍可折叠成直接返回 5。保留的是返回结果。" },
    ] },
    { id: "code", kind: "code", title: "执行一个可对照的 C 示例", language: "C",
      source: `#include <stdio.h>

volatile int device_flag;

int main(void) {
    int scratch = 2 + 3;
    (void)scratch;
    if (0) puts("extra");
    device_flag = 7;
    puts("ready");
    return 0;
}`,
      notes: [{ lines: "6–8", text: "scratch 的值被丢弃。常量假分支也不会执行。" },
        { lines: "9–11", text: "保留 volatile 写和输出。默认只打印 ready，退出状态为 0。" }] },
    { id: "limits", kind: "explain", title: "删除结论依赖已知信息", paragraphs: [
      "结果未使用的调用也可能写文件。仅凭没接返回值，不能删除调用。",
      "普通存储若可能通过别名读取，也要先证明读取不可发生。面板的普通局部量约定从未泄露。",
      "优化可以改写实现。测试可从输出、访问和返回值核对行为。面板表示这三种行为约束。",
    ] },
  ],
  demo: "dead-code-observations",
  exercises: [
    { id: "deep-dead-value", level: "基础", kind: "single", prompt: "默认哪一项因结果无用而可删？", options: ["scratch 的纯计算", "ready 的输出", "volatile 写入"],
      answer: 0, explanation: "纯计算的结果未被使用，也没有观察效果。", wrong: "先问这一行是否会改变可观察行为。", review: "rule" },
    { id: "deep-dead-return", level: "应用", kind: "integer", prompt: "把返回表达式改为 scratch，返回多少？", answer: 5,
      explanation: "保留值等价于返回 2+3，编译器也可直接用常量 5。", wrong: "查看谁依赖 scratch。", review: "trace" },
    { id: "deep-dead-limits", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["常量假分支中的输出不会发生", "返回值未用的调用总可删除", "可达的 volatile 写要保留其效果", "返回值所需计算可以常量化"],
      answer: [0, 2, 3], explanation: "先检查可达性，再查副作用。保留行为仍允许改写计算形式。", wrong: "把可达、用途和效果分开检查。", review: "limits" },
  ],
  recap: ["不可达与死值各查一次。", "副作用要单独判断。", "优化须保留可观察效果。"],
  extension: "切换分支与返回值，比较两处变化。下一节用逆向数据流判断变量还会不会被用。",
  next: "dataflow-live-variable",
  sources: [
    { title: "LLVM · Dead Code Elimination", href: "https://llvm.org/docs/Passes.html#dce-dead-code-elimination" },
    { title: "LLVM · Volatile Memory Accesses", href: "https://llvm.org/docs/LangRef.html#volatile-memory-accesses" },
  ],
};
