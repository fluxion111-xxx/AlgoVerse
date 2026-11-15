import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const mit = { title: "MIT 6.004 · Computation Structures", href: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/" };
const os = { title: "UW–Madison · Operating Systems: Three Easy Pieces", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/" };
const benchmark = { title: "Google Benchmark · User Guide", href: "https://google.github.io/benchmark/user_guide.html" };
const rt = { title: "Linux Kernel · RT-mutex implementation design", href: "https://docs.kernel.org/locking/rt-mutex-design.html" };

export const system700 = [
  topic(["digital-logic", "boolean-algebra"], ["karnaugh-map-neighbors", "卡诺图相邻格与化简", "基础"], ["de-morgan-gates"], mit,
    "相邻格只差一个输入位。", "按格雷码排列行列。把相邻的 1 组成大小为 2 的幂的矩形。只保留组内不变的变量。",
    "用两个相邻格消去变化的变量。", "AB′ 和 AB 对应两格。B 变化而 A 不变，合起来就是 A。", "图的左右边缘也可相邻。斜对角格通常同时变两位。",
    ["AB′ 与 AB 合并后得到什么？", ["A", "B", "A+B"], 0, "提取 A 后，B′+B 恒为 1。"]),
  topic(["computer-organization", "datapath"], ["program-counter-next-address", "程序计数器的下一地址", "基础"], ["instruction-datapath-controls"], mit,
    "下一条可顺序执行或跳转。", "取指使用当前地址。控制逻辑根据指令长度、分支条件或跳转目标选择下一个地址。",
    "区分未跳转路径与分支目标。", "在只用四字节指令的例子里，PC=100。若条件分支不跳转，下个 PC 为 104。", "PC 的增量取决于指令长度。不能假定所有指令集都加 4。",
    ["当前地址 100，四字节分支跳到 140。条件成立时，下个地址是？", ["104", "140", "144"], 1, "分支采用已算出的目标地址。顺序地址仅在未跳转时用。"]),
  topic(["virtualization", "isolation-limits"], ["cold-warm-start-measure", "冷启动与热启动测量", "进阶"], ["container-vm-trust-boundary"], benchmark,
    "先确定计时起点和终点。", "冷启动可含实例创建和初始化。热启动重用已有进程或缓存。两者应分开测量，并记录初始状态。",
    "设计可复现的启动对比。", "镜像已下载时，从创建到健康检查就绪记一组。首次下载另记一组。", "一个热请求很快，不说明首次部署也快。不要把两组混成平均数。",
    ["只想比较镜像就绪后的启动开销，计时应从何时开始？", ["开始下载镜像", "创建实例", "收到第十个请求"], 1, "固定镜像就绪为前置条件，才能隔离实例启动开销。"]),
  topic(["memory-management", "replacement"], ["lru-stack-distance", "LRU 重用距离与命中", "进阶"], ["page-replacement-lru"], os,
    "数两次访问间出现的不同页。", "全相联 LRU 中，再访问某页时，若中间出现 k 个不同页，其重用距离为 k。容量严格大于 k 才能命中。",
    "从访问序列判断容量阈值。", "A、B、B、C、A。两次 A 之间只有 B、C 两种页。容量 3 命中，容量 2 缺页。", "重复访问同一中间页不增加距离。首次访问也不能套有限距离。",
    ["容量为 2，序列 A、B、B、A 的最后一次 A 如何？", ["命中", "缺页", "取决于第二次 B 的时刻"], 0, "中间只有 B，距离为 1，小于容量 2。"], undefined,
    [{ engineId: "page-replacement", label: "用 LRU 核对命中", prompt: "固定引用串，只改变页框数。" }]),
  topic(["processes", "synchronization"], ["mutex-priority-inheritance", "锁的优先级反转与继承", "进阶"], ["mutex-critical-section"], rt,
    "低优先级持锁者可暂时提权。", "高优先级任务等待低优先级持有的锁。中优先级任务若持续抢占持锁者，高优先级会被间接拖延。优先级继承可缓解。",
    "画出三任务互相阻塞的时序。", "L 持锁，H 等锁，M 抢占 L。让 L 暂用 H 的优先级，可让它先跑完临界区。", "继承不会消除锁等待。它减少无关中优先级任务造成的额外等待。",
    ["在上述场景，哪个任务临时提高优先级？", ["H", "M", "L"], 2, "L 持有 H 需要的锁。提高 L 的优先级有助于尽快释放锁。"]),
];
