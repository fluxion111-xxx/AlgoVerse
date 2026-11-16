"use client";

import { SavedPathfindingReplay } from "@/components/PathfindingWorkbench";
import type { AgentRun } from "@/lib/experimentAgent";
import type { ExperimentResults } from "@/lib/experimentEngines";
import { getCurriculumLab } from "@/lib/experiments/curriculumLabs";
import { CurriculumReplay } from "./CurriculumLab";
import { SimulationResultReplay } from "./SimulationParameters";
import { EvidenceReplayStep } from "./SimulationReplay";
import { WorkbenchSortingReplay } from "./WorkbenchSortingReplay";

export function WorkbenchReplay({ run, results, evidenceStep }: { run: AgentRun; results: ExperimentResults; evidenceStep?: number }) {
  const { tool, config } = run;
  if (tool === "pathfinding" && "walls" in config && "dijkstra" in results) {
    return <SavedPathfindingReplay map={config} results={results} evidenceFrame={evidenceStep} />;
  }
  if (tool === "sorting" && "values" in config && "kind" in results && results.kind === "sorting") {
    return <EvidenceReplayStep.Provider value={evidenceStep}><WorkbenchSortingReplay config={config} results={results} /></EvidenceReplayStep.Provider>;
  }
  const lab = getCurriculumLab(tool);
  if (lab && "report" in results && results.kind === tool) {
    return <EvidenceReplayStep.Provider value={evidenceStep}>
      <CurriculumReplay lab={lab.curriculum} description={lab.creator.description} results={results} />
    </EvidenceReplayStep.Provider>;
  }
  if (tool !== "pathfinding" && !("walls" in config) && "kind" in results && results.kind === tool) {
    return <EvidenceReplayStep.Provider value={evidenceStep}>
      <SimulationResultReplay engineId={tool} config={config} results={results} />
    </EvidenceReplayStep.Provider>;
  }
  return <p className="wb-muted">本轮暂无回放。</p>;
}
