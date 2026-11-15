import type { DeepLesson } from "./types";

export const outerJoinPredicateLesson: DeepLesson = {
  title: "外连接的 ON 与 WHERE",
  intro: "会费报表要列出所有会员。右侧只放已付款记录。有人没缴费。有人缴了两次。怎么写才不漏人？",
  goals: ["逐阶段判断哪一行会保留。", "解释空主键补救的漏洞。", "为查询准备能抓错的样本。"],
  blocks: [
    { id: "phases", kind: "explain", title: "把筛选写到正确阶段", paragraphs: [
      "ON 定义左右哪些行算匹配。只接受条件为 TRUE 的配对。FALSE 和 UNKNOWN 都不会匹配。",
      "左连接按 ON 找不到匹配时补一行。补空行的右侧字段全为 NULL。若已有匹配对，就不补空。",
      "WHERE 在连接结果上再筛一遍。它只留下 TRUE。比较 NULL 与字符串得到 UNKNOWN。行在这一步丢掉后，不会再补空。",
      "这是查询的逻辑顺序。优化器可以改执行计划。输出仍需维持原语义。",
    ], formula: "按 ON 配对 → 为失配左行补 NULL → 按 WHERE 筛结果" },
    { id: "report", kind: "steps", title: "跟着五位会员走一遍", steps: [
      { label: "列出真实缴费行", text: "1 号有已付与待付各一笔。2 号只有待付。3 号没有缴费行。4 号有一笔，状态未知。5 号已付两笔。" },
      { label: "把状态条件写进 ON", text: "按会员号及已付状态匹配。1 号出一行，5 号出两行。2、3、4 号各补一行。总计六行，五位会员都在。" },
      { label: "把相同条件挪到 WHERE", text: "先按会员号匹配。只有 3 号补空。再筛已付。2 号的待付为 FALSE。3、4 号的 NULL 比较为 UNKNOWN。最后只剩三行。" },
      { label: "试着加 OR p.id IS NULL", text: "3 号没有右侧主键，可以回到结果。2、4 号都有真实缴费行。右侧主键有值。两人的行仍会丢掉。查询留下四行。" },
    ] },
    { id: "query", kind: "code", title: "并排运行三种写法", language: "SQL",
      source: `WITH members(id) AS (VALUES (1), (2), (3), (4), (5)),
     payments(id, member, status) AS (
       VALUES (101, 1, 'paid'), (102, 1, 'pending'), (201, 2, 'pending'),
              (401, 4, NULL), (501, 5, 'paid'), (502, 5, 'paid')
     )
SELECT 'A_ON' AS variant, m.id AS member, p.id AS payment
FROM members AS m LEFT JOIN payments AS p
  ON p.member = m.id AND p.status = 'paid'
UNION ALL
SELECT 'B_WHERE', m.id, p.id
FROM members AS m LEFT JOIN payments AS p ON p.member = m.id
WHERE p.status = 'paid'
UNION ALL
SELECT 'C_OR_NULL', m.id, p.id
FROM members AS m LEFT JOIN payments AS p ON p.member = m.id
WHERE p.status = 'paid' OR p.id IS NULL
ORDER BY variant, member, payment;`,
      notes: [{ lines: "1–5", text: "造五位会员与六条缴费行。" },
        { lines: "6–8", text: "限制右行匹配。保留五位会员。" },
        { lines: "9–12", text: "先连再筛。只剩有已付的两位。" },
        { lines: "13–17", text: "只补救本来就没有右行的 3 号。三种写法用 UNION ALL 并排看。" }] },
    { id: "tests", kind: "explain", title: "准备能暴露漏行的测试", paragraphs: [
      "用非空主键识别补空行。状态本身可能就为 NULL。查状态为空，会同时匹配未知状态的真实缴费行。",
      "要筛会员是否活跃，可在 WHERE 写会员侧条件。若仅写入 ON，左连接仍会保留不活跃会员，并给右侧补空。",
      "至少测试无缴费、只有待付、状态未知、已付两次这四类。既核对会员集合，也核对每人的行数。",
      "汇总缴费笔数时，用 COUNT(p.id)。补空行的 p.id 为 NULL。它不会增加缴费笔数。",
    ] },
  ],
  demo: "outer-join-predicate",
  exercises: [
    { id: "deep-outer-predicate-truth", level: "基础", kind: "single", prompt: "WHERE 保留哪种条件结果？",
      options: ["只有 TRUE", "TRUE 和 UNKNOWN", "只有 UNKNOWN"], answer: 0,
      explanation: "WHERE 只纳入真值为 TRUE 的行。NULL 比较通常得到 UNKNOWN。", wrong: "先写出三种可能的真值。", review: "phases" },
    { id: "deep-outer-predicate-count", level: "应用", kind: "integer", prompt: "在 ON 筛已付款。最终有几行？", answer: 6,
      explanation: "已付匹配三行。2、3、4 号各补一行。合计六行。", wrong: "别漏数 5 号的第二笔已付。", review: "report" },
    { id: "deep-outer-predicate-or", level: "挑战", kind: "multiple", prompt: "在 WHERE 加 OR p.id IS NULL。哪些判断成立？",
      options: ["有 3 号这一行", "有 2 号这一行", "没有 4 号", "5 号仍有两行"], answer: [0, 2, 3],
      explanation: "3 号补空，右主键为空。2、4 号匹配过真实右行，右主键非空。5 号两笔都已付。",
      wrong: "先标出连接阶段是否有真实右行。", review: "report" },
  ],
  recap: ["ON 决定哪些右行匹配。", "补空在 WHERE 之前。", "用非空主键识别补空行。"],
  extension: "再改成筛待付。比较会员集合。接着学连接后如何避免重复计数。",
  next: "aggregate-distinct-fanout",
  sources: [{ title: "PostgreSQL · Table Expressions", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN" }],
};
