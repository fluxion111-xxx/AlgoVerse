import type { DeepLesson } from "./types";

export const sortingStabilityLesson: DeepLesson = {
  title: "排序稳定性与同键记录",
  intro: "三笔工单按到达时间排好。再按等级升序排。同一等级的工单，谁应该先处理？",
  goals: ["用记录身份检验稳定性。", "从插入条件解释同键保序。", "了解多关键字排序的用法。"],
  blocks: [
    { id: "definition", kind: "explain", title: "给同键记录保留身份", paragraphs: [
      "排序要求输出的键有序。稳定性再加一条，同键记录要保持输入中的相对顺序。",
      "两条工单的等级相同，仍有不同编号。只检查等级数组，看不出它们是否换过位置。",
      "稳定是算法对所有输入的保证。某组没有重复键，或者同键刚好没换，都不足以证明稳定。",
    ] },
    { id: "trace", kind: "steps", title: "只改一个比较符", steps: [
      { label: "设置三条工单", text: "A、B、C 按到达先后排列。等级分别为 2、1、2。输出先看等级，遇到相同等级就保留到达顺序。" },
      { label: "先插入 B", text: "前一项 A 的等级更大。A 右移，B 进入第一个位置。此时前两项为 B、A。" },
      { label: "再插入 C", text: "使用严格大于时，A 与 C 同级，A 不移动。C 留在 A 后面。最终顺序为 B、A、C。" },
      { label: "改成大于等于", text: "A 此时也会右移。C 插到 A 前面，结果为 B、C、A。等级有序，同级顺序却变了。" },
    ] },
    { id: "code", kind: "code", title: "比较排序后的记录编号", language: "Python",
      source: `def insert_sorted(items, move_equal=False):
    result = list(items)
    for i in range(1, len(result)):
        item = result[i]
        j = i
        while j and (result[j - 1][0] > item[0] or
                     (move_equal and result[j - 1][0] == item[0])):
            result[j] = result[j - 1]
            j -= 1
        result[j] = item
    return [name for _, name in result]

orders = [(2, "A"), (1, "B"), (2, "C")]
print(insert_sorted(orders))
print(insert_sorted(orders, move_equal=True))`,
      notes: [{ lines: "2–5", text: "复制输入。每轮取出待插入的完整记录。" },
        { lines: "6–10", text: "右移大键。是否也移动同键由开关决定。" },
        { lines: "11–15", text: "输出编号以观察同键顺序。两行分别是 B、A、C 与 B、C、A。" }] },
    { id: "reason", kind: "explain", title: "为什么严格大于能保序", paragraphs: [
      "每轮开始，前缀已按键排序，已有同键也保持原序。插入时只移动比当前项大的后缀。",
      "当前项停在所有旧同键之后。旧同键之间也没有换位。因此这一轮保持稳定，直到最后一轮。",
      "按多个字段排序时，可以先按次要字段排。随后对主要字段做稳定排序。同一主键内便保留之前的次键次序。",
    ] },
  ],
  demo: "record-sort-ties",
  exercises: [
    { id: "deep-stability-rule", level: "基础", kind: "single", prompt: "稳定排序必须保留哪种关系？", options: ["同键记录的相对顺序", "每条记录的绝对下标", "所有输入都原样返回"],
      answer: 0, explanation: "记录可移动到新下标，但同键记录之间先后不变。", wrong: "区分相对顺序和下标。", review: "definition" },
    { id: "deep-stability-index", level: "应用", kind: "integer", prompt: "案例改用 ≥ 后，A 位于第几个位置？", answer: 3,
      explanation: "B 等级小，排第一。C 越过同级 A，排第二。A 位于第三。", wrong: "把同级右移也记下来。", review: "trace" },
    { id: "deep-stability-proof", level: "挑战", kind: "multiple", prompt: "要检验或使用稳定性，哪些做法合理？",
      options: ["用不同编号区分同键记录", "只看排序后的等级序列", "先排次键，再稳定排主键", "检查插入时是否跨过同键"],
      answer: [0, 2, 3], explanation: "同键记录须可辨认。主键相同的记录靠稳定性保留次键次序。", wrong: "找出输出中无法只看键值的变化。", review: "reason" },
  ],
  recap: ["稳定性关注同键先后。", "严格大于才移动前项。", "次键可先于主键排序。"],
  extension: "把三条等级都调成相同。再用归并的同键规则复核。",
  next: "stable-merge-sort",
  sources: [{ title: "NIST · Stable", href: "https://xlinux.nist.gov/dads/HTML/stable.html" }],
};
