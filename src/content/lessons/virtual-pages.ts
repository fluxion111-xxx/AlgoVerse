import type { DeepLesson } from "./types";

export const virtualPagesLesson: DeepLesson = {
  title: "虚拟页与页表",
  intro: "程序读地址 4101。硬件为何可能去物理地址 12293？先拆页号，再查页表。",
  goals: ["算出页号和页内偏移。", "用页表恢复物理地址。", "识别未映射页与越页访问。"],
  blocks: [
    { id: "mapping", kind: "explain", title: "页和页框各在哪？", paragraphs: [
      "程序使用虚拟地址。进程看到自己的地址空间。操作系统把它切成等大的虚拟页。",
      "物理内存用同样大小的槽。每个槽叫页框。页表记录哪个虚拟页映到哪个页框。连续虚拟页可以落在相隔很远的页框。",
      "用固定大小的页便于选空闲页框。访问页里的具体字节时，仍使用原来的偏移。页表只替换页号对应的部分。",
    ], formula: "页号 VPN = floor(虚拟地址 / 页大小)\n偏移 offset = 虚拟地址 mod 页大小\n物理地址 = 页框号 PFN × 页大小 + offset" },
    { id: "trace", kind: "steps", title: "换算虚拟地址 4101", steps: [
      { label: "用除法拆开", text: "页大小为 4096。4101 等于 1×4096+5。虚拟页号是 1，偏移是 5。" },
      { label: "只拿页号查表", text: "模型将页 1 映到页框 3。页表索引是 1。偏移 5 不参与查表。" },
      { label: "拼出物理字节地址", text: "页框 3 从 12288 开始。向后数 5 字节，得到 12293。" },
      { label: "跨过边界再查一次", text: "8191 仍在第 1 页。8192 已在第 2 页。两次查到的物理页框可能不同。" },
    ] },
    { id: "bits", kind: "explain", title: "为什么硬件常用位运算", paragraphs: [
      "4096 是 2 的 12 次方。因此低 12 位是偏移。高位可用右移提取。两种算法得到同一结果。",
      "页面权限也可能影响翻译。有效映射且访问获许可时，硬件可得物理地址。查无映射或越权时，处理器会报告异常。",
      "查表也要访存。频繁翻译会多出访问成本。后面学习的 TLB 会缓存常用翻译。",
      "演示固定四条页表映射。它展示地址算术。实际系统还要看进程和访问权限。",
    ], formula: "页大小 = 2^k 字节时：VPN = VA >> k，offset = VA & (2^k − 1)" },
  ],
  demo: "page-address",
  exercises: [
    { id: "deep-pages-offset", level: "基础", kind: "single", prompt: "查到页框后，哪部分保持原样？", options: ["虚拟页号", "页内偏移", "整个虚拟地址"], answer: 1,
      explanation: "两边的页与页框大小相同。页内位置不必变化。", wrong: "翻译只改变页的归属。", review: "mapping" },
    { id: "deep-pages-address", level: "应用", kind: "integer", prompt: "页大小 4096。虚拟地址 4101。页 1 映到页框 3。物理地址是多少？", answer: 12293,
      explanation: "先拆出偏移 5。页框起点 3×4096=12288。加 5 得 12293。", wrong: "先找页框起点。再加原偏移。", review: "trace" },
    { id: "deep-pages-edge", level: "挑战", kind: "multiple", prompt: "页大小为 4096。以下哪些说法成立？", options: ["8191 的偏移为 4095", "8192 与 8191 同页", "低 12 位给出偏移", "连续虚拟页可以映到不相邻页框"], answer: [0, 2, 3],
      explanation: "8192 恰好跨页。2^12 是页大小。虚拟连续由页表维护。",
      wrong: "按 4096 的整数倍检查边界。", review: "bits" },
  ],
  recap: ["整除得页号，取余得偏移。", "页号查表，偏移原样保留。", "跨页要重新查表。"],
  extension: "把地址放在页边界两侧。再学习地址转换缓存。",
  next: "translation-cache",
  sources: [{ title: "OSTEP · Paging: Introduction", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf" }],
};
