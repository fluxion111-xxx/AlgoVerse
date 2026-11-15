import type { DeepLesson } from "./types";

export const sortingLesson: DeepLesson = {
  title: "冒泡排序与快速排序",
  intro: "要把成绩从低到高排好。反复交换相邻项，还是先挑一个基准？同一组输入能看清两者的取舍。",
  goals: ["跟踪一次冒泡和快排分区。", "区分比较、交换和运行时间。", "解释为什么输入顺序影响成本。"],
  blocks: [
    { id: "mechanism", kind: "steps", title: "两种方法怎么走", steps: [
      { label: "冒泡扫描", text: "从左往右比较相邻项。左项更大就交换。每趟结束后，最大的待排项已经移到右端。" },
      { label: "缩短待排区", text: "右端已就位，下趟不再检查它。如果一整趟都没有交换，待排区已非降序，可以提前结束。" },
      { label: "快排先分区", text: "本实验取末项为基准。从左边扫描，比基准小或相等的项放进左区。扫描后把基准放到分界处。" },
      { label: "分别排子区", text: "基准已经就位，只需递归处理左右两区。空区或单项都能直接返回。" },
    ] },
    { id: "worked", kind: "steps", title: "手算序列 3、1、2", steps: [
      { label: "冒泡的第一趟", text: "比较 3 和 1，再比较 3 和 2，两次都交换。得到 1、2、3。" },
      { label: "冒泡再检查一对", text: "下一趟只比较 1 和 2，随后结束。合计比较 3 次，交换 2 次。" },
      { label: "快排比较基准 2", text: "3 留在右区。扫描到 1 时与前面的 3 交换。最后把基准 2 与 3 交换。比较 2 次，交换 2 次。" },
    ] },
    { id: "code", kind: "code", title: "读懂提前停止", language: "Python",
      source: "def bubble(values):\n    a = list(values)\n    for end in range(len(a) - 1, 0, -1):\n        moved = False\n        for i in range(end):\n            if a[i] > a[i + 1]:\n                a[i], a[i + 1] = a[i + 1], a[i]\n                moved = True\n        if not moved:\n            break\n    return a",
      notes: [
        { lines: "1–2", text: "复制输入，保留原序列。" },
        { lines: "3–5", text: "end 是本趟右边界。检查边界左侧的相邻对。" },
        { lines: "6–8", text: "只交换严格逆序的相邻项。相等项不换。" },
        { lines: "9–11", text: "没发生交换，就提前结束并返回。" },
      ] },
    { id: "cost", kind: "explain", title: "输入顺序会改答案", paragraphs: [
      "升序输入让这版冒泡比较 n−1 次就停。逆序输入无法提前终止。各趟比较数加起来为 n(n−1)/2。",
      "快排每次分区要扫描子区。分区若接近平衡，约有 log₂ n 层，每层总扫描量与 n 同阶。末项基准碰到升序输入时，总把最大值选为基准。子区只缩小一项，比较数仍达平方阶。",
      "图里的次数是确定值。真实耗时还受运行环境和数据表示影响。两个算法的计数口径要一致，本实验不计同一索引与自身交换。",
    ], formula: "提前停止的冒泡：最好 Θ(n)，最坏 Θ(n²)\n末项基准快排：平衡 Θ(n log n)，最坏 Θ(n²)" },
  ],
  demo: "sorting",
  exercises: [
    { id: "deep-bubble-comparisons", level: "基础", kind: "integer", prompt: "输入 3、1、2，冒泡共比较多少次？", answer: 3,
      explanation: "首趟两次，第二趟一次，总共三次。", wrong: "首趟排好后，还会做下一趟检查。", review: "worked" },
    { id: "deep-bubble-break", level: "应用", kind: "code", prompt: "哪条条件能使示例冒泡提前结束？", options: ["一趟没有交换", "第一对没有交换", "本趟交换过一次"], answer: 0,
      explanation: "只有完整扫描待排区，才知道是否存在相邻逆序。", wrong: "一次比较不能代表整趟。", review: "code" },
    { id: "deep-pivot-order", level: "挑战", kind: "multiple", prompt: "升序且元素互异时，哪些说法成立？",
      options: ["冒泡只扫一趟", "末项基准快排每次都近似平分", "末项基准快排会退化到平方阶"], answer: [0, 2],
      explanation: "冒泡第一趟不交换。末项快排总取最大值，左子区只缩小一项。", wrong: "先找出升序数组的末项。", review: "cost" },
  ],
  recap: ["冒泡处理相邻逆序。", "快排靠基准把问题拆小。", "同一算法遇到不同输入，成本也会变。"],
  extension: "接下来看看比较本身能区分多少种排列。",
  next: "comparison-sort-decision-tree",
  sources: [{ title: "NIST · 冒泡排序", href: "https://xlinux.nist.gov/dads/HTML/bubblesort.html" },
    { title: "NIST · 快速排序", href: "https://xlinux.nist.gov/dads/HTML/quicksort.html" }],
};
