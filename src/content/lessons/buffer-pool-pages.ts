import type { DeepLesson } from "./types";

export const bufferPoolLesson: DeepLesson = {
  title: "数据库页与缓冲池",
  intro: "两次查询都要读页 7。第二次是否还需读取存储？跟着有限页框走一遍。",
  goals: ["区分数据库页和内存页框。", "从访问串计算命中与换出。", "理解固定页对替换的约束。"],
  blocks: [
    { id: "lookup", kind: "explain", title: "先查页号是否已经驻留", paragraphs: [
      "数据库按页管理记录。缓冲池的页框用于放已装入的页。目录把逻辑页号映射到驻留页框。",
      "请求命中时可复用内存页。未命中时要找空框或换出候选，再从下层读取。",
      "正在使用的页通常会被固定。替换要避开这些页。教学轨迹假定只读，每一步用完就解除固定。",
    ] },
    { id: "trace", kind: "steps", title: "让六次访问共享两个页框", steps: [
      { label: "从空框开始", text: "依次请求 7、8、7、9、7、8。前两次分别读入 7 和 8。第三次请求 7 命中，刚用过的页变得更新。" },
      { label: "为新页腾出位置", text: "第四次读页 9。两框已满，LRU 换出较久没有访问的 8。此时 7 和 9 驻留。" },
      { label: "重访两种旧页", text: "第五次读取 7 命中。最后请求 8，它已换出。需要重新读入，此时换出 9。总共 2 次命中、4 次读入。" },
      { label: "加一框再跑", text: "三个不同页可同时放下。每页只读入一次，合计 3 次读入。若改为连续扫描六个不同页，仍会读入 6 次。" },
    ] },
    { id: "limits", kind: "explain", title: "理解演示里的读入计数", paragraphs: [
      "面板复用站内 LRU，按读入页次统计。真实数据库的一次缓冲池未命中，可能仍能由操作系统缓存提供。",
      "未解除固定的页不能参加本轮替换。若所有页框都不可替换，系统需等待或采取其他策略。",
      "修改过的脏页还涉及写回和日志约束。本面板没有加入修改操作。下一节再用这些条件判断候选。",
    ] },
  ],
  demo: "database-buffer-pool",
  exercises: [
    { id: "deep-buffer-hit", level: "基础", kind: "single", prompt: "页已驻留时，缓冲池怎么处理？", options: ["复用对应页框", "必定重新读入", "先删所有同表页"],
      answer: 0, explanation: "目录查询命中，当前请求可以使用已有页。", wrong: "先查页目录。", review: "lookup" },
    { id: "deep-buffer-read-count", level: "应用", kind: "integer", prompt: "默认两框模型中，共读入几页次？", answer: 4,
      explanation: "读入的是 7、8、9，再次读入 8。第三与第五步都命中。", wrong: "区分不同页数和读入次数。", review: "trace" },
    { id: "deep-buffer-scope", level: "挑战", kind: "multiple", prompt: "哪些判断有依据？",
      options: ["固定页应避开替换", "一次未命中必等于一次物理磁盘读", "连续扫描可没有命中", "脏页还需核对写回条件"],
      answer: [0, 2, 3], explanation: "页框状态限制替换。缓冲池与更下层缓存是不同的统计范围。", wrong: "对齐页状态、策略与计数口径。", review: "limits" },
  ],
  recap: ["页号用于查驻留位置。", "复用可减少重复读入。", "替换要考虑固定和写回。"],
  extension: "先加到三框，再改成连续扫描。下一节看固定与脏页怎样影响淘汰。",
  next: "buffer-pool-pin-dirty",
  sources: [{ title: "UC Berkeley CS 186 · Buffer Management", href: "https://cs186berkeley.net/notes/note5/" }],
};
