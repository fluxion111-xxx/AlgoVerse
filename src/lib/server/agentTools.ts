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

export function prepareToolCall(value: unknown, seed: number): AgentCall | null {
  const input = fields(value, ["tool", "parameters"]);
  if (!input) return null;
  const tool = agentTools.find(({ tool }) => tool === input.tool);
  const engine = tool && getExperimentEngine(tool.tool, tool.version);
  const config = engine?.configure(input.parameters, seed);
  if (!engine || !config || !engine.validate(config)) return null;
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
