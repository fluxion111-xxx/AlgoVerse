import type { DeepLesson } from "./types";

export const translationCacheLesson: DeepLesson = {
  title: "地址转换缓存",
  intro: "程序连续读同一页。偏移不断变化，页号却相同。硬件可以暂存一次翻译，省去下一次查页表。",
  goals: ["区分 TLB 的命中和缺页。", "手算小容量 LRU 缓存。", "理解复用规律与切换边界。"],
  blocks: [
    { id: "lookup", kind: "explain", title: "缓存的是地址翻译", paragraphs: [
      "TLB 缓存近期的页号映射。命中时可直接取出页框号。随后加回页内偏移。",
      "一页内的地址共享同一页号。因此在同页读多个字节时，有机会复用一条翻译。",
      "TLB 未命中表示翻译缓存缺项。有效页表可以补上它。访问是否触发缺页，要检查页表与系统状态。",
    ] },
    { id: "trace", kind: "steps", title: "两条缓存怎样淘汰", steps: [
      { label: "先看 1、1", text: "第一次查页表，缓存页 1。第二次复用它，得到一次命中。" },
      { label: "再读 2、1", text: "页 2 查表后放入。随后命中 1，把 1 变成最新项。此刻 2 比 1 更久没用。" },
      { label: "读页 3", text: "缓存已满。按 LRU 淘汰页 2，加入 3。最后再读 1，仍然命中。六次共命中三次。" },
      { label: "改成循环访问", text: "选择 1、2、3、1、2、3。容量仍为 2。每次回到旧页前，它都已淘汰。六次都要查表。" },
    ] },
    { id: "engineering", kind: "explain", title: "什么时候结果会失效", paragraphs: [
      "切换地址空间后，相同页号可能映到不同页框。实现可用地址空间标识区分。没有适用标识时，也可清除相关缓存项。",
      "若系统修改页表，旧缓存可能留下过期权限。应按目标硬件规则使相关项失效。映射变了，旧翻译就不能继续用。",
      "演示用固定页序列和全相联 LRU。页表映射都有效。不同处理器可能采用其他替换策略。",
    ] },
  ],
  demo: "tlb-trace",
  exercises: [
    { id: "deep-tlb-entry", level: "基础", kind: "single", prompt: "TLB 主要缓存什么？", options: ["虚拟页的地址翻译", "程序的磁盘文件", "每个字节的数据值"], answer: 0,
      explanation: "翻译缓存记录页映射，数据缓存存放数据。", wrong: "先区分翻译和数据。", review: "lookup" },
    { id: "deep-tlb-hits", level: "应用", kind: "integer", prompt: "默认序列用两条 TLB 项。总命中几次？", answer: 3,
      explanation: "第 2、4、6 次访问页 1 都命中。", wrong: "命中也会更新最近使用顺序。", review: "trace" },
    { id: "deep-tlb-invalid", level: "挑战", kind: "multiple", prompt: "下面哪些说法成立？", options: ["同页不同偏移可复用翻译", "TLB 未命中一定缺页", "带地址空间标识的 TLB 可区分地址空间", "页表修改后可能需要失效旧项"], answer: [0, 2, 3],
      explanation: "未命中可以查到有效翻译。不同地址空间的同页号不一定相同。",
      wrong: "区分缺少缓存和缺少有效映射。", review: "engineering" },
  ],
  recap: ["TLB 暂存翻译。", "未命中可继续查页表。", "映射变化后清除旧翻译。"],
  extension: "改变缓存容量和序列。再分析多级页表如何节省空间。",
  next: "multilevel-page-table-sparse",
  sources: [{ title: "OSTEP · Paging: Faster Translations", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf" }],
};
