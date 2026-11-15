import type { DeepLesson } from "./types";

export const transactionConcurrencyLesson: DeepLesson = {
  title: "MVCC 与行版本",
  intro: "A 查到余额 10。B 把同一行改成 30 并提交。A 再查一次，应该读到几？",
  goals: ["预测同一行的两次读取。", "区分暂存值、可见版本和已提交值。", "跟踪一次写冲突的回滚。"],
  blocks: [
    { id: "visibility", kind: "explain", title: "看见哪个版本？", paragraphs: [
      "MVCC 是多版本并发控制。行更新后可以留下旧版本。读取按规则选择可见版本。",
      "读已提交模式每次查询看最新提交。课内快照固定在事务开始时。",
      "两种模式都能读到自己的暂存写入。其他事务要等到提交后才有机会读到。",
    ] },
    { id: "interleave", kind: "steps", title: "跟踪 A 和 B 的八步", steps: [
      { label: "A 开始并读行 0", text: "A 两种模式都读到 10。当前行版本是 v0。" },
      { label: "B 写 30 后提交", text: "B 写入时先暂存。提交后，行 0 变成 30，版本变成 v1。" },
      { label: "A 重读行 0", text: "读已提交模式看到 30。A 的快照仍停在 v0，读到 10。注意读到的值可与已提交表不同。" },
      { label: "A 写 40 并尝试提交", text: "每行的首次写入记下可见版本。读已提交模式记下 v1。它能提交 40。快照模式仍基于 v0。行已到 v1，A 冲突回滚。最终保留 30。" },
    ] },
    { id: "conflict", kind: "explain", title: "改动提交点再试一次", paragraphs: [
      "把 B commit 改为 B rollback。B 的写入没有发布。A 再读时，两种模式都看到 10。",
      "A 写入时记录的版本仍是 v0。提交检查通过。两种模式最后都得到 40。",
      "这是乐观版本检查模型。真实数据库可能等锁。也可能重试更新。各数据库的冲突规则有差异。",
      "写冲突检查针对同一行。两个事务可以各写一行。它们仍可能破坏跨行约束。那就是写偏斜的一种情形。",
    ] },
  ],
  demo: "transaction-concurrency",
  exercises: [
    { id: "deep-tx-own-write", level: "基础", kind: "single", prompt: "A 写入暂存值后，谁能立即读取 A 的新值？",
      options: ["A 自己", "B 自己", "A 和 B 都能"], answer: 0,
      explanation: "A 的读取优先看自己的暂存写入。B 只能按规则读到已提交版本。",
      wrong: "先看这次读取是谁发起的。", review: "visibility" },
    { id: "deep-tx-snapshot-read", level: "应用", kind: "integer", prompt: "默认案例第六步，A 用起始快照再读行 0。它读到几？",
      answer: 10, explanation: "A 开始时已保存 v0。第六步还没写自己的值，所以仍读到 10。",
      wrong: "已提交表是 30。再核对 A 的快照。", review: "interleave" },
    { id: "deep-tx-rollback", level: "挑战", kind: "multiple", prompt: "把默认案例的 B commit 改为 B rollback。哪些结果成立？",
      options: ["A 重读时两边都看到 10", "B 的 30 成为已提交值", "A 提交时两边都通过版本检查", "两边最终行 0 都是 40"], answer: [0, 2, 3],
      explanation: "B 回滚后，行 0 仍是 v0。A 在两边都基于 v0 写入，最后提交 40。",
      wrong: "回滚不会发布 B 的暂存写入。", review: "conflict" },
  ],
  recap: ["读取规则决定可见版本。", "已提交表和读取值要分开看。", "回滚会放弃暂存写入。"],
  extension: "比较 B 提交和 B 回滚两条时间线。再看看分别写两行会出什么错。",
  next: "snapshot-write-skew",
  sources: [{ title: "PostgreSQL · Transaction Isolation", href: "https://www.postgresql.org/docs/current/transaction-iso.html" }],
};
