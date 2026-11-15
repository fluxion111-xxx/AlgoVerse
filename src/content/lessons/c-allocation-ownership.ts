import type { DeepLesson } from "./types";

export const allocationOwnershipLesson: DeepLesson = {
  title: "动态内存的所有权",
  intro: "手里有两条指针。它们都指向同一块内存。谁负责释放？另一个指针能用到什么时候？",
  goals: ["给分配成功的对象指定所有者。", "区分借用、转移与释放。", "检查分配失败和重复释放。"],
  blocks: [
    { id: "contract", kind: "explain", title: "所有权是一条接口约定", paragraphs: [
      "malloc 成功后会给出可用存储。代码要决定谁最后调用 free。这里称这个责任方为所有者。",
      "把地址复制给另一个指针，只产生别名。若接口约定是借用，借用者不用释放。它也不能在所有者释放后继续访问。",
      "若移交所有权，要把释放责任移走。移交后，原责任方应停止管理该资源。",
    ] },
    { id: "trace", kind: "steps", title: "走完成功与失败两条路径", steps: [
      { label: "先处理失败", text: "如果分配返回 NULL，马上走错误分支。该分支从未得到对象。它不能先写入再检查。" },
      { label: "只借出地址", text: "成功后，由 owner 写入 12。view 借用同一存储。此时读取 view 得到 12。" },
      { label: "在最后一次使用后释放", text: "所有者调用一次 free。对象寿命立即结束。owner 和 view 都不能继续解引用。" },
      { label: "检查退出分支", text: "成功后若提前返回，也要释放或转交。遗漏会泄漏。若两条路径都释放同一对象，则可能重复释放。" },
    ] },
    { id: "code", kind: "code", title: "只让所有者释放", language: "C",
      source: "#include <stdio.h>\n#include <stdlib.h>\nint main(void) {\n    int *owner = malloc(sizeof *owner);\n    if (owner == NULL) return 1;\n    *owner = 12;\n    const int *view = owner;\n    printf(\"%d\\n\", *view);\n    free(owner);\n    return 0;\n}",
      notes: [{ lines: "4–6", text: "按类型分配。检查成功后才写入。" }, { lines: "7–8", text: "观察者只读取有效对象。" },
        { lines: "9–10", text: "最后一次使用后释放。退出前不再碰别名。" }] },
    { id: "boundary", kind: "explain", title: "检查那几条危险路径", paragraphs: [
      "把 owner 设为空能限制这个变量的后续用法。其他指针仍不会自动变安全。",
      "free(NULL) 是允许的无操作。重复释放一个已结束的对象不是这种情形。不能靠比较旧地址决定是否还能释放。",
      "给接口写清谁创建、谁借用、谁结束。调试时常查错误路径、延迟回调和共享别名。",
    ] },
  ],
  demo: "heap-ownership",
  exercises: [
    { id: "deep-owner-contract", level: "基础", kind: "single", prompt: "借用指针默认负责释放吗？", options: ["由借用者释放", "仍由所有者释放", "所有别名各释放一次"], answer: 1,
      explanation: "借用不移交清理责任。释放责任由接口约定。", wrong: "复制地址不改变责任。", review: "contract" },
    { id: "deep-owner-value", level: "应用", kind: "integer", prompt: "本例分配成功时，释放之前输出哪个整数？", answer: 12,
      explanation: "view 读取刚由 owner 赋值的有效对象。", wrong: "看赋值和释放的先后。", review: "code" },
    { id: "deep-owner-boundary", level: "挑战", kind: "multiple", prompt: "下面哪些做法符合本节约定？", options: ["失败后直接走错误分支", "释放后继续读别名", "最后一次读完再释放", "提前返回时检查清理责任"], answer: [0, 2, 3],
      explanation: "只有成功路径有资源。有效访问要在释放前完成。每条出口都要处理责任。",
      wrong: "按成功、失败和提前退出逐条核对。", review: "boundary" },
  ],
  recap: ["复制地址不等于移交责任。", "借用不能超过对象寿命。", "成功路径必须清理。"],
  extension: "切换失败和清理阶段。再看扩容失败如何保留旧对象。",
  next: "c-realloc-temporary-pointer",
  sources: [{ title: "WG14 N1570 · §7.22.3 Memory Management", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" }],
};
