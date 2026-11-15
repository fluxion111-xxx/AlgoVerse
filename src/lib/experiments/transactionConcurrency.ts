import { defineEngine, fields, goalLabel, integer } from "./engine";

type Transaction = "A" | "B";
type Guard = { row: number; equals: number };
type Operation =
  | { tx: Transaction; action: "begin" | "commit" | "rollback" }
  | { tx: Transaction; action: "read"; row: number }
  | { tx: Transaction; action: "write"; row: number; value: number; guard?: Guard };
type TransactionConfig = { goalLabel: string; initialRows: number[]; schedule: Operation[] };
type Row = { value: number; version: number };
type State = { snapshot: Row[]; writes: Map<number, { value: number; baseVersion: number }> };
type Mode = "read-committed" | "snapshot";

function configure(value: unknown): TransactionConfig | null {
  const input = fields(value, ["goalLabel", "initialRows", "schedule"]);
  const goal = goalLabel(input?.goalLabel);
  const { initialRows, schedule } = input ?? {};
  if (!goal || !Array.isArray(initialRows) || initialRows.length < 1 || initialRows.length > 6
    || ![...initialRows].every((entry) => integer(entry, -99, 99))
    || !Array.isArray(schedule) || schedule.length < 2 || schedule.length > 32) return null;
  const operations: Operation[] = [];
  const active = new Set<Transaction>();
  for (const entry of schedule) {
    const op = fields(entry, ["tx", "action"]) ?? fields(entry, ["tx", "action", "row"])
      ?? fields(entry, ["tx", "action", "row", "value"]) ?? fields(entry, ["tx", "action", "row", "value", "guard"]);
    if (!op || (op.tx !== "A" && op.tx !== "B")) return null;
    const { tx, action, row } = op;
    if (action === "begin" && Object.keys(op).length === 2 && !active.has(tx)) {
      active.add(tx);
      operations.push({ tx, action });
      continue;
    }
    if (!active.has(tx)) return null;
    if ((action === "commit" || action === "rollback") && Object.keys(op).length === 2) {
      active.delete(tx);
      operations.push({ tx, action });
    } else if (action === "read" && Object.keys(op).length === 3 && integer(row, 0, initialRows.length - 1)) {
      operations.push({ tx, action, row });
    } else if (action === "write" && integer(row, 0, initialRows.length - 1) && integer(op.value, -99, 99)) {
      if (Object.hasOwn(op, "guard")) {
        const guard = fields(op.guard, ["row", "equals"]);
        if (!integer(guard?.row, 0, initialRows.length - 1) || !integer(guard?.equals, -99, 99)) return null;
        operations.push({ tx, action, row, value: op.value, guard: { row: guard.row, equals: guard.equals } });
      } else operations.push({ tx, action, row, value: op.value });
    } else return null;
  }
  return active.size ? null : { goalLabel: goal, initialRows: [...initialRows], schedule: operations };
}

function simulate(config: TransactionConfig, mode: Mode) {
  const committed = config.initialRows.map((value) => ({ value, version: 0 }));
  const transactions = new Map<Transaction, State>();
  let version = 0;
  let conflicts = 0;
  const steps = config.schedule.map((operation) => {
    const { tx, action } = operation;
    let read: { value: number; version: number | null } | null = null;
    let outcome: "begin" | "read" | "write" | "commit" | "rollback" | "conflict" | "skipped" = action;
    let conflictRow: number | null = null;
    if (action === "begin") {
      transactions.set(tx, { snapshot: [...committed], writes: new Map() });
    } else {
      const state = transactions.get(tx)!;
      const visible = mode === "snapshot" ? state.snapshot : committed;
      const readRow = (row: number) => {
        const pending = state.writes.get(row);
        return pending ? { value: pending.value, version: null } : visible[row];
      };
      if (operation.action === "read") {
        read = readRow(operation.row);
      } else if (operation.action === "write") {
        const { row, value, guard } = operation;
        if (guard) read = readRow(guard.row);
        if (guard && read?.value !== guard.equals) outcome = "skipped";
        else state.writes.set(row, { value, baseVersion: state.writes.get(row)?.baseVersion ?? visible[row].version });
      } else if (action === "commit") {
        conflictRow = [...state.writes].find(([row, write]) => committed[row].version !== write.baseVersion)?.[0] ?? null;
        if (conflictRow !== null) {
          conflicts++;
          outcome = "conflict";
        } else if (state.writes.size > 0) {
          version++;
          for (const [row, write] of state.writes) committed[row] = { value: write.value, version };
        }
        transactions.delete(tx);
      } else if (action === "rollback") transactions.delete(tx);
    }
    return { operation, outcome, read, conflictRow, committed: [...committed],
      buffered: [...transactions].flatMap(([name, state]) => [...state.writes].map(([row, { value }]) => ({ tx: name, row, value }))) };
  });
  return { mode, steps, committed, conflicts };
}

export const transactionConcurrencyEngine = defineEngine({
  id: "transaction-concurrency", version: 1, domain: "databases", route: "/experiments/databases/transaction-concurrency",
  creator: {
    title: "事务并发",
    description: "比较语句级已提交读取与事务级快照。同一事务读到自己的暂存写入。提交时检验写入行版本，冲突则整笔撤销。教学模型采用乐观检查，不模拟数据库锁等待。",
    parameters: { goalLabel: "实验目标", initialRows: "1–6 行，值为 -99 至 99 的整数，行编号从 0 起",
      schedule: "2–32 个操作。tx 为 A 或 B。action 为 begin/read/write/commit/rollback。read 需 row；write 需 row、value，可另加 guard:{row,equals}。每个 begin 须有结束操作。" },
  },
  preset: (): TransactionConfig => ({ goalLabel: "对比重复读取与提交时冲突。", initialRows: [10, 20], schedule: [
    { tx: "A", action: "begin" }, { tx: "A", action: "read", row: 0 },
    { tx: "B", action: "begin" }, { tx: "B", action: "write", row: 0, value: 30 }, { tx: "B", action: "commit" },
    { tx: "A", action: "read", row: 0 }, { tx: "A", action: "write", row: 0, value: 40 }, { tx: "A", action: "commit" },
  ] }),
  configure,
  validate: (value): value is TransactionConfig => configure(value) !== null,
  run: (config: TransactionConfig) => ({ kind: "transaction-concurrency" as const,
    readCommitted: simulate(config, "read-committed"), snapshot: simulate(config, "snapshot") }),
});
