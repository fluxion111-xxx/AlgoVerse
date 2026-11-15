import type { ExperimentConfig, ExperimentResults } from "@/lib/experimentEngines";
import { pagePolicies } from "@/lib/experiments/pageReplacement";
import { Controls, useReplay } from "./SimulationReplay";

type Result<Kind> = Extract<ExperimentResults, { kind: Kind }>;
const displayNumber = (value: number) => String(Number(value.toPrecision(5)));

export function PageReplacementReplay({ config, results }: {
  config: Extract<ExperimentConfig, { references: number[] }>;
  results?: Result<"page-replacement">;
}) {
  const replay = useReplay(results ? config.references.length : 0, 600);
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>三种置换策略</h3>
      <p>同一序列 · {config.frameCount} 个页框</p>
      <p>OPT 预知未来引用。</p>
      <p>本次引用 {replay.step ? config.references[replay.step - 1] : "—"}</p>
      <table className="simulation-table">
        <thead><tr><th>策略</th><th>页框</th><th>本次结果</th><th>缺页</th><th>命中</th></tr></thead>
        <tbody>{pagePolicies.map((policy, index) => {
          const step = results?.policies[index].steps[replay.step - 1];
          const frames = step?.frames ?? Array<null>(config.frameCount).fill(null);
          return <tr key={policy}>
            <th scope="row">{policy}</th>
            <td>{frames.map((page, slot) => slot === step?.slot ? <strong key={slot}>[{page}] </strong> : <span key={slot}>{page ?? "空"} </span>)}</td>
            <td>{!step ? "待访问" : step.hit ? "命中" : step.evicted === null ? "装入空框" : `淘汰 ${step.evicted}`}</td>
            <td>{step?.faults ?? 0}</td><td>{step?.hits ?? 0}</td>
          </tr>;
        })}</tbody>
      </table>
      <p>方括号标记本次访问的页框。</p>
    </section>
  </div>;
}

const outcomes = { inserted: "插入成功", exists: "键已存在", found: "找到键", missing: "未找到键", deleted: "删除成功", full: "满表" };
const operations = { insert: "插入", find: "查找", delete: "删除" };

export function HashCollisionsReplay({ config, results }: {
  config: Extract<ExperimentConfig, { operations: unknown[] }>;
  results?: Result<"hash-collisions">;
}) {
  const replay = useReplay(results?.steps.length ?? 0, 850);
  const step = results?.steps[replay.step - 1];
  const lanes = [
    { name: "链地址", trace: step?.chaining, entries: step?.chaining.buckets.map((bucket) => bucket.join(" → ") || "空") },
    { name: "线性探测", trace: step?.probing, entries: step?.probing.slots.map((slot) => slot === "deleted" ? "墓碑" : slot ?? "空") },
  ];
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <p>{step ? `${operations[step.operation.action]} ${step.operation.key} · 起始槽 ${step.home}` : `空表 · ${config.capacity} 个槽`}</p>
    <div className="simulation-sort">{lanes.map(({ name, trace, entries }) => <section className="simulation-panel" key={name}>
      <h3>{name}</h3>
      <p>{trace ? outcomes[trace.outcome] : "等待操作"}</p>
      <p>检查顺序 {trace?.visits.map(({ slot, compared }) => compared === null ? slot : `${slot}(${compared})`).join(" → ") || "—"}</p>
      <table className="simulation-table">
        <thead><tr><th>槽</th><th>内容</th></tr></thead>
        <tbody>{(entries ?? Array<string>(config.capacity).fill("空")).map((entry, index) => <tr key={index}>
          <th scope="row">{index}</th><td>{trace?.visits.some(({ slot }) => slot === index) ? <strong>{entry}</strong> : entry}</td>
        </tr>)}</tbody>
      </table>
    </section>)}</div>
  </div>;
}

const clusterColors = ["#ffc389", "#d4dc9f", "#83c6bf", "#e8a6a0", "#f0dc96"];
const pointX = (x: number) => 163 + x * 7;
const pointY = (y: number) => 163 - y * 7;

export function KMeansReplay({ config, results }: {
  config: Extract<ExperimentConfig, { points: unknown[] }>;
  results?: Result<"k-means">;
}) {
  const replay = useReplay(results?.steps.length ?? 0, 850);
  const step = results?.steps[replay.step - 1];
  const centers = step?.centers ?? config.initialCenters;
  const finished = !!results && replay.step === replay.length;
  return <div className="simulation-view">
    {results && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>样本与簇中心</h3>
      <p>先分配样本，再更新中心。</p>
      <p>十字是中心。虚线显示移动。</p>
      <svg className="knn-plot" viewBox="0 0 326 326" role="img" aria-label="聚类散点图">
        <path d="M 23 163 H 303 M 163 23 V 303" stroke="#91785e" />
        {step?.previousCenters.map(({ x, y }, index) => <line key={index}
          x1={pointX(x)} y1={pointY(y)} x2={pointX(centers[index].x)} y2={pointY(centers[index].y)}
          stroke={clusterColors[index]} strokeDasharray="3 3" strokeWidth="2" />)}
        {config.points.map(({ x, y }, index) => {
          const cluster = step?.assignments[index];
          return <circle key={index} cx={pointX(x)} cy={pointY(y)} r={4} fill={cluster === undefined ? "#f7e2c5" : clusterColors[cluster]}>
            <title>{`样本 ${index + 1} · (${x}, ${y}) · ${cluster === undefined ? "待分配" : `簇 ${cluster + 1}`}`}</title>
          </circle>;
        })}
        {centers.map(({ x, y }, index) => <g key={index} transform={`translate(${pointX(x)} ${pointY(y)})`}>
          <path d="M -7 0 H 7 M 0 -7 V 7" stroke={clusterColors[index]} strokeWidth="2" />
          <text x="8" y="-7" fill={clusterColors[index]}>{index + 1}</text>
        </g>)}
      </svg>
      <p>簇内平方距离和 {step ? displayNumber(step.loss) : "—"}</p>
      <table className="simulation-table">
        <thead><tr><th>簇</th><th>本轮分配</th><th>中心</th></tr></thead>
        <tbody>{centers.map(({ x, y }, index) => <tr key={index}>
          <th scope="row">{index + 1}</th>
          <td>{step?.assignments.flatMap((cluster, i) => cluster === index ? [i + 1] : []).join("、") || (step ? "空簇" : "—")}</td>
          <td>({displayNumber(x)}, {displayNumber(y)})</td>
        </tr>)}</tbody>
      </table>
      {finished && <p className="domain-result">{results.converged ? "中心不再变化" : "达到轮次上限"}</p>}
    </section>
  </div>;
}

export function GradientReplay({ config, results }: {
  config: Extract<ExperimentConfig, { curvature: number }>;
  results?: Result<"gradient-descent">;
}) {
  const replay = useReplay(results?.steps.length ?? 0, 425);
  const step = results?.steps[replay.step - 1];
  const point = step ?? results?.initial;
  const max = results ? Math.max(1, results.initial.loss, ...results.steps.map(({ loss }) => loss)) : 1;
  const chart = results ? [results.initial, ...results.steps.slice(0, replay.step)].map(({ loss }, index) => ({
    x: 28 + index / Math.max(1, results.steps.length) * 270,
    y: 145 - Math.log1p(loss) / Math.log1p(max) * 120,
  })) : [];
  const last = chart.at(-1);
  return <div className="simulation-view">
    {results && !!replay.length && <Controls replay={replay} />}
    <section className="simulation-panel">
      <h3>损失变化</h3>
      <p>L(w) = {config.curvature}(w − ({config.target}))² / 2</p>
      {last ? <svg className="knn-plot" viewBox="0 0 326 170" role="img" aria-label="损失随步数变化，纵轴采用对数刻度">
        <path d="M 28 25 V 145 H 298" stroke="#91785e" fill="none" />
        <polyline points={chart.map(({ x, y }) => `${x},${y}`).join(" ")} stroke="#ffc389" strokeWidth="2" fill="none" />
        <circle cx={last.x} cy={last.y} r="4" fill="#ffc389" />
      </svg> : <p>运行后绘制损失曲线。</p>}
      {results && <p>横轴为步数。纵轴为 log(1 + 损失)。</p>}
      <table className="simulation-table">
        <thead><tr><th>步</th><th>位置 w</th><th>梯度</th><th>损失</th></tr></thead>
        <tbody><tr><th scope="row">{replay.step}</th>
          <td>{displayNumber(point?.position ?? config.start)}</td>
          <td>{point ? displayNumber(point.gradient) : "—"}</td><td>{point ? displayNumber(point.loss) : "—"}</td>
        </tr></tbody>
      </table>
      {results && replay.step === replay.length && <p className="domain-result">{results.converged ? "梯度已接近零" : "达到步数上限"}</p>}
    </section>
  </div>;
}
