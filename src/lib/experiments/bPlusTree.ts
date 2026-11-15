import { defineEngine, fields, goalLabel, integer } from "./engine";

type BPlusConfig = { goalLabel: string; order: number; keys: number[]; lower: number; upper: number };
export type IndexNode = { id: number; keys: number[] } & (
  { kind: "leaf"; next: number | null } | { kind: "branch"; children: number[] }
);
type IndexStep = { kind: "insert" | "query"; key: number; root: number; nodes: IndexNode[]; visited: number[]; splits: number; matches: number[] };

function configure(value: unknown): BPlusConfig | null {
  const input = fields(value, ["goalLabel", "order", "keys", "lower", "upper"]);
  const goal = goalLabel(input?.goalLabel);
  const { order, keys, lower, upper } = input ?? {};
  return goal && integer(order, 1, 3) && integer(lower, -99, 99) && integer(upper, lower, 99)
    && Array.isArray(keys) && keys.length >= 1 && keys.length <= 32 && keys.every((key) => integer(key, -99, 99))
    && new Set(keys).size === keys.length ? { goalLabel: goal, order, keys: [...keys], lower, upper } : null;
}

export const bPlusTreeEngine = defineEngine({
  id: "b-plus-tree",
  version: 1,
  domain: "databases",
  route: "/experiments/databases/b-plus-tree",
  creator: {
    title: "B+ 树索引",
    description: "按顺序插入唯一键，观察叶与分支分裂，再沿叶链查询闭区间。上下界相等时做点查。不支持删除。",
    parameters: { goalLabel: "实验目标", order: "1–3，节点最多容纳 2 × order 个键", keys: "1–32 个不重复整数，范围 -99–99",
      lower: "查询下界 -99–99", upper: "查询上界，必须大于等于下界且不超过 99" },
  },
  preset: (): BPlusConfig => ({ goalLabel: "观察插入分裂与范围查询。", order: 1, keys: [10, 20, 5, 6, 12, 30, 7, 17], lower: 6, upper: 17 }),
  configure,
  validate: (value): value is BPlusConfig => configure(value) !== null,
  run({ order, keys, lower, upper }: BPlusConfig) {
    const nodes: IndexNode[] = [{ id: 0, keys: [], kind: "leaf", next: null }];
    const steps: IndexStep[] = [];
    let root = 0;
    let splits = 0;
    const capacity = order * 2;
    function record(kind: IndexStep["kind"], key: number, visited: number[] = [], matches: number[] = []) {
      steps.push({ kind, key, root, splits, visited: [...visited], matches: [...matches], nodes: nodes.map((node) => node.kind === "leaf"
        ? { ...node, keys: [...node.keys] } : { ...node, keys: [...node.keys], children: [...node.children] }) });
    }
    function childIndex(node: IndexNode, key: number) {
      const index = node.keys.findIndex((separator) => key < separator);
      return index < 0 ? node.keys.length : index;
    }
    function insert(id: number, key: number): { separator: number; right: number } | null {
      const node = nodes[id];
      const index = childIndex(node, key);
      if (node.kind === "leaf") {
        node.keys.splice(index, 0, key);
      } else {
        const split = insert(node.children[index], key);
        if (!split) return null;
        node.keys.splice(index, 0, split.separator);
        node.children.splice(index + 1, 0, split.right);
      }
      if (node.keys.length <= capacity) return null;
      splits += 1;
      const right = nodes.length;
      if (node.kind === "leaf") {
        const rightKeys = node.keys.splice(order);
        nodes.push({ id: right, kind: "leaf", keys: rightKeys, next: node.next });
        node.next = right;
        return { separator: rightKeys[0], right };
      }
      const rightKeys = node.keys.splice(order + 1);
      const separator = node.keys.pop()!;
      nodes.push({ id: right, kind: "branch", keys: rightKeys, children: node.children.splice(order + 1) });
      return { separator, right };
    }
    let height = 1;
    for (const key of keys) {
      const split = insert(root, key);
      if (split) {
        const previous = root;
        root = nodes.length;
        nodes.push({ id: root, kind: "branch", keys: [split.separator], children: [previous, split.right] });
        height += 1;
      }
      record("insert", key);
    }
    const visited: number[] = [];
    const matches: number[] = [];
    let node = nodes[root];
    while (node.kind === "branch") {
      visited.push(node.id);
      record("query", lower, visited, matches);
      node = nodes[node.children[childIndex(node, lower)]];
    }
    for (;;) {
      visited.push(node.id);
      matches.push(...node.keys.filter((key) => key >= lower && key <= upper));
      record("query", lower, visited, matches);
      if (node.kind !== "leaf" || node.next === null || (node.keys.at(-1) ?? -Infinity) >= upper || lower === upper) break;
      node = nodes[node.next];
    }
    return { kind: "b-plus-tree" as const, steps, height, splits, visitedCount: visited.length, matches };
  },
});
