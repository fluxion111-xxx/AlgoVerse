import { defineEngine, fields, goalLabel, integer } from "./engine";

export type SortingConfig = { goalLabel: string; values: number[] };
type SortFrame = { values: number[]; active: number[]; kind: "compare" | "swap" | "done"; comparisons: number; swaps: number };

function configure(value: unknown): SortingConfig | null {
  const input = fields(value, ["goalLabel", "values"]);
  const goal = goalLabel(input?.goalLabel);
  const values = input?.values;
  return goal && Array.isArray(values) && values.length >= 2 && values.length <= 20 && values.every((entry) => integer(entry, -999, 999))
    ? { goalLabel: goal, values: [...values] } : null;
}

function trace(input: number[], algorithm: "bubble" | "quick") {
  const values = [...input];
  const frames: SortFrame[] = [];
  let comparisons = 0;
  let swaps = 0;
  const record = (kind: SortFrame["kind"], active: number[]) => frames.push({ kind, active, values: [...values], comparisons, swaps });
  function compare(left: number, right: number) {
    comparisons += 1;
    record("compare", [left, right]);
    return values[left] - values[right];
  }
  function swap(left: number, right: number) {
    if (left === right) return;
    [values[left], values[right]] = [values[right], values[left]];
    swaps += 1;
    record("swap", [left, right]);
  }
  function partition(low: number, high: number) {
    if (low >= high) return;
    // Lomuto partition uses the last element as the pivot.
    let boundary = low;
    for (let index = low; index < high; index++) {
      if (compare(index, high) <= 0) swap(boundary++, index);
    }
    swap(boundary, high);
    partition(low, boundary - 1);
    partition(boundary + 1, high);
  }
  if (algorithm === "bubble") {
    for (let end = values.length - 1; end > 0; end--) {
      const previousSwaps = swaps;
      for (let index = 0; index < end; index++) if (compare(index, index + 1) > 0) swap(index, index + 1);
      if (swaps === previousSwaps) break;
    }
  } else {
    partition(0, values.length - 1);
  }
  record("done", []);
  return { frames, sorted: values, comparisons, swaps };
}

export const sortingEngine = defineEngine({
  id: "sorting",
  version: 1,
  domain: "algorithms",
  route: "/experiments/algorithms/sorting",
  creator: {
    title: "冒泡与快速排序",
    description: "在同一序列比较升序冒泡排序与快速排序。快排取末项作基准。记录比较和交换。",
    parameters: { goalLabel: "实验目标", values: "2–20 个整数，每个在 -999 到 999 之间，例如 [7,2,9,4,3]" },
  },
  preset: (): SortingConfig => ({ goalLabel: "比较排序的比较和交换次数。", values: [7, 2, 9, 4, 3, 8, 1] }),
  configure,
  validate: (value): value is SortingConfig => configure(value) !== null,
  run: ({ values }) => ({ kind: "sorting" as const, bubble: trace(values, "bubble"), quick: trace(values, "quick") }),
});
