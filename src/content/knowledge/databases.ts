import type { KnowledgeDomain } from "../../lib/knowledge";

export const databases = {
  id: "databases",
  title: "数据库原理",
  courses: [{
    id: "storage-and-query",
    title: "存储与查询",
    chapters: [{
      id: "index-structures",
      title: "索引结构",
      topics: [{
        id: "b-plus-index",
        title: "B+ 树索引",
        summary: "先沿树找起点，再沿叶子扫一段。",
        sections: [
          { title: "树里怎么走", paragraphs: ["内部节点用键指路。叶子按键排序。", "查范围时，先找到下界。再沿相邻叶子往后找。"] },
          { title: "插满会怎样", paragraphs: ["叶子装不下时就要分裂。父节点会多一个分隔键。", "实验支持点查和范围查。先查 10，再找 10 到 20。"] },
        ],
        sources: [{ title: "UC Berkeley CS 186 · B+ Trees", href: "https://cs186berkeley.net/notes/note4/" }],
        relatedTopicIds: ["binary-search", "query-plans"],
        experiments: [{ engineId: "b-plus-tree", label: "打开索引实验", prompt: "插一组键，比较点查和范围查。" }],
      }],
    }, {
      id: "query-execution",
      title: "查询执行",
      topics: [{
        id: "query-plans",
        title: "查询计划与扫描",
        summary: "同一条查询，也能换个走法。",
        sections: [
          { title: "计划写了什么", paragraphs: ["EXPLAIN 可以查看计划。它列出扫描等操作。", "顺序扫描逐块读表。索引扫描借索引缩小范围。"] },
          { title: "先看会取多少行", paragraphs: ["只找少量行时，索引可能省事。取大半张表时，情况会变。", "先看计划的估计行数。再用实际结果核对估算。"] },
        ],
        sources: [{ title: "PostgreSQL · Using EXPLAIN", href: "https://www.postgresql.org/docs/current/using-explain.html" }],
        relatedTopicIds: ["b-plus-index"],
        experiments: [],
      }],
    }],
  }, {
    id: "transaction-management",
    title: "事务管理",
    chapters: [{
      id: "transaction-boundaries",
      title: "事务边界",
      topics: [{
        id: "transactions",
        title: "事务的提交与回滚",
        summary: "把几项改动捆成一件事。",
        sections: [
          { title: "拿转账举例", paragraphs: ["账户 A 扣 10 元。账户 B 加 10 元。", "两步放进同一事务。全部完成，再一起提交。"] },
          { title: "失败了怎么办", paragraphs: ["加款失败，就回滚这笔事务。刚才的扣款也撤回。", "用 BEGIN 开启事务。用 COMMIT 提交。用 ROLLBACK 回滚。"] },
        ],
        sources: [{ title: "PostgreSQL · Transactions", href: "https://www.postgresql.org/docs/current/tutorial-transactions.html" }],
        experiments: [],
      }],
    }],
  }],
} satisfies KnowledgeDomain;
