export const pathfindingRoute = "/experiments/algorithms/pathfinding";

type Experiment = { title: string; prompt: string; href?: string };
type PrimaryExperiment = Pick<Experiment, "title" | "prompt"> & { slug: string; pageTitle: string };

export type Course = {
  slug: "algorithms" | "operating-systems" | "networks" | "programming" | "databases" | "ai";
  title: string;
  icon: string;
  introduction: string;
  preview: string;
  primary: PrimaryExperiment;
  experiments: readonly Experiment[];
};

export const courses: readonly Course[] = [
  {
    slug: "algorithms",
    title: "数据结构与算法",
    icon: "lucide:chart-no-axes-column-increasing",
    introduction: "换个存法，解题会更快吗？",
    preview: "看相邻的柱子比较、交换。",
    primary: { slug: "sorting", pageTitle: "排序实验", title: "排序算法", prompt: "把一列数字排好队。" },
    experiments: [
      { title: "二叉树遍历", prompt: "换个顺序，遍历一棵树。", href: "/experiments/algorithms/tree-traversal" },
      { title: "栈与队列", prompt: "同一组数，先取出谁？", href: "/experiments/algorithms/stack-queue" },
      { title: "二分查找", prompt: "重复的数，找第一个。", href: "/experiments/algorithms/binary-search" },
      { title: "图搜索", prompt: "改张地图，比比谁找得快。", href: pathfindingRoute },
      { title: "图遍历", prompt: "同一个起点，怎么走？", href: "/experiments/algorithms/graph-traversal" },
      { title: "哈希冲突", prompt: "键落在同一槽，怎么存？", href: "/experiments/algorithms/hash-collisions" },
      { title: "拓扑排序与环检测", prompt: "任务互相依赖，还能排吗？", href: "/experiments/algorithms/topological-sort" },
      { title: "并查集路径压缩", prompt: "再查一次，少跳几步？", href: "/experiments/algorithms/union-find" },
      { title: "KMP 与重叠匹配", prompt: "匹配完，还能接着找吗？", href: "/experiments/algorithms/kmp-search" },
      { title: "Kruskal 最小生成树", prompt: "轻边加进去，会成环吗？", href: "/experiments/algorithms/kruskal-mst" },
      { title: "单调栈找下一个更大值", prompt: "往右找，谁先比我大？", href: "/experiments/algorithms/monotonic-stack" },
      { title: "Bellman–Ford 与负权环", prompt: "绕一圈，路费还能降吗？", href: "/experiments/algorithms/bellman-ford" },
      { title: "树状数组与前缀和", prompt: "改一个值，前缀和差几？", href: "/experiments/algorithms/fenwick-prefix" },
      { title: "最长公共子序列", prompt: "字符能跳过，最长留几个？", href: "/experiments/algorithms/longest-subsequence" },
      { title: "区间调度的贪心选择", prompt: "同一房间，能多接几单？", href: "/experiments/algorithms/interval-scheduling" },
      { title: "布隆过滤器与误判", prompt: "查到全是 1，键就存在吗？", href: "/experiments/algorithms/bloom-membership" },
      { title: "差分数组与区间更新", prompt: "只改两端，整段都能加吗？", href: "/experiments/algorithms/difference-array" },
      { title: "零一背包与倒序更新", prompt: "容量正序会多拿几件？", href: "/experiments/algorithms/zero-one-knapsack" },
      { title: "单调队列与滑窗最大值", prompt: "窗口向右，最大值在哪？", href: "/experiments/algorithms/sliding-maximum" },
      { title: "滚动哈希与字符复核", prompt: "哈希一样，内容也一样吗？", href: "/experiments/algorithms/rolling-hash" },
    ],
  },
  {
    slug: "operating-systems",
    title: "操作系统",
    icon: "lucide:cpu",
    introduction: "一颗 CPU，怎么轮着干活？",
    preview: "看进程轮流拿到时间片。",
    primary: { slug: "cpu-scheduling", pageTitle: "CPU 调度实验", title: "CPU 进程调度", prompt: "让三个进程轮流跑。" },
    experiments: [
      { title: "内存分配", prompt: "找空块。分配后再释放。", href: "/experiments/operating-systems/memory-allocation" },
      { title: "页面置换", prompt: "内存满了，先换哪一页？", href: "/experiments/operating-systems/page-replacement" },
      { title: "死锁避免", prompt: "这次资源请求能批吗？", href: "/experiments/operating-systems/deadlock-avoidance" },
      { title: "磁盘寻道调度", prompt: "同一批请求，磁头走多远？", href: "/experiments/operating-systems/disk-scheduling" },
      { title: "TLB 地址转换", prompt: "重复访问，少查几次表？", href: "/experiments/operating-systems/tlb-translation" },
      { title: "时钟置换与引用位", prompt: "刚用过的页会被换掉吗？", href: "/experiments/operating-systems/clock-replacement" },
      { title: "临界区与丢失更新", prompt: "两次加值，为何只剩一次？", href: "/experiments/operating-systems/counter-mutex" },
      { title: "缓存映射与组冲突", prompt: "总容量相同，谁少淘汰？", href: "/experiments/operating-systems/cache-mapping" },
      { title: "生产者与消费者", prompt: "队列满了，谁得等？", href: "/experiments/operating-systems/bounded-buffer" },
      { title: "工作集与连续缺页", prompt: "多一个页框，少换几次？", href: "/experiments/operating-systems/working-set" },
      { title: "优先级反转与继承", prompt: "优先级最高，怎么还在等？", href: "/experiments/operating-systems/priority-inheritance" },
      { title: "fork 与写时复制", prompt: "父子共用页，写入会怎样？", href: "/experiments/operating-systems/copy-on-write" },
      { title: "读写锁与写者等待", prompt: "读者接着来，写者等多久？", href: "/experiments/operating-systems/reader-writer" },
      { title: "多级反馈队列与优先级提升", prompt: "短任务连着来，长任务还等多久？", href: "/experiments/operating-systems/feedback-queue" },
      { title: "硬链接与符号链接", prompt: "删了原名，还能读到文件吗？", href: "/experiments/operating-systems/file-links" },
      { title: "固定加锁顺序与死锁", prompt: "两把锁，谁在等谁？", href: "/experiments/operating-systems/lock-ordering" },
      { title: "文件描述符与共享偏移", prompt: "两个描述符，从哪开始读？", href: "/experiments/operating-systems/file-offset" },
      { title: "缓存写回与写直达", prompt: "写四次，下层要写几次？", href: "/experiments/operating-systems/cache-write-policy" },
      { title: "条件变量与醒后重查", prompt: "醒了，还能取到资源吗？", href: "/experiments/operating-systems/condition-recheck" },
    ],
  },
  {
    slug: "networks",
    title: "计算机网络",
    icon: "lucide:network",
    introduction: "跟着一个包，走一趟网络。",
    preview: "看数据包在节点之间转发。",
    primary: { slug: "network-transmission", pageTitle: "网络传输实验", title: "数据包传输", prompt: "发一个包，看看它到哪。" },
    experiments: [
      { title: "动态路由", prompt: "断开链路，重新找路。", href: "/experiments/networks/dynamic-routing" },
      { title: "网络延迟与丢包", prompt: "调慢链路，再发一次。" },
      { title: "TCP 拥塞控制", prompt: "遇到丢包，窗口怎么变？", href: "/experiments/networks/tcp-congestion" },
      { title: "IPv4 子网划分", prompt: "改前缀，看地址落在哪。", href: "/experiments/networks/ipv4-subnet" },
      { title: "最长前缀匹配", prompt: "匹配多条路，该选哪条？", href: "/experiments/networks/longest-prefix" },
      { title: "CRC 差错检测", prompt: "翻转一位，余数会变吗？", href: "/experiments/networks/crc-detection" },
      { title: "停止等待与滑动窗口", prompt: "确认还没到，能接着发吗？", href: "/experiments/networks/send-window" },
      { title: "ARP 下一跳与缓存", prompt: "发往外网，该查谁的地址？", href: "/experiments/networks/arp-resolution" },
      { title: "IPv4 分片与 MTU", prompt: "一个包过大，要拆成几片？", href: "/experiments/networks/ipv4-fragmentation" },
      { title: "TCP 超时与重传退避", prompt: "确认来晚了，会重发几次？", href: "/experiments/networks/tcp-timeout" },
      { title: "DNS 否定缓存与发布", prompt: "新域名发布了，多久能查到？", href: "/experiments/networks/dns-negative-cache" },
      { title: "交换机学习与 VLAN 转发", prompt: "地址没学到，帧发到哪？", href: "/experiments/networks/ethernet-learning" },
      { title: "链路聚合与流哈希", prompt: "三条链路，流量分得匀吗？", href: "/experiments/networks/link-aggregation" },
      { title: "二层环路与生成树", prompt: "一帧绕回来了，会再传吗？", href: "/experiments/networks/spanning-bridge" },
      { title: "IPv6 路径 MTU 与大包卡住", prompt: "包太大，反馈丢了会怎样？", href: "/experiments/networks/ipv6-path-mtu" },
      { title: "TCP 握手与初始序号", prompt: "最后确认丢了，谁在等？", href: "/experiments/networks/tcp-handshake" },
      { title: "TCP 累计确认与 SACK", prompt: "后面的段到了，ACK 会动吗？", href: "/experiments/networks/tcp-sack" },
      { title: "IPv6 跳数限制与路由环", prompt: "包进了环，会在哪里停？", href: "/experiments/networks/hop-limit" },
      { title: "DNS 递归解析与转介", prompt: "下次查询，能少问几站？", href: "/experiments/networks/dns-referral" },
    ],
  },
  {
    slug: "programming",
    title: "程序设计与内存",
    icon: "lucide:code-xml",
    introduction: "跑一行代码，看看内存变了啥。",
    preview: "看函数入栈，再看它返回。",
    primary: { slug: "memory-visualization", pageTitle: "递归调用栈实验", title: "递归调用栈", prompt: "算一次阶乘，看栈怎么变。" },
    experiments: [
      { title: "指针与数组写入", prompt: "挪一下指针，看改了哪格。", href: "/experiments/programming/pointer-write" },
      { title: "C/C++ 变量作用域", prompt: "同名的变量，改了哪层？", href: "/experiments/programming/variable-scope" },
      { title: "短路求值与空指针保护", prompt: "左边为假，右边还读吗？", href: "/experiments/programming/short-circuit" },
      { title: "无符号整数回绕", prompt: "250 加 10，怎么成了 4？", href: "/experiments/programming/unsigned-wrap" },
      { title: "Python 别名与浅拷贝", prompt: "改副本，原列表会变吗？", href: "/experiments/programming/python-copy" },
      { title: "引用计数与环回收", prompt: "互相引用，还收得掉吗？", href: "/experiments/programming/gc-cycles" },
      { title: "循环闭包与逐轮绑定", prompt: "循环结束，回调读到几？", href: "/experiments/programming/loop-closure" },
      { title: "RAII 与异常清理", prompt: "申请中途失败，谁来收尾？", href: "/experiments/programming/raii-cleanup" },
      { title: "微任务与计时器顺序", prompt: "计时器要等几步才执行？", href: "/experiments/programming/microtask-queue" },
      { title: "vector 扩容与迭代器失效", prompt: "追加后，旧位置还能用吗？", href: "/experiments/programming/vector-iterator" },
      { title: "生成器与迭代耗尽", prompt: "同一个生成器，能再取几项？", href: "/experiments/programming/generator-exhaustion" },
      { title: "Java 哈希键修改与查找", prompt: "改了键，还能查到原记录吗？", href: "/experiments/programming/mutable-hash-key" },
      { title: "Python 可变默认参数", prompt: "再调用，列表还留着什么？", href: "/experiments/programming/mutable-default" },
      { title: "强异常保证与暂存提交", prompt: "中途出错，原对象变了吗？", href: "/experiments/programming/exception-guarantee" },
      { title: "C++ 复制与移动所有权", prompt: "交接之后，谁持有缓冲？", href: "/experiments/programming/copy-move" },
      { title: "C 字符串与结束字节", prompt: "多留一格，是给谁用的？", href: "/experiments/programming/c-string-terminator" },
    ],
  },
  {
    slug: "databases",
    title: "数据库原理",
    icon: "lucide:database",
    introduction: "一条查询，怎么找到那行？",
    preview: "沿索引树，找到键值 32。",
    primary: { slug: "b-plus-tree", pageTitle: "B+ 树实验", title: "B+ 树索引", prompt: "插入键，观察分裂和查找。" },
    experiments: [
      { title: "SQL 查询执行", prompt: "先筛订单，再筛分组。", href: "/experiments/databases/sql-grouping" },
      { title: "嵌套循环与哈希连接", prompt: "重复键会配成几对？", href: "/experiments/databases/join-strategies" },
      { title: "索引删除", prompt: "删掉键，看看节点怎么合并。" },
      { title: "事务并发", prompt: "同一行，两次读到什么？", href: "/experiments/databases/transaction-concurrency" },
      { title: "SQL 空值与三值逻辑", prompt: "NULL 用等号找得到吗？", href: "/experiments/databases/sql-null" },
      { title: "联合索引的范围扫描", prompt: "固定第一列，缩小扫描范围。", href: "/experiments/databases/composite-index" },
      { title: "SQL 窗口帧累计", prompt: "时间并列，累计值怎么算？", href: "/experiments/databases/sql-window-frame" },
      { title: "外键删除策略", prompt: "删掉父键，子表会怎样？", href: "/experiments/databases/foreign-key-delete" },
      { title: "UNION 与重复行", prompt: "编号相同，会合并吗？", href: "/experiments/databases/sql-union" },
      { title: "属性闭包与候选键", prompt: "用最少属性，推出整张表。", href: "/experiments/databases/candidate-keys" },
      { title: "NOT IN 遇到 NULL", prompt: "内表加个空值，还剩几行？", href: "/experiments/databases/not-in-null" },
      { title: "预写日志与检查点重做", prompt: "断电重启，需要补写几条？", href: "/experiments/databases/wal-checkpoint" },
      { title: "缓冲池的固定页与脏页", prompt: "缓存满了，哪页能先换出？", href: "/experiments/databases/buffer-pool" },
      { title: "MVCC 快照与版本回收", prompt: "旧快照在，哪一版能删？", href: "/experiments/databases/mvcc-versions" },
      { title: "左连接中的 ON 与 WHERE", prompt: "挪个条件，哪些行消失？", href: "/experiments/databases/outer-join-filter" },
      { title: "LSM 压实与删除标记", prompt: "删了墓碑，旧键会回来吗？", href: "/experiments/databases/lsm-compaction" },
      { title: "一致性哈希与迁移", prompt: "加一个节点，多少键要搬？", href: "/experiments/databases/consistent-ring" },
      { title: "覆盖索引与回表读取", prompt: "索引有值，还要回表吗？", href: "/experiments/databases/covering-index" },
    ],
  },
  {
    slug: "ai",
    title: "人工智能基础",
    icon: "lucide:scan-line",
    introduction: "给一堆散点，看看怎么分组。",
    preview: "看散点分组，再给新点归类。",
    primary: { slug: "ml-classification", pageTitle: "机器学习分类实验", title: "KNN 分类", prompt: "看邻居，给新点分个类。" },
    experiments: [
      { title: "K-Means 聚类", prompt: "挪动中心，看散点怎么分。", href: "/experiments/ai/k-means" },
      { title: "梯度下降", prompt: "换个步长，试试能否下坡。", href: "/experiments/ai/gradient-descent" },
      { title: "分类阈值与误报漏报", prompt: "抬高阈值，少报还是漏报？", href: "/experiments/ai/classification-threshold" },
      { title: "ε-贪心与探索", prompt: "多试一下，能多拿几分？", href: "/experiments/ai/epsilon-greedy" },
      { title: "决策树切分与基尼下降", prompt: "把分界往右挪，谁更纯？", href: "/experiments/ai/tree-split" },
      { title: "KNN 特征缩放", prompt: "换个尺度，近邻还是谁？", href: "/experiments/ai/knn-scaling" },
      { title: "线性回归与残差", prompt: "直线离样本还有多远？", href: "/experiments/ai/linear-regression" },
      { title: "PCA 主方向与投影", prompt: "换个角度，保住多少方差？", href: "/experiments/ai/pca-projection" },
      { title: "岭回归与惩罚强度", prompt: "压低斜率，新样本更准吗？", href: "/experiments/ai/ridge-regression" },
      { title: "分层交叉验证", prompt: "重新分样本，哪折还缺类？", href: "/experiments/ai/stratified-validation" },
      { title: "聚类轮廓系数", prompt: "一个点分错组，能看出吗？", href: "/experiments/ai/silhouette-score" },
      { title: "概率校准与 Brier 分数", prompt: "准确率一样，概率也一样准吗？", href: "/experiments/ai/probability-calibration" },
      { title: "均值填补与数据泄漏", prompt: "验证特征混进来，分数会变吗？", href: "/experiments/ai/imputation-leakage" },
      { title: "早停与最佳验证检查点", prompt: "训练越久，验证误差越低吗？", href: "/experiments/ai/early-stopping" },
      { title: "Softmax 平移与数值稳定", prompt: "分数都加 800，概率会变吗？", href: "/experiments/ai/stable-softmax" },
      { title: "注意力与因果掩码", prompt: "当前词能看到未来吗？", href: "/experiments/ai/causal-mask" },
      { title: "Dropout 的训练与推理", prompt: "训练随机丢弃，推理会怎样？", href: "/experiments/ai/dropout-mode" },
      { title: "排序召回率与 NDCG", prompt: "命中数一样，哪种排序更好？", href: "/experiments/ai/ranking-metrics" },
    ],
  },
];

export function getCourse(slug: string) {
  return courses.find((course) => course.slug === slug);
}

export function courseRoute(course: Course) {
  return `/experiments/${course.slug}`;
}

export function primaryExperimentRoute(course: Course) {
  return `${courseRoute(course)}/${course.primary.slug}`;
}
