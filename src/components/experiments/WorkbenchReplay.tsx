"use client";

import { SavedPathfindingReplay } from "@/components/PathfindingWorkbench";
import type { AgentRun } from "@/lib/experimentAgent";
import type { ExperimentResults } from "@/lib/experimentEngines";
import { SimulationResultReplay } from "./SimulationParameters";

export function WorkbenchReplay({ run, results }: { run: AgentRun; results: ExperimentResults }) {
  const { tool, config } = run;
  if (tool === "pathfinding" && "walls" in config && "dijkstra" in results) {
    return <SavedPathfindingReplay map={config} results={results} />;
  }
  if (tool !== "pathfinding" && !("walls" in config) && "kind" in results && results.kind === tool) {
    return <SimulationResultReplay engineId={tool} config={config} results={results} />;
  }
  return <p className="wb-muted">本轮暂无回放。</p>;
}
