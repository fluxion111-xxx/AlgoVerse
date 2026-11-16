import type { AgentEvidence, AgentRun } from "../experimentAgent";
import type { ExperimentEngine, ExperimentResults } from "../experimentEngines";
import { registeredEngines } from "@/lib/experimentEngines";
import { evidenceLabels, experimentEvidence } from "./evidence";
import { evidencePositionToken, type EvidencePosition, type RunEvidenceReference } from "./evidencePosition";
import { metricDeltas, parameterLabels, sortingChange } from "./runComparison";

export type EvidenceRunData = Pick<AgentRun, "id" | "sessionId" | "tool" | "version" | "config"> & { results: ExperimentResults };
type Trace = { key: string; label: string; items: readonly unknown[]; offset?: number };
type ResultTarget = { key: string; label: string; replayStep: number };
type Rule = {
  metrics?: string[];
  conditions?: string[];
  limitations?: string[];
  normalize?: (config: EvidenceRunData["config"]) => Record<string, unknown>;
  results?: (results: ExperimentResults) => ResultTarget[];
  keyStep?: (traces: Trace[]) => EvidencePosition | undefined;
};

const rules: Partial<Record<AgentRun["tool"], Rule>> = {
  "knn-classification": {
    metrics: ["prediction", "votes", "neighbors"], conditions: ["samples", "query"],
    limitations: ["待分类点缺少真实标签。", "无法判断准确率是否提高。"],
    results: (results) => "neighbors" in results && results.neighbors.length
      ? [{ key: "neighbors", label: "最近邻与距离", replayStep: results.neighbors.length },
        { key: "votes", label: "投票与预测", replayStep: results.neighbors.length }] : [],
  },
  sorting: {
    metrics: ["comparisons", "swaps", "sorted"],
    limitations: ["本轮只统计操作次数。", "快慢需要实际计时。"],
  },
  "cpu-scheduling": {
    metrics: ["waiting", "turnaround", "response"], conditions: ["processes"],
    limitations: ["本轮使用单核模拟。", "切换只计次数。"],
    normalize: (config) => "policy" in config && config.policy === "fcfs" ? { ...config, quantum: undefined } : config,
    keyStep: ([track]) => track && { kind: "step", key: track.key, step: track.items.length },
  },
  "pointer-write": {
    metrics: ["pointerOutcome", "pointerTarget", "pointerArray"], conditions: ["memoryCells"],
    keyStep: ([trace]) => trace && { kind: "step", key: trace.key, step: trace.items.length },
    limitations: ["结论适用于本轮数组。"],
  },
  pathfinding: {
    metrics: ["visited", "pathLength", "elapsedMs"], conditions: ["walls", "start", "goal"],
    limitations: ["单次耗时可能波动。"],
    normalize: (config) => "walls" in config ? { ...config, walls: [...config.walls].sort((a, b) => a - b), seed: undefined, difficulty: undefined } : config,
  },
  "network-transmission": { conditions: ["seed", "packets"], limitations: ["丢包结果受模拟种子影响。"] },
};

function trace(key: string, label: string, items: readonly unknown[] | undefined, offset?: number): Trace[] {
  return Array.isArray(items) && items.length ? [{ key, label, items, offset }] : [];
}

// These tracks match the saved data and step counters used by the existing players.
function nativeTraces(result: ExperimentResults): Trace[] {
  if ("dijkstra" in result) return [...trace("dijkstra", "Dijkstra 访问", result.dijkstra.visited), ...trace("astar", "A* 访问", result.astar.visited)];
  if ("report" in result) return [];
  switch (result.kind) {
    case "sorting": return [...trace("bubble", "冒泡排序记录", result.bubble.frames), ...trace("quick", "快速排序记录", result.quick.frames)];
    case "cpu-scheduling": return trace("timeline", "CPU 调度记录", result.timeline);
    case "network-transmission": return trace("events", "发包记录", result.events);
    case "knn-classification": return trace("neighbors", "邻居顺序", result.neighbors);
    case "page-replacement": return trace("references", "页面引用记录", result.policies[0]?.steps);
    case "tree-traversal": return result.traversals.flatMap(({ order, steps }) => trace(order, "树节点访问", steps));
    case "graph-traversal": return [...trace("bfs", "BFS 访问", result.bfs), ...trace("dfs", "DFS 访问", result.dfs)];
    case "deadlock-avoidance": return [...trace("initial", "原状态检查", result.initial.steps),
      ...trace("trial", "试分配检查", result.trial?.steps, result.initial.steps.length + 1)];
    case "dynamic-routing": return [...trace("before", "链路变更前", result.before.steps), ...trace("after", "链路变更后", result.after.steps)];
    case "memory-allocation": return [...trace("first", "首次适配", result.first.steps), ...trace("best", "最佳适配", result.best.steps)];
    case "transaction-concurrency": return [...trace("readCommitted", "读已提交", result.readCommitted.steps), ...trace("snapshot", "快照", result.snapshot.steps)];
    default: return "steps" in result ? trace("steps", "运行步骤", result.steps) : [];
  }
}

function registerAdapter(engine: ExperimentEngine) {
  const curriculum = "curriculum" in engine ? engine.curriculum : undefined;
  const rule = rules[engine.id];
  return {
    engine,
    rule,
    firstMetrics: rule?.metrics ?? (curriculum ? [curriculum.focusMetric] : []),
    traces: curriculum
      ? (results: ExperimentResults) => "report" in results ? trace("steps", "实验轨迹", results.steps) : []
      : nativeTraces,
    parameterLabel(key: string) {
      return curriculum?.fields.find(([field]) => field === key)?.[1].label ?? parameterLabels[key] ?? (key === "values" ? "输入序列" : key);
    },
  };
}

const adapters = new Map(registeredEngines.map((engine) => [`${engine.id}:${engine.version}`, registerAdapter(engine)]));

export function adaptEvidenceRun(researchId: string, round: AgentRun, data: EvidenceRunData | undefined | null) {
  if (!data || data.id !== round.id || data.sessionId !== round.sessionId || data.tool !== round.tool || data.version !== round.version) return null;
  const adapter = adapters.get(`${data.tool}:${data.version}`);
  if (!adapter || !adapter.engine.validate(data.config)) return null;
  try {
    if (!data.results || (data.tool === "pathfinding" ? !("dijkstra" in data.results) : !("kind" in data.results) || data.results.kind !== data.tool)) return null;
    const metrics = Object.fromEntries(Object.entries(experimentEvidence(data.results)).filter(([, value]) => typeof value === "string" && value.length > 0));
    return { researchId, data, metrics, adapter, traces: adapter.traces(data.results), results: adapter.rule?.results?.(data.results) ?? [] };
  } catch {
    return null;
  }
}

type AdaptedRun = NonNullable<ReturnType<typeof adaptEvidenceRun>>;
type EvidenceLink = { label: string; reference: RunEvidenceReference };
export type EvidenceFinding = { text: string; links: EvidenceLink[] };

export function referenceFor(run: AdaptedRun, position: EvidencePosition): RunEvidenceReference {
  return { researchId: run.researchId, sessionId: run.data.sessionId, runId: run.data.id, position };
}

export function resolveEvidence(run: AdaptedRun | null, reference: RunEvidenceReference) {
  if (!run || reference.researchId !== run.researchId || reference.runId !== run.data.id || reference.sessionId !== run.data.sessionId) return null;
  const position = reference.position;
  const token = evidencePositionToken(position);
  if (position.kind === "metric") return Object.hasOwn(run.metrics, position.key)
    ? { token, label: evidenceLabels[position.key] ?? position.key, replayStep: undefined } : null;
  if (position.kind === "result") {
    const target = run.results.find(({ key }) => key === position.key);
    return target ? { token, label: target.label, replayStep: target.replayStep } : null;
  }
  if (position.kind === "step") {
    const track = run.traces.find(({ key }) => key === position.key);
    if (track && Number.isSafeInteger(position.step) && position.step >= 1 && position.step <= track.items.length) {
      return { token, label: `${track.label} · 第 ${position.step} 步`, replayStep: position.step + (track.offset ?? 0) };
    }
  }
  return null;
}

function link(run: AdaptedRun, position: EvidencePosition, prefix = ""): EvidenceLink[] {
  const reference = referenceFor(run, position);
  const target = resolveEvidence(run, reference);
  return target ? [{ label: prefix + target.label, reference }] : [];
}

function equal(before: unknown, after: unknown): boolean {
  if (Object.is(before, after)) return true;
  if (Array.isArray(before) && Array.isArray(after)) return before.length === after.length && before.every((value, i) => equal(value, after[i]));
  if (!before || !after || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) || Array.isArray(after)) return false;
  const left = Object.entries(before);
  return left.length === Object.keys(after).length && left.every(([key, value]) => Object.hasOwn(after, key) && equal(value, (after as Record<string, unknown>)[key]));
}

export function precedingEvidenceRound(rounds: AgentRun[], index: number, firstRound: number) {
  const current = rounds[index];
  if (!current || index < firstRound) return undefined;
  return rounds.findLast((round, at) => at >= firstRound && at < index && round.tool === current.tool && round.version === current.version);
}

export function compareEvidenceRuns(before: AdaptedRun, after: AdaptedRun) {
  if (before.researchId !== after.researchId || before.data.id === after.data.id || before.adapter !== after.adapter) return null;
  const normalize = after.adapter.rule?.normalize ?? ((config: EvidenceRunData["config"]) => config);
  const left = normalize(before.data.config) as Record<string, unknown>;
  const right = normalize(after.data.config) as Record<string, unknown>;
  const parameters = [...new Set([...Object.keys(left), ...Object.keys(right)])].filter((key) => key !== "goalLabel");
  const changed = parameters.filter((key) => !equal(left[key], right[key]));
  const same = parameters.filter((key) => !changed.includes(key) && right[key] !== undefined);
  const metrics = Object.keys(after.metrics).filter((key) => Object.hasOwn(before.metrics, key));
  const controlsChanged = after.adapter.rule?.conditions?.filter((key) => changed.includes(key)) ?? [];
  return { changed, same, metrics, controlsChanged };
}

export function verifyRunEvidence(after: AdaptedRun, before?: AdaptedRun | null, cited: string[] = []) {
  const { adapter, metrics } = after;
  const keys = [...new Set([...adapter.firstMetrics, ...cited, ...Object.keys(metrics)])].filter((key) => Object.hasOwn(metrics, key));
  const facts = keys.slice(0, 4).map((key) => ({
    text: `${evidenceLabels[key] ?? key} · ${metrics[key]}`,
    links: link(after, { kind: "metric", key }),
  }));
  const supported: EvidenceFinding[] = [];
  const limitations = [...(adapter.rule?.limitations ?? [])];
  const scope = ["仅用于已运行的条件。"];
  const conditions = Object.entries(adapter.rule?.normalize?.(after.data.config) ?? after.data.config)
    .filter(([key, value]) => key !== "goalLabel" && value !== undefined)
    .map(([key, value]) => ({ label: adapter.parameterLabel(key), value: typeof value === "string" ? value : JSON.stringify(value) }));
  const comparison = before && compareEvidenceRuns(before, after);
  if (comparison && before) {
    const label = (key: string) => adapter.parameterLabel(key);
    const { changed, same, controlsChanged } = comparison;
    if (same.length) scope.push(`保持 ${same.map(label).join("、")}。`);
    if (changed.length) scope.push(`改动 ${changed.map(label).join("、")}。`);
    else scope.push("两轮有效参数一致。");
    if (after.data.tool === "sorting" && "values" in before.data.config && "values" in after.data.config) {
      scope.push(sortingChange(before.data.config.values, after.data.config.values));
    }
    if (controlsChanged.length) limitations.push(`对照条件有变。涉及 ${controlsChanged.map(label).join("、")}。`);
    if (changed.length > 1 || controlsChanged.length) limitations.push("当前对照无法分离影响。");
    const common = keys.filter((key) => comparison.metrics.includes(key));
    const changedMetrics = common.filter((key) => before.metrics[key] !== metrics[key]);
    for (const key of (changedMetrics.length ? changedMetrics : common.slice(0, 1)).slice(0, 3)) {
      const deltas = after.data.tool === "sorting" && (key === "comparisons" || key === "swaps")
        ? metrics[key].split(" / ").flatMap((value, index) => metricDeltas(key, before.metrics[key].split(" / ")[index] ?? "", value)
          .map((delta) => `${index === 0 ? "冒泡" : "快排"} ${delta}`))
        : metricDeltas(key, before.metrics[key], metrics[key]);
      supported.push({
        text: before.metrics[key] === metrics[key] ? `${evidenceLabels[key] ?? key}两轮记录相同。`
          : `${evidenceLabels[key] ?? key} · ${before.metrics[key]} → ${metrics[key]}${deltas.length ? `（${deltas.join("、")}）` : ""}`,
        links: [...link(before, { kind: "metric", key }, "前轮 · "), ...link(after, { kind: "metric", key }, "本轮 · "),
          ...(key === "prediction" ? [...link(before, { kind: "result", key: "votes" }, "前轮 · "), ...link(after, { kind: "result", key: "votes" }, "本轮 · ")] : [])],
      });
    }
    if (!common.length) limitations.push("两轮缺少共同指标。");
  } else {
    if (facts[0]) supported.push({ text: `本轮记录了${evidenceLabels[keys[0]] ?? keys[0]}。`, links: facts[0].links });
    limitations.push("缺少可核验的对照轮。");
  }
  limitations.push("推广结论还需更多复测。");
  const defaultTrace = after.traces[0];
  const keyStep = adapter.rule?.keyStep?.(after.traces)
    ?? (defaultTrace && { kind: "step" as const, key: defaultTrace.key, step: 1 });
  const locations = [
    ...after.results.flatMap(({ key }) => link(after, { kind: "result", key })),
    ...(keyStep ? link(after, keyStep) : []),
  ];
  return { facts, supported, limitations, scope, conditions, locations };
}

export function citedRunEvidence(citations: AgentEvidence[], rounds: (AdaptedRun | null)[]) {
  const links = citations.flatMap(({ from, to, metric }) => [...new Set([from, to])].flatMap((number) => {
    const run = rounds[number - 1];
    return run ? link(run, { kind: "metric", key: metric }, `第 ${number} 轮 · `) : [];
  }));
  return links.filter((entry, index) => links.findIndex(({ reference }) => reference.runId === entry.reference.runId
    && evidencePositionToken(reference.position) === evidencePositionToken(entry.reference.position)) === index);
}
