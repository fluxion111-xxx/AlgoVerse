import type { DeepLesson } from "./types";

export const rollupSubtotalsLesson: DeepLesson = {
  title: "ROLLUP 的分组小计",
  intro: "金额表里有条产品为 NULL 的明细。地区小计也显示 NULL。怎样可靠地给这两行起名？",
  goals: ["把 ROLLUP 展开成分组集合。", "用 GROUPING 区分空值来源。", "计算地区小计和总计。"],
  blocks: [
    { id: "levels", kind: "explain", title: "从右往左收起分组键", paragraphs: [
      "ROLLUP(地区, 产品) 对分组键的各个前缀求和。先按地区和产品，再仅按地区，最后不保留任何分组键。",
      "每个分组集都从原始行计算。结果放在同一份表里。地区小计和总计不能再与明细一起累加。",
      "某个分组集没包含一列时，该列显示 NULL。GROUPING 为它标记 1。若这一列在集合内，即使值是 NULL，标记仍为 0。",
    ], formula: "ROLLUP(地区, 产品) = GROUPING SETS ((地区, 产品), (地区), ())" },
    { id: "trace", kind: "steps", title: "把三笔金额放进六行", steps: [
      { label: "按原值分组", text: "北区 A 为 10，北区未知产品为 20，南区 A 为 30。两个分组键均保留。三行的标记都是 0、0。" },
      { label: "收起产品键", text: "北区合计 10+20=30，南区合计 30。产品列都显示 NULL，产品标记都为 1。地区标记仍为 0。" },
      { label: "再收起地区键", text: "总计 60。两列都显示 NULL，两个标记都是 1。这一行代表全部输入。" },
      { label: "比对两个北区 NULL", text: "未知产品那行的金额为 20，产品标记为 0。北区小计为 30，产品标记为 1。可据此分别命名。" },
    ] },
    { id: "query", kind: "code", title: "显示两列独立标记", language: "SQL",
      source: `WITH sales(region, product, amount) AS (
  VALUES ('North', 'A', 10), ('North', NULL, 20), ('South', 'A', 30)
)
SELECT region, product,
       GROUPING(region) AS region_rolled,
       GROUPING(product) AS product_rolled,
       SUM(amount) AS total
FROM sales
GROUP BY ROLLUP (region, product)
ORDER BY region_rolled, product_rolled, region, product;`,
      notes: [{ lines: "1–3", text: "保留一条真正为空的产品明细。" },
        { lines: "4–9", text: "在 PostgreSQL 中生成三层结果。单列标记指示该列是否参与分组。" },
        { lines: "10", text: "排序展示明细、小计和总计。不要依赖引擎自然顺序。" }] },
    { id: "pitfalls", kind: "explain", title: "改变顺序就改变小计", paragraphs: [
      "调换参数顺序后，第二层变成产品小计。若两种小计都要，需列出分组集合或按任务使用 CUBE。",
      "单靠 COALESCE(product, '小计') 会把来源不明的产品也改成小计。先看标记，再处理原始空值。",
      "本面板只演示固定输入的分组结果。对照明细和总计时，选定一种粒度即可。",
    ] },
  ],
  demo: "rollup-group-levels",
  exercises: [
    { id: "deep-rollup-grouping", level: "基础", kind: "single", prompt: "产品标记为 1，说明什么？", options: ["该层收起了产品键", "输入产品必定为空", "产品金额为 1"],
      answer: 0, explanation: "GROUPING 标记分组集合是否包含该列，与输入值是否为空无关。", wrong: "查看这一层保留的键。", review: "levels" },
    { id: "deep-rollup-subtotal", level: "应用", kind: "integer", prompt: "本例北区的小计是多少？", answer: 30,
      explanation: "北区 A 的 10 和未知产品的 20 都计入地区小计。", wrong: "不要把产品 NULL 的明细丢掉。", review: "trace" },
    { id: "deep-rollup-boundaries", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["换键顺序可能换小计层", "产品值为空必是小计", "总计行两列标记都为 1", "不同层的金额不能再一起求总额"],
      answer: [0, 2, 3], explanation: "小计由前缀决定。真空值要与分组占位区分。汇总层重复覆盖输入。", wrong: "找出每一层实际包含的输入。", review: "pitfalls" },
  ],
  recap: ["ROLLUP 汇总键的前缀。", "标记识别小计占位。", "汇总层要分开读。"],
  extension: "把汇总方式切到明细。再改北区未知产品金额，对照小计和总计的变化。",
  next: "olap-ratio-of-sums",
  sources: [{ title: "PostgreSQL · GROUPING SETS, CUBE, and ROLLUP", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUPING-SETS" }],
};
