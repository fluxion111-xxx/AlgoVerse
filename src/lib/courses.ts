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
