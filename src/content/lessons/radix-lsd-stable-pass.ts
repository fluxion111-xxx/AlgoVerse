import type { DeepLesson } from "./types";

export const radixLsdLesson: DeepLesson = {
  title: "低位优先基数排序",
  intro: "四条记录的编号是 21、13、12、11。每轮只看一位。先看哪一位，怎样保留前一轮的次序？",
  goals: ["跟踪个位和十位两轮。", "证明每轮保留的顺序。", "估算位数和值域的成本。"],
  blocks: [
    { id: "invariant", kind: "explain", title: "把低位当成已排好的次序", paragraphs: [
      "从最低有效位开始。每轮按照当前位分桶。桶按编号从小到大收回。桶内保留进入的顺序。",
      "归纳目标是前 k 轮之后，记录按最低 k 位的组合排序。第一轮只有个位，直接成立。",
      "下一轮若两条记录的当前位不同，桶号决定先后。若当前位相同，稳定收桶保留上轮低位顺序。于是有序范围多了一位。",
      "最后一轮覆盖所有有效位。记录键相同的情况，也能靠每一轮的稳定性保留原先次序。",
    ], formula: "第 i 位 = ⌊key / bⁱ⌋ mod b\n稳定计数分桶时，总时间 Θ(d(n+b))" },
    { id: "trace", kind: "steps", title: "逐位排 21、13、12、11", steps: [
      { label: "发到个位桶", text: "桶 1 收到 21、11。桶 2 收到 12。桶 3 收到 13。顺序收桶，得到 21、11、12、13。" },
      { label: "发到十位桶", text: "桶 1 按上一轮顺序收到 11、12、13。桶 2 收到 21。收桶得到 11、12、13、21。" },
      { label: "故意反转一个桶", text: "把十位的每个桶都倒序收回。桶号依然递增，但桶 1 变成 13、12、11。先前排好的个位顺序丢了。" },
      { label: "检查有重复的键", text: "把两个编号调成一样。稳定模式会保持原标签顺序。键值看起来一样时，标签能揭示不稳定的错误。" },
    ] },
    { id: "code", kind: "code", title: "用桶做两轮稳定收集", language: "Python",
      source: `def radix_sort(records, digits):
    output = list(records)
    divisor = 1
    for _ in range(digits):
        buckets = [[] for _ in range(10)]
        for key, name in output:
            digit = (key // divisor) % 10
            buckets[digit].append((key, name))
        output = [item for bucket in buckets for item in bucket]
        divisor *= 10
    return output

print(radix_sort([(21, "A"), (13, "B"), (12, "C"), (11, "D")], 2))`,
      notes: [{ lines: "2–5", text: "复制记录。每轮新建十个桶。" }, { lines: "6–9", text: "顺着读，顺着写。同桶不反转。" },
        { lines: "10–13", text: "移到下一位。调用时给足位数，结果从 D 到 A。" }] },
    { id: "limits", kind: "explain", title: "位数和桶数都要算成本", paragraphs: [
      "本例是非负整数。短键前面补零即可。处理负数时，需要先定义保序编码或分开处理符号。",
      "每轮初始化 b 个桶并扫描 n 条记录。空间可复用，为 Θ(n+b)。b 变大可减少轮数，但会扩大桶表。",
      "若少做一轮，将只得到按低位组合的顺序。若少数键特别长，按最大位数重复扫描也会增加成本。",
    ] },
  ],
  demo: "radix-stable-passes",
  exercises: [
    { id: "deep-radix-order", level: "基础", kind: "single", prompt: "低位优先的第一轮先看哪一位？", options: ["最高位", "最低位", "随便选"], answer: 1,
      explanation: "先排低位，再让较高位的稳定排序保留同桶的低位顺序。", wrong: "看算法名称里的低位。", review: "invariant" },
    { id: "deep-radix-third", level: "应用", kind: "integer", prompt: "案例稳定排序后，第三个键是多少？", answer: 13,
      explanation: "两轮后依次为 11、12、13、21。", wrong: "按十位收桶后再数位置。", review: "trace" },
    { id: "deep-radix-cost", level: "挑战", kind: "multiple", prompt: "哪些做法有依据？", options: ["短键补前导零", "十位桶倒序仍能保证有序", "相同高位保留低位顺序", "成本同时依赖轮数和桶数"],
      answer: [0, 2, 3], explanation: "前导零统一位宽。每轮稳定才能维持归纳条件。每轮还要初始化桶。", wrong: "分别看桶间和桶内顺序。", review: "limits" },
  ],
  recap: ["从低位到高位。", "桶内顺序必须保留。", "位数决定扫描轮数。"],
  extension: "把十位桶改为反转。再让两个键相同，通过标签检验稳定性。",
  next: "sorting-stability-records",
  sources: [{ title: "MIT 6.006 · Linear Sorting", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/78a3c3444de1ff837f81e52991c24a86_MIT6_006S20_lec5.pdf" }],
};
