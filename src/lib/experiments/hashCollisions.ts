import { defineEngine, fields, goalLabel, integer } from "./engine";

const actions = ["insert", "find", "delete"] as const;
type Action = typeof actions[number];
type Operation = { action: Action; key: number };
type HashConfig = { goalLabel: string; capacity: number; operations: Operation[] };
type Outcome = "inserted" | "exists" | "found" | "missing" | "deleted" | "full";
type Visit = { slot: number; compared: number | null };
type Slot = number | "deleted" | null;

function configure(value: unknown): HashConfig | null {
  const input = fields(value, ["goalLabel", "capacity", "operations"]);
  const goal = goalLabel(input?.goalLabel);
  const { capacity, operations } = input ?? {};
  if (!goal || !integer(capacity, 2, 12) || !Array.isArray(operations) || !operations.length || operations.length > 24) return null;

  const parsed: Operation[] = [];
  for (const operation of operations) {
    const row = fields(operation, ["action", "key"]);
    const action = actions.find((item) => item === row?.action);
    if (!action || !integer(row?.key, -999, 999)) return null;
    parsed.push({ action, key: row.key });
  }
  return { goalLabel: goal, capacity, operations: parsed };
}

function insertionOrMatch(action: Action): Outcome {
  if (action === "insert") return "exists";
  return action === "delete" ? "deleted" : "found";
}

function chainedOperation(buckets: number[][], home: number, { action, key }: Operation) {
  const bucket = buckets[home];
  const visits: Visit[] = [];
  for (const [index, candidate] of bucket.entries()) {
    visits.push({ slot: home, compared: candidate });
    if (candidate !== key) continue;
    if (action === "delete") bucket.splice(index, 1);
    return { outcome: insertionOrMatch(action), visits };
  }
  if (bucket.length === 0) visits.push({ slot: home, compared: null });
  if (action !== "insert") return { outcome: "missing" as const, visits };
  bucket.push(key);
  return { outcome: "inserted" as const, visits };
}

function linearOperation(slots: Slot[], home: number, { action, key }: Operation) {
  const visits: Visit[] = [];
  let available = -1;
  for (let offset = 0; offset < slots.length; offset++) {
    const slot = (home + offset) % slots.length;
    const candidate = slots[slot];
    visits.push({ slot, compared: typeof candidate === "number" ? candidate : null });
    if (candidate === key) {
      if (action === "delete") slots[slot] = "deleted";
      return { outcome: insertionOrMatch(action), visits };
    }
    if (available === -1 && (candidate === null || candidate === "deleted")) available = slot;
    if (candidate === null) break;
  }
  if (action !== "insert") return { outcome: "missing" as const, visits };
  if (available === -1) return { outcome: "full" as const, visits };
  slots[available] = key;
  return { outcome: "inserted" as const, visits };
}

export const hashCollisionsEngine = defineEngine({
  id: "hash-collisions",
  version: 1,
  domain: "algorithms",
  route: "/experiments/algorithms/hash-collisions",
  creator: {
    title: "哈希冲突",
    description: "同一组集合操作对比链地址和线性探测。整数键取非负余数。固定容量，线性探测删除后保留墓碑。",
    parameters: { goalLabel: "实验目标", capacity: "2–12 个槽",
      operations: "1–24 项，每项为 {action: insert | find | delete, key: -999 至 999 的整数}" },
  },
  preset: (): HashConfig => ({ goalLabel: "删除后继续查找同桶键。", capacity: 5, operations: [
    { action: "insert", key: 4 }, { action: "insert", key: 9 }, { action: "insert", key: 14 },
    { action: "delete", key: 9 }, { action: "find", key: 14 }, { action: "insert", key: 19 }, { action: "find", key: 9 },
  ] }),
  configure,
  validate: (value): value is HashConfig => configure(value) !== null,
  run({ capacity, operations }: HashConfig) {
    const buckets = Array.from({ length: capacity }, () => [] as number[]);
    const slots = Array<Slot>(capacity).fill(null);
    const totals = { chainingChecks: 0, probingChecks: 0, chainingConflicts: 0, probingConflicts: 0, fullInsertions: 0 };
    const countConflicts = (visits: Visit[], key: number) => visits.filter(({ compared }) => compared !== null && compared !== key).length;
    const steps = operations.map((operation) => {
      const home = ((operation.key % capacity) + capacity) % capacity;
      const chaining = chainedOperation(buckets, home, operation);
      const probing = linearOperation(slots, home, operation);
      totals.chainingChecks += chaining.visits.length;
      totals.probingChecks += probing.visits.length;
      if (operation.action === "insert") {
        totals.chainingConflicts += countConflicts(chaining.visits, operation.key);
        totals.probingConflicts += countConflicts(probing.visits, operation.key);
        if (probing.outcome === "full") totals.fullInsertions++;
      }
      return { operation, home, chaining: { ...chaining, buckets: buckets.map((bucket) => [...bucket]) },
        probing: { ...probing, slots: [...slots] } };
    });
    return { kind: "hash-collisions" as const, steps, ...totals };
  },
});
