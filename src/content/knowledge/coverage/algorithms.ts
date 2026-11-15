import { fullTopic as topic } from "./types";

const mit = { title: "MIT 6.006 · Introduction to Algorithms", href: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/" };
const nist = { title: "NIST · Dictionary of Algorithms and Data Structures", href: "https://xlinux.nist.gov/dads/" };
const unicode = { title: "Unicode · UTF-8 FAQ", href: "https://www.unicode.org/faq/utf_bom.html" };

export const algorithmCoverage = [
  topic(["hashing", "resizing"], ["hash-table-load-factor", "哈希表负载因子", "进阶"], ["open-addressing", "dynamic-array-amortization"], mit,
    "用装载程度判断何时扩容。", "负载因子等于键数除以槽数。开放寻址越满，通常越难找到空槽。扩容后要按新容量重新定位键。",
    "算出负载因子。判断是否扩容。", "8 个槽放 6 个键。负载因子为 0.75。若扩到 16 个槽，就降至 0.375。",
    "扩容要重新算槽位。直接复制旧下标可能查不到键。",
    ["用 h(k) mod m 定位。m 从 8 改到 16。哈希值 11 的槽位如何变？", ["仍是 3", "从 3 到 11", "从 11 到 3"], 1, "11 mod 8 是 3。11 mod 16 是 11。容量变了，槽位也会变。"]),
  topic(["hashing", "probabilistic-lookup"], ["bloom-filter-membership", "布隆过滤器的误判", "进阶"], ["hash-equality-contract", "bayes-rule"], nist,
    "用位数组快速排除不存在的键。", "插入时置位多个哈希位置。查询时只要一位为零，就能排除。全为一时，可能是别的键碰巧置位。",
    "区分确定缺失与可能存在。", "查询映射到位 2、4、7。只要位 4 为零，该键就未插入。",
    "普通版本不应直接清位。那一位可能还有别的键共用。",
    ["普通布隆过滤器查询时，所有目标位都是一。说明什么？", ["一定存在", "一定缺失", "可能存在"], 2, "别的键也能把这些位置全置一。因此仍需查真实集合。"]),
  topic(["string-algorithms", "text-representation"], ["utf8-byte-boundaries", "UTF-8 字节与字符边界", "基础"], ["array-indexing"], unicode,
    "字符可占多个字节。", "UTF-8 用一至四字节编码一个 Unicode 标量值。字节偏移可能落在多字节编码中间。",
    "识别安全的 UTF-8 截断点。", "字串 A中 共四个字节。只留前两字节，会切到「中」的编码内部。",
    "码点与可见字符也有区别。组合音标可与前一个字母一起显示。",
    ["ASCII 字母 A 后跟「中」。UTF-8 字节数是多少？", ["2", "4", "6"], 1, "A 占一字节。「中」占三字节。合计四字节。"]),
  topic(["string-algorithms", "suffix-structures"], ["suffix-array-lcp", "后缀数组与最长公共前缀", "进阶"], ["array-indexing", "utf8-byte-boundaries"], nist,
    "把后缀按字典序排列。", "后缀数组保存各后缀的起点。LCP 记录相邻后缀共享的前缀长度。它可帮助寻找重复子串。",
    "用相邻后缀找重复片段。", "banana 的后缀 ana 和 anana 相邻。它们共享 ana。",
    "后缀数组只存起点。无需复制每个后缀的文本。",
    ["后缀 ana 和 anana 的 LCP 长度是多少？", ["1", "2", "3"], 2, "两者前 3 个字符都是 ana。较短后缀到此结束。"]),
  topic(["algorithm-basics", "graph-search"], ["bfs-unweighted-distance", "广度优先搜索的层数", "基础"], ["ring-queue", "adjacency-list"], mit,
    "用队列逐层访问邻居。", "起点入队。每次取队首，并让未见邻居入队。无权图中，首次到达的层数就是最少边数。",
    "从入队顺序推断无权距离。", "S 连 A、B。A 连 C。C 第一次入队时在第 2 层。",
    "边权不同要另算总代价。仅比较层数可能选错路。",
    ["无权图 S→A→T，且有 S→T。BFS 得到 T 的距离是多少？", ["1", "2", "3"], 0, "T 与 S 直接相邻。它在第 1 层，另一条路径需要两条边。"],
    undefined, [{ engineId: "graph-traversal", label: "比较 BFS 与 DFS", prompt: "换个起点。对比访问次序。" }]),
  topic(["algorithm-design", "dynamic-programming"], ["knapsack-rolling-order", "零一背包的倒序更新", "进阶"], ["dp-state-transition"], mit,
    "每件物品只用一次。", "一维状态压缩时，容量从大到小更新。读到的较小容量仍来自上一轮，当前物品便不会重复使用。",
    "选出零一背包的容量遍历方向。", "容量 4。一件重 2、价值 3 的物品。若正序更新，dp[4] 可能误读本轮 dp[2]。",
    "倒序针对零一约束。允许无限次选择时，更新顺序不同。",
    ["只有一件重 2、价值 3 的物品。容量为 4，最佳价值是多少？", ["0", "3", "6"], 1, "最多选一件。6 相当于把同一件选了两次。"]),
];
