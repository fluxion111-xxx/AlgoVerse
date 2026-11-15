import { lesson } from "@/content/knowledge/teaching/types";

export const operatingSystemsReview700 = {
  "de-morgan-gates": lesson("基础", "把带否定的组合逻辑改写成等价门。", "警报只在门窗都关时不响。响的条件是门开或窗开，等价于对“门窗都关”取反。", "取反时要换 AND 与 OR，并分别对输入取反。",
    { id: "practice", prompt: "NOT(A OR B) 等价于什么？", options: ["NOT A AND NOT B", "NOT A OR NOT B", "A AND B"], answer: 0, explanation: "OR 只要有真就为真。取反后，只有两个输入都假时才为真。" }),
  "binary-full-adder": lesson("基础", "把三个输入位拆成和位与进位。", "A=1、B=0、进位输入=1。总和是二进制 10，和位 0，进位 1。", "全加器还要读取低位进位。半加器没有这个输入。",
    { id: "practice", prompt: "三个输入都是 1，输出是什么？", options: ["和 0，进位 0", "和 1，进位 1", "和 1，进位 0"], answer: 1, explanation: "三个 1 的和是十进制 3，即二进制 11。" }),
  "clocked-register": lesson("基础", "用采样边沿解释寄存器为何保持旧值。", "上升沿时输入为 1。之后输入变成 0，但输出保持 1，直到下个上升沿采到 0。", "边沿触发的寄存器在有效边沿之间不会一直跟随输入。",
    { id: "practice", prompt: "理想上升沿寄存器的输入只在两个上升沿之间短暂为 1。一定会输出 1 吗？", options: ["一定", "不一定，可能没有采到", "一定，因为它在下降沿采样"], answer: 1, explanation: "短脉冲若未覆盖有效采样时刻，寄存器可能始终保持 0。" }),
  "byte-order": lesson("基础", "从地址递增方向读取多字节数。", "存放 0x1234 时，大端先存 12，小端先存 34。", "字节序交换字节的位置。它不颠倒单个字节里的位。",
    { id: "practice", prompt: "地址从低到高依次是 78、56、34、12。按小端读出什么？", options: ["0x78563412", "0x12345678", "0x87654321"], answer: 1, explanation: "低地址放最低有效字节。最高有效字节是末尾的 12。" }),
  "load-store-isa": lesson("基础", "识别哪些指令接触内存。", "先用 load 把内存值装入 r1。用寄存器加法得到 r2。最后用 store 写回。", "加法指令能改寄存器，不意味着它直接写内存。",
    { id: "practice", prompt: "已把和算到寄存器。若要改内存，应执行什么？", options: ["store", "load", "再次 add"], answer: 0, explanation: "store 把寄存器的值写到内存地址。" }),
  "calling-convention": lesson("进阶", "区分调用者保存与被调用者保存。", "调用者要在函数返回后继续用临时寄存器 t0。若约定 t0 由调用者保存，就应先保存它。", "寄存器名字和职责因架构及 ABI 而异。应先查目标 ABI。",
    { id: "practice", prompt: "若 ABI 规定某寄存器由被调用者保存，谁负责恢复它？", options: ["调用者", "改动它的被调用者", "操作系统调度器"], answer: 1, explanation: "被调用者可以暂用它，但在返回前须恢复调用前的值。" }),
  "cpu-cpi": lesson("基础", "同时用指令条数、CPI 和频率估算用时。", "一亿条指令，平均 CPI=2，频率 1 GHz。需要两亿周期，耗时 0.2 秒。", "时钟更快仍可能更慢。指令数和 CPI 也会变。",
    { id: "practice", prompt: "在其他量不变时，CPI 从 2 降为 1，执行时间怎样变？", options: ["减半", "不变", "翻倍"], answer: 0, explanation: "周期数等于指令数乘 CPI，周期数减半。" }),
  "pipeline-hazards": lesson("进阶", "区分可旁路的数据与必须等待的数据。", "上一条加法在执行级已得到结果。后续指令可直接读取旁路，无须等写回。", "旁路只搬运已算出的值。加载值还未从内存返回时仍可能停顿。",
    { id: "practice", prompt: "所需的值还未产生，旁路能立即消除等待吗？", options: ["能", "不能", "只要时钟够快就能"], answer: 1, explanation: "数据尚不可用。消费者仍需等值产生。" }),
  "file-system-journaling": lesson("进阶", "用提交记录判断崩溃后的重放边界。", "日志已写入变更块，提交记录却未落盘。恢复可忽略该笔未完成变更。", "元数据日志不能保证每个文件的数据内容都保留。要看数据写入策略。",
    { id: "practice", prompt: "一笔日志事务没有完整提交记录，恢复应怎么办？", options: ["按完整事务重放", "忽略该笔未提交事务", "删除全部旧文件"], answer: 1, explanation: "提交记录用于区分可安全重放的事务与写到一半的事务。" }),
  "containers-shared-kernel": lesson("进阶", "识别容器边界与共享的宿主内核。", "两个 Linux 容器可使用不同用户空间发行版。系统调用仍由同一宿主 Linux 内核处理。", "隔离了进程视图并不等于启动了第二个内核。",
    { id: "practice", prompt: "容器里更换用户空间发行版，会自动更换处理系统调用的内核吗？", options: ["会", "不会", "仅更换 shell 时会"], answer: 1, explanation: "镜像主要提供用户空间。常规 Linux 容器共享宿主内核。" }),
};
