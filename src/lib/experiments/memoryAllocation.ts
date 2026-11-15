import { defineEngine, fields, goalLabel, integer } from "./engine";

type Command = { action: "alloc"; id: string; size: number } | { action: "free"; id: string };
type HeapConfig = { goalLabel: string; heapSize: number; commands: Command[] };
type Block = { start: number; size: number; owner: string | null };
type Outcome = "allocated" | "freed" | "duplicate" | "unknown" | "capacity" | "fragmented";

function configure(value: unknown): HeapConfig | null {
  const input = fields(value, ["goalLabel", "heapSize", "commands"]);
  const goal = goalLabel(input?.goalLabel);
  const { heapSize, commands } = input ?? {};
  if (!goal || !integer(heapSize, 4, 256) || !Array.isArray(commands) || !commands.length || commands.length > 32) return null;
  const parsed: Command[] = [];
  for (const command of commands) {
    const row = fields(command, ["action", "id", "size"]) ?? fields(command, ["action", "id"]);
    if (typeof row?.id !== "string" || !/^[A-Z][A-Z0-9]{0,5}$/.test(row.id)) return null;
    if (row.action === "alloc" && integer(row.size, 1, 256)) parsed.push({ action: "alloc", id: row.id, size: row.size });
    else if (row.action === "free" && !Object.hasOwn(row, "size")) parsed.push({ action: "free", id: row.id });
    else return null;
  }
  return { goalLabel: goal, heapSize, commands: parsed };
}

function summarize(blocks: Block[]) {
  const free = blocks.filter(({ owner }) => owner === null);
  const freeUnits = free.reduce((sum, { size }) => sum + size, 0);
  const largest = Math.max(0, ...free.map(({ size }) => size));
  return { freeUnits, largest, fragmentedUnits: freeUnits - largest, holes: free.length };
}

function coalesce(blocks: Block[]) {
  const merged: Block[] = [];
  for (const block of blocks) {
    const previous = merged.at(-1);
    if (previous?.owner === null && block.owner === null) previous.size += block.size;
    else merged.push({ ...block });
  }
  return merged;
}

function runPolicy(config: HeapConfig, policy: "first" | "best") {
  let blocks: Block[] = [{ start: 0, size: config.heapSize, owner: null }];
  let failures = 0;
  const steps = config.commands.map((command) => {
    const active = blocks.findIndex(({ owner }) => owner === command.id);
    let outcome: Outcome;
    let address: number | null = null;
    if (command.action === "free") {
      outcome = active < 0 ? "unknown" : "freed";
      if (active >= 0) {
        address = blocks[active].start;
        blocks[active] = { ...blocks[active], owner: null };
        blocks = coalesce(blocks);
      }
    } else if (active >= 0) {
      outcome = "duplicate";
    } else {
      let choice = -1;
      for (const [i, block] of blocks.entries()) {
        if (block.owner !== null || block.size < command.size) continue;
        if (choice === -1 || (policy === "best" && block.size < blocks[choice].size)) choice = i;
        if (policy === "first") break;
      }
      if (choice < 0) {
        failures++;
        outcome = summarize(blocks).freeUnits >= command.size ? "fragmented" : "capacity";
      } else {
        outcome = "allocated";
        const block = blocks[choice];
        address = block.start;
        const pieces: Block[] = [{ start: block.start, size: command.size, owner: command.id }];
        if (block.size > command.size) pieces.push({ start: block.start + command.size, size: block.size - command.size, owner: null });
        blocks.splice(choice, 1, ...pieces);
      }
    }
    return { command, outcome, address, blocks: [...blocks], ...summarize(blocks) };
  });
  return { policy, steps, failures, final: summarize(blocks) };
}

export const memoryAllocationEngine = defineEngine({
  id: "memory-allocation", version: 1, domain: "operating-systems", route: "/experiments/operating-systems/memory-allocation",
  creator: {
    title: "内存分配",
    description: "在相同固定堆上比较首次适配和最佳适配。分配时拆块，释放后合并相邻空块。用空闲总量和最大空块区分容量不足与外部碎片。",
    parameters: { goalLabel: "实验目标", heapSize: "4–256 个内存单位",
      commands: "1–32 条。{action: alloc,id,size} 或 {action: free,id}。ID 用 1–6 位大写英数字且以字母起头，size 为 1–256。" },
  },
  preset: (): HeapConfig => ({ goalLabel: "观察小请求怎样影响后续分配。", heapSize: 24, commands: [
    { action: "alloc", id: "A", size: 8 }, { action: "alloc", id: "B", size: 4 },
    { action: "alloc", id: "C", size: 5 }, { action: "alloc", id: "D", size: 7 },
    { action: "free", id: "A" }, { action: "free", id: "C" },
    { action: "alloc", id: "E", size: 5 }, { action: "alloc", id: "F", size: 7 },
  ] }),
  configure,
  validate: (value): value is HeapConfig => configure(value) !== null,
  run: (config: HeapConfig) => ({ kind: "memory-allocation" as const, first: runPolicy(config, "first"), best: runPolicy(config, "best") }),
});
