import { hainan, cs2023, sdjzu } from "./sources";
import { curriculumCourse as course } from "./types";

const ostep = { title: "UW–Madison · Operating Systems: Three Easy Pieces", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/" };

export const systemCurriculum = [
  course("digital-logic", "数字逻辑", [hainan, sdjzu, cs2023], [
    ["binary-representation", "二进制与补码", "位权、定点数、溢出"],
    ["boolean-algebra", "布尔代数与逻辑门", "真值表、德摩根律、卡诺图"],
    ["combinational-circuits", "组合逻辑", "译码器、多路选择器、加法器"],
    ["sequential-circuits", "时序逻辑", "触发器、时钟、寄存器与计数器"],
    ["state-machines", "有限状态机电路", "状态编码、Moore 与 Mealy、时序约束"],
  ]),
  course("computer-organization", "计算机组成原理", [hainan, sdjzu, cs2023], [
    ["machine-data", "机器数据表示", "整数运算、浮点格式、字节序"],
    ["instruction-sets", "指令集与寻址", "指令编码、寄存器、寻址方式"],
    ["assembly", "汇编与调用约定", "条件转移、栈帧、参数传递"],
    ["datapath", "数据通路与控制", "ALU、控制信号、取指与写回"],
    ["io", "总线、中断与 DMA", "设备寄存器、中断处理、直接内存访问"],
  ]),
  course("computer-architecture", "处理器与存储层次", [hainan, cs2023], [
    ["performance", "性能与度量", "时钟周期、CPI、吞吐与延迟"],
    ["pipeline", "指令流水线", "流水级、结构冲突、旁路、分支预测"],
    ["caches", "缓存与局部性", "组相联、替换策略、写回与直写"],
    ["memory-hierarchy", "存储层次与带宽", "寄存器、缓存、DRAM、持久存储"],
    ["multicore", "多核与一致性", "缓存一致性、内存顺序、并行加速"],
    ["pipeline-cache-analysis", "流水线与缓存联合分析", "有效 CPI、分支代价、多级未命中、停顿重叠、计数器"],
    ["out-of-order-execution", "乱序执行与顺序提交", "寄存器重命名、保留站、ROB、精确异常与加载存储队列"],
    ["mesi-coherence", "MESI 缓存一致性", "状态转换、读共享、写失效、脏行转移与一致性边界"],
    ["directory-coherence", "目录式缓存一致性", "归属节点、共享者目录、定向失效、转发与确认"],
  ]),
  course("processes", "进程与调度", [hainan, ostep], [
    ["kernel-entry", "系统调用与内核态", "特权级、陷入、异常与中断"],
    ["process-thread", "进程与线程", "地址空间、线程栈、状态迁移"],
    ["cpu-dispatch", "分配 CPU", "FCFS、轮转、抢占、响应时间"],
    ["synchronization", "同步与互斥", "锁、信号量、条件变量、临界区"],
    ["deadlocks", "死锁与进程通信", "资源等待、死锁条件、管道、共享内存"],
    ["syscall-tracing", "系统调用跟踪与排障", "strace、返回值、描述符、阻塞与子进程"],
  ]),
  course("memory-management", "内存管理", [hainan, ostep], [
    ["address-spaces", "虚拟地址空间", "重定位、保护、分页与分段"],
    ["address-translation", "地址转换", "页表、页内偏移、TLB"],
    ["demand-paging", "按需分页", "缺页、写时复制、内存映射"],
    ["replacement", "页面置换", "FIFO、LRU、工作集与抖动"],
    ["fault-diagnostics", "缺页与内存压力排查", "轻重缺页、进程计数、常驻页、回收停顿"],
    ["linux-reclaim", "Linux 内存回收", "后台与直接回收、文件页与匿名页、回收效率、控制组和复访"],
  ]),
  course("file-systems", "文件系统", [hainan, ostep], [
    ["file-interfaces", "文件与目录接口", "描述符、路径解析、链接"],
    ["on-disk-layout", "磁盘上的布局", "inode、目录项、空闲空间"],
    ["storage-devices", "存储设备与 I/O", "硬盘寻道、SSD、缓冲与队列"],
    ["linux-device-io", "Linux 设备 I/O 路径", "页缓存、直接 I/O、块层多队列、DMA、块事件与延迟"],
    ["crash-consistency", "崩溃一致性", "写入顺序、日志、同步与恢复"],
    ["durable-file-updates", "文件写入与持久化", "短写、同步边界、原子替换、目录同步"],
    ["filesystem-repair", "文件系统检查与修复", "一致性检查、孤儿 inode、校验和与快照"],
    ["crash-testing", "崩溃重现与验收", "持久化边界、故障注入、恢复后检查"],
  ]),
  course("virtualization", "虚拟化与容器", [cs2023, ostep], [
    ["hypervisors", "虚拟机与管理程序", "特权指令、来宾系统、硬件辅助"],
    ["virtual-resources", "虚拟内存与设备", "嵌套页表、虚拟 I/O、资源调度"],
    ["containers", "容器与资源隔离", "命名空间、控制组、镜像层"],
    ["isolation-limits", "隔离边界与开销", "共享内核、启动成本、性能测量"],
  ]),
];
