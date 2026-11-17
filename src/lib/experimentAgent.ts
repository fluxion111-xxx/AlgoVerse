import type { EngineId, ExperimentConfig } from "./experimentEngines";
import type { TutorCodeBlock } from "./tutorReply";
import type { AICooldown } from "./aiRateLimit";
import type { AIErrorCode } from "./aiSettings";

export const agentLimits = { decisions: 6, runs: 4, steps: 12, batch: 2, outputTokens: 1000 } as const;
export const agentDialogueLimits = { requests: 24, context: 10, outputTokens: 1200 } as const;
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
  calls?: AgentCall[];
  plan?: string[];
};
export type AgentTurnAction = "answer" | "explain" | "clarify" | "unsupported" | "run";
export type SchedulingEvidence = {
  from: number;
  to: number;
  metric: "waiting" | "response" | "turnaround";
  processes: { process: number; before: number; after: number }[];
};
export type TutorContext = { topicId?: string; runId?: string; includeExperiment: boolean; includePractice: boolean };
export type TutorConversationSummary = { id: string; title: string; updatedAt: string };
export type TutorReference = { title: string; href: string };
export type TutorTurnDetails = { codeBlocks?: TutorCodeBlock[]; sources: TutorReference[]; recommendation?: TutorReference };
export type AgentTurn = { message: string; operationId?: string; stopped?: boolean; tutorScope?: TutorContext; tutor?: TutorTurnDetails } & (
  { reply: string; model: string; action: AgentTurnAction; evidence: AgentEvidence[]; scheduling?: SchedulingEvidence[]; proposalIds?: string[] }
  | { reply?: never; model?: never; action?: never; evidence?: never; scheduling?: never; proposalIds?: never }
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
  pendingRound?: number | null;
  pendingPlan?: Omit<AgentFocus, "firstRun"> & { switchTopic?: boolean };
  cooldown?: AICooldown;
  activeUntil?: number;
  operationId?: string;
  error?: string;
  errorCode?: AIErrorCode;
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
  tutorContext?: TutorContext;
  experimentGoal?: string;
  autoContinue?: boolean;
  referenceConfig?: Pick<AgentCall, "tool" | "version" | "config">;
  question?: string;
  error?: string;
  errorCode?: AIErrorCode;
  leaseUntil?: number;
  cooldown?: AICooldown;
  operationId?: string;
  requests: number;
  steps: number;
};

export function agentCooldown(task: AgentTask | null, provider: AICooldown["provider"] | undefined, now = Date.now()) {
  return [task?.dialogue?.cooldown, task?.cooldown].reduce<AICooldown | undefined>((latest, cooldown) =>
    cooldown && cooldown.provider === provider && cooldown.until > (latest?.until ?? now) ? cooldown : latest, undefined);
}

const confirmationCommands = new Set([
  "确认", "确认运行", "确认并运行", "开始", "开始运行", "开始实验", "运行", "运行实验", "执行", "执行实验",
  "确认吧", "开始吧", "运行吧", "确认执行", "开始执行", "请开始", "请开始运行", "请运行", "请执行", "可以开始了",
]);

// A whole-message command grants consent for the current batch only.
export function isAgentConfirmation(task: AgentTask, message: string) {
  const command = message.normalize("NFKC").trim().replace(/[。.!]$/u, "");
  return (task.pending.length > 0 || task.runs.length > 0) && confirmationCommands.has(command);
}

export function agentDialogueActive(task: Pick<AgentTask, "dialogue">) {
  return (task.dialogue?.activeUntil ?? 0) > Date.now();
}

export function isAgentOperationId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

export function hasAgentOperation(task: Pick<AgentTask, "dialogue">, operationId?: string) {
  if (!operationId) return false;
  const dialogue = task.dialogue;
  return dialogue?.turns.some((turn) => turn.operationId === operationId)
    || (dialogue?.operationId === operationId && (agentDialogueActive(task) || !!dialogue.error));
}

export type AgentOperationProgress =
  | { stage: "intent" | "plan" | "analysis"; until: number }
  | { stage: "ready" | "complete" | "failed" | "stopped" | "interrupted"; turn?: AgentTurn };

export function agentOperationProgress(task: AgentTask, operationId: string, now = Date.now()): AgentOperationProgress | undefined {
  const dialogue = task.dialogue;
  const turn = dialogue?.turns.find((entry) => entry.operationId === operationId);
  if (turn) {
    if (turn.stopped) return { stage: "stopped", turn };
    const ready = turn.action === "run" && task.phase === "confirm" && !dialogue?.pending && task.pending.length > 0
      && task.pending.every(({ id }) => turn.proposalIds?.includes(id));
    return { stage: ready ? "ready" : "complete", turn };
  }
  if (dialogue?.operationId === operationId && dialogue.pending) {
    if (dialogue.error) return { stage: "failed" };
    const until = dialogue.activeUntil ?? 0;
    if (until <= now) return { stage: "interrupted" };
    return { stage: dialogue.pendingPlan ? "plan" : "intent", until };
  }
  if (task.operationId !== operationId || dialogue?.pending) return;
  if (task.phase === "deciding") {
    const until = task.leaseUntil ?? 0;
    if (until <= now) return { stage: "interrupted" };
    return { stage: "analysis", until };
  }
  if (task.error) return { stage: "failed" };
  return { stage: task.phase === "confirm" && task.pending.length ? "ready" : "complete" };
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
