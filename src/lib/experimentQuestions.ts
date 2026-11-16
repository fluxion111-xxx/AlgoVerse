import type { EngineId } from "./experimentEngines";
import type { experimentDomains } from "./experiments/engine";

type Domain = keyof typeof experimentDomains;
type Question = {
  text: string;
  tool: EngineId;
  trials: readonly [Record<string, unknown>, ...Record<string, unknown>[]];
};

const processes = [{ arrival: 0, burst: 6 }, { arrival: 1, burst: 4 }, { arrival: 2, burst: 3 }];
const links = { AB: { delay: 8, loss: 0 }, BD: { delay: 10, loss: 0 }, AC: { delay: 16, loss: 0 }, CD: { delay: 16, loss: 0 } };
const samples = [{ x: 4, y: 4, label: "A" }, { x: 6, y: 5, label: "B" }, { x: 5, y: 7, label: "B" }];
const points = [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 8, y: 1 }, { x: 10, y: 1 }];
const keys = [10, 20, 5, 6, 12, 30, 7, 17];

export const experimentQuestions = {
  algorithms: [
    {
      text: "用同一组数 [7,2,9,1,5] 比较冒泡排序与快速排序。两者各比较、交换了几次？",
      tool: "sorting",
      trials: [{ values: [7, 2, 9, 1, 5] }],
    },
    {
      text: "在同一张普通难度的地图上比较 Dijkstra 和 A*。它们走多远？各访问多少个节点？",
      tool: "pathfinding",
      trials: [{ map: { kind: "random", difficulty: "normal" } }],
    },
    {
      text: "建一张 5 点无向图。边为 0–1、0–2、1–3、2–4。从 0 出发，BFS 和 DFS 的访问顺序有何区别？",
      tool: "graph-traversal",
      trials: [{ vertexCount: 5, startVertex: 0, directed: false, edges: [[0, 1], [0, 2], [1, 3], [2, 4]] }],
    },
  ],
  "operating-systems": [
    {
      text: "用 RR 调度三个进程。到达时间为 0、1、2，运行时长为 6、4、3。时间片从 1 改到 4，平均等待时间和切换次数怎么变？",
      tool: "cpu-scheduling",
      trials: [{ processes, policy: "rr", quantum: 1 }, { processes, policy: "rr", quantum: 4 }],
    },
    {
      text: "设 3 个页框，依次访问页 1、2、3、1、4、2、5。FIFO、LRU 和 OPT 各缺页几次？",
      tool: "page-replacement",
      trials: [{ frameCount: 3, references: [1, 2, 3, 1, 4, 2, 5] }],
    },
    {
      text: "共享计数器初值是 10。线程 A 加 1，线程 B 加 2，按 ABABAB 轮流读、算、写。加互斥锁前后，终值差多少？",
      tool: "counter-mutex",
      trials: [{ counterInitial: 10, threadDeltaA: 1, threadDeltaB: 2, counterSchedule: [0, 1, 0, 1, 0, 1] }],
    },
  ],
  networks: [
    {
      text: "从 A 向 D 发送 10 个包。AB、BD、AC、CD 的延迟分别是 8、10、16、16 毫秒，都不丢包。只把 AB 提高到 35 毫秒，路径和到达延迟会怎么变？",
      tool: "network-transmission",
      trials: [{ packets: 10, links }, { packets: 10, links: { ...links, AB: { delay: 35, loss: 0 } } }],
    },
    {
      text: "用简化 TCP Reno，初始窗口 4，阈值 8。先来一个新 ACK，再来三个重复 ACK，最后超时。在哪一步重传？窗口如何变化？",
      tool: "tcp-congestion",
      trials: [{ initialWindow: 4, initialThreshold: 8, signals: ["ack", "dup", "dup", "dup", "timeout"] }],
    },
    {
      text: "IPv4 包的数据部分是 1480 字节。允许分片时，把 MTU 从 600 改成 1500 字节。分片数和额外首部开销差多少？",
      tool: "ipv4-fragmentation",
      trials: [{ fragmentPayload: 1480, fragmentMtu: 600, fragmentDf: 0 }, { fragmentPayload: 1480, fragmentMtu: 1500, fragmentDf: 0 }],
    },
  ],
  programming: [
    {
      text: "用递归分别算 3! 和 6!。最大栈深差多少？每次返回后，哪个栈帧先离开？",
      tool: "memory-visualization",
      trials: [{ factorialInput: 3 }, { factorialInput: 6 }],
    },
    {
      text: "数组是 [8,12,19,23]，指针指向下标 1。从这里偏移 1 或 3 格，再尝试写入 42。哪次能写入？哪个元素会改变？",
      tool: "pointer-write",
      trials: [
        { memoryCells: [8, 12, 19, 23], pointerIndex: 1, pointerOffset: 1, writeValue: 42 },
        { memoryCells: [8, 12, 19, 23], pointerIndex: 1, pointerOffset: 3, writeValue: 42 },
      ],
    },
    {
      text: "无符号整数从 250 开始，先加 10，再减 7。分别用 8 位和 16 位存储。哪一步会回绕？最后存下多少？",
      tool: "unsigned-wrap",
      trials: [{ unsignedBits: 8, unsignedInitial: 250, unsignedIncrements: [10, -7] },
        { unsignedBits: 16, unsignedInitial: 250, unsignedIncrements: [10, -7] }],
    },
  ],
  databases: [
    {
      text: "对同一组双列键，用联合索引和逐行扫描。查 A=2 且 B 在 15 到 25 之间的记录。两种方法各查几次、命中几行？",
      tool: "composite-index",
      trials: [{ compositeKeys: [[2, 25], [1, 10], [2, 10], [3, 20], [2, 18], [1, 22], [2, 25], [2, 30]],
        indexLeading: 2, indexLower: 15, indexUpper: 25 }],
    },
    {
      text: "往 B+ 树依次插入 10、20、5、6、12、30、7、17。阶数取 1 或 2。各分裂几次？查 6 到 17 要访问多少节点？",
      tool: "b-plus-tree",
      trials: [{ order: 1, keys, lower: 6, upper: 17 }, { order: 2, keys, lower: 6, upper: 17 }],
    },
    {
      text: "左表键为 [2,2,3]，右表键为 [2,2,4]。用嵌套循环和哈希分别做等值内连接。各检查几对候选？重复键匹配几行？",
      tool: "join-strategies",
      trials: [{ leftRows: [2, 2, 3], rightRows: [2, 2, 4] }],
    },
  ],
  ai: [
    {
      text: "做 KNN 分类。A 类点是 (4,4)，B 类点是 (6,5) 和 (5,7)。按欧氏距离判断 (4,5)。K 取 1 或 3，投票和类别会变吗？",
      tool: "knn-classification",
      trials: [{ k: 1, metric: "euclidean", samples, query: { x: 4, y: 5 } },
        { k: 3, metric: "euclidean", samples, query: { x: 4, y: 5 } }],
    },
    {
      text: "用 K-Means 给 (0,1)、(2,1)、(8,1)、(10,1) 分两组。初始中心的横坐标设为 0 和 10，再试 0 和 2。各跑最多 8 轮，比较收敛轮数和每轮损失。",
      tool: "k-means",
      trials: [{ points, initialCenters: [points[0], points[3]], maxIterations: 8 },
        { points, initialCenters: [points[0], points[1]], maxIterations: 8 }],
    },
    {
      text: "用梯度下降最小化 f(x)=x²。从 4 出发，各跑 8 步。学习率取 0.1 或 0.6，损失降得一样快吗？会越过最低点吗？",
      tool: "gradient-descent",
      trials: [{ start: 4, target: 0, curvature: 2, learningRate: 0.1, maxSteps: 8 },
        { start: 4, target: 0, curvature: 2, learningRate: 0.6, maxSteps: 8 }],
    },
  ],
} satisfies Record<Domain, readonly [Question, ...Question[]]>;

const lastByModule = new Map<Domain, number>();

export function nextExperimentQuestion(domain: Domain) {
  const pool = experimentQuestions[domain];
  const key = `algoverse:experiment-questions:v1:${domain}`;
  let index = ((lastByModule.get(domain) ?? -1) + 1) % pool.length;
  try {
    const storage = window.sessionStorage;
    const saved = storage.getItem(key);
    const storedIndex = saved !== null && /^\d+$/.test(saved) && Number(saved) < pool.length
      ? (Number(saved) + 1) % pool.length : index;
    storage.setItem(key, String(storedIndex));
    index = storedIndex;
  } catch {
    // The in-memory cursor also works when browser storage is blocked.
  }
  lastByModule.set(domain, index);
  return { text: pool[index].text, lastInRound: index === pool.length - 1 };
}
