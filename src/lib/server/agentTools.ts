import "server-only";
import { randomUUID } from "node:crypto";
import { creatorCapabilities, creatorObservations } from "@/lib/creatorCapabilities";
import { getExperimentEngine, type EngineId } from "@/lib/experimentEngines";
import type { AgentCall, AgentDialogue, AgentRun, AgentTask } from "@/lib/experimentAgent";
import { experimentQuestions } from "@/lib/experimentQuestions";
import { fields } from "@/lib/experiments/engine";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { runConfirmedAgentCall } from "./experimentRecords";

export const agentTools = creatorCapabilities.map(({ id, version, title, domain, description, parameters, metrics }) => ({
  tool: id, version, title, domain, description, inputSchema: parameters,
  outputSchema: { metrics: { values: "string", description: metrics }, runId: "UUID", sessionId: "UUID", completedAt: "ISO 8601" },
}));

export function agentPlanningTools(seed: number, candidates?: readonly EngineId[]) {
  const tools = candidates ? agentTools.filter(({ tool }) => candidates.includes(tool)) : agentTools;
  return tools.map(({ tool, version, description, inputSchema, outputSchema }) => {
    const preset = getExperimentEngine(tool, version)?.preset(seed);
    const inputs = preset && Object.fromEntries(Object.entries(preset).filter(([key]) => Object.hasOwn(inputSchema, key)));
    return { tool, description, inputSchema, metrics: outputSchema.metrics.description,
      preset: inputs && (JSON.stringify(inputs).length <= 240 ? inputs : { goalLabel: preset?.goalLabel }) };
  });
}

const normalizeRequest = (text: string) => text.normalize("NFKC").trim().toLowerCase();
const comparisonSubject = (text: string) => text.replace(/\band\b|[与和、]/gu, "|").replace(/\s+/gu, "");
const registeredComparison = (tool: EngineId) => creatorObservations[tool].comparison?.match(/^(?:同一|相同)[^。，“”]{1,16}上的\s*(.+)$/u)?.[1];
const exampleTools = new Map(Object.values(experimentQuestions).flatMap((group) => group.map(({ text, tool }) => [normalizeRequest(text), tool] as const)));

const planningNames = agentTools.map(({ tool, title }) => {
  const methods = registeredComparison(tool)?.split(/\band\b|[与和、]/giu) ?? [];
  const names = [...new Set([tool, title, ...methods].map((name) => normalizeRequest(name).replace(/\s+/g, " ")))];
  const patterns = names.filter((name) => name.length >= 3 || name === "a*").map((name) => {
    const literal = name.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&").replace(/ /g, "\\s*");
    const left = /^[a-z0-9]/.test(name) ? "(?<![a-z0-9_-])" : "";
    const right = /[a-z0-9*]$/.test(name) ? "(?![a-z0-9_-])" : "";
    return new RegExp(left + literal + right, "u");
  });
  return { tool, patterns };
});

// Use explicit registered names, not loose words such as “性能” or “排序”.
export function selectAgentPlanningTools(...requirements: (string | undefined)[]) {
  const text = normalizeRequest(requirements.filter(Boolean).join("\n"));
  const matches = planningNames.filter(({ patterns }) => patterns.some((pattern) => pattern.test(text))).map(({ tool }) => tool);
  return matches.length >= 1 && matches.length <= 6 ? matches : undefined;
}

// Accept only complete, unambiguous requests. The model still supplies the whole plan.
export function recognizeAgentPlan(message: string) {
  const input = normalizeRequest(message);
  const example = exampleTools.get(input);
  const command = input.replace(/[。.]+$/u, "");
  const named = /^用(.+)做(?:一个|个)?实验$/u.exec(command)?.[1].replace(/\s+/gu, "");
  const compared = /^(?:比较|对比)(.+)$/u.exec(command)?.[1];
  const candidates = agentTools.filter(({ tool, title }) => {
    if (example) return tool === example;
    const name = normalizeRequest(title).replace(/\s+/gu, "");
    if (named && (named === name || named === tool)) return true;
    if (!compared) return false;
    const comparison = registeredComparison(tool);
    if (!comparison) return false;
    const subject = comparisonSubject(compared);
    const titledComparison = comparisonSubject(name);
    return subject === comparisonSubject(normalizeRequest(comparison)) || (titledComparison.includes("|") && subject === titledComparison);
  });
  if (candidates.length !== 1) return;
  const { tool, title } = candidates[0];
  const focus: NonNullable<AgentDialogue["pendingPlan"]> = { topic: title, goal: message.length <= 100 ? message : title,
    ...(example && { defaults: "forbidden" as const }) };
  return { tool, focus };
}

// A model-only projection. Keep every tool and all schema overrides and presets.
export function compactAgentCatalog<T extends { inputSchema: object }>(tools: T[]) {
  const goalLabel = "1–100 字的实验目标";
  if (tools.some(({ inputSchema }) => !Object.hasOwn(inputSchema, "goalLabel"))) return { tools };
  return {
    sharedInputSchema: { goalLabel },
    tools: tools.map((entry) => {
      const { goalLabel: ownGoalLabel, ...inputSchema } = entry.inputSchema as { goalLabel?: unknown };
      return ownGoalLabel === goalLabel ? { ...entry, inputSchema } : entry;
    }),
  };
}

export function prepareToolCall(value: unknown, seed: number, options?: {
  presetGoal?: string;
  base?: Pick<AgentCall, "tool" | "version" | "config">;
}): AgentCall | null {
  const input = fields(value, ["tool", "parameters"]);
  if (!input) return null;
  const tool = agentTools.find(({ tool }) => tool === input.tool);
  const engine = tool && getExperimentEngine(tool.tool, tool.version);
  if (!tool || !engine) return null;
  const base = options?.base;
  const changes = input.parameters !== null && typeof input.parameters === "object" && !Array.isArray(input.parameters)
    ? input.parameters : undefined;
  let config;
  if (input.parameters === "preset" && options?.presetGoal) {
    config = { ...engine.preset(seed), goalLabel: options.presetGoal };
  } else if (base?.tool === engine.id && base.version === engine.version && changes
    && Object.keys(changes).every((key) => Object.hasOwn(tool.inputSchema, key))) {
    const revised = { ...base.config, ...changes };
    config = engine.validate(revised) ? revised : engine.configure({ goalLabel: base.config.goalLabel, ...changes }, seed);
  } else {
    config = engine.configure(input.parameters, seed);
  }
  if (!config || !engine.validate(config)) return null;
  return { id: randomUUID(), sessionId: randomUUID(), tool: engine.id, version: engine.version, config };
}

export async function callAgentTool(task: AgentTask, call: AgentCall): Promise<AgentRun> {
  const saved = await runConfirmedAgentCall(task, call.id);
  if (!saved || saved.id !== call.id || saved.session.id !== call.sessionId || saved.session.engineId !== call.tool
    || saved.session.engineVersion !== call.version || !Number.isFinite(Date.parse(saved.completedAt))
    || ("kind" in saved.results ? saved.results.kind : "pathfinding") !== call.tool) {
    throw new Error("Invalid experiment run");
  }
  const metrics = experimentEvidence(saved.results);
  const entries = Object.entries(metrics);
  if (!entries.length || !entries.every(([key, value]) => Object.hasOwn(evidenceLabels, key) && typeof value === "string")) {
    throw new Error("Invalid experiment evidence");
  }
  return { ...call, completedAt: saved.completedAt, metrics };
}
