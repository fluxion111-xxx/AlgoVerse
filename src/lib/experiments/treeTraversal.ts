import { defineEngine, fields, goalLabel, integer } from "./engine";

type TreeConfig = { goalLabel: string; nodes: (number | null)[] };
export const treeOrders = ["preorder", "inorder", "postorder", "level"] as const;

function configure(value: unknown): TreeConfig | null {
  const input = fields(value, ["goalLabel", "nodes"]);
  const goal = goalLabel(input?.goalLabel);
  const nodes = input?.nodes;
  if (!goal || !Array.isArray(nodes) || !nodes.length || nodes.length > 31 || !integer(nodes[0], -99, 99)) return null;
  const parsed = [...nodes];
  if (parsed.some((node, i) => node !== null && (!integer(node, -99, 99) || (i > 0 && parsed[Math.floor((i - 1) / 2)] === null)))) return null;
  return { goalLabel: goal, nodes: parsed };
}

function traverse(nodes: TreeConfig["nodes"], order: typeof treeOrders[number]) {
  const steps: { node: number; pending: number[] }[] = [];
  const hasNode = (i: number) => nodes[i] !== undefined && nodes[i] !== null;
  if (order === "level") {
    const queue = [0];
    while (queue.length) {
      const node = queue.shift()!;
      queue.push(...[node * 2 + 1, node * 2 + 2].filter(hasNode));
      steps.push({ node, pending: [...queue] });
    }
  } else {
    const stack: number[] = [];
    function walk(node: number) {
      if (!hasNode(node)) return;
      stack.push(node);
      const visit = () => steps.push({ node, pending: [...stack] });
      if (order === "preorder") visit();
      walk(node * 2 + 1);
      if (order === "inorder") visit();
      walk(node * 2 + 2);
      if (order === "postorder") visit();
      stack.pop();
    }
    walk(0);
  }
  return { order, steps, values: steps.map(({ node }) => nodes[node]!) };
}

export const treeTraversalEngine = defineEngine({
  id: "tree-traversal", version: 1, domain: "algorithms", route: "/experiments/algorithms/tree-traversal",
  creator: {
    title: "二叉树遍历",
    description: "在同一棵二叉树对比先序、中序、后序、层序。数组槽 i 的左右子节点为 2i+1、2i+2。空节点不能有子节点。",
    parameters: { goalLabel: "实验目标", nodes: "1–31 个数组槽，整数 -99 至 99 或 null。根须存在。" },
  },
  preset: (): TreeConfig => ({ goalLabel: "比较访问根的时机。", nodes: [4, 2, 7, 1, 3, null, 9] }),
  configure,
  validate: (value): value is TreeConfig => configure(value) !== null,
  run: ({ nodes }: TreeConfig) => ({ kind: "tree-traversal" as const, traversals: treeOrders.map((order) => traverse(nodes, order)) }),
});
