import type { KnowledgeDomain } from "../../lib/knowledge";

export const algorithms = {
  id: "algorithms",
  title: "数据结构与算法",
  courses: [{
    id: "algorithm-basics",
    title: "算法基础",
    chapters: [{
      id: "comparison-sorting",
      title: "比较排序",
      topics: [{
        id: "sorting-comparisons",
        title: "冒泡排序与快速排序",
        summary: "同一列数，两种排法。每次比较都能看到。",
        sections: [
          { title: "冒泡怎么排", paragraphs: ["每次比较相邻两个数。左边大，就交换。扫完一趟，最大值就到末尾。", "下轮少看一个位置。整趟没交换，就结束。"] },
          { title: "快排怎么分", paragraphs: ["先挑一个基准值。本实验选最后一项。", "小于等于基准的放左边。大于基准的放右边。再分别排序两边。"] },
          { title: "动手比较", paragraphs: ["先输入 3、1、2，单步观察。看每次比较的是哪两个数。", "再换成 1、2、3。两次都记下比较和交换次数。哪种排法更早停？"] },
        ],
        sources: [
          { title: "NIST DADS · Bubble sort", href: "https://xlinux.nist.gov/dads/HTML/bubblesort.html" },
          { title: "NIST DADS · Quicksort", href: "https://xlinux.nist.gov/dads/HTML/quicksort.html" },
        ],
        relatedTopicIds: ["binary-search"],
        experiments: [{ engineId: "sorting", label: "打开排序实验", prompt: "用同一序列，比较两种排法。" }],
      }],
    }, {
      id: "ordered-lookup",
      title: "有序查找",
      topics: [{
        id: "binary-search",
        title: "二分查找",
        summary: "先排好序，再每次排除一半。",
        sections: [
          { title: "为什么能减半", paragraphs: ["先看中间项。目标更大，就去右边。目标更小，就去左边。", "每次缩小候选区间。区间空了，就没找到。"] },
          { title: "找一找 7", paragraphs: ["数列是 1、3、5、7、9。先看 5，再找右半段。", "目标若是 6，最后会找空。"] },
        ],
        sources: [{ title: "MIT 6.006 · Binary Search", href: "https://courses.csail.mit.edu/6.006/spring10/psets/ps1/ps1A-solution.pdf" }],
        relatedTopicIds: ["sorting-comparisons", "b-plus-index"],
        experiments: [],
      }],
    }, {
      id: "graph-search",
      title: "图与搜索",
      topics: [{
        id: "weighted-paths",
        title: "带权图与最短路径",
        summary: "边有代价，最少步未必最省。",
        sections: [
          { title: "先算总花费", paragraphs: ["直达花 9。绕两段各花 3。绕路只花 6。", "Dijkstra 按已走代价排队。先扩展代价最小的候选点。边的代价要非负。"] },
          { title: "给搜索一个方向", paragraphs: ["A* 还会估算剩余代价。它按两项之和排序。", "若估计为零，就只按已走代价排。试着比较两种搜索的访问量。"] },
        ],
        sources: [
          { title: "NIST DADS · Dijkstra’s algorithm", href: "https://xlinux.nist.gov/dads/HTML/dijkstraalgo.html" },
          { title: "Stanford · A* 原始论文", href: "https://ai.stanford.edu/~nilsson/OnlinePubs-Nils/PublishedPapers/astar.pdf" },
        ],
        relatedTopicIds: ["packet-routing", "distance-metrics"],
        experiments: [{ engineId: "pathfinding", label: "打开寻路实验", prompt: "换一张地图，比较访问节点数。" }],
      }],
    }],
  }],
} satisfies KnowledgeDomain;
