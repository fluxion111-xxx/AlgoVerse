import { defineEngine, fields, goalLabel, integer } from "./engine";

export type ProcessInput = { arrival: number; burst: number };
export type SchedulingConfig = { goalLabel: string; policy: "rr" | "fcfs"; quantum: number; processes: ProcessInput[] };
type Slice = { process: number | null; start: number; end: number };

function configure(value: unknown): SchedulingConfig | null {
  const input = fields(value, ["goalLabel", "policy", "quantum", "processes"]);
  const goal = goalLabel(input?.goalLabel);
  const { policy, quantum, processes } = input ?? {};
  if (!goal || (policy !== "rr" && policy !== "fcfs") || !integer(quantum, 1, 20)
    || !Array.isArray(processes) || processes.length < 2 || processes.length > 6) return null;
  const jobs: ProcessInput[] = [];
  for (const process of processes) {
    const job = fields(process, ["arrival", "burst"]);
    if (!integer(job?.arrival, 0, 40) || !integer(job?.burst, 1, 25)) return null;
    jobs.push({ arrival: job.arrival, burst: job.burst });
  }
  return { goalLabel: goal, policy, quantum, processes: jobs };
}

function schedule(config: SchedulingConfig) {
  const jobs = config.processes.map(({ arrival, burst }, process) => ({ arrival, burst, process, remaining: burst, started: -1, finished: -1 }));
  const arrivals = [...jobs].sort((left, right) => left.arrival - right.arrival || left.process - right.process);
  const queue: typeof jobs = [];
  const timeline: Slice[] = [];
  let time = 0;
  let next = 0;
  let switches = 0;
  let previous: number | null = null;
  function enqueueArrivals() {
    while (next < arrivals.length && arrivals[next].arrival <= time) queue.push(arrivals[next++]);
  }
  while (next < arrivals.length || queue.length) {
    enqueueArrivals();
    const job = queue.shift();
    if (!job) {
      const end = arrivals[next].arrival;
      timeline.push({ process: null, start: time, end });
      time = end;
      previous = null;
      continue;
    }
    if (previous !== null && previous !== job.process) switches += 1;
    previous = job.process;
    if (job.started === -1) job.started = time;
    const duration = config.policy === "rr" ? Math.min(job.remaining, config.quantum) : job.remaining;
    timeline.push({ process: job.process, start: time, end: time + duration });
    time += duration;
    job.remaining -= duration;
    enqueueArrivals();
    if (job.remaining) queue.push(job);
    else job.finished = time;
  }
  const processes = jobs.map(({ process, arrival, burst, started, finished }) => ({
    process, finished, waiting: finished - arrival - burst, turnaround: finished - arrival, response: started - arrival,
  }));
  const average = (key: "waiting" | "turnaround" | "response") => processes.reduce((sum, job) => sum + job[key], 0) / processes.length;
  return { kind: "cpu-scheduling" as const, timeline, processes, duration: time, switches,
    averageWaiting: average("waiting"), averageTurnaround: average("turnaround"), averageResponse: average("response") };
}

export const schedulingEngine = defineEngine({
  id: "cpu-scheduling",
  version: 1,
  domain: "operating-systems",
  route: "/experiments/operating-systems/cpu-scheduling",
  creator: {
    title: "CPU 进程调度",
    description: "单核 CPU。支持轮转抢占（rr）和先来先服务（fcfs）。不支持优先级或最短剩余时间。时间使用整数刻度。切换只计次数，不消耗模拟时间。",
    parameters: { goalLabel: "实验目标", policy: '单个字符串 "rr" 或 "fcfs"', quantum: "必填整数 1–20。fcfs 填 1，调度时忽略。禁止填 0",
      processes: "2–6 个进程，例如 [{arrival:0,burst:6},{arrival:1,burst:4},{arrival:2,burst:3}]；到达 0–40，运行 1–25" },
  },
  preset: (): SchedulingConfig => ({ goalLabel: "观察进程怎样轮流占用 CPU。", policy: "rr", quantum: 2,
    processes: [{ arrival: 0, burst: 6 }, { arrival: 1, burst: 4 }, { arrival: 2, burst: 3 }] }),
  configure,
  validate: (value): value is SchedulingConfig => configure(value) !== null,
  run: schedule,
});
