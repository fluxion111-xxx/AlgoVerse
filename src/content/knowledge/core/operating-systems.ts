import { concept as topic } from "./types";

const os = { title: "UW–Madison · Operating Systems: Three Easy Pieces", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/" };
const riscv = { title: "RISC-V · Unprivileged ISA", href: "https://docs.riscv.org/reference/isa/unpriv/unpriv-index.html" };
const nand = { title: "Nand to Tetris · Course Projects", href: "https://www.nand2tetris.org/course" };

export const systems = [
  topic("digital-logic", "binary-representation", "twos-complement", "定宽二进制补码", "基础", "最高位带负权。", "w 位补码的范围是 −2^(w−1) 到 2^(w−1)−1。位宽变大时，符号扩展复制最高位。", nand),
  topic("digital-logic", "boolean-algebra", "de-morgan-gates", "德摩根律与门电路", "基础", "否定一个组合条件。", "取反会交换与和或。逐项取反后，再使用交换后的运算。", nand, ["predicate-quantifiers"]),
  topic("digital-logic", "combinational-circuits", "binary-full-adder", "一位全加器", "基础", "三个输入产生和位与进位。", "和位等于三个输入的异或。至少两个输入为一时，进位为一。", nand, ["de-morgan-gates"]),
  topic("digital-logic", "sequential-circuits", "clocked-register", "时钟边沿与寄存器", "基础", "寄存器跨时钟周期保存值。", "边沿触发寄存器在指定边沿采样。输入须满足建立时间和保持时间。", nand, ["de-morgan-gates"]),
  topic("computer-organization", "machine-data", "byte-order", "大端与小端字节序", "基础", "多字节数可按两种方向存放。", "大端把最高有效字节放在低地址。小端把最低有效字节放在低地址。", riscv, ["twos-complement"]),
  topic("computer-organization", "instruction-sets", "load-store-isa", "加载与存储指令集", "基础", "先把值读入寄存器再计算。", "在典型加载存储架构中，访存由加载或存储指令完成。算术指令主要操作寄存器。", riscv, ["clocked-register"]),
  topic("computer-organization", "assembly", "calling-convention", "汇编调用约定", "进阶", "函数间要约好传值和保存规则。", "调用约定规定参数、返回值和需保存的寄存器。调用者保存与被调用者保存是两类责任。", riscv, ["load-store-isa", "recursion-stack"]),
  topic("computer-architecture", "performance", "cpu-cpi", "CPI 与 CPU 执行时间", "基础", "把指令数、CPI 和周期相乘。", "CPI 是每条指令的平均周期数。时钟更快时，仍要看指令数和平均 CPI 是否改变。", nand, ["load-store-isa"]),
  topic("computer-architecture", "pipeline", "pipeline-hazards", "流水线相关与旁路", "进阶", "后续指令可能先等前面的值。", "读后写依赖可能让操作数还未就绪。旁路可提前送值，部分依赖仍需停顿。", nand, ["cpu-cpi"]),
  topic("computer-architecture", "caches", "cache-locality", "缓存的时间与空间局部性", "基础", "最近访问和邻近地址常被再次访问。", "缓存行一次取来一段相邻字节。重复读同一地址和顺序扫描利用了不同局部性。", os, ["array-indexing"]),
  topic("computer-architecture", "memory-hierarchy", "cache-hit-latency", "平均访存时间", "进阶", "命中时间上再计未命中开销。", "若未命中惩罚定义为额外等待，平均访存时间等于命中时间加未命中率乘惩罚。", os, ["cache-locality", "expected-value"]),
  topic("processes", "kernel-entry", "system-call-boundary", "系统调用与特权切换", "基础", "用户程序向内核请求服务。", "系统调用通过受控入口转到内核。内核验证请求后再访问受保护资源。", os),
  topic("processes", "process-thread", "process-thread-sharing", "进程与线程的资源边界", "基础", "同一进程的线程共享地址空间。", "每个线程有自己的寄存器上下文和栈。进程边界通常隔离虚拟地址空间。", os, ["system-call-boundary"]),
  topic("processes", "synchronization", "mutex-critical-section", "互斥锁与临界区", "基础", "只让一个线程同时改共享状态。", "读、计算、写三步可能交错。锁覆盖整个读改写区间，才可防止丢失更新。", os, ["process-thread-sharing"]),
  topic("processes", "deadlocks", "deadlock-resource-order", "死锁条件与固定加锁顺序", "进阶", "用统一次序打破循环等待。", "固定全局锁顺序时，等待边只能从小序号指向大序号。仅由这些锁构成的等待环无法形成。", os, ["mutex-critical-section"]),
  topic("memory-management", "demand-paging", "page-fault", "缺页异常与按需调页", "进阶", "访问尚未驻留的合法页时触发异常。", "内核先检查访问是否合法。有效缺页可分配或装入页面，再重试指令。", os, ["virtual-pages", "system-call-boundary"]),
  topic("memory-management", "replacement", "page-replacement-lru", "FIFO 与 LRU 页面置换", "进阶", "比较最早装入与最久未访问。", "FIFO 按装入时间选牺牲页。LRU 按最后使用时间选页，两者对同一访问序列可能不同。", os, ["page-fault"],
    [{ engineId: "page-replacement", label: "比较三种页面置换", prompt: "把页框从 3 改成 4。看 FIFO 缺页怎么变。" }]),
  topic("file-systems", "file-interfaces", "file-descriptors", "文件描述符与打开文件", "基础", "描述符是进程内的整数句柄。", "打开文件返回描述符。复制描述符可共享同一打开文件描述，从而共享偏移。", os, ["system-call-boundary"]),
  topic("file-systems", "on-disk-layout", "inode-directory-entry", "目录项与 inode", "基础", "文件名经目录项找到 inode。", "inode 保存文件元数据和数据位置。硬链接让多个目录项引用同一 inode。", os, ["file-descriptors"]),
  topic("file-systems", "crash-consistency", "file-system-journaling", "文件系统日志与崩溃恢复", "进阶", "先记修改，再更新原位置。", "恢复时依据日志中的提交信息重放已完成事务。日志覆盖范围取决于所用模式。", os, ["inode-directory-entry"]),
  topic("virtualization", "containers", "containers-shared-kernel", "容器的共享内核", "进阶", "容器隔离资源视图。", "常见容器共享宿主内核。命名空间隔离视图，控制组统计并限制资源用量。", os, ["process-thread-sharing"]),
];
