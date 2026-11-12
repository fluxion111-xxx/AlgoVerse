export const pathfindingRoute = "/experiments/algorithms/pathfinding";

type Experiment = { title: string; prompt: string; href?: string };

export type Course = {
  slug: "algorithms" | "operating-systems" | "networks" | "programming" | "databases" | "ai";
  title: string;
  icon: string;
  introduction: string;
  preview: string;
  experiments: readonly Experiment[];
};

export const courses: readonly Course[] = [
  {
    slug: "algorithms",
    title: "数据结构与算法",
    icon: "lucide:chart-no-axes-column-increasing",
    introduction: "换个存法，解题会更快吗？",
    preview: "看相邻的柱子比较、交换。",
    experiments: [
      { title: "排序算法", prompt: "把一列数字排好队。" },
      { title: "二叉树", prompt: "换个顺序，遍历一棵树。" },
      { title: "栈与队列", prompt: "先进去的，先出来吗？" },
      { title: "图搜索", prompt: "改张地图，比比谁找得快。", href: pathfindingRoute },
    ],
  },
  {
    slug: "operating-systems",
    title: "操作系统",
    icon: "lucide:cpu",
    introduction: "一颗 CPU，怎么轮着干活？",
    preview: "看进程轮流拿到时间片。",
    experiments: [
      { title: "CPU 进程调度", prompt: "让三个进程轮流跑。" },
      { title: "内存分配", prompt: "给新进程找一块空地。" },
      { title: "页面置换", prompt: "内存满了，先换哪一页？" },
    ],
  },
  {
    slug: "networks",
    title: "计算机网络",
    icon: "lucide:network",
    introduction: "跟着一个包，走一趟网络。",
    preview: "看数据包在节点之间转发。",
    experiments: [
      { title: "数据包传输", prompt: "发一个包，看看它到哪。" },
      { title: "路由选择", prompt: "同一个终点，有几条路？" },
      { title: "网络延迟与丢包", prompt: "调慢链路，再发一次。" },
    ],
  },
  {
    slug: "programming",
    title: "程序设计与内存",
    icon: "lucide:code-xml",
    introduction: "跑一行代码，看看内存变了啥。",
    preview: "看函数入栈，再看它返回。",
    experiments: [
      { title: "C/C++ 变量", prompt: "改个数，看看存在哪里。" },
      { title: "指针与内存", prompt: "顺着地址，找到那个值。" },
      { title: "函数调用栈", prompt: "进一个函数，再退回来。" },
    ],
  },
  {
    slug: "databases",
    title: "数据库原理",
    icon: "lucide:database",
    introduction: "一条查询，怎么找到那行？",
    preview: "沿索引树，找到键值 32。",
    experiments: [
      { title: "SQL 查询执行", prompt: "写条查询，看看先做哪步。" },
      { title: "索引查找", prompt: "顺着索引，找到目标行。" },
      { title: "B+ 树", prompt: "插入一个键，看看树怎么变。" },
    ],
  },
  {
    slug: "ai",
    title: "人工智能基础",
    icon: "lucide:scan-line",
    introduction: "给一堆散点，看看怎么分组。",
    preview: "看散点分组，再给新点归类。",
    experiments: [
      { title: "K-Means 聚类", prompt: "挪动中心，看散点怎么分。" },
      { title: "KNN 分类", prompt: "看邻居，给新点分个类。" },
      { title: "梯度下降", prompt: "换个步长，试试能否下坡。" },
    ],
  },
];

export function getCourse(slug: string) {
  return courses.find((course) => course.slug === slug);
}
