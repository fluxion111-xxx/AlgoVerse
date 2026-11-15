import type { DeepLesson } from "./types";

export const hashCollisionsLesson: DeepLesson = {
  title: "哈希冲突与删除标记",
  intro: "三个键落在同一槽。删了中间的键。为什么后面的键还能找到？",
  goals: ["比较链地址和线性探测。", "跟踪探测如何绕回表头。", "解释墓碑如何保住探测链。"],
  blocks: [
    { id: "locate", kind: "explain", title: "先算起始槽", paragraphs: [
      "实验用非负余数确定起始槽。容量为 5 时，4、9、14 都落在槽 4。键不同，槽相同，就发生冲突。",
      "链地址把这些键放进同一桶。查找时逐个比较键。线性探测让每个槽只放一个键。遇到冲突就向后找，尾部接回表头。",
    ], formula: "起始槽 = ((键 % 容量) + 容量) % 容量\n第 i 个候选槽 = (起始槽 + i) % 容量，i 从 0 开始" },
    { id: "trace", kind: "steps", title: "跟着键 14 走一遍", steps: [
      { label: "先插入三个键", text: "链地址把 4、9、14 放入桶 4。线性探测把它们放在槽 4、0、1。遇到表尾后，从槽 0 继续。" },
      { label: "删除键 9", text: "链地址从桶中移除 9。线性探测在槽 0 留下墓碑。它表示这个槽曾经用过。" },
      { label: "再查键 14", text: "线性探测先比较槽 4 的键。再越过槽 0 的墓碑。最终在槽 1 找到 14。若把墓碑当空槽，查找就会提前结束。" },
      { label: "插入键 19", text: "从槽 4 开始找。记下槽 0 的墓碑。继续查到空槽，确认 19 不在表内。然后复用槽 0。" },
    ] },
    { id: "limits", kind: "explain", title: "查找何时停？", paragraphs: [
      "遇到目标就停。遇到从未用过的空槽也能停。若没有空槽，最多绕一圈。",
      "插入遇墓碑时，先记下位置。还要继续确认有没有同键。否则可能插出重复键。",
      "线性探测的槽数固定。全满时不能再插新键。链地址还能延长桶链。长链也需要更多比较。",
    ] },
  ],
  demo: "hash-collisions",
  exercises: [
    { id: "deep-hash-bucket", level: "基础", kind: "single", prompt: "容量为 5。键 9 的起始槽是哪一个？",
      options: ["槽 0", "槽 4", "槽 9"], answer: 1,
      explanation: "9 除以 5 的余数是 4。探测从槽 4 开始。", wrong: "从 0 编号。先算除法余数。", review: "locate" },
    { id: "deep-hash-probes", level: "应用", kind: "integer", prompt: "默认案例删除 9 后，再查 14。线性探测共检查几个槽？",
      answer: 3, explanation: "依次看槽 4、0、1。墓碑所在的槽 0 也计一次检查。",
      wrong: "从起始槽数起，墓碑也要算。", review: "trace" },
    { id: "deep-hash-tombstones", level: "挑战", kind: "multiple", prompt: "在线性探测中，哪些说法成立？",
      options: ["查找应越过墓碑", "遇到从未使用的空槽可以停止查找", "插入可复用墓碑", "遇墓碑就能立刻插入"], answer: [0, 1, 2],
      explanation: "墓碑保留查找路径。插入前还要查完可能有同键的路径。",
      wrong: "把空槽、墓碑和已占槽分开看。", review: "limits" },
  ],
  recap: ["冲突只说明起始槽相同。", "墓碑不会截断查找。", "复用墓碑前先排除重复键。"],
  extension: "把容量缩成 2，试插三个奇数。再看负载因子如何影响探测。",
  next: "hash-table-load-factor",
  sources: [{ title: "MIT 6.006 · Hashing and open addressing", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/pages/lecture-notes/" }],
};
