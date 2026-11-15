import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const pg = (page: string, title: string) => ({ title: `PostgreSQL · ${title}`, href: `https://www.postgresql.org/docs/current/${page}.html` });

export const advancedDatabases = [
  topic(["relational-databases", "joins-and-aggregation"], ["outer-join-on-where-predicate", "外连接的 ON 与 WHERE", "进阶"], ["sql-inner-left-join", "sql-null-three-valued-logic"], pg("queries-table-expressions", "Table Expressions"),
    "放错条件会丢掉未匹配左行。", "ON 先决定匹配。左连接再补空行。WHERE 随后筛结果，右列的比较可把补空行过滤掉。",
    "保留没有合格订单的客户。", "把订单状态等于已支付放进 ON。无已支付订单的客户仍有补空行。", "把同一条件从 ON 移到 WHERE，外连接语义可能改变。",
    ["想保留全部客户，只匹配已支付订单。状态条件适合放哪里？", ["LEFT JOIN 的 ON", "WHERE 且不允许 NULL", "只放在 ORDER BY"], 0, "在 ON 中限制匹配，未匹配客户仍由左连接补齐。"]),
  topic(["relational-databases", "window-functions"], ["sql-running-total-rows-frame", "窗口帧与逐行累计", "进阶"], ["sql-window-partitions", "sql-row-number-rank-ties"], pg("tutorial-window", "Window Functions Tutorial"),
    "按明确顺序定义累计范围。", "ROWS 帧按行位置取范围。用唯一排序键和从首行到当前行的帧，可稳定算逐行累计。",
    "写出同一天多笔交易的累计口径。", "按日期和交易号排序。依次为 2、5、3，累计为 2、7、10。", "只按日期时同日可并列。默认帧可能把同一排序值的同伴一起算进去。",
    ["需要逐条累计，且日期可相同。更合适的做法是什么？", ["只按日期排序，不写窗口帧", "加唯一键并明确 ROWS 帧", "去掉排序"], 1, "唯一键决定先后。ROWS 到当前行让累计边界逐条移动。"]),
  topic(["storage-and-query", "query-execution"], ["join-nested-loop-index-lookup", "索引嵌套循环连接", "进阶"], ["query-plans", "btree-composite-prefix"], pg("using-explain", "Using EXPLAIN"),
    "外侧每行触发一次内侧定位。", "先读外侧行。把它的键传给内侧索引查找。外侧很小时，这可避免扫完整内表。",
    "判断什么数据形状有利于该连接。", "外侧仅三行，每行匹配大表的一条索引记录。可做三次定点查找。", "外侧变很大时，大量重复或随机访问可能更贵。要结合实际计划。",
    ["外侧 3 行，内侧巨大且键上有索引。哪种计划可逐键查找？", ["把两表都完整排序后读", "不检查键的笛卡尔积", "索引嵌套循环连接"], 2, "内侧以外侧当前键为参数，用索引直接缩小候选。"]),
  topic(["transaction-management", "isolation"], ["serializable-abort-retry", "可串行化失败与整笔重试", "进阶"], ["snapshot-write-skew", "database-deadlock-retry"], pg("transaction-iso", "Transaction Isolation"),
    "数据库可拒绝无法安全并行的事务。", "可串行化要保证结果等价于某种串行顺序。检测到危险并发时，可终止事务，让应用整笔重试。",
    "识别重试前要重新读取的条件。", "一笔预约事务因并发冲突失败。下一轮重新查询余量，再尝试写入。", "只重发最后一个 UPDATE 可能沿用旧决策。应重跑事务里的读取和判断。",
    ["收到可串行化失败，应优先重试哪部分？", ["整笔事务，包括读取与判断", "只重复 COMMIT", "沿用旧结果，跳过所有读取"], 0, "新事务要按新快照重新决策，否则仍可能依据过期数据。"]),
  topic(["nosql", "replication"], ["replication-log-position", "复制日志位置与追赶", "进阶"], ["replica-read-lag", "write-ahead-logging"], pg("warm-standby", "Log-Shipping Standby Servers"),
    "区分收到日志和已经应用。", "副本可先接收日志，再按序重放。重放进度落后时，查询仍可能看不到主库已提交的变化。",
    "用两个进度指标定位副本延迟。", "日志已收到位置 900，只重放到 800。网络已送达一段，但可见状态仍待推进。", "收到日志不等于可立即读取对应行。还要看持久化、重放和事务可见性。",
    ["副本已收到但尚未重放一笔事务。查询能保证看到它吗？", ["一定能", "不能保证", "只要读取端口相同就能"], 1, "应用进度尚未到达该位置。接收并不直接更新查询可见状态。"]),
  topic(["warehouse-and-analytics", "data-quality"], ["data-reconciliation-count-sum", "源表与目标表的数据对账", "基础"], ["dataset-lineage-run", "sql-count-null-distinction"], { title: "dbt · Data Tests", href: "https://docs.getdbt.com/docs/build/data-tests" },
    "对账要按同一时间范围和口径。", "比较两边行数、关键金额与主键集合。汇总一致后仍可抽查具体键，减少不同错误互相抵消。",
    "给数据迁移写出可复查的对账条件。", "按同一订单日期统计源目标总金额，再按订单号检查缺失或多出。", "总金额相等也可能丢一行又多一行。不能只校验一个总数。",
    ["总金额相等，但怀疑漏单和重复互相抵消。下一步做什么？", ["直接宣布完全一致", "只换显示精度", "按主键比较缺失、重复与金额"], 2, "主键级核对能定位具体差异，不会被汇总抵消掩盖。"]),
];
