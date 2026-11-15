import type { DeepLesson } from "./types";

export const sqlHavingLesson: DeepLesson = {
  title: "WHERE 与 HAVING 的筛选时机",
  intro: "要找总额至少 100 的地区。只算已付且单笔过线的订单。两道门槛该放哪里？",
  goals: ["按逻辑顺序跟踪查询。", "区分行条件和组条件。", "检查组从何时消失。"],
  blocks: [
    { id: "phases", kind: "explain", title: "行先入组，组再过线", paragraphs: [
      "WHERE 在分组前检查每行。它决定哪些订单参与聚合。字段值和状态通常在此筛选。",
      "GROUP BY 把留下的行按地区归组。每组求一个总额。HAVING 再检查组总额是否过线。",
      "查询优化器可以改变物理执行顺序。逻辑规则仍决定哪些输入参与结果。不能在 WHERE 用同一层的组总额。",
    ], formula: "FROM → WHERE → GROUP BY / 聚合 → HAVING → SELECT" },
    { id: "trace", kind: "steps", title: "把六笔订单逐步筛掉", steps: [
      { label: "按状态区分原始订单", text: "东区已付 60、50，取消 30。西区已付 80、20，取消 200。先排除两张取消单。" },
      { label: "设单笔门槛为 50", text: "东区留下 60 和 50，西区留下 80。WHERE 共保留三笔。取消的 200 仍不能入组。" },
      { label: "让组总额过线", text: "东区总额 110，西区总额 80。HAVING 要求至少 100，只留东区。" },
      { label: "调低前一道门槛", text: "将单笔门槛降到 0，西区会多收 20。此时总额正好 100，也能通过。组门槛始终没变。" },
    ] },
    { id: "query", kind: "code", title: "写出两道独立条件", language: "SQL",
      source: `WITH orders(region, amount, status) AS (
  VALUES ('East',60,'paid'), ('East',50,'paid'), ('East',30,'cancelled'),
         ('West',80,'paid'), ('West',20,'paid'), ('West',200,'cancelled')
)
SELECT region, SUM(amount) AS total
FROM orders
WHERE status = 'paid' AND amount >= 50
GROUP BY region
HAVING SUM(amount) >= 100
ORDER BY region;`,
      notes: [{ lines: "1–4", text: "两区各三笔，含一笔取消。" }, { lines: "5–8", text: "先筛订单，再按地区求和。" },
        { lines: "9–10", text: "筛组总额。只返回 East、110。" }] },
    { id: "limits", kind: "explain", title: "空组与空值要分别看", paragraphs: [
      "若 WHERE 删光某地区的行，普通 GROUP BY 不会产出该地区。组总额门槛设零，也不会让它回来。",
      "若报表要求列全地区，可从地区表出发左连接小计。注意过滤位置，别把补空行再从结果中删掉。",
      "若金额可以为空，单笔比较结果未知。SUM 也会忽略 NULL。应按业务定义核对未知值如何处理。",
    ] },
  ],
  demo: "sql-row-group-filter",
  exercises: [
    { id: "deep-having-stage", level: "基础", kind: "single", prompt: "组总额的门槛放哪里？", options: ["HAVING", "WHERE", "ORDER BY"],
      answer: 0, explanation: "先分组才会产生组总额，HAVING 负责筛组。", wrong: "先定位总额产生的位置。", review: "phases" },
    { id: "deep-having-total", level: "应用", kind: "integer", prompt: "按默认参数，保留地区的总额是多少？", answer: 110,
      explanation: "东区的 60 和 50 都留下，总额 110，过了 100 的门槛。", wrong: "先筛已付状态和单笔金额。", review: "trace" },
    { id: "deep-having-empty", level: "挑战", kind: "multiple", prompt: "改变筛选时，哪些判断成立？",
      options: ["单笔门槛会改变组总额", "HAVING 能恢复 WHERE 删掉的地区", "金额 NULL 的比较可能未知", "组总额等于下限也能通过"],
      answer: [0, 2, 3], explanation: "行筛选改变聚合输入。没有输入就没有普通分组。大于等于包含边界。", wrong: "顺着查询阶段逐一判断。", review: "limits" },
  ],
  recap: ["WHERE 先筛输入行。", "HAVING 再筛聚合组。", "缺行地区需另设计保留。"],
  extension: "将单笔门槛升到 90，再把组门槛降到零。看看地区会不会重新出现。",
  next: "sql-rollup-subtotals",
  sources: [{ title: "PostgreSQL · GROUP BY and HAVING", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP" }],
};
