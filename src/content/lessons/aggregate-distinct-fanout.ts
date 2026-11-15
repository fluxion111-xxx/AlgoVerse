import type { DeepLesson } from "./types";

export const aggregateFanoutLesson: DeepLesson = {
  title: "一对多连接造成的重复计数",
  intro: "一个客户付了两笔 30 元。还有三张工单。连接后，报表为什么显示收了 180 元？",
  goals: ["写出指标所在的数据粒度。", "算出两个明细表的行数乘积。", "用预聚合避免重复加总。"],
  blocks: [
    { id: "grain", kind: "explain", title: "先问一行代表什么", paragraphs: [
      "付款表每行是一笔付款。工单表每行是一张工单。报表要求每个客户一行。",
      "若两张明细都只按客户号连接，同一客户的每笔付款都配上他的每张工单。连接结果每行变成一个付款与工单的组合。",
      "当某侧为空时，左连接给它保留一个空位置。两边都有行时，结果是行数的乘积。",
    ], formula: "每个客户的连接行数 = max(1, 付款笔数) × max(1, 工单笔数)" },
    { id: "trace", kind: "steps", title: "逐行拆开 180 元", steps: [
      { label: "列出付款和工单", text: "付款 P1、P2 各 30 元。工单 T1、T2、T3 均属于同一客户。实际收款是 60 元。" },
      { label: "直接连接两张明细", text: "P1 配三行，P2 又配三行。共六行。COUNT(p.id) 变成 6，SUM(p.amount) 变成 180。" },
      { label: "分别看两个 DISTINCT", text: "按付款 ID 去重能数回 2 笔。按金额去重却把 P1 和 P2 一起合并，只加出 30 元。" },
      { label: "各表先按客户汇总", text: "付款小计得到 2 笔和 60 元。工单小计得到 3 张。随后连接两份小计，每份对同一客户最多给一行。" },
    ] },
    { id: "query", kind: "code", title: "从明细走到客户小计", language: "SQL",
      source: `WITH customers(id) AS (VALUES (1), (2)),
     payments(id, customer, amount) AS (VALUES (1, 1, 30), (2, 1, 30)),
     tickets(id, customer) AS (VALUES (1, 1), (2, 1), (3, 1)),
     pay AS (
       SELECT customer, COUNT(*) AS paid, SUM(amount) AS total
       FROM payments GROUP BY customer
     ),
     help AS (
       SELECT customer, COUNT(*) AS opened FROM tickets GROUP BY customer
     )
SELECT c.id, COALESCE(p.paid, 0) AS payments,
       COALESCE(p.total, 0) AS total, COALESCE(h.opened, 0) AS tickets
FROM customers c
LEFT JOIN pay p ON p.customer = c.id
LEFT JOIN help h ON h.customer = c.id
ORDER BY c.id;`,
      notes: [{ lines: "1–3", text: "第二个客户没有明细，用来检验空集合。" },
        { lines: "4–10", text: "分别按客户汇总，每个小计最多占一行。" },
        { lines: "11–16", text: "保留所有客户。没小计时补零。两行结果为 (1,2,60,3) 与 (2,0,0,0)。" }] },
    { id: "limits", kind: "explain", title: "对齐筛选与汇报粒度", paragraphs: [
      "若只算已付和当月工单，分别在小计里筛。若指标要按客户和月份展示，就用客户加月份一起分组和连接。",
      "若付款要归属某张工单，指标需要明确的关联键。只按客户号预聚合，不能回答那张工单收了多少钱。",
      "付款金额若允许未知，NULL 还有业务含义。本例金额明确。COALESCE 只把没有小计的情况视作零。",
    ] },
  ],
  demo: "join-aggregate-fanout",
  exercises: [
    { id: "deep-fanout-count", level: "基础", kind: "single", prompt: "直接连接后，一行代表什么？",
      options: ["一笔付款和一张工单的配对", "一位客户", "一笔独立付款"], answer: 0,
      explanation: "两表都按客户匹配。同一笔付款会与多张工单配对。", wrong: "观察左右明细来自哪一行。", review: "grain" },
    { id: "deep-fanout-sum", level: "应用", kind: "integer", prompt: "用本例明细直接 SUM，金额会变为多少？",
      answer: 180, explanation: "两笔付款各出现三次，6 行各记 30 元。", wrong: "先数连接后每笔出现几次。", review: "trace" },
    { id: "deep-fanout-grain", level: "挑战", kind: "multiple", prompt: "要写客户小计。哪些判断成立？",
      options: ["用付款 ID 去重可还原笔数", "金额相同就当成同一笔付款", "预聚合的键要和报表粒度对齐", "空明细也可保留客户行"], answer: [0, 2, 3],
      explanation: "实体身份由 ID 确定。预聚合后用左连接，可保留缺少明细的客户。",
      wrong: "分开看笔数、总额和是否保留客户。", review: "limits" },
  ],
  recap: ["连接会改变行的含义。", "先按指标粒度汇总。", "同价付款仍是两笔。"],
  extension: "把工单改为零。观察左连接怎样保留付款。再学如何按汇总值筛组。",
  next: "sql-having-group-filter",
  sources: [
    { title: "PostgreSQL · Joined Tables", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN" },
    { title: "PostgreSQL · Aggregate Functions", href: "https://www.postgresql.org/docs/current/functions-aggregate.html" },
  ],
};
