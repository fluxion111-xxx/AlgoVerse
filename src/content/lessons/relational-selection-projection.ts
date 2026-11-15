import type { DeepLesson } from "./types";

export const selectionProjectionLesson: DeepLesson = {
  title: "关系代数的选择与投影",
  intro: "教务需要列出达标的课程。成绩表里有学生、课程与分数。怎么筛选，并只交出需要的列？",
  goals: ["分别用选择筛行、用投影取列。", "手算两个操作的中间结果。", "区分集合与 SQL 的重复行。"],
  blocks: [
    { id: "rules", kind: "explain", title: "先区分行与列", paragraphs: [
      "关系包含一组元组。每个元组就是一行。属性可以看成列名。选择按条件保留行，属性集合保持原样。",
      "投影只保留指定属性。经典关系代数以集合为结果。若多行投出同一元组，集合只保留一份。",
      "SQL 的 SELECT 对应取列。WHERE 负责筛行。SQL 通常会保留重复结果，需要 DISTINCT 才去重。",
    ], formula: "选择：σ_{分数 ≥ 70}(成绩)\n再投影：π_{课程}(σ_{分数 ≥ 70}(成绩))" },
    { id: "trace", kind: "steps", title: "把成绩表算一遍", steps: [
      { label: "列出输入", text: "四行课程依次是 OS、OS、DB、DB。分数是 88、76、91、60。目标是列出至少 70 分的课程。" },
      { label: "先按分数筛选", text: "前三行满足分数门槛。第四行排除。中间结果仍有学生、课程和分数。" },
      { label: "只取课程列", text: "得到 OS、OS、DB。保留普通 SQL 的重复行时，共有 3 行。" },
      { label: "改成集合结果", text: "去重后只剩 OS 与 DB。调整最低分为 80，原本就只剩两行。此时加 DISTINCT 不改变结果行数。" },
    ] },
    { id: "query", kind: "code", title: "用 SQL 复现结果", language: "SQL",
      source: "WITH grades(student, course, score) AS (\n  VALUES ('A', 'OS', 88), ('B', 'OS', 76),\n         ('C', 'DB', 91), ('D', 'DB', 60)\n)\nSELECT DISTINCT course\nFROM grades\nWHERE score >= 70\nORDER BY course;",
      notes: [{ lines: "1–4", text: "构建四行自包含的成绩表。" }, { lines: "6–7", text: "从表取行，只保留达标元组。" },
        { lines: "5", text: "只输出 course，再消去重复元组。" }, { lines: "8", text: "指定展示顺序，得到 DB、OS。" }] },
    { id: "boundary", kind: "explain", title: "何时能提前投影", paragraphs: [
      "把不需要的列提早丢掉，可以减小中间数据。若后面的过滤用到 score，就要先保留该列。",
      "先只取 course 再用 score 过滤，在关系代数里就失去条件所需的属性。优化需要满足等价条件。",
      "DISTINCT 对输出列的组合去重。若输出 student 与 course，同课程的不同学生仍是不同结果行。",
      "本演示计算固定表上的筛选与去重。它不解析输入的 SQL。空值和排序规则另见相关章节。",
    ] },
  ],
  demo: "relation-project",
  exercises: [
    { id: "deep-relations-op", level: "基础", kind: "single", prompt: "按分数筛行，对应哪个运算？", options: ["选择", "投影", "连接"], answer: 0,
      explanation: "选择按条件留下行。投影负责留下需要的属性。", wrong: "先看输入减少的是行还是列。", review: "rules" },
    { id: "deep-relations-rows", level: "应用", kind: "integer", prompt: "门槛为 70。普通 SQL 只输出课程。未写 DISTINCT。结果有几行？", answer: 3,
      explanation: "88、76、91 都合格。两条 OS 仍都保留，共三行。", wrong: "题中没有要求去重。", review: "trace" },
    { id: "deep-relations-project", level: "挑战", kind: "multiple", prompt: "分析本例的 SQL。哪些说法成立？", options: ["DISTINCT course 可得到两行", "WHERE 按分数筛行", "没写 ORDER BY 也保证按课程排序", "提前删掉 score 会丢失过滤所需列"], answer: [0, 1, 3],
      explanation: "去重后保留 OS 与 DB。保证输出顺序须明确排序。分数仍是过滤条件。",
      wrong: "分别检查筛行、去重和排序。", review: "boundary" },
  ],
  recap: ["选择保留符合条件的行。", "投影保留指定的列。", "按需求决定是否去重。"],
  extension: "让门槛刚好等于 76。比较两种输出。下一节再合并两张表。",
  next: "sql-inner-left-join",
  sources: [{ title: "PostgreSQL · Select Lists", href: "https://www.postgresql.org/docs/current/queries-select-lists.html" }],
};
