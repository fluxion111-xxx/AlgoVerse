import type { DeepLesson } from "./types";

export const mglruAgingLesson: DeepLesson = {
  title: "多代 LRU 的年龄分组",
  intro: "A 原本最老。扫描却发现它刚被访问。只看旧标签回收，就会漏掉这次变化。",
  goals: ["用代号表达相对新旧。", "跟踪近期访问怎样提升候选。", "辨别教学模型和内核证据。"],
  blocks: [
    { id: "generations", kind: "explain", title: "先把页面按年龄分桶", paragraphs: [
      "多代 LRU 用多组页面表示相对新旧。同一代中的页可以有不同的精确访问时刻。",
      "老化负责找最近访问的证据。扫描页表时可检查访问位。发现年轻条目后清位，并更新相关页的代。",
      "回收通常从较老的候选代入手。真实内核还会考虑页类型、访问历史和回收反馈。",
    ] },
    { id: "trace", kind: "steps", title: "对照三页的一轮扫描", steps: [
      { label: "先给原始代号", text: "A 在第 3 代，B 在第 4 代，C 在第 5 代。同类页面先比较年龄。扫描前 A 最老。" },
      { label: "扫描观察到 A", text: "面板将 A 放进本轮年轻代 5。B、C 没有新的扫描证据，原代号保留。" },
      { label: "盘点剩下的候选", text: "有页的代只剩 4 与 5，最老的是 B 所在的 4。面板同时把下一轮代号推进到 6。" },
      { label: "再切到 A、B 都被发现", text: "A 和 B 都归到 5，C 原就在 5。三页暂时同代。仅凭代号不能判断具体先淘汰谁。" },
    ] },
    { id: "scope", kind: "explain", title: "分别读代号和实测指标", paragraphs: [
      "演示只固定三页，比较同类最老候选。它不会读取 Linux 内核，也不模拟实际的回收扫描范围。",
      "对照项调用站内精确 LRU。它先依次访问 A、B、C，再按 A、B 顺序重读本次发现的页。随后访问新页 D、E，记录两次换出。",
      "选中 A、B 时，三页在模型中同代。精确 LRU 则从指定访问顺序得出 C、A 两次换出。现实中的扫描并未给出这条确切顺序。",
      "真实排查要对齐 cgroup 和时间窗口。将回收、复访和压力放在一起观察，才能评估候选变化的影响。",
    ] },
  ],
  demo: "mglru-age-generations",
  exercises: [
    { id: "deep-mglru-observation", level: "基础", kind: "single", prompt: "扫描发现近期访问后，本例会怎么做？", options: ["把页归到较年轻代", "立刻删除该页", "按虚拟地址重排"],
      answer: 0, explanation: "近期访问是老化扫描提升页的依据。", wrong: "想一想刚使用的页应落在哪种候选代。", review: "generations" },
    { id: "deep-mglru-oldest", level: "应用", kind: "integer", prompt: "默认只发现 A。最老的有页代是几？",
      answer: 4, explanation: "A 从 3 提到 5。B 还在 4，C 仍在 5。最小的有页代号为 4。", wrong: "忽略已经空掉的代。", review: "trace" },
    { id: "deep-mglru-limit", level: "挑战", kind: "multiple", prompt: "哪些判断有依据？",
      options: ["同期页面可落在同一代", "同代号能推出精确淘汰顺序", "3 代变空后要看仍有页的代", "内核实测需结合复访和压力"],
      answer: [0, 2, 3], explanation: "代号提供粗粒度年龄。实际选择和性能需要更多证据。", wrong: "分开年龄分组和真实淘汰。", review: "scope" },
  ],
  recap: ["扫描发现近期访问。", "新证据能改变代号。", "年龄组只给候选范围。"],
  extension: "依次比较三种扫描结果。下一节将回收、复访和停顿一起核对。",
  next: "linux-reclaim-case-across-three-metrics",
  sources: [{ title: "Linux Kernel · Multi-Gen LRU", href: "https://docs.kernel.org/mm/multigen_lru.html" }],
};
