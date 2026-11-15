"use client";

import type { ExperimentConfig, ExperimentResults } from "@/lib/experimentEngines";
import type { IndexNode } from "@/lib/experiments/bPlusTree";
import { Controls, useReplay } from "./SimulationReplay";

type MemoryResult = Extract<ExperimentResults, { kind: "memory-visualization" }>;
type IndexResult = Extract<ExperimentResults, { kind: "b-plus-tree" }>;
type KnnResult = Extract<ExperimentResults, { kind: "knn-classification" }>;

export function MemoryReplay({ input, results }: { input: number; results?: MemoryResult }) {
  const replay = useReplay(results?.steps.length ?? 0, 510);
  const step = results?.steps[replay.step - 1];
  const finished = step?.kind === "done";
  return <div className="simulation-view" aria-label="递归调用栈回放">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel memory-replay">
      <div>
        <h3>{input}! 的调用栈</h3>
        <p>栈顶在上。每帧有自己的 n。</p>
        <pre className="memory-code">{["factorial(n)", "  if n == 0: return 1", "  return n × factorial(n − 1)"].join("\n")}</pre>
        <p>{step?.kind === "call" ? "压入新的栈帧。" : step?.kind === "return" ? `本帧返回 ${step.value}。` : finished ? "所有栈帧已退出。" : "运行后查看调用过程。"}</p>
      </div>
      <div>
        <ol className="memory-stack" aria-label="栈帧，从栈顶到底部">
          {step?.stack.slice().reverse().map(({ n, returned }) => <li key={n}><code>factorial({n})</code>
            <span>{returned === undefined ? `局部参数 n = ${n}` : `返回 ${returned}`}</span></li>)}
        </ol>
        {finished && <p className="domain-result">结果 {step.value} · 栈深 {results?.maxDepth} · 调用 {results?.calls} 次</p>}
      </div>
    </section>
  </div>;
}

function IndexBranch({ id, nodes, visited }: { id: number; nodes: IndexNode[]; visited: number[] }) {
  const node = nodes[id];
  return <li>
    <div className="index-node" data-visited={visited.includes(id)} data-leaf={node.kind === "leaf"}>
      <span>{node.kind === "leaf" ? "叶" : "分支"} #{node.id}</span>
      <b>{node.keys.join(" · ") || "空"}</b>
    </div>
    {node.kind === "branch" && <ul>{node.children.map((child) => <IndexBranch key={child} id={child} nodes={nodes} visited={visited} />)}</ul>}
  </li>;
}

export function IndexReplay({ lower, upper, results }: { lower: number; upper: number; results?: IndexResult }) {
  const replay = useReplay(results?.steps.length ?? 0, 570);
  const step = results?.steps[replay.step - 1];
  const leaves: number[] = [];
  if (step) {
    let node = step.nodes[step.root];
    while (node.kind === "branch") node = step.nodes[node.children[0]];
    while (node.kind === "leaf") {
      leaves.push(node.id);
      if (node.next === null) break;
      node = step.nodes[node.next];
    }
  }
  return <div className="simulation-view" aria-label="B+ 树回放">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>{step?.kind === "insert" ? `插入 ${step.key}` : step ? `查询 [${lower}, ${upper}]` : "B+ 树索引"}</h3>
      <p className="simulation-caption">键值放在叶节点。分支指路。</p>
      {step ? <>
        <div className="index-tree" tabIndex={0} aria-label="索引树，可横向滚动">
          <ul><IndexBranch id={step.root} nodes={step.nodes} visited={step.visited} /></ul>
        </div>
        <p className="index-leaves">叶链 · {leaves.map((leaf) => `#${leaf}`).join(" → ")}</p>
        <p>累计分裂 {step.splits} 次</p>
        {step.kind === "query" && <p className="domain-result">访问 {step.visited.length} 个节点 · 命中 {step.matches.join("、") || "无"}</p>}
        {replay.step === replay.length && <p>树高 {results?.height} 层</p>}
      </> : <p>运行后查看分裂与查找。</p>}
    </section>
  </div>;
}

const plot = (x: number, y: number) => ({ x: 26 + x * 24, y: 266 - y * 24 });

export function KnnReplay({ config, results }: {
  config: Extract<ExperimentConfig, { samples: unknown }>;
  results?: KnnResult;
}) {
  const replay = useReplay(results?.neighbors.length ?? 0, 600);
  const neighbors = results?.neighbors.slice(0, replay.step) ?? [];
  const query = plot(config.query.x, config.query.y);
  const finished = !!results && replay.step === replay.length;
  return <div className="simulation-view" aria-label="KNN 分类回放">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel knn-replay">
      <div>
        <h3>谁离待分类点最近？</h3>
        <svg className="knn-plot" viewBox="0 0 294 294" role="img" aria-label="二维样本与待分类点">
          {[0, 2, 4, 6, 8, 10].map((tick) => <g key={tick} className="knn-grid">
            <path d={`M26 ${plot(0, tick).y}H266 M${plot(tick, 0).x} 26V266`} />
            <text x={plot(tick, 0).x} y={283} textAnchor="middle">{tick}</text>
            <text x={17} y={plot(0, tick).y + 4} textAnchor="end">{tick}</text>
          </g>)}
          {neighbors.map(({ index }) => {
            const point = plot(config.samples[index].x, config.samples[index].y);
            return <line className="knn-link" key={index} x1={query.x} y1={query.y} x2={point.x} y2={point.y} />;
          })}
          {config.samples.map(({ x, y, label }, index) => {
            const point = plot(x, y);
            return <g key={index} className="knn-sample" data-label={label}>
              <title>{`${index + 1} 号 · ${label} 类 · (${x}, ${y})`}</title>
              {label === "A" ? <circle cx={point.x} cy={point.y} r={7} /> : <rect x={point.x - 6} y={point.y - 6} width={12} height={12} />}
            </g>;
          })}
          <circle className="knn-query" cx={query.x} cy={query.y} r={10} />
        </svg>
        <p>圆点 A · 方点 B · 空心环待分类</p>
      </div>
      <div>
        <h3>最近邻</h3>
        <p>同距按输入顺序。平票看最近邻。</p>
        {neighbors.length > 0 && <table className="simulation-table">
          <thead><tr><th>样本</th><th>类别</th><th>距离</th></tr></thead>
          <tbody>{neighbors.map(({ index, label, distance }) => <tr key={index}><th>{index + 1} 号</th><td>{label}</td><td>{distance.toFixed(2)}</td></tr>)}</tbody>
        </table>}
        {finished && <p className="domain-result">预测 {results.prediction} 类 · A {results.votes.A} 票 · B {results.votes.B} 票</p>}
      </div>
    </section>
  </div>;
}
