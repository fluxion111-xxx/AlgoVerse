import { defineEngine, fields, goalLabel, integer } from "./engine";

type BankerConfig = { goalLabel: string; available: number[]; allocation: number[][]; maximum: number[][]; process: number; request: number[] };
const fits = (need: number[], work: number[]) => need.every((value, i) => value <= work[i]);

function vector(value: unknown, size: number): number[] | null {
  if (!Array.isArray(value) || value.length !== size) return null;
  const entries = [...value];
  return entries.every((entry) => integer(entry, 0, 30)) ? entries : null;
}

function matrix(value: unknown, rows: number, size: number): number[][] | null {
  if (!Array.isArray(value) || value.length !== rows) return null;
  const entries = [...value].map((row) => vector(row, size));
  return entries.every((row) => row !== null) ? entries : null;
}

function configure(value: unknown): BankerConfig | null {
  const input = fields(value, ["goalLabel", "available", "allocation", "maximum", "process", "request"]);
  const goal = goalLabel(input?.goalLabel);
  if (!goal || !Array.isArray(input?.available) || !Array.isArray(input?.allocation)) return null;
  const size = input.available.length;
  const rows = input.allocation.length;
  if (!integer(size, 1, 4) || !integer(rows, 1, 8) || !integer(input.process, 0, rows - 1)) return null;
  const available = vector(input.available, size);
  const allocation = matrix(input.allocation, rows, size);
  const maximum = matrix(input.maximum, rows, size);
  const request = vector(input.request, size);
  if (!available || !allocation || !maximum || !request) return null;
  const total = available.map((free, i) => allocation.reduce((sum, row) => sum + row[i], free));
  if (maximum.some((row, p) => !fits(allocation[p], row) || !fits(row, total))) return null;
  return { goalLabel: goal, available, allocation, maximum, process: input.process, request };
}

function safety(available: number[], allocation: number[][], need: number[][]) {
  let work = [...available];
  const sequence: number[] = [];
  const steps = [];
  const pending = new Set(allocation.keys());
  while (pending.size) {
    const candidate = [...pending].find((process) => fits(need[process], work));
    if (candidate === undefined) break;
    pending.delete(candidate);
    const before = work;
    work = work.map((units, i) => units + allocation[candidate][i]);
    sequence.push(candidate);
    steps.push({ process: candidate, before, released: allocation[candidate], after: work });
  }
  return { steps, sequence, blocked: [...pending], safe: pending.size === 0, work };
}

function simulate({ available, allocation, maximum, process, request }: BankerConfig) {
  const need = maximum.map((row, p) => row.map((units, i) => units - allocation[p][i]));
  const initial = safety(available, allocation, need);
  const base = { kind: "deadlock-avoidance" as const, need, initial };
  if (!fits(request, need[process])) return { ...base, decision: "exceeds-need" as const, trial: null };
  if (!fits(request, available)) return { ...base, decision: "wait" as const, trial: null };
  const trialAvailable = available.map((units, i) => units - request[i]);
  const trialAllocation = allocation.map((row, p) => p === process ? row.map((units, i) => units + request[i]) : row);
  const trialNeed = need.map((row, p) => p === process ? row.map((units, i) => units - request[i]) : row);
  const trial = safety(trialAvailable, trialAllocation, trialNeed);
  return { ...base, trial, decision: trial.safe ? "grant" as const : "unsafe" as const };
}

export const deadlockAvoidanceEngine = defineEngine({
  id: "deadlock-avoidance", version: 1, domain: "operating-systems", route: "/experiments/operating-systems/deadlock-avoidance",
  creator: {
    title: "银行家算法",
    description: "计算 Need = Maximum − Allocation。先检查原状态，再试分配指定请求；逐步模拟可完成进程归还资源。危险试分配不会提交。",
    parameters: { goalLabel: "实验目标", available: "1–4 种资源的可用量", allocation: "1–8 行进程已分配量",
      maximum: "与 allocation 同形状的最大需求；不能小于已分配或超过系统总量", process: "请求进程编号从 0 起",
      request: "本次请求向量，与 available 等长。资源计数均为 0–30 的整数。" },
  },
  preset: (): BankerConfig => ({
    goalLabel: "判断请求是否还能留下安全序列。", available: [3, 3, 2], process: 1, request: [1, 0, 2],
    allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
    maximum: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
  }),
  configure,
  validate: (value): value is BankerConfig => configure(value) !== null,
  run: simulate,
});
