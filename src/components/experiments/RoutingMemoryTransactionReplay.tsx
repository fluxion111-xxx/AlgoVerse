import type { ExperimentConfig, ExperimentResults } from "@/lib/experimentEngines";
import { Controls, useReplay } from "./SimulationReplay";

type Config<Key extends string> = Extract<ExperimentConfig, Record<Key, unknown>>;
type Result<Kind> = Extract<ExperimentResults, { kind: Kind }>;

export function DynamicRoutingReplay({ config, results }: { config: Config<"topology">; results?: Result<"dynamic-routing"> }) {
  const replay = useReplay(results ? Math.max(results.before.steps.length, results.after.steps.length) : 0, 700);
  const positions = Array.from({ length: config.routerCount }, (_, i) => ({
    x: 145 + Math.cos(i / config.routerCount * Math.PI * 2 - Math.PI / 2) * 90,
    y: 106 + Math.sin(i / config.routerCount * Math.PI * 2 - Math.PI / 2) * 81,
  }));
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <p>R{config.source} → R{config.destination} · 链路状态重算</p>
    <div className="simulation-sort">{(["before", "after"] as const).map((phase) => {
      const run = results?.[phase];
      const step = run?.steps[Math.min(replay.step, run.steps.length) - 1];
      const finished = !!run && replay.step >= run.steps.length;
      const path = finished ? run.destination.path : [];
      return <section key={phase} className="simulation-panel">
        <h3>{phase === "before" ? "原拓扑" : "变更后"}</h3>
        <svg className="simulation-network" viewBox="0 0 290 212" role="img" aria-label={phase === "before" ? "原拓扑" : "变更后的拓扑"}>
          {config.topology.map(({ from, to, cost }, i) => {
            const a = positions[from], b = positions[to];
            const changed = phase === "after" && i === config.changedLink;
            const weight = changed ? config.newCost : cost;
            const inPath = path.some((id, j) => id === from && path[j + 1] === to || id === to && path[j + 1] === from);
            return <g key={i} data-active={inPath || changed}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeDasharray={weight === 0 ? "4 5" : undefined} />
              <text x={(a.x + b.x) / 2 + 5} y={(a.y + b.y) / 2 - 3}>{weight || "断"}</text>
            </g>;
          })}
          {positions.map(({ x, y }, i) => <g key={i}>
            <circle cx={x} cy={y} r="13" fill={step?.chosen === i ? "#a64e2d" : step?.settled.includes(i) ? "#6d6142" : "#392e25"} stroke="currentColor" />
            <text x={x} y={y + 4} textAnchor="middle">R{i}</text>
          </g>)}
        </svg>
        {step && <p>确认 R{step.chosen} · 更新 {step.updated.map((i) => `R${i}`).join("、") || "无"}</p>}
        <table className="simulation-table">
          <thead><tr><th>目标</th><th>成本</th><th>{finished ? "下一跳" : "前驱"}</th></tr></thead>
          <tbody>{positions.map((_, i) => {
            const through = finished ? run.routes[i].path[1] : step?.previous[i];
            const distance = step?.distances[i] ?? (i === config.source ? 0 : null);
            return <tr key={i}><th scope="row">R{i}</th><td>{distance ?? "—"}</td><td>{through == null ? "—" : `R${through}`}</td></tr>;
          })}</tbody>
        </table>
        {finished && <p className="domain-result">{path.length ? path.map((i) => `R${i}`).join(" → ") : "目标不可达"}</p>}
      </section>;
    })}</div>
  </div>;
}

const heapOutcome = { allocated: "分配成功", freed: "已释放", duplicate: "编号已占用", unknown: "找不到编号", capacity: "空闲容量不足", fragmented: "空闲块不连续" };

export function HeapReplay({ config, results }: { config: Config<"commands">; results?: Result<"memory-allocation"> }) {
  const replay = useReplay(results?.first.steps.length ?? 0, 750);
  const command = config.commands[replay.step - 1];
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <p>堆容量 {config.heapSize} · {command ? command.action === "alloc" ? `分配 ${command.id} 大小 ${command.size}` : `释放 ${command.id}` : "初始空堆"}</p>
    <div className="simulation-sort">{(["first", "best"] as const).map((policy) => {
      const step = results?.[policy].steps[replay.step - 1];
      const blocks = step?.blocks ?? [{ start: 0, size: config.heapSize, owner: null }];
      return <section className="simulation-panel" key={policy}>
        <h3>{policy === "first" ? "首次适配" : "最佳适配"}</h3>
        <svg className="simulation-network" viewBox="0 0 330 49" role="img" aria-label="堆地址分布">
          {blocks.map(({ start, size, owner }) => {
            const x = 5 + 320 * start / config.heapSize;
            const width = 320 * size / config.heapSize;
            return <g key={start}>
              <rect x={x} y={6} width={width} height={32} fill={owner === null ? "#392e25" : start === step?.address ? "#a64e2d" : "#6d6142"} stroke="#91785e" />
              {width >= 38 && <text x={x + width / 2} y={26} textAnchor="middle">{owner ?? "空"}</text>}
            </g>;
          })}
        </svg>
        {step && <p>{heapOutcome[step.outcome]}{step.address !== null && ` · 地址 ${step.address}`}</p>}
        <p>空闲 {step?.freeUnits ?? config.heapSize} · 最大空块 {step?.largest ?? config.heapSize}</p>
        <p>最大空块之外 {step?.fragmentedUnits ?? 0}</p>
        <table className="simulation-table">
          <thead><tr><th>地址</th><th>长度</th><th>归属</th></tr></thead>
          <tbody>{blocks.map(({ start, size, owner }) => <tr key={start}>
            <th scope="row">{start}</th><td>{size}</td><td>{owner ?? "空闲"}</td>
          </tr>)}</tbody>
        </table>
      </section>;
    })}</div>
  </div>;
}

const transactionOutcome = { begin: "开始事务", read: "读取", write: "写入暂存", commit: "提交", rollback: "回滚", conflict: "写冲突，整笔撤销", skipped: "条件不符，跳过写入" };

export function TransactionReplay({ config, results }: { config: Config<"schedule">; results?: Result<"transaction-concurrency"> }) {
  const replay = useReplay(results?.readCommitted.steps.length ?? 0, 780);
  const operation = config.schedule[replay.step - 1];
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <p>{operation ? `${operation.tx} · ${operation.action}${"row" in operation ? ` · 行 ${operation.row}` : ""}` : "尚未开始事务"}</p>
    <div className="simulation-sort">{(["readCommitted", "snapshot"] as const).map((mode) => {
      const step = results?.[mode].steps[replay.step - 1];
      const rows = step?.committed ?? config.initialRows.map((value) => ({ value, version: 0 }));
      return <section key={mode} className="simulation-panel">
        <h3>{mode === "readCommitted" ? "读已提交" : "事务快照"}</h3>
        <p>{mode === "readCommitted" ? "每次读取看最新提交。" : "读取沿用事务起始快照。"}</p>
        {step && <p className="domain-result">{transactionOutcome[step.outcome]}{step.conflictRow !== null && ` · 行 ${step.conflictRow}`}</p>}
        {step?.read && <p>读到 {step.read.value} · {step.read.version === null ? "本事务写入" : `版本 v${step.read.version}`}</p>}
        <table className="simulation-table"><thead><tr><th>行</th><th>已提交值</th><th>版本</th></tr></thead>
          <tbody>{rows.map(({ value, version }, i) => <tr key={i}><th scope="row">{i}</th><td>{value}</td><td>v{version}</td></tr>)}</tbody>
        </table>
        <p>暂存写入 {step?.buffered.map(({ tx, row, value }) => `${tx}[${row}] = ${value}`).join("、") || "无"}</p>
      </section>;
    })}</div>
    <p>提交时检查写冲突。</p>
  </div>;
}
