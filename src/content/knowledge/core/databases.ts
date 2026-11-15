import { concept as topic } from "./types";

const pg = { title: "PostgreSQL · SQL Tutorial", href: "https://www.postgresql.org/docs/current/tutorial.html" };
const tx = { title: "PostgreSQL · Transaction Isolation", href: "https://www.postgresql.org/docs/current/transaction-iso.html" };
const berkeley = { title: "UC Berkeley · CS186 Database Systems", href: "https://cs186berkeley.net/notes/" };
const spark = { title: "Apache Spark · Documentation", href: "https://spark.apache.org/docs/latest/" };

export const databases = [
  topic("relational-databases", "relational-model", "relational-selection-projection", "关系代数的选择与投影", "基础", "选择过滤行，投影选属性。", "经典关系代数按集合处理。SQL 通常保留重复行，去重要显式指定 DISTINCT。", berkeley),
  topic("relational-databases", "schema-and-constraints", "foreign-key-integrity", "外键与参照完整性", "基础", "外键限制一条记录能引用谁。", "给定非空引用时，被引用的键必须存在。删除父记录时按声明的动作处理。", pg, ["relational-selection-projection"]),
  topic("relational-databases", "joins-and-aggregation", "sql-inner-left-join", "SQL 内连接与左连接", "基础", "左连接保留未匹配的左表行。", "内连接只保留匹配组合。左连接还给无匹配的左表行补一组右侧空值。", pg, ["relational-selection-projection"]),
  topic("relational-databases", "subqueries", "sql-exists", "EXISTS 与相关子查询", "进阶", "EXISTS 只看能否找到一行。", "相关子查询引用外层行的值。EXISTS 在结果非空时为真，不依赖选出哪些列。", pg, ["sql-inner-left-join"]),
  topic("relational-databases", "window-functions", "sql-window-partitions", "窗口函数的分区与窗口帧", "进阶", "保留每行，同时计算分组指标。", "分区限定同行集合。排序指定顺序。窗口帧决定本行计算时纳入哪些同行。", pg, ["sql-inner-left-join"]),
  topic("database-design", "conceptual-design", "entity-relationship-cardinality", "实体关系的基数", "基础", "用基数表达一对一或一对多。", "多对多关系通常用关联表表示。两侧的键组成一对合法引用。", berkeley, ["foreign-key-integrity"]),
  topic("database-design", "dependencies", "functional-dependency", "函数依赖与属性闭包", "进阶", "相同决定项要给相同被决定项。", "若 X→Y，同一合法关系中 X 相同的两行，其 Y 也相同。闭包可推导 X 决定的属性。", berkeley, ["equivalence-relations"]),
  topic("database-design", "normalization", "bcnf-lossless-join", "BCNF 与无损分解", "进阶", "拆表后要能连接回原关系。", "BCNF 要求每个非平凡依赖的决定项是超键。无损连接与依赖保持需要分别验证。", berkeley, ["functional-dependency", "sql-inner-left-join"]),
  topic("storage-and-query", "physical-layout", "buffer-pool-pages", "数据库页与缓冲池", "基础", "查询常按页从存储读取记录。", "缓冲池复用读过的页。正在使用的页通常先固定，避免立即淘汰。", berkeley, ["cache-locality"]),
  topic("storage-and-query", "cost-optimization", "query-selectivity", "选择率与查询代价估算", "进阶", "先估算有多少行满足条件。", "优化器用统计信息估算行数。列间相关性会让独立性假设产生偏差。", berkeley, ["query-plans", "expected-value"]),
  topic("transaction-management", "isolation", "snapshot-write-skew", "快照隔离与写偏斜", "进阶", "不同的写入也能一起打破约束。", "两个事务可从同一快照作决定。即使写不同行，合起来仍可能破坏跨行约束。", tx, ["transactions"],
    [{ engineId: "transaction-concurrency", label: "验证跨行写偏斜", prompt: "让两人各读对方。再改自己的行。" }]),
  topic("transaction-management", "concurrency", "mvcc-row-versions", "MVCC 与行版本", "进阶", "读取按可见性规则选版本。", "更新产生新版本。旧快照仍可读其可见版本，直到这些版本再无人需要。", tx, ["transactions"],
    [{ engineId: "transaction-concurrency", label: "对比事务的可见版本", prompt: "让 B 先提交。看 A 再读一次。" }]),
  topic("transaction-management", "recovery", "write-ahead-logging", "预写日志与重做", "进阶", "先持久化日志，再刷对应数据页。", "重启时可用持久日志重做已记录的修改。检查点限制恢复需要扫描的范围。", { title: "PostgreSQL · WAL Introduction", href: "https://www.postgresql.org/docs/current/wal-intro.html" }, ["transactions", "buffer-pool-pages"]),
  topic("nosql", "nosql-models", "document-embedding-reference", "文档嵌入与引用", "基础", "一起读取的数据可考虑放一起。", "嵌入可减少跨文档读取。经常单独更新或无限增长的实体更适合独立引用。", { title: "MongoDB · Data Modeling", href: "https://www.mongodb.com/docs/manual/data-modeling/" }, ["foreign-key-integrity"]),
  topic("nosql", "partitioning", "partition-hot-key", "分区键与热点", "进阶", "数据均匀不保证流量均匀。", "哈希可分散不同键。同一个热门键仍落在同一分区，需要单独考虑访问负载。", { title: "MongoDB · Shard Keys", href: "https://www.mongodb.com/docs/manual/core/sharding-shard-key/" }, ["hash-equality-contract"]),
  topic("warehouse-and-analytics", "dimensional-modeling", "fact-table-grain", "事实表的粒度", "基础", "先说清每一行代表什么。", "混合订单级和明细级会导致重复加总。先约定粒度，再选择事实和维度。", { title: "Kimball Group · Declaring the Grain", href: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/grain/" }, ["entity-relationship-cardinality"]),
  topic("big-data-processing", "distributed-computation", "shuffle-partitioning", "分布式 Shuffle", "进阶", "把同键记录送到同一分区。", "重分区常需要跨机器搬数据。键分布倾斜会让少数任务承担大部分负载。", spark, ["partition-hot-key"]),
  topic("big-data-processing", "stream-processing", "event-time-watermark", "事件时间与水位线", "进阶", "按事件发生时间划窗口。", "水位线描述系统对事件时间推进的估计。迟到数据如何处理取决于引擎和配置。", spark, ["shuffle-partitioning"]),
];
