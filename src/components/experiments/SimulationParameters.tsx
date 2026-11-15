"use client";

import { useState, type ReactNode } from "react";
import { getExperimentEngine, type EngineId, type ExperimentConfig, type ExperimentResults } from "@/lib/experimentEngines";
import { IndexReplay, KnnReplay, MemoryReplay } from "./DomainReplay";
import { ExpandedLabFields } from "./ExpandedLabFields";
import { GradientReplay, HashCollisionsReplay, KMeansReplay, PageReplacementReplay } from "./ExpandedLabReplay";
import { TraversalLabFields } from "./TraversalLabFields";
import { BankerReplay, GraphReplay, TcpReplay, TreeReplay } from "./TraversalLabReplay";
import { RoutingMemoryTransactionFields } from "./RoutingMemoryTransactionFields";
import { DynamicRoutingReplay, HeapReplay, TransactionReplay } from "./RoutingMemoryTransactionReplay";
import { NetworkReplay, SchedulingReplay, SortingReplay } from "./SimulationReplay";
import { FactorialFields, KnnFields, NetworkFields, numberValue, SchedulingFields } from "./SimulationFields";

type Parameters = Record<string, unknown>;

function integers(text: string) {
  return text.trim().split(/[\s,，]+/).map((entry) => /^-?\d+$/.test(entry) ? Number(entry) : null);
}

function editable(config: Exclude<ExperimentConfig, { walls: readonly number[] }>): Parameters {
  if ("links" in config) return { goalLabel: config.goalLabel, packets: config.packets, links: config.links };
  return { ...config };
}

export function SimulationWorkbench({ engineId, initial, results, action, sessionId, revision, nextRunId, runButton, onEdited, presentation }: {
  engineId: Exclude<EngineId, "pathfinding">;
  initial: Exclude<ExperimentConfig, { walls: readonly number[] }>;
  results?: ExperimentResults;
  action: (data: FormData) => Promise<void>;
  sessionId?: string;
  revision?: number;
  nextRunId: string;
  runButton: (hasRun: boolean) => ReactNode;
  onEdited: (edited: boolean) => void;
  presentation?: "plan" | "result";
}) {
  const [parameters, setParametersState] = useState(() => editable(initial));
  const [sequence, setSequence] = useState(() => {
    if ("values" in initial) return initial.values.join(", ");
    if ("keys" in initial) return initial.keys.join(", ");
    return "";
  });
  const changed = JSON.stringify(parameters) !== JSON.stringify(editable(initial));
  const engine = getExperimentEngine(engineId);
  const validated = engine?.configure(parameters, "seed" in initial ? initial.seed : 0);
  const config = validated ?? initial;
  const visibleResults = changed ? undefined : results;
  function setParameters(next: Parameters) {
    setParametersState(next);
    onEdited(JSON.stringify(next) !== JSON.stringify(editable(initial)));
  }

  return <div className="creator-console simulation-console">
    {presentation !== "result" && <aside className="creator-parameters" aria-labelledby="creator-parameters-title">
      <h3 id="creator-parameters-title" tabIndex={-1}>{presentation === "plan" ? "推荐参数" : "实验参数"}</h3>
      <form action={action}>
        {sessionId && <><input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="revision" value={revision} /></>}
        <input type="hidden" name="engineId" value={engineId} />
        <input type="hidden" name="runId" value={nextRunId} />
        {(!sessionId || changed) && <input type="hidden" name="parameters" value={JSON.stringify(parameters)} />}
        {"values" in initial && <div className="simulation-fields">
          <label htmlFor="simulation-values">整数序列</label>
          <input id="simulation-values" value={sequence} maxLength={140} onChange={(event) => {
            const text = event.target.value;
            setSequence(text);
            setParameters({ ...parameters, values: integers(text) });
          }} />
          <p>输入 2–20 个整数。</p>
        </div>}
        {"processes" in initial && <SchedulingFields parameters={parameters} update={setParameters} />}
        {"links" in initial && <NetworkFields parameters={parameters} update={setParameters} />}
        {"factorialInput" in initial && <FactorialFields parameters={parameters} update={setParameters} />}
        {"keys" in initial && <div className="simulation-fields">
          <label htmlFor="index-order">每节点最多几个键</label>
          <select id="index-order" value={String(parameters.order)} onChange={(event) => setParameters({ ...parameters, order: Number(event.target.value) })}>
            {[1, 2, 3].map((order) => <option key={order} value={order}>{order * 2} 个键</option>)}
          </select>
          <label htmlFor="index-keys">插入顺序</label>
          <textarea id="index-keys" rows={3} value={sequence} maxLength={180} onChange={(event) => {
            setSequence(event.target.value);
            setParameters({ ...parameters, keys: integers(event.target.value) });
          }} />
          <p>最多 32 个不同整数。范围 −99 至 99。</p>
          <div className="domain-fields">
            {(["lower", "upper"] as const).map((bound) => <div key={bound}>
              <label htmlFor={`index-${bound}`}>{bound === "lower" ? "查询下界" : "查询上界"}</label>
              <input id={`index-${bound}`} type="number" min={-99} max={99} value={numberValue(parameters[bound])}
                onChange={(event) => setParameters({ ...parameters, [bound]: event.target.valueAsNumber })} />
            </div>)}
          </div>
          <p>上下界都算。相等时查单个键。</p>
        </div>}
        {"samples" in initial && <KnnFields initial={initial} parameters={parameters} update={setParameters} />}
        {("references" in initial || "operations" in initial || "points" in initial || "curvature" in initial) &&
          <ExpandedLabFields initial={initial} values={parameters} onChange={setParameters} />}
        {("nodes" in initial || "edges" in initial || "allocation" in initial || "signals" in initial) &&
          <TraversalLabFields config={initial} parameters={parameters} update={setParameters} />}
        {("topology" in initial || "commands" in initial || "schedule" in initial) &&
          <RoutingMemoryTransactionFields config={initial} parameters={parameters} update={setParameters} />}
        {!validated && <p className="preset-error" role="status">请检查参数范围。</p>}
        {presentation === "plan" && !validated && <p className="simulation-caption">预览保留原方案。</p>}
        {presentation === "plan" && validated && <p className="creator-validation" role="status">参数校验通过。</p>}
        <fieldset className="creator-param-actions" disabled={!validated}>{runButton(!!visibleResults)}</fieldset>
      </form>
    </aside>}
    <div className="creator-stage" id="experiment-replay" tabIndex={-1}>
      {"values" in config && <SortingReplay config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "sorting" ? visibleResults : undefined} />}
      {"processes" in config && <SchedulingReplay config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "cpu-scheduling" ? visibleResults : undefined} />}
      {"links" in config && <NetworkReplay config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "network-transmission" ? visibleResults : undefined} />}
      {"factorialInput" in config && <MemoryReplay input={config.factorialInput} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "memory-visualization" ? visibleResults : undefined} />}
      {"keys" in config && <IndexReplay lower={config.lower} upper={config.upper} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "b-plus-tree" ? visibleResults : undefined} />}
      {"samples" in config && <KnnReplay config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "knn-classification" ? visibleResults : undefined} />}
      {"references" in config && <PageReplacementReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "page-replacement" ? visibleResults : undefined} />}
      {"operations" in config && <HashCollisionsReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "hash-collisions" ? visibleResults : undefined} />}
      {"points" in config && <KMeansReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "k-means" ? visibleResults : undefined} />}
      {"curvature" in config && <GradientReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "gradient-descent" ? visibleResults : undefined} />}
      {"nodes" in config && <TreeReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "tree-traversal" ? visibleResults : undefined} />}
      {"edges" in config && <GraphReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "graph-traversal" ? visibleResults : undefined} />}
      {"allocation" in config && <BankerReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "deadlock-avoidance" ? visibleResults : undefined} />}
      {"signals" in config && <TcpReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "tcp-congestion" ? visibleResults : undefined} />}
      {"topology" in config && <DynamicRoutingReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "dynamic-routing" ? visibleResults : undefined} />}
      {"commands" in config && <HeapReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "memory-allocation" ? visibleResults : undefined} />}
      {"schedule" in config && <TransactionReplay key={visibleResults ? "saved" : "preview"} config={config} results={visibleResults && "kind" in visibleResults && visibleResults.kind === "transaction-concurrency" ? visibleResults : undefined} />}
    </div>
  </div>;
}
