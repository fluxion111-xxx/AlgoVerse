import type { DeepLesson } from "./types";

export const asymptoticLesson: DeepLesson = {
  title: "渐近上界与紧确界",
  intro: "两份程序都能处理一千项。若输入变成一百万项，谁更容易拖慢？先数关键操作，再看它随输入怎么涨。",
  goals: ["从循环写出操作次数。", "用常数和门槛证明上下界。", "区分宽松上界与紧确增长阶。"],
  blocks: [
    { id: "definitions", kind: "explain", title: "先分清三把尺", paragraphs: [
      "n 表示输入规模。f(n) 是你选择的计步规则得到的总成本。它可以数比较或读写。同一种对照要用同一把尺。",
      "g(n) 是参照曲线。以 n 为例，输入翻倍时，这条曲线也翻倍。我们允许用固定常数 C 抬高它，也允许跳过前 n₀−1 个输入规模。",
      "O 是上界。要找到 C > 0 和正整数 n₀，使不等式在每个 n ≥ n₀ 上都成立。Ω 是下界，只把不等号反过来。Θ 同时要求上下界成立。",
      "两个常数可以不同。若两个方向开始生效的门槛不同，取较大的门槛。C 和门槛一旦选定，就不能随 n 改变。",
    ], formula: "O(g): f(n) ≤ C·g(n)\nΩ(g): c·g(n) ≤ f(n)\nΘ(g): c·g(n) ≤ f(n) ≤ C·g(n)  (n ≥ n₀)" },
    { id: "proof", kind: "steps", title: "把 Θ(n) 写成证明", steps: [
      { label: "写出计步规则", text: "先做 7 次准备，再做两轮扫描。每轮每项记 1 步。因此总成本是 2n + 7。" },
      { label: "给出下界", text: "只要 n ≥ 1，就有 2n ≤ 2n + 7。可取 c = 2。" },
      { label: "给出上界", text: "当 n ≥ 7 时，常数 7 ≤ n。于是 2n + 7 ≤ 3n，可取 C = 3。" },
      { label: "合并区间", text: "两个不等式从 n = 7 起同时有效，得到 f(n) ∈ Θ(n)。取 C = 2 不行，因为始终差 7 步。" },
    ] },
    { id: "python", kind: "code", title: "逐行读一次扫描", language: "Python",
      source: "def count_work(n):\n    steps = 0\n    for _ in range(7):\n        steps += 1\n    for _ in range(2):\n        for _ in range(n):\n            steps += 1\n    return steps",
      notes: [
        { lines: "1–2", text: "传入规模 n，计数器从零开始。" },
        { lines: "3–4", text: "准备阶段固定加 7 次。" },
        { lines: "5–7", text: "外层两轮，内层每轮加 n 次。" },
        { lines: "8", text: "返回标记次数。循环控制等操作未计入。" },
      ],
    },
    { id: "worked", kind: "steps", title: "手算一次翻倍", steps: [
      { label: "从 8 项开始", text: "线性模型用 2×8+7 = 23 步。逐项做配对的模型用 8×8 = 64 步。" },
      { label: "扩大为 16 项", text: "线性模型变成 39 步。平方模型变成 256 步，正好是原来的 4 倍。" },
      { label: "解释差异", text: "线性成本的 7 步准备没有跟着翻倍。n 越大，这段常数占比越小。比较增长趋势时，也要记住小输入仍可能受常数影响。" },
    ] },
    { id: "mistakes", kind: "explain", title: "避开三个常见坑", paragraphs: [
      "O(n²) 可以描述线性函数的宽松上界。它没有说明线性函数会按平方增长。若要说明确切的数量级，需要同时证明下界。",
      "渐近界描述一条已选的成本函数。最坏、平均、最好要先定义输入范围或分布。O 这个符号本身没有选中最坏情况。",
      "很大的常数能抬高曲线，却不会改变它的增长阶。选出若干样本通过也不够。证明要覆盖门槛后的所有规模。",
    ] },
  ],
  demo: "growth",
  exercises: [
    { id: "deep-upper", kind: "boolean", level: "基础", prompt: "2n + 7 ∈ O(n²) 吗？", options: ["成立", "不成立"], answer: 0, explanation: "n ≥ 1 时，2n + 7 ≤ 9n ≤ 9n²。取 C = 9、n₀ = 1 即可。", wrong: "把 O 当成了紧确界。", review: "definitions" },
    { id: "deep-theta", kind: "multiple", level: "基础", prompt: "证明 f(n) ∈ Θ(n) 需要哪些条件？", options: ["找到线性上界", "找到线性下界", "让 C 随 n 增长", "只检查 n = 100"], answer: [0, 1], explanation: "需要同一尾段上成立的两条界。常数固定，且不等式覆盖每个足够大的 n。", wrong: "检查上界、下界和门槛的定义。", review: "definitions" },
    { id: "deep-count", kind: "code", level: "应用", prompt: "示例代码在 n = 8 时返回多少？", options: ["16", "23", "64"], answer: 1, explanation: "准备阶段加 7，两轮各加 8。总计 7 + 8 + 8 = 23。", wrong: "把准备阶段和扫描阶段分开计步。", review: "python" },
    { id: "deep-threshold", kind: "integer", level: "应用", prompt: "取 C = 3，最小门槛 n₀ 是多少？", answer: 7, explanation: "2n + 7 ≤ 3n 等价于 n ≥ 7。n = 7 时恰好相等。", wrong: "移项后别漏掉等号。", review: "proof" },
    { id: "deep-limit", kind: "multiple", level: "挑战", prompt: "哪些说法对所有正整数 n 或足够大的 n 成立？", options: ["可取 n₀ = 1，C = 2", "取 C = 4 时，最小门槛为 4", "f(n) ∈ Θ(n²)", "f(n) ∈ Ω(n)"], answer: [1, 3], explanation: "C = 4 时需要 n ≥ 7/2，所以首个整数是 4。2n 永远是一个下界。比值 f(n)/n² 趋于零，故平方下界不成立。", wrong: "先检查门槛的取整，再分别检验两条界。", review: "proof" },
    { id: "deep-order", kind: "text", level: "挑战", prompt: "填空：3n² + 10n ∈ Θ(____)。用 n^2 作答。", answer: ["n^2", "n²", "n**2"], explanation: "n ≥ 1 时，3n² ≤ 3n² + 10n ≤ 13n²。上下界同阶。", wrong: "用最高次项给下界，再把低次项包进上界。", review: "mistakes" },
  ],
  recap: ["先定规模和计步规则。", "O 只要求上界。", "Θ 要同阶的上下界。"],
  extension: "下节用决策树，数一数比较排序的下界。",
  next: "comparison-sort-decision-tree",
  sources: [{ title: "MIT 6.006 · 渐近记号", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/c6d8f06c6f11e3342633dec85498f551_MIT6_006S20_r01.pdf" }],
};
