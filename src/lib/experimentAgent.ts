import type { EngineId, ExperimentConfig } from "./experimentEngines";

export const agentLimits = { decisions: 6, runs: 4, steps: 12, batch: 2, outputTokens: 1000 } as const;
export const agentDialogueLimits = { requests: 24, context: 10, outputTokens: 1200 } as const;
export const agentRoute = "/experiments/create?mode=agent";
export type AgentCall = {
  id: string;
  sessionId: string;
  tool: EngineId;
  version: number;
  config: ExperimentConfig;
};
export type AgentRun = AgentCall & { completedAt: string; metrics: Record<string, string> };
export type AgentEvidence = { from: number; to: number; metric: string };
export type AgentDecision = {
  observation: string;
  evidence: AgentEvidence[];
  model: string;
};
export type AgentTurnAction = "answer" | "explain" | "clarify" | "unsupported" | "run";
export type SchedulingEvidence = {
  from: number;
  to: number;
  metric: "waiting" | "response" | "turnaround";
  processes: { process: number; before: number; after: number }[];
};
export type AgentTurn = { message: string } & (
  { reply: string; model: string; action: AgentTurnAction; evidence: AgentEvidence[]; scheduling?: SchedulingEvidence[] }
  | { reply?: never; model?: never; action?: never; evidence?: never; scheduling?: never }
);
export type AgentFocus = {
  topic: string;
  goal?: string;
  constraints?: string;
  defaults?: "allowed" | "forbidden";
  // Completed runs before this index remain available as history.
  firstRun?: number;
};
export type AgentDialogue = {
  turns: AgentTurn[];
  requests: number;
  focus?: AgentFocus;
  pending?: string;
  activeUntil?: number;
  error?: string;
};
export type AgentTask = {
  id: string;
  revision: number;
  goal: string;
  seed: number;
  phase: "draft" | "deciding" | "confirm" | "running" | "observe" | "clarify" | "finished"
    | "unsupported" | "cancelled" | "limit" | "ai-error" | "tool-error";
  plan: string[];
  runs: AgentRun[];
  pending: AgentCall[];
  decisions: AgentDecision[];
  clarifications: { question: string; answer: string }[];
  dialogue?: AgentDialogue;
  experimentGoal?: string;
  autoContinue?: boolean;
  referenceConfig?: Pick<AgentCall, "tool" | "version" | "config">;
  question?: string;
  error?: string;
  leaseUntil?: number;
  requests: number;
  steps: number;
};

const confirmationCommands = new Set([
  "确认", "确认运行", "确认并运行", "开始", "开始运行", "开始实验", "运行", "运行实验", "执行", "执行实验",
  "确认吧", "开始吧", "运行吧", "确认执行", "开始执行", "请开始", "请开始运行", "请运行", "请执行", "可以开始了",
]);

// A whole-message command grants consent for the current batch only.
export function isAgentConfirmation(task: AgentTask, message: string) {
  const command = message.normalize("NFKC").trim().replace(/[。.!]$/u, "");
  return (task.pending.length > 0 || task.runs.length > 0) && confirmationCommands.has(command);
}

export function agentDialogueActive(task: AgentTask) {
  return (task.dialogue?.activeUntil ?? 0) > Date.now();
}

export function agentFinished(phase: AgentTask["phase"]) {
  return phase === "finished" || phase === "unsupported" || phase === "cancelled" || phase === "limit";
}

export function schedulingWaitReport(runs: AgentRun[]) {
  const cpu = runs.flatMap((run, index) => run.tool === "cpu-scheduling" && "processes" in run.config
    ? [{ round: index + 1, config: run.config, wait: Number(run.metrics.waiting) }] : []);
  const firstRR = cpu.find(({ config }) => config.policy === "rr");
  if (!firstRR) return null;
  const workload = JSON.stringify(firstRR.config.processes);
  const comparable = cpu.filter(({ config, wait }) => Number.isFinite(wait) && JSON.stringify(config.processes) === workload);
  const trials = comparable.filter(({ config }) => config.policy === "rr");
  if (trials.length < 2) return null;
  const bestWait = Math.min(...trials.map(({ wait }) => wait));
  return { firstRR, bestWait, bestTrials: trials.filter(({ wait }) => wait === bestWait),
    fcfs: comparable.find(({ config }) => config.policy === "fcfs") };
}
