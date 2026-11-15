import { lesson } from "@/content/knowledge/teaching/types";

export const databasesReview700 = {
  "query-selectivity": lesson("进阶", "从匹配比例估算扫描返回行数。", "表有 10000 行，状态为失败的估计比例为 2%。该过滤大约返回 200 行。", "两个谓词相关时，不能直接相乘并把结果当作准确行数。",
    { id: "practice", prompt: "同一过滤的选择率为 0.2，输入有 500 行。估算输出多少？", options: ["25", "100", "400"], answer: 1, explanation: "用输入行数乘预估匹配比例，500×0.2=100。" }),
  "entity-relationship-cardinality": lesson("基础", "从业务规则判断关系两端的数量。", "一个订单含多条明细，每条明细只属于一个订单。明细表存订单 ID。", "外键放到一端或多端会改变能表达的关系。还要单独判断关系是否允许缺失。",
    { id: "practice", prompt: "订单与明细一对多，外键通常放哪？", options: ["订单表", "明细表", "两张表各放一份同列"], answer: 1, explanation: "每条明细只需引用一个订单。一个订单可由多行明细引用。" }),
  "functional-dependency": lesson("进阶", "用依赖规则反复扩展属性闭包。", "A→B，B→C。先从 A 推出 B，再用 B 推出 C。所以 A 的闭包含 A、B、C。", "依赖方向不能倒过来。A→B 不自动推出 B→A。",
    { id: "practice", prompt: "只有上述两条依赖。B 的闭包包含 A 吗？", options: ["包含", "不包含", "只有 C 为空时包含"], answer: 1, explanation: "从 B 只能推出 C。没有规则从 B 或 C 推出 A。" }),
  "bcnf-lossless-join": lesson("进阶", "用交集的决定关系检查二元分解。", "R(A,B,C) 有 A→B。拆成 AB、AC。交集 A 决定 AB，因此分解可无损连接。", "无损连接和保留全部依赖是两项独立性质。",
    { id: "practice", prompt: "上述两张表用什么属性连接？", options: ["A", "B", "C"], answer: 0, explanation: "A 是唯一共有属性。由 A 决定 AB 可避免重组时产生伪元组。" }),
  "document-embedding-reference": lesson("基础", "按读写模式选择嵌入或引用。", "订单行通常随订单一起读取，且数量有界，可嵌入。被许多订单共享且频繁改动的供应商资料适合引用。", "不能无界扩展一个文档。复制共享数据还会带来更新一致性问题。",
    { id: "practice", prompt: "一个供应商的资料被许多订单引用，更新又频繁。优先考虑什么？", options: ["在每张订单完整复制", "集中保存，通过标识引用", "每次更新删除订单"], answer: 1, explanation: "集中更新可避免改许多副本。读路径需为引用解析留出成本。" }),
  "partition-hot-key": lesson("进阶", "从请求分布找出真正的热点。", "100 个分区里，一个热榜单键承接一半请求。该键仍落在同一分区，即使其他键分散。", "多加机器不一定拆得开单键流量。需考虑缓存、改键或拆分聚合。",
    { id: "practice", prompt: "仅把分区数从 100 加到 200，单热键一定被摊开吗？", options: ["一定", "不一定", "仅取决于键名长度"], answer: 1, explanation: "普通键哈希每次仍只给这个键选择一个分区。" }),
  "shuffle-partitioning": lesson("进阶", "解释相同键如何汇到同一归约器。", "两个 Map 分别发出 (猫,1) 和 (猫,2)。分区规则把它们送到同一 Reduce，输出 (猫,3)。", "Shuffle 会搬运中间数据。大量记录共享一个键会造成分区倾斜。",
    { id: "practice", prompt: "两个 Map 产生同一个键。归约前这些值应去哪？", options: ["随机分散且不再合并", "同一个负责该键的归约器", "只保留先到的一条"], answer: 1, explanation: "每个键的聚合需要看到该键的全部值。" }),
};
