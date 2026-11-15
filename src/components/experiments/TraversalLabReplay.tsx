import type { ExperimentConfig, ExperimentResults } from "@/lib/experimentEngines";
import { Controls, useReplay } from "./SimulationReplay";

type Result<Kind> = Extract<ExperimentResults, { kind: Kind }>;
type Config<Key extends string> = Extract<ExperimentConfig, Record<Key, unknown>>;
const treeLabels = { preorder: "先序", inorder: "中序", postorder: "后序", level: "层序" };
const list = (items: number[]) => items.join("、") || "—";

export function TreeReplay({ config, results }: { config: Config<"nodes">; results?: Result<"tree-traversal"> }) {
  const count = config.nodes.filter((node) => node !== null).length;
  const replay = useReplay(results ? count : 0, 700);
  const depth = Math.floor(Math.log2(config.nodes.length));
  const point = (index: number) => {
    const level = Math.floor(Math.log2(index + 1));
    const start = 2 ** level - 1;
    return { x: (index - start + 0.5) * 540 / 2 ** level + 10, y: 22 + 41 * level };
  };
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <div className="simulation-sort">
      {(Object.entries(treeLabels) as [keyof typeof treeLabels, string][]).map(([order, label]) => {
        const run = results?.traversals.find((row) => row.order === order);
        const steps = run?.steps.slice(0, replay.step) ?? [];
        const active = steps.at(-1);
        const visited = new Set(steps.map(({ node }) => node));
        return <section className="simulation-panel" key={order}>
          <h3>{label}遍历</h3>
          <svg className="simulation-network" viewBox={`0 0 560 ${46 + 41 * depth}`} role="img" aria-label={label + "二叉树"}>
            {config.nodes.map((node, index) => {
              if (node === null || index === 0) return null;
              const parent = point(Math.floor((index - 1) / 2));
              const child = point(index);
              return <line key={index} x1={parent.x} y1={parent.y} x2={child.x} y2={child.y} />;
            })}
            {config.nodes.map((node, index) => {
              if (node === null) return null;
              const { x, y } = point(index);
              return <g key={index}>
                <circle cx={x} cy={y} r={13} fill={active?.node === index ? "#a64e2d" : visited.has(index) ? "#6d6142" : "#3a2e24"} stroke="#f7e2c5" />
                <text x={x} y={y + 4} textAnchor="middle">{node}</text>
              </g>;
            })}
          </svg>
          <p>访问顺序 {list(run?.values.slice(0, replay.step) ?? [])}</p>
          <p>{order === "level" ? "待访问队列" : "调用栈"} {list(active?.pending.map((i) => config.nodes[i]!) ?? [])}</p>
        </section>;
      })}
    </div>
  </div>;
}

export function GraphReplay({ config, results }: { config: Config<"edges">; results?: Result<"graph-traversal"> }) {
  const replay = useReplay(results?.bfs.length ?? 0, 700);
  const vertices = Array.from({ length: config.vertexCount }, (_, vertex) => {
    const angle = 2 * Math.PI * vertex / config.vertexCount - Math.PI / 2;
    return { x: 150 + 105 * Math.cos(angle), y: 132 + 105 * Math.sin(angle) };
  });
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <p>起点 {config.startVertex} · {config.directed ? "有向图" : "无向图"}</p>
    <div className="simulation-sort">{(["bfs", "dfs"] as const).map((method) => {
      const steps = results?.[method].slice(0, replay.step) ?? [];
      const active = steps.at(-1);
      const visited = new Set(steps.map(({ vertex }) => vertex));
      return <section className="simulation-panel" key={method}>
        <h3>{method === "bfs" ? "广度优先 BFS" : "深度优先 DFS"}</h3>
        <svg className="simulation-network" viewBox="0 0 300 264" role="img" aria-label={method.toUpperCase() + " 遍历图"}>
          <defs><marker id={method + "-arrow"} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#eaa779" />
          </marker></defs>
          {config.edges.map(([from, to]) => {
            const a = vertices[from];
            const b = vertices[to];
            if (from === to) return <path key={`${from},${to}`} d={`M ${a.x - 8} ${a.y - 8} q 8 -33 16 0`}
              stroke="#91785e" fill="none" markerEnd={config.directed ? `url(#${method}-arrow)` : undefined} />;
            const distance = Math.hypot(b.x - a.x, b.y - a.y);
            const x = (b.x - a.x) / distance;
            const y = (b.y - a.y) / distance;
            const shift = config.directed ? 3 : 0;
            return <g key={`${from},${to}`} data-active={active?.parent === from && active.vertex === to || !config.directed && active?.parent === to && active.vertex === from}>
              <line x1={a.x + x * 12 - y * shift} y1={a.y + y * 12 + x * shift}
                x2={b.x - x * 13 - y * shift} y2={b.y - y * 13 + x * shift} markerEnd={config.directed ? `url(#${method}-arrow)` : undefined} />
            </g>;
          })}
          {vertices.map(({ x, y }, index) => <g key={index}>
            <circle cx={x} cy={y} r={12} fill={active?.vertex === index ? "#a64e2d" : visited.has(index) ? "#6d6142" : "#3a2e24"} stroke="#f7e2c5" />
            <text x={x} y={y + 4} textAnchor="middle">{index}</text>
          </g>)}
        </svg>
        <p>访问顺序 {list(steps.map(({ vertex }) => vertex))}</p>
        <p>{method === "bfs" ? "待访问队列" : "调用栈"} {list(active?.pending ?? [])}</p>
        {active && <p>{method === "bfs" ? "无权距离" : "搜索树深度"} {active.depth}</p>}
      </section>;
    })}</div>
    {results && replay.step === replay.length && <p>不可达顶点 {results.unreachable.join("、") || "无"}</p>}
  </div>;
}

const decisions = { "grant": "批准请求", "wait": "资源不足，暂缓", "exceeds-need": "请求超出所需量", "unsafe": "试分配不安全，撤销" };

export function BankerReplay({ config, results }: { config: Config<"allocation">; results?: Result<"deadlock-avoidance"> }) {
  const limit = results ? results.initial.steps.length + (results.trial?.steps.length ?? 0) + 2 : 0;
  const replay = useReplay(limit, 780);
  const initialSize = results?.initial.steps.length ?? 0;
  const inTrial = !!results && replay.step > initialSize;
  const audit = inTrial ? results.trial : results?.initial;
  const shown = inTrial ? replay.step - initialSize - 1 : replay.step;
  const step = audit?.steps[shown - 1];
  const work = step?.after ?? (inTrial && audit ? config.available.map((value, i) => value - config.request[i]) : config.available);
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>{inTrial ? "试分配检查" : "原状态检查"}</h3>
      <p>可用量 [{work.join(", ")}]</p>
      <p>请求来自 P{config.process}：[{config.request.join(", ")}]</p>
      <table className="simulation-table">
        <thead><tr><th>进程</th><th>已分配</th><th>最大需求</th><th>尚需</th></tr></thead>
        <tbody>{config.allocation.map((row, process) => {
          const allocated = inTrial && audit && process === config.process ? row.map((value, i) => value + config.request[i]) : row;
          return <tr key={process}><th scope="row">P{process}</th><td>{allocated.join(", ")}</td><td>{config.maximum[process].join(", ")}</td>
            <td>{config.maximum[process].map((value, i) => value - allocated[i]).join(", ")}</td></tr>;
        })}</tbody>
      </table>
      {step && <p>P{step.process} 模拟完成。归还 [{step.released.join(", ")}]。</p>}
      {audit && <p>完成顺序 {audit.sequence.slice(0, shown).map((value) => `P${value}`).join(" → ") || "—"}</p>}
      {audit && shown >= audit.steps.length && !audit.safe && <p>余下进程无法完成 {audit.blocked.map((value) => `P${value}`).join("、")}</p>}
      {results && replay.step === limit && <p className="domain-result">{decisions[results.decision]}</p>}
    </section>
  </div>;
}

const phases = { "slow-start": "慢启动", "avoidance": "拥塞避免", "recovery": "快恢复" };
const signalLabels = { ack: "新 ACK", dup: "重复 ACK", timeout: "超时" };

export function TcpReplay({ config, results }: { config: Config<"signals">; results?: Result<"tcp-congestion"> }) {
  const replay = useReplay(results?.steps.length ?? 0, 600);
  const current = results?.steps[replay.step - 1];
  const cap = Math.max(config.initialWindow, config.initialThreshold, ...(results?.steps.map(({ cwnd, threshold }) => Math.max(cwnd, threshold)) ?? []));
  const shown = [{ cwnd: config.initialWindow, threshold: config.initialThreshold }, ...(results?.steps.slice(0, replay.step) ?? [])];
  const line = (key: "cwnd" | "threshold") => shown.map((state, i) =>
    `${35 + i * 365 / Math.max(1, config.signals.length)},${145 - state[key] * 118 / cap}`).join(" ");
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>拥塞窗口轨迹</h3>
      <p>简化 Reno · 单位 MSS</p>
      <p>满窗近似在途量。</p>
      <svg className="simulation-network" viewBox="0 0 420 165" role="img" aria-label="拥塞窗口和慢启动阈值轨迹">
        <path d="M 35 20 V 145 H 400" fill="none" stroke="#91785e" />
        <polyline points={line("cwnd")} fill="none" stroke="#ffc389" strokeWidth="3" />
        <polyline points={line("threshold")} fill="none" stroke="#d4dc9f" strokeWidth="2" strokeDasharray="5 4" />
      </svg>
      <p>实线为窗口。虚线为阈值。</p>
      <p>{current ? signalLabels[current.signal] : "初始状态"} · {phases[current?.phase ?? (config.initialWindow < config.initialThreshold ? "slow-start" : "avoidance")]}</p>
      <p>窗口 {(current?.cwnd ?? config.initialWindow).toFixed(2)} · 阈值 {current?.threshold ?? config.initialThreshold}</p>
      {current?.signal === "dup" && <p>连续重复 ACK {current.duplicates}</p>}
      {current?.retransmit && <p>{current.retransmit === "fast" ? "触发快重传" : "触发超时重传"}</p>}
    </section>
  </div>;
}
