import type { DeepLesson } from "./types";

export const stableMergeLesson: DeepLesson = {
  title: "稳定归并排序",
  intro: "左右两段都排好了。段首分数相同。此时先取哪一段，才能保留工单原来的次序？",
  goals: ["逐项回放双指针归并。", "证明跨段同键也能保序。", "估算整棵递归树的成本。"],
  blocks: [
    { id: "merge", kind: "explain", title: "先固定两段的含义", paragraphs: [
      "左段来自原输入的前半部分，右段来自后半部分。每段已经按键稳定排好。",
      "每次比较两段尚未处理的第一项。取较小者，再移动那个指针。遇到同键时先取左段。",
      "归并后缀只要一段用完，就可直接接上另一段剩余项。无需继续两两比较。",
    ] },
    { id: "trace", kind: "steps", title: "合并四条工单记录", steps: [
      { label: "写出有序的两段", text: "左半是 A(2)、B(4)。右半是 C(2)、D(3)。归并前，A 在 C 之前。" },
      { label: "遇到跨段同键", text: "A 和 C 都是 2。先拿 A。此时左段首变成 B(4)，右段首仍是 C(2)。" },
      { label: "继续比较段首", text: "拿 C 后，再比较 B(4) 与 D(3)。取 D。右段用完，直接接上 B。输出 A、C、D、B。" },
      { label: "改成同键先取右段", text: "第一步变成拿 C。最后得到 C、A、D、B。键依然有序，但跨段的同键次序反了。" },
    ] },
    { id: "code", kind: "code", title: "写出完整的归并排序", language: "Python",
      source: `def merge_sort(records):
    if len(records) <= 1:
        return list(records)
    mid = len(records) // 2
    left = merge_sort(records[:mid])
    right = merge_sort(records[mid:])
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i][0] <= right[j][0]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    return out + left[i:] + right[j:]

print(merge_sort([(2, "A"), (4, "B"), (2, "C"), (3, "D")]))`,
      notes: [{ lines: "2–6", text: "平分连续输入。递归保留各段内部同键次序。" },
        { lines: "9–15", text: "取小键。同键用 <= 走左段。" },
        { lines: "16–18", text: "尾段原顺序接入。输出 A、C、D、B。" }] },
    { id: "proof", kind: "explain", title: "把局部保序推到整段", paragraphs: [
      "同段的同键没有跳位，因为指针只向前。若同键跨段，原位置较早的记录一定在左段。先取左段就保住了这组次序。",
      "递归底部只有一项，天然稳定。每层归并保序，因此整段稳定。",
      "每层合并至多处理 n 条。前 ⌊log₂ n⌋ 层的分段都要合并，层代价为线性。总时间是 Θ(n log n)，还需要额外归并存储。",
    ], formula: "T(n)=T(⌊n/2⌋)+T(⌈n/2⌉)+Θ(n)=Θ(n log n)" },
  ],
  demo: "merge-record-halves",
  exercises: [
    { id: "deep-merge-choice", level: "基础", kind: "single", prompt: "跨段同键时，应先取哪一段？",
      options: ["左段", "右段", "随机"], answer: 0, explanation: "左段在原输入中更早，因此应先输出左段的同键记录。", wrong: "先看原输入的相对位置。", review: "merge" },
    { id: "deep-merge-position", level: "应用", kind: "integer", prompt: "案例按稳定规则合并，D 在第几个位置？",
      answer: 3, explanation: "依次取 A、C、D，再接上 B，D 在第三位。", wrong: "合并前先列出左右指针。", review: "trace" },
    { id: "deep-merge-proof", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["同段指针只向前有助于保序", "同键先右仍保证全局稳定", "每层最多合并 n 条记录", "一段耗尽可直接接另一段"],
      answer: [0, 2, 3], explanation: "跨段同键由先左保序。每层待合并分段互不重叠，至多处理 n 条。", wrong: "分别看同段和跨段的同键。", review: "proof" },
  ],
  recap: ["先拆，再排两段。", "同键时先取左段。", "各层合并代价为线性。"],
  extension: "把四个键改相同，切换取值顺序。再用分治递推式推导运行成本。",
  next: "divide-merge-recurrence",
  sources: [{ title: "NIST · Merge Sort", href: "https://xlinux.nist.gov/dads/HTML/mergesort.html" }],
};
