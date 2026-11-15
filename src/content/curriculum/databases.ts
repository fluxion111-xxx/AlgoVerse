import { hainan, cs2023, sdjzu } from "./sources";
import { curriculumCourse as course } from "./types";

const postgres = { title: "PostgreSQL · Tutorial", href: "https://www.postgresql.org/docs/current/tutorial.html" };
const spark = { title: "Apache Spark · Documentation", href: "https://spark.apache.org/docs/latest/" };

export const databaseCurriculum = [
  course("relational-databases", "关系数据库与 SQL", [hainan, postgres], [
    ["relational-model", "关系模型与关系代数", "关系、元组、投影、选择与连接"],
    ["schema-and-constraints", "建表与约束", "主键、外键、唯一性、空值"],
    ["joins-and-aggregation", "连接与聚合", "连接类型、分组、HAVING"],
    ["subqueries", "子查询与公共表表达式", "相关子查询、EXISTS、递归查询"],
    ["window-functions", "窗口函数与数据修改", "分区与排序、窗口帧、更新与删除"],
  ]),
  course("database-design", "数据库设计", [hainan, sdjzu, cs2023], [
    ["conceptual-design", "概念建模", "实体、关系、基数与弱实体"],
    ["schema-mapping", "模型到关系模式", "多对多、主外键、约束落地"],
    ["dependencies", "函数依赖", "属性闭包、候选键、最小依赖集"],
    ["normalization", "规范化与分解", "第三范式、BCNF、无损连接、依赖保持"],
    ["schema-evolution", "模式演进", "迁移、反规范化、数据一致性检查"],
  ]),
  course("storage-and-query", "存储与查询", [hainan, cs2023], [
    ["physical-layout", "页与记录存储", "记录布局、缓冲池、行存与列存"],
    ["index-structures", "索引结构", "B+ 树、哈希、复合索引"],
    ["query-execution", "查询执行", "扫描、连接算法、执行计划"],
    ["cost-optimization", "查询优化", "选择率、代价估算、连接顺序"],
    ["index-tuning", "索引选择与调优", "索引覆盖、读写取舍、实际测量"],
    ["query-plan-diagnostics", "查询计划排查", "EXPLAIN ANALYZE、loops、缓冲区、行数偏差与改动验证"],
  ]),
  course("transaction-management", "事务管理", [hainan, postgres, cs2023], [
    ["transaction-boundaries", "事务边界", "ACID、提交、回滚、保存点"],
    ["isolation", "隔离级别与异常", "脏读、不可重复读、幻读、写偏斜"],
    ["concurrency", "并发控制", "两阶段锁、MVCC、可串行化"],
    ["recovery", "日志与恢复", "WAL、检查点、重做与撤销"],
    ["aries-recovery-trace", "ARIES 恢复推演", "LSN、脏页表、分析、重做历史、CLR 与二次崩溃"],
    ["aries-fuzzy-checkpoints", "ARIES 模糊检查点与多事务", "起始指针、快照合并、脏页下界、多个输家与再崩溃恢复"],
    ["distributed-atomic-commit", "分布式原子提交", "协调者、参与者、两阶段提交、持久化决定"],
    ["distributed-isolation", "跨分片隔离与副本", "串行顺序、全局死锁、稳定快照、复制边界"],
    ["distributed-recovery", "分布式事务恢复", "未决事务、重试、补偿、事务发件箱"],
  ]),
  course("nosql", "NoSQL 与分布式存储", [cs2023], [
    ["nosql-models", "非关系数据模型", "键值、文档、宽列、图模型"],
    ["replication", "复制与一致性", "主从复制、读写一致性、网络分区"],
    ["partitioning", "分片与负载分布", "范围分片、哈希分片、热点"],
    ["lsm-trees", "LSM 树与写入路径", "内存表、SSTable、压实"],
    ["model-selection", "存储系统选型", "访问模式、事务语义、故障恢复"],
  ]),
  course("warehouse-and-analytics", "数据仓库与数据分析", [cs2023, spark], [
    ["dimensional-modeling", "维度建模", "事实表、维度表、粒度、缓慢变化维"],
    ["data-integration", "数据集成", "ETL/ELT、清洗、数据血缘"],
    ["analytical-processing", "分析查询", "OLAP、列式扫描、分组汇总"],
    ["analysis-workflow", "探索性数据分析", "缺失值、抽样偏差、指标口径"],
    ["data-quality", "数据质量与治理", "校验规则、权限、可追溯性"],
  ]),
  course("big-data-processing", "大数据处理基础", [cs2023, spark], [
    ["distributed-computation", "分布式计算模型", "任务分区、MapReduce、Shuffle"],
    ["batch-processing", "批处理", "DAG、窄依赖与宽依赖、数据倾斜"],
    ["stream-processing", "流处理", "事件时间、窗口、水位线"],
    ["fault-tolerance", "故障恢复与交付语义", "检查点、重放、幂等写入"],
  ]),
];
