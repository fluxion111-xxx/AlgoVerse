import type { DeepLesson } from "./types";

export const reallocTemporaryPointerLesson: DeepLesson = {
  title: "realloc 失败时保留旧指针",
  intro: "缓冲区已经存了三个字节。你想扩到五个。系统可能拒绝请求。怎样保证旧数据还能用？",
  goals: ["记住失败时仍由原指针负责。", "成功后使用返回的指针。", "算出多少旧数据会保留。", "正确处理容量和借用。"],
  blocks: [
    { id: "contract", kind: "explain", title: "先保存结果，再提交容量", paragraphs: [
      "这里只讨论有效指针和非零大小。旧地址来自内存分配函数。旧对象尚未释放。",
      "申请失败时，函数返回 NULL。旧对象仍活着。原来的内容和容量都要保留。",
      "申请成功时，函数可能移动对象。也可能复用相同地址。无论哪种情况，都用返回的新指针。",
      "先把返回值存进临时指针。成功后才更新所有者和容量。失败时保留两者。",
      "若把返回值直接赋给唯一指针，失败就会覆盖旧地址。旧内存仍占用。却再也无法通过该变量释放。",
    ], formula: "成功时保留的前缀字节数 = min(旧大小, 新大小)" },
    { id: "trace", kind: "steps", title: "跟踪三个字节何去何从", steps: [
      { label: "记录已有资源", text: "当前有 3 字节。内容依次是 11、22、33。请求 5 字节前，先保留原指针和容量。" },
      { label: "模拟申请失败", text: "临时指针得到 NULL。原指针仍能读到 11、22、33。容量仍为 3。不能写第四个字节。" },
      { label: "模拟扩容成功", text: "返回有效指针。前 3 字节仍是 11、22、33。新增两个字节需先初始化。再把容量更新为 5。" },
      { label: "换一个缩小请求", text: "把请求改为 2 字节。成功后只保留 11、22。第三个字节已经超出新对象范围。" },
    ] },
    { id: "code", kind: "code", title: "失败也能正常清理", language: "C",
      source: "#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    size_t capacity = 3;\n    unsigned char *buffer = malloc(capacity);\n    if (buffer == NULL) return 1;\n    buffer[0] = 11;\n    buffer[1] = 22;\n    buffer[2] = 33;\n\n    const size_t requested = 5;\n    unsigned char *updated = realloc(buffer, requested);\n    if (updated != NULL) {\n        buffer = updated;\n        buffer[3] = 0;\n        buffer[4] = 0;\n        capacity = requested;\n    }\n\n    printf(\"%u %u %u %u\\n\", (unsigned)capacity,\n        (unsigned)buffer[0], (unsigned)buffer[1], (unsigned)buffer[2]);\n    free(buffer);\n    return 0;\n}",
      notes: [
        { lines: "5–10", text: "检查首次分配。再写入现有内容。" },
        { lines: "12–13", text: "扩容请求明确为 5 字节。结果交给临时指针。" },
        { lines: "14–19", text: "只在成功时使用新指针。初始化新增字节。更新容量。" },
        { lines: "21–24", text: "本例容量只有 3 或 5。可转成 unsigned 打印。最后用当前指针释放对象。" },
      ] },
    { id: "limits", kind: "explain", title: "地址一样，旧借用也要收回", paragraphs: [
      "成功后旧对象寿命结束。旧借用和内部指针都别继续读。即使地址看起来没变，也应重新获取。",
      "若调用前要保留某个位置，可先记下索引。成功后检查它还在新范围内。再从新指针算位置。",
      "容量是字节或元素，都要统一单位。元素个数乘宽度前应检查溢出。还要保证请求非零。",
      "演示按分支推演数据和所有权。它让你主动选择失败或成功。它不会制造真实内存不足。",
    ] },
  ],
  demo: "realloc-preserve",
  exercises: [
    { id: "deep-realloc-fail-owner", level: "基础", kind: "single", prompt: "非零扩容返回 NULL。旧对象现在如何？",
      options: ["旧对象有效，可继续释放", "已被自动释放", "大小已经扩到新容量"], answer: 0,
      explanation: "失败不会改变旧对象。本课代码用原指针保留访问和释放能力。",
      wrong: "想一想提交容量的条件。", review: "contract" },
    { id: "deep-realloc-kept-prefix", level: "应用", kind: "integer", prompt: "3 字节缩到 2 字节，成功时保留几个旧字节？",
      answer: 2, explanation: "保留新旧大小中较小的前缀。新对象只有 2 字节。",
      wrong: "想一下第三个字节还在不在新范围。", review: "trace" },
    { id: "deep-realloc-success", level: "挑战", kind: "multiple", prompt: "扩容成功后，哪些做法符合本课规则？",
      options: ["使用返回的指针释放", "比较旧借用再决定是否能继续读它", "从新地址重新获得内部指针", "先初始化新增字节再读取"], answer: [0, 2, 3],
      explanation: "新指针有新的对象寿命。借用要重建，新增空间要初始化。",
      wrong: "先检查旧对象的寿命。再检查哪些字节写过。", review: "limits" },
  ],
  recap: ["用临时指针接结果。", "容量随成功一起提交。", "重新取得旧位置的借用。"],
  extension: "分别试一次失败和原位成功。接着检查元素个数乘宽度时的溢出。",
  next: "c-allocation-size-overflow",
  sources: [{ title: "WG14 N1570 · §7.22.3.5 The realloc function", href: "https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf" }],
};
