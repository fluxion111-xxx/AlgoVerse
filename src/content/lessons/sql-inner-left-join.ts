import type { DeepLesson } from "./types";

export const sqlJoinLesson: DeepLesson = {
  title: "内连接与左外连接",
  intro: "报表要列出所有客户，也要附上符合金额要求的订单。没有订单的客户该留几行？",
  goals: ["按连接条件逐行找配对。", "预测左外连接的补空行。", "区分连接条件和结果过滤。"],
  blocks: [
    { id: "semantics", kind: "explain", title: "先数匹配对，再想补空", paragraphs: [
      "内连接保留 ON 条件为真的配对。左行命中几条右行，就产生几条结果。它不会替你去重。",
      "左外连接会保留这些匹配对。找不到匹配的左行，还会产生一行。右侧各列填 NULL。",
      "逻辑上可以逐行配对。数据库也可用哈希连接等实现。选用哪种算法不改变结果。",
    ] },
    { id: "walk", kind: "steps", title: "逐个客户算结果", steps: [
      { label: "给出原表", text: "有客户 1、2、3。客户 1 有 40 和 80 元两单。客户 2 有一张 60 元订单。客户 3 没有订单。" },
      { label: "先只匹配客户编号", text: "内连接得三行。客户 1 占两行。左连接还给客户 3 补一条 NULL 行，共四行。" },
      { label: "在 ON 加门槛", text: "只接受至少 70 元的订单。客户 1 命中 80。客户 2、3 都无匹配。左连接仍得三行。" },
      { label: "把门槛移到 WHERE", text: "先用编号左连接，再过滤金额。客户 2 的 60 被丢弃。客户 3 的 NULL 比较结果是未知，也被丢弃。只剩客户 1。" },
    ] },
    { id: "query", kind: "code", title: "让缺订单的客户仍入表", language: "SQL",
      source: "WITH customers(id) AS (VALUES (1), (2), (3)),\n     orders(customer_id, amount) AS (VALUES (1, 40), (1, 80), (2, 60))\nSELECT c.id, o.amount\nFROM customers AS c\nLEFT JOIN orders AS o\n  ON o.customer_id = c.id AND o.amount >= 70\nORDER BY c.id, o.amount;",
      notes: [{ lines: "1–2", text: "构造两张本地示例表。" }, { lines: "3–4", text: "输出客户编号和订单金额。" },
        { lines: "5–6", text: "只匹配同编号的足额订单。找不到匹配的左行仍保留。" }, { lines: "7", text: "固定展示顺序。得到 (1,80)、(2,NULL)、(3,NULL)。" }] },
    { id: "boundary", kind: "explain", title: "核对报表里的三个数", paragraphs: [
      "连接结果行数、客户数和订单数各有含义。客户可能出现多行。COUNT(*) 会把补空行也数进去。",
      "按客户分组后，可用 COUNT(o.order_id) 数匹配订单。前提是订单键本身非空。这样能把没命中的客户计为零。",
      "测试报表时，至少留一个无右行的客户、一个有多条匹配的客户，以及一个订单全被门槛排除的客户。",
    ] },
  ],
  demo: "sql-join",
  exercises: [
    { id: "deep-join-duplicates", level: "基础", kind: "single", prompt: "客户有两笔合格订单。内连接输出几行？", options: ["零行", "一行", "两行"], answer: 2,
      explanation: "每个匹配对各出一行。", wrong: "按订单逐个配对。", review: "semantics" },
    { id: "deep-join-count", level: "应用", kind: "integer", prompt: "金额门槛 70 放在 ON。左连接输出几行？", answer: 3,
      explanation: "一条匹配，两条补空。", wrong: "对每个左行应用补空规则。", review: "walk" },
    { id: "deep-join-checks", level: "挑战", kind: "multiple", prompt: "哪些检查能区分两种写法？", options: ["检查无订单的客户", "只测每人一张合格订单", "检查订单全低于门槛的客户", "检查补空行是否留下"], answer: [0, 2, 3],
      explanation: "关键是找出没有合格匹配的左行。两种写法在这时产生不同结果。",
      wrong: "只测成功配对时，差异不会出现。", review: "walk" },
  ],
  recap: ["每个匹配对都出一行。", "左连接给失配客户补空。", "过滤位置会改变结果。"],
  extension: "切换连接类型，并提高金额门槛。再系统比较 ON 与 WHERE。",
  next: "outer-join-on-where-predicate",
  sources: [{ title: "PostgreSQL · Table Expressions", href: "https://www.postgresql.org/docs/current/queries-table-expressions.html" }],
};
