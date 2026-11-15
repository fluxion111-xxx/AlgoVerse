import type { KnowledgeDomain } from "../../lib/knowledge";

export const operatingSystems = {
  id: "operating-systems",
  title: "操作系统",
  courses: [{
    id: "processes",
    title: "进程与调度",
    chapters: [{
      id: "cpu-dispatch",
      title: "分配 CPU",
      topics: [{
        id: "cpu-time-slices",
        title: "先来先服务与时间片轮转",
        summary: "三个进程等 CPU，谁先跑？",
        sections: [
          { title: "两种排法", paragraphs: ["先来先服务按到达顺序排。进程跑完，才轮到下一个。", "轮转给每次运行设上限。用完时间片，就去队尾。"] },
          { title: "用 2 个单位试试", paragraphs: ["让 3 个进程同时到达。运行时长设为 5、3、1。", "时间片设成 2。看响应时间，再数切换次数。"] },
        ],
        sources: [{ title: "OSTEP · Scheduling: Introduction", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf" }],
        relatedTopicIds: ["recursion-stack"],
        experiments: [{ engineId: "cpu-scheduling", label: "打开调度实验", prompt: "换个时间片，观察等待和切换。" }],
      }],
    }],
  }, {
    id: "memory-management",
    title: "内存管理",
    chapters: [{
      id: "address-translation",
      title: "地址转换",
      topics: [{
        id: "virtual-pages",
        title: "虚拟页与页表",
        summary: "把地址拆成页号和页内偏移。",
        sections: [
          { title: "页表记录什么", paragraphs: ["虚拟地址分成两段。先用页号查页表。", "找到物理页框，再加页内偏移。偏移保持原值。"] },
          { title: "换算一次地址", paragraphs: ["每页有 4096 字节。地址 4101 落在第 1 页。", "页号从 0 算，偏移是 5。假设它映射到页框 3。物理地址是 12293。"] },
        ],
        sources: [{ title: "OSTEP · Paging: Introduction", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf" }],
        relatedTopicIds: ["c-pointer-lifetime", "b-plus-index"],
        experiments: [],
      }, {
        id: "translation-cache",
        title: "地址转换缓存",
        summary: "常用的地址转换，可以先存一份。",
        sections: [
          { title: "省下什么", paragraphs: ["处理器先查 TLB。它缓存近期的地址映射。", "命中时可直接拿到页框。没命中，就要查页表。"] },
          { title: "连续读一段", paragraphs: ["假设每页 4096 字节。从地址 0 起，依次读 8 字节。", "这些字节共享同一个页号。一份映射就能覆盖。"] },
        ],
        sources: [{ title: "OSTEP · Paging: Faster Translations", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf" }],
        prerequisiteIds: ["virtual-pages"],
        experiments: [],
      }],
    }],
  }],
} satisfies KnowledgeDomain;
