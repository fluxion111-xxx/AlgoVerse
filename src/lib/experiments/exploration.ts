import { agentDialogueActive, agentLimits, type AgentTask } from "@/lib/experimentAgent";

export type ExplorationChange = { key: string; value: unknown; metrics: string[]; purpose: string; reason: string };

export type ExplorationSuggestion = {
  change: ExplorationChange;
  parameter: { label: string; before: unknown };
  controls: { key: string; label: string; value: unknown }[];
  metrics: { key: string; label: string; baseline: string }[];
};

export function explorationBlock(task: AgentTask | null, runId: string) {
  if (!task) return "";
  if (task.runs.length <= (task.dialogue?.focus?.firstRun ?? 0) || task.runs.at(-1)?.id !== runId) return "请选当前研究的最新一轮。";
  if (task.pending.length) return "请先处理待确认方案。";
  if (task.phase === "running" || task.phase === "deciding" || agentDialogueActive(task) || task.dialogue?.pending) return "请先处理当前任务。";
  if (task.runs.length >= agentLimits.runs || task.steps + 2 > agentLimits.steps || task.requests >= agentLimits.decisions) return "本研究已达轮次上限。";
  return "";
}
