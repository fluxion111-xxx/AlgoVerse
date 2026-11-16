import { evidencePositionToken, type EvidencePosition, type RunEvidenceReference } from "./evidencePosition";
import { referenceFor, resolveEvidence, type adaptEvidenceRun } from "./runEvidence";

type Run = NonNullable<ReturnType<typeof adaptEvidenceRun>>;
type Trace = Run["traces"][number];
type Candidate = { label: string; reference: RunEvidenceReference };

export type EvidenceExplanation = {
  reference: RunEvidenceReference;
  explanation: string;
};

function findEvent(trace: Trace, field: string, value: unknown) {
  return trace.items.findIndex((item) => item !== null && typeof item === "object" && Reflect.get(item, field) === value) + 1;
}

function keySteps(run: Run, trace: Trace): [number, string?][] {
  const last = trace.items.length;
  switch (run.data.tool) {
    case "sorting": return [[findEvent(trace, "kind", "compare"), "首次比较"], [findEvent(trace, "kind", "swap"), "首次交换"],
      [findEvent(trace, "kind", "done"), "排序完成"]];
    case "network-transmission": return [[findEvent(trace, "state", "forwarded"), "首次转发"],
      [findEvent(trace, "state", "dropped"), "首次丢包"], [findEvent(trace, "state", "delivered"), "首次送达"]];
    case "cpu-scheduling": {
      const slices = run.data.results;
      if (!("timeline" in slices)) return [];
      const slicesInOrder = slices.timeline;
      const change = slicesInOrder.findIndex((slice, index) => index > 0 && slice.process !== null
        && slicesInOrder[index - 1].process !== null && slice.process !== slicesInOrder[index - 1].process) + 1;
      return [[1, slicesInOrder[0]?.process === null ? "初始空闲" : "调度开始"], [change, "首次切换"], [last, "末段调度"]];
    }
    default: return [[1], ...(last > 2 ? [[Math.ceil(last / 2)] as [number]] : []), [last]];
  }
}

export function keyframeCandidates(run: Run): Candidate[] {
  const candidates: Candidate[] = [];
  function add(position: EvidencePosition, event?: string) {
    const reference = referenceFor(run, position);
    const target = evidenceSnapshot(run, reference);
    if (target) candidates.push({ reference, label: event ? `${target.label} · ${event}` : target.label });
  }

  // The KNN player reveals a saved neighbor ranking. It has no time-based trace.
  if (run.data.tool !== "knn-classification") {
    for (const track of run.traces) {
      const listed = new Set<number>();
      for (const [step, event] of keySteps(run, track)) {
        if (step < 1 || listed.has(step)) continue;
        listed.add(step);
        add({ kind: "step", key: track.key, step }, event);
      }
    }
  }
  if (!candidates.length) {
    for (const { key } of run.results) add({ kind: "result", key });
    if (!candidates.length) {
      const keys = [...new Set([...run.adapter.firstMetrics, ...Object.keys(run.metrics)])];
      for (const key of keys.filter((key) => Object.hasOwn(run.metrics, key)).slice(0, 4)) add({ kind: "metric", key });
    }
  }
  return candidates;
}

export function evidenceSnapshot(run: Run, reference: RunEvidenceReference) {
  const location = resolveEvidence(run, reference);
  if (!location) return null;
  const position = reference.position;
  const identity = { token: evidencePositionToken(position), label: location.label };
  if (position.kind === "metric") return { ...identity, kind: "metric" as const, value: run.metrics[position.key] };
  if (position.kind === "result") {
    const results = run.data.results;
    if ("neighbors" in results) return { ...identity, kind: "result" as const,
      value: position.key === "neighbors" ? results.neighbors : { votes: results.votes, prediction: results.prediction } };
    return null;
  }
  if (position.kind !== "step" || run.data.tool === "knn-classification") return null;
  const track = run.traces.find(({ key }) => key === position.key);
  const current = track?.items[position.step - 1];
  if (current === undefined || current === null) return null;
  const engine = run.adapter.engine;
  return { ...identity, kind: "step" as const, step: position.step, track: position.key,
    columns: "curriculum" in engine ? engine.curriculum.columns : undefined,
    previous: track?.items[position.step - 2], current };
}

export function keyframeContext(run: Run, reference: RunEvidenceReference) {
  const snapshot = evidenceSnapshot(run, reference);
  if (!snapshot) return null;
  const { adapter, data } = run;
  return {
    runId: data.id, sessionId: data.sessionId, experiment: adapter.engine.creator.title, engine: data.tool,
    input: data.config, evidence: snapshot, limits: adapter.rule?.limitations ?? [],
  };
}
