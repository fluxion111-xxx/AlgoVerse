import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const os = { title: "UW–Madison · Operating Systems: Three Easy Pieces", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/" };
const cpu = { title: "UC Berkeley · CS61C", href: "https://cs61c.org/" };

export const advancedSystems = [
  topic(["digital-logic", "sequential-circuits"], ["setup-hold-timing-window", "寄存器的建立与保持时间", "进阶"], ["clocked-register"], cpu,
    "采样边沿前后都要保持输入稳定。", "建立时间要求边沿前数据稳定。保持时间要求边沿后仍稳定。违例可使输出进入亚稳状态。",
    "判断输入在哪侧违反时序。", "触发边沿在 10ns。建立时间为 2ns。输入在 9ns 才变化，违反建立要求。", "建立和保持分别约束边沿两侧。只检查时钟周期还不够。",
    ["边沿刚过，输入太早变化。主要违反什么？", ["保持时间", "指令吞吐量", "建立时间"], 0, "保持时间要求边沿之后继续稳定一小段时间。"]),
  topic(["computer-architecture", "pipeline"], ["pipeline-load-use-stall", "流水线中的加载使用停顿", "进阶"], ["pipeline-hazards", "load-store-isa"], cpu,
    "旁路也要等数据真正产生。", "典型五级流水线中，加载数据到访存末尾才可用。紧随其后的指令可能在更早时需要值，因此要停一拍。",
    "标出紧邻加载的读后写依赖。", "先 lw t0，再 add 使用 t0。若数据来不及旁路给 add 的执行级，就插入气泡。", "是否停顿取决于流水级时序。不能只看有没有旁路。",
    ["值还没产生，下一条就要用。典型处理是什么？", ["提前读取旧值", "停顿，等新值可用", "删除下一条指令"], 1, "等待确保后继读到本次加载结果，而不是旧值。"]),
  topic(["processes", "synchronization"], ["compare-and-swap-retry", "原子比较交换与重试", "进阶"], ["mutex-critical-section"], os,
    "只有当前值仍等于预期才更新。", "CAS 将比较与写入做成一个原子操作。失败后可读取新值重算。某些算法还要处理 ABA 问题。",
    "判断竞争写入时 CAS 能否成功。", "线程读到 5，计划写 6。另一线程先改为 7。预期仍为 5 的 CAS 失败。", "CAS 的原子性只覆盖这一次操作。整个循环仍需检查进展与数据生命周期。",
    ["预期值 5，当前为 7。普通 CAS 尝试写 6，结果如何？", ["强制写 6", "把当前值改回 5", "比较失败，保留 7"], 2, "当前值不同于预期，原子写入条件未满足。"]),
  topic(["memory-management", "replacement"], ["clock-page-reference-bit", "时钟置换的引用位", "进阶"], ["page-replacement-lru"], os,
    "近期访问过的页先给一次机会。", "指针环形扫页帧。引用位为一时清零并跳过。遇到引用位为零的候选时可置换。",
    "跟踪指针经过两个页帧。", "指针从 A 开始，A 引用位一，B 为零。先清 A，再换出 B。", "时钟算法近似 LRU。它并不维护每次访问的完整次序。",
    ["从 A 开始，A 位为一、下一帧 B 为零。先换谁？", ["B", "A", "都不换"], 0, "A 清位后获得一次机会，B 的零位满足淘汰条件。"]),
  topic(["file-systems", "storage-devices"], ["hdd-seek-rotation-latency", "磁盘寻道与旋转延迟", "基础"], ["file-descriptors"], os,
    "机械盘先移动磁头，再等扇区转来。", "访问时间可拆为寻道、旋转等待和传输。连续读取常能摊薄前两项。固态盘没有机械转动。",
    "比较小随机读和连续读的开销。", "两次读相邻块通常比读分散磁道更省寻道。总字节数相同也可能不同速。", "吞吐率不能直接代替单请求延迟。短请求常受固定成本主导。",
    ["等待目标扇区转到磁头下，属于什么？", ["写放大", "旋转延迟", "页表查找"], 1, "磁头到位后仍需等盘片转到正确位置。"]),
  topic(["virtualization", "virtual-resources"], ["virtio-shared-queue", "Virtio 的共享队列", "拓展"], ["guest-trap-hypervisor"], { title: "OASIS · Virtual I/O Device 1.2", href: "https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html" },
    "来宾和后端通过队列交换请求。", "驱动放入缓冲区描述，再按协议通知设备。设备处理后更新已用队列。双方要遵守内存可见顺序。",
    "指出描述符何时能被安全复用。", "来宾提交收包缓冲。后端写入并报告完成后，来宾才消费。", "通知不等于已完成。要查看队列进度和描述符所有权。",
    ["来宾刚发布一个缓冲区。何时能按完成结果读取？", ["发布前", "一发通知就保证完成", "设备报告该描述符已用后"], 2, "设备可能异步处理。完成队列才告诉来宾可消费结果。"]),
];
