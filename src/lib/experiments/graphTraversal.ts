import { defineEngine, fields, goalLabel, integer } from "./engine";

type Edge = [number, number];
type GraphConfig = { goalLabel: string; vertexCount: number; startVertex: number; directed: boolean; edges: Edge[] };

function configure(value: unknown): GraphConfig | null {
  const input = fields(value, ["goalLabel", "vertexCount", "startVertex", "directed", "edges"]);
  const goal = goalLabel(input?.goalLabel);
  const { vertexCount, startVertex, directed, edges } = input ?? {};
  if (!goal || !integer(vertexCount, 1, 12) || !integer(startVertex, 0, vertexCount - 1)
    || typeof directed !== "boolean" || !Array.isArray(edges) || edges.length > 36) return null;
  const parsed: Edge[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    if (!Array.isArray(edge) || edge.length !== 2) return null;
    const [from, to] = edge;
    if (!integer(from, 0, vertexCount - 1) || !integer(to, 0, vertexCount - 1)) return null;
    const key = directed || from <= to ? `${from},${to}` : `${to},${from}`;
    if (seen.has(key)) return null;
    seen.add(key);
    parsed.push([from, to]);
  }
  return { goalLabel: goal, vertexCount, startVertex, directed, edges: parsed };
}

type GraphStep = { vertex: number; parent: number | null; depth: number; pending: number[] };

function breadthFirst(adjacency: number[][], startVertex: number) {
  const visited = new Set([startVertex]);
  const queue = [{ vertex: startVertex, parent: null as number | null, depth: 0 }];
  const steps: GraphStep[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbor of adjacency[current.vertex]) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push({ vertex: neighbor, parent: current.vertex, depth: current.depth + 1 });
    }
    steps.push({ ...current, pending: queue.map(({ vertex }) => vertex) });
  }
  return steps;
}

function depthFirst(adjacency: number[][], startVertex: number) {
  const visited = new Set<number>();
  const stack: number[] = [];
  const steps: GraphStep[] = [];
  function visit(vertex: number, parent: number | null) {
    visited.add(vertex);
    stack.push(vertex);
    steps.push({ vertex, parent, depth: stack.length - 1, pending: [...stack] });
    for (const neighbor of adjacency[vertex]) if (!visited.has(neighbor)) visit(neighbor, vertex);
    stack.pop();
  }
  visit(startVertex, null);
  return steps;
}

export const graphTraversalEngine = defineEngine({
  id: "graph-traversal", version: 1, domain: "algorithms", route: "/experiments/algorithms/graph-traversal",
  creator: {
    title: "图遍历",
    description: "以同一起点执行无权图 BFS 与 DFS。邻接点按编号升序访问，环不会导致重复访问，未连通顶点保留为未访问。",
    parameters: { goalLabel: "实验目标", vertexCount: "1–12 个顶点，编号从 0 起", startVertex: "合法顶点编号",
      directed: "布尔值，是否有向", edges: "0–36 条不重复的 [起点,终点]" },
  },
  preset: (): GraphConfig => ({ goalLabel: "比较队列和递归栈。", vertexCount: 6, startVertex: 0, directed: false,
    edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4]] }),
  configure,
  validate: (value): value is GraphConfig => configure(value) !== null,
  run({ vertexCount, startVertex, directed, edges }: GraphConfig) {
    const adjacency = Array.from({ length: vertexCount }, () => [] as number[]);
    for (const [from, to] of edges) {
      adjacency[from].push(to);
      if (!directed && from !== to) adjacency[to].push(from);
    }
    for (const neighbors of adjacency) neighbors.sort((a, b) => a - b);
    const bfs = breadthFirst(adjacency, startVertex);
    const dfs = depthFirst(adjacency, startVertex);
    const reached = new Set(bfs.map(({ vertex }) => vertex));
    return { kind: "graph-traversal" as const, bfs, dfs, unreachable: adjacency.flatMap((_, vertex) => reached.has(vertex) ? [] : [vertex]) };
  },
});
