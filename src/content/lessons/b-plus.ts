import type { DeepLesson } from "./types";

export const indexLesson: DeepLesson = {
  title: "B+ 树索引",
  intro: "订单表有很多行。现在只要编号 8 到 17 的订单。怎么尽快找到第一行，又不漏掉后面的编号？",
  goals: ["说清分支和叶节点的职责。", "跟踪一次闭区间查询。", "区分模型记录和真实执行计划。"],
  blocks: [
    { id: "structure", kind: "explain", title: "像查目录一样找键", paragraphs: [
      "键是我们用来定位的有序值。分支节点存分隔键和指向子节点的指针。实验里的完整键集合存在叶节点中。",
      "查找时用分隔键决定往哪里走。在本模型中，等于分隔键时进入右侧子树。找到起始叶以后，利用叶节点间的链接按序到下一叶。",
      "各叶处在同一深度。插入挤满节点时，分裂会改变父节点的分隔键。根满时还会产生新根。也正因为维护要写数据，增加索引有写入成本。",
    ] },
    { id: "range", kind: "steps", title: "用区间找一轮", steps: [
      { label: "先找下界", text: "查询 [8, 17] 时，按分隔键从根走向可能含有 8 的叶。即使没有键 8，也能继续找较大的第一个键。" },
      { label: "沿叶链读", text: "示例键按序是 5、6、7、10、12、17、20、30。略过小于 8 的键。收下 10、12、17。" },
      { label: "遇到更大的键就停", text: "20 超过上界。叶链后续只会更大。上下界都算在区间内，上下界相等就是点查。" },
    ] },
    { id: "sql", kind: "code", title: "把区间写进 SQL", language: "SQL",
      source: "CREATE INDEX orders_order_no_idx ON orders (order_no);\nSELECT order_no\nFROM orders\nWHERE order_no BETWEEN 8 AND 17\nORDER BY order_no;",
      notes: [
        { lines: "1", text: "为 order_no 创建索引。安装索引本身也有成本。" },
        { lines: "2–3", text: "只取订单号。示例假设表中已有订单。" },
        { lines: "4", text: "BETWEEN 包含两端。若有键 17，就必须返回。" },
        { lines: "5", text: "要求按订单号输出。索引存在也不保证优化器一定选它。" },
      ] },
    { id: "limits", kind: "explain", title: "模型能说明什么", paragraphs: [
      "观察访问节点数、分裂次数和命中键。范围变宽时，可能要读更多叶。改变节点容量，树高和分裂次数也可能改变。",
      "教学模型使用唯一键，支持插入和查询。数据库还需处理页、缓存、并发和返回行的成本。要判断真实执行方式，应检查数据库的执行计划。",
    ] },
  ],
  demo: "index",
  exercises: [
    { id: "deep-inclusive-range", level: "基础", kind: "multiple", prompt: "查询 8 到 17，应返回哪些示例键？",
      options: ["7", "10", "12", "17", "20"], answer: [1, 2, 3], explanation: "三个键在闭区间内。17 等于上界，也应返回。", wrong: "BETWEEN 包含左右边界。", review: "range" },
    { id: "deep-point-lookup", level: "应用", kind: "integer", prompt: "在同一组唯一键上查询 [12, 12]，命中几个？",
      answer: 1, explanation: "上下界相等，只寻找键 12。示例里有且只有一个。", wrong: "区间宽度为零时，仍可命中端点。", review: "range" },
    { id: "deep-plan-choice", level: "挑战", kind: "boolean", prompt: "建了索引，数据库每次都会用它吗？", options: ["一定会", "不一定"],
      answer: 1, explanation: "优化器会评估候选方案的成本。小表或命中特别多时，顺序扫描也可能更便宜。", wrong: "区分可用的索引和最终选择的执行计划。", review: "limits" },
  ],
  recap: ["分支负责定位。", "叶链便于范围扫描。", "用执行计划核对数据库行为。"],
  extension: "下一节看看数据库如何组合扫描与连接。",
  next: "query-plans",
  sources: [{ title: "UC Berkeley CS186 · B+ Trees", href: "https://cs186berkeley.net/notes/note4/" }],
};
