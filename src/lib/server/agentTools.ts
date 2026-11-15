import "server-only";
import { randomUUID } from "node:crypto";
import { creatorCapabilities } from "@/lib/creatorCapabilities";
import { getExperimentEngine } from "@/lib/experimentEngines";
import type { AgentCall, AgentRun, AgentTask } from "@/lib/experimentAgent";
import { fields } from "@/lib/experiments/engine";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { runConfirmedAgentCall } from "./experimentRecords";

export const agentTools = creatorCapabilities.map(({ id, version, title, domain, description, parameters, metrics }) => ({
  tool: id, version, title, domain, description, inputSchema: parameters,
  outputSchema: { metrics: { values: "string", description: metrics }, runId: "UUID", sessionId: "UUID", completedAt: "ISO 8601" },
}));

export function agentPlanningTools(seed: number) {
  return agentTools.map(({ tool, version, description, inputSchema, outputSchema }) => {
    const preset = getExperimentEngine(tool, version)?.preset(seed);
    const inputs = preset && Object.fromEntries(Object.entries(preset).filter(([key]) => Object.hasOwn(inputSchema, key)));
    return { tool, description, inputSchema, metrics: outputSchema.metrics.description,
      preset: inputs && (JSON.stringify(inputs).length <= 240 ? inputs : { goalLabel: preset?.goalLabel }) };
  });
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
