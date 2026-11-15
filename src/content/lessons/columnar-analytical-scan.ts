import type { DeepLesson } from "./types";

export const columnarScanLesson: DeepLesson = {
  title: "列式存储的分析扫描",
  intro: "报表只按日期筛选，再合计金额。表里还有大段附注。一次全扫要读取多少无关数据？",
  goals: ["找出查询依赖的所有字段。", "估算行式全扫和列式投影的字节。", "解释估算成立的条件。"],
  blocks: [
    { id: "projection", kind: "explain", title: "用到的列包括过滤条件", paragraphs: [
      "行式布局把同一行的字段放在一起。列式布局把同一列的值聚在一起。",
      "查询仅读几列时，支持投影下推的列式扫描可跳过未用列。WHERE 里的列依然是查询依赖。",
      "本例按未压缩的固定宽度估算。暂不算缓存、页头、编码和跳过整块带来的影响。",
    ], formula: "行式全扫估算 = 行数 × 各字段总宽度\n列式投影估算 = 行数 × 所需字段总宽度" },
    { id: "trace", kind: "steps", title: "给千条付款记一笔字节账", steps: [
      { label: "列出字段宽度", text: "客户 ID 4 字节、日期 4 字节、金额 8 字节、附注 120 字节。整行是 136 字节。" },
      { label: "检查筛选与聚合", text: "合计金额要读金额列。按日期筛选还要读日期列。即使输出里没有日期，也占 4 字节。" },
      { label: "换算千行", text: "行式全扫为 136000 字节。列式只读两列，每行 12 字节，共 12000 字节。差 124000 字节。" },
      { label: "换成整行查询", text: "如果所有字段都要读，两种模型都算 136000 字节。单靠列式存放无法在这个案例省去字段。" },
    ] },
    { id: "query", kind: "code", title: "明确哪些字段参与查询", language: "SQL",
      source: `WITH payments(customer_id, day, amount, note) AS (
  VALUES (11, 1, 30, 'a'), (22, 1, 40, 'b'), (11, 2, 80, 'c')
)
SELECT SUM(amount) AS daily_amount
FROM payments
WHERE day = 1;`,
      notes: [{ lines: "1–3", text: "这三条是核对查询语义的小样本。" }, { lines: "4–6", text: "只依赖 day 和 amount。结果为 70。" }] },
    { id: "limits", kind: "explain", title: "字节少和耗时少要分开", paragraphs: [
      "过滤条件能用索引或块级统计跳过数据时，还会改变扫描行数。面板固定全扫，不计算这一步。",
      "实际文件可能压缩。同列的值容易具有相似结构，但压缩量取决于数据与编码。磁盘时间还受缓存和访问模式影响。",
      "确认系统是否真的只读所需字段，要看执行计划及读写指标。面板的字节数用于比较两种布局的理想开销。",
    ] },
  ],
  demo: "columnar-scan-budget",
  exercises: [
    { id: "deep-columnar-deps", level: "基础", kind: "single", prompt: "本例查询需要哪些字段？", options: ["日期和金额", "仅金额", "客户 ID 和附注"],
      answer: 0, explanation: "日期用于过滤，金额用于聚合。结果列不是全部依赖。", wrong: "查看 WHERE 和 SUM 两处。", review: "projection" },
    { id: "deep-columnar-budget", level: "应用", kind: "integer", prompt: "默认案例的列式投影读多少字节？", answer: 12000,
      explanation: "两列每行共 12 字节，千行就是 12000 字节。", wrong: "先加日期和金额的宽度。", review: "trace" },
    { id: "deep-columnar-scope", level: "挑战", kind: "multiple", prompt: "哪些判断有依据？",
      options: ["过滤用的列也要纳入预算", "估算字节可直接当耗时", "整行查询会读更多列", "真实开销受压缩和跳块影响"],
      answer: [0, 2, 3], explanation: "投影只省未用字段。实际耗时还要测量运行条件。", wrong: "区分字段、行数和运行环境。", review: "limits" },
  ],
  recap: ["投影先列查询依赖。", "过滤列也影响读取。", "理论字节需实测校验。"],
  extension: "调高附注宽度，观察两种查询。接着看数据页怎样进入缓冲池。",
  next: "buffer-pool-pages",
  sources: [{ title: "DuckDB · Parquet Projection Pushdown", href: "https://duckdb.org/docs/stable/data/parquet/overview" }],
};
