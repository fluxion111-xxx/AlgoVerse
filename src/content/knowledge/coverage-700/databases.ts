import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const pg = (page: string, name: string) => ({ title: "PostgreSQL · " + name, href: "https://www.postgresql.org/docs/current/" + page + ".html" });
const graph = { title: "Neo4j · Cypher Patterns", href: "https://neo4j.com/docs/cypher-manual/current/patterns/" };
const rocks = { title: "RocksDB · Tuning Guide", href: "https://github.com/meta/rocksdb/wiki/RocksDB-Tuning-Guide" };
const pandas = { title: "pandas · Working with missing data", href: "https://pandas.pydata.org/docs/user_guide/missing_data.html" };
const hadoop = { title: "Apache Hadoop · MapReduce Tutorial", href: "https://hadoop.apache.org/docs/stable/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html" };

export const database700 = [
  topic(["database-design", "schema-mapping"], ["one-to-one-unique-fk", "一对一关系的唯一外键", "基础"], ["many-to-many-junction-key"], pg("ddl-constraints", "Constraints"),
    "用唯一约束限制重复引用。", "外键要求引用对象存在。再加 UNIQUE，让每个父行至多被一个子行引用。NOT NULL 可要求子行必须有父行。",
    "分别约束关系的两端。", "用户设置表把 user_id 设为主键及外键。每位用户至多有一份设置。", "子表的唯一外键不能强制每个父行都拥有子行。",
    ["设置表中 user_id 只有外键，没有唯一约束。能插入两份同用户设置吗？", ["不能", "能，若其他约束允许", "只在用户被删时能"], 1, "外键只检查用户存在，未限制引用次数。"]),
  topic(["nosql", "nosql-models"], ["graph-edge-traversal", "图模型的有向边与遍历", "基础"], ["document-embedding-reference"], graph,
    "遍历沿符合条件的边找邻居。", "节点表示实体。有向边有起点、终点和类型。查询按方向与类型扩展，必要时还限制最大跳数。",
    "给关系路径选择合适方向和深度。", "A 关注 B，B 关注 C。沿关注边两跳可从 A 到 C。反过来并不一定成立。", "连通不能替代有向可达。沿反向边会回答不同问题。",
    ["沿关注方向，从 C 能确定到达 A 吗？", ["能，两跳", "能，一跳", "不能，缺少反向边信息"], 2, "现有边只给出 A→B→C，没有给出 C 的出边。"]),
  topic(["nosql", "model-selection"], ["storage-write-amplification", "写放大与存储选型", "进阶"], ["storage-query-pattern-fit"], rocks,
    "逻辑写入小，磁盘写入仍可能大。", "索引、日志和后台合并都会产生额外写入。写放大可用物理写入量除以逻辑写入量表示。",
    "把写放大纳入写密集系统的比较。", "应用写了 100 MB。计入后台合并后，设备共写了 300 MB。写放大约为 3。", "只测前台写延迟会漏掉后台成本。计数口径也必须一致。",
    ["逻辑写入 50 MB，设备写入 200 MB。写放大是多少？", ["2", "4", "150 MB"], 1, "200 除以 50 得 4。相减只得到额外写入量。"]),
  topic(["warehouse-and-analytics", "analysis-workflow"], ["missing-value-versus-zero", "缺失值、真实零与均值", "基础"], ["selection-bias-sample", "expected-value"], pandas,
    "缺测与实际测到零含义不同。", "缺失表示没有观测值。按零填补会改变均值分子或分母。跳过缺失也可能在非随机缺测时产生偏差。",
    "计算并对比两种缺失值处理。", "三个读数为 4、8、缺测。已观测均值为 6，填零后为 4。", "跳过缺失只能描述已观测样本。样本可能无法代表全部对象。",
    ["传感器断线时读数缺失，能直接当成 0 吗？", ["能，断线就是零", "不能，须先确认数据语义", "仅在均值较高时能"], 1, "断线没有报告观测值。填零相当于引入一个新观测。"]),
  topic(["big-data-processing", "distributed-computation"], ["mapreduce-combiner-mergeable", "Combiner 与可合并统计", "进阶"], ["shuffle-partitioning"], hadoop,
    "先在本地合并，少传中间结果。", "Combiner 可减少传给 Reduce 的数据。结果须不依赖框架执行合并的次数或分组方式。均值可携带和与数量。",
    "为分布式均值选择可合并中间量。", "一组是 2 和 4，一组只有 10。合并 (6,2) 和 (10,1)，全局均值为 16/3。", "直接平均各组均值会忽略组大小。也不能依赖 Combiner 一定执行。",
    ["每个分区应发送什么来计算精确全局均值？", ["仅均值", "总和与计数", "仅最大值"], 1, "先合并所有总和与计数，再相除，能保持各记录的权重。"]),
  topic(["storage-and-query", "cost-optimization"], ["prepared-generic-custom-plan", "预备语句的通用计划与定制计划", "进阶"], ["query-selectivity", "explain-estimate-actual"], pg("sql-prepare", "PREPARE"),
    "参数值不同，最便宜的计划也可能不同。", "定制计划利用这次的参数估计行数。通用计划可跨参数复用，节省规划开销，但不使用这次的值来定制。",
    "解释数据偏斜下两种计划的取舍。", "查常见状态会读大部分表。查罕见状态只读几行。两种状态未必适合同一种扫描。", "预备语句的参数化与计划复用是两件事。参数化语句也可以生成定制计划。",
    ["参数值罕见且有合适索引。哪类计划能直接利用该值估算行数？", ["定制计划", "通用计划", "任何计划都必须忽略参数值"], 0, "定制计划看当前值，可利用相关统计估计过滤后的行数。"]),
  topic(["transaction-management", "recovery"], ["point-in-time-recovery-target", "时间点恢复与目标时刻", "进阶"], ["write-ahead-logging"], pg("continuous-archiving", "Continuous Archiving and PITR"),
    "从基础备份重放日志到指定时刻。", "恢复需可用的基础备份，以及从备份到目标的连续 WAL。可在误操作之前停止重放。",
    "为误删场景选择目标和所需日志。", "备份于 01:00 完成，误删在 10:00 提交。可重放到误删提交前，再核对数据。", "备份和目标之间少一段 WAL，恢复不能凭后面的日志跳过缺口。",
    ["误删在 10:00 提交。想排除它，应恢复到何处？", ["误删提交前", "误删提交后", "只看最新备份时间"], 0, "重放应在错误事务的提交前停住，以保留此前的数据。"]),
];
