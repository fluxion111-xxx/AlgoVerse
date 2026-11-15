import { hainan, cs2023 } from "./sources";
import { curriculumCourse as course } from "./types";

export const algorithmCurriculum = [
  course("algorithm-basics", "算法基础", [hainan, cs2023], [
    ["cost-model", "时间与空间复杂度", "输入规模、渐近上界与下界、均摊分析"],
    ["correctness", "算法正确性", "循环不变量、终止性、归纳证明"],
    ["ordered-lookup", "有序查找", "二分区间、边界查找、插入位置"],
    ["comparison-sorting", "比较排序", "冒泡、插入、归并、快排、堆排序与稳定性"],
    ["non-comparison-sorting", "非比较排序", "计数排序、基数排序、键值范围"],
    ["graph-search", "图与搜索", "BFS、DFS、Dijkstra、A*"],
  ]),
  course("linear-structures", "线性数据结构", [hainan, cs2023], [
    ["abstract-types", "抽象数据类型", "操作约定、表示不变量、边界情况"],
    ["arrays", "数组与动态数组", "连续存储、扩容、随机访问"],
    ["linked-lists", "链表", "单链表、双链表、哨兵节点"],
    ["stacks", "栈", "表达式求值、括号匹配、单调栈"],
    ["queues", "队列", "循环队列、双端队列、单调队列"],
  ]),
  course("trees-and-heaps", "树与堆", [hainan, cs2023], [
    ["binary-trees", "二叉树与遍历", "树的表示、先中后序、层序遍历"],
    ["search-trees", "二叉搜索树", "查找、插入、删除、退化"],
    ["balanced-trees", "平衡搜索树", "AVL 旋转、红黑树约束、多路树"],
    ["priority-queues", "堆与优先队列", "数组堆、建堆、堆顶更新"],
    ["range-structures", "区间与前缀结构", "树状数组、线段树、区间更新"],
  ]),
  course("hashing", "哈希与查找结构", [hainan, cs2023], [
    ["hash-functions", "哈希函数", "键值映射、分布质量、相等性约定"],
    ["collisions", "哈希冲突", "链地址法、开放寻址、删除标记"],
    ["resizing", "负载因子与扩容", "查找代价、再散列、均摊成本"],
    ["probabilistic-lookup", "概率查找结构", "布隆过滤器、误判率、空间取舍"],
  ]),
  course("graph-algorithms", "图算法", [hainan, cs2023], [
    ["graph-representations", "图的存储", "邻接表、邻接矩阵、稀疏图"],
    ["dependencies", "依赖关系与连通性", "拓扑排序、强连通分量、并查集"],
    ["shortest-paths", "最短路径模型", "松弛、负权边、全源最短路"],
    ["spanning-trees", "最小生成树", "割性质、Prim、Kruskal"],
    ["network-flow", "网络流", "容量、残量网络、最大流最小割"],
  ]),
  course("algorithm-design", "算法设计方法", [hainan, cs2023], [
    ["recursive-design", "递归与递推", "基例、递归树、递推式"],
    ["divide-and-conquer", "分治", "划分、子问题、合并成本"],
    ["greedy", "贪心", "局部选择、交换论证、反例"],
    ["dynamic-programming", "动态规划", "状态定义、转移、背包与序列"],
    ["backtracking", "回溯与剪枝", "搜索空间、撤销选择、约束传播"],
    ["approximation-guarantees", "近似算法与性能保证", "上下界、顶点覆盖、集合覆盖、度量 TSP、LP 舍入与近似方案"],
  ]),
  course("string-algorithms", "字符串算法", [hainan, cs2023], [
    ["text-representation", "字符串表示", "字符编码、下标单位、字典序"],
    ["pattern-matching", "单模式匹配", "朴素匹配、前缀函数、KMP"],
    ["rolling-hash", "滚动哈希", "子串哈希、模运算、冲突复查"],
    ["multiple-patterns", "字典树与多模式匹配", "Trie、失败链接、Aho–Corasick"],
    ["suffix-structures", "后缀结构", "后缀数组、LCP、重复子串"],
  ]),
];
