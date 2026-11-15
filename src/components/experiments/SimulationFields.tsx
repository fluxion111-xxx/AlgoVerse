import { useState } from "react";
import type { knnEngine } from "@/lib/experiments/knn";
import { networkLinks, type NetworkConfig } from "@/lib/experiments/network";
import type { ProcessInput } from "@/lib/experiments/scheduling";

type FieldProps = { parameters: Record<string, unknown>; update: (next: Record<string, unknown>) => void };

export function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

export function FactorialFields({ parameters, update }: FieldProps) {
  return <div className="simulation-fields">
    <label htmlFor="memory-input">阶乘输入 n</label>
    <input id="memory-input" type="number" min={0} max={10} value={numberValue(parameters.factorialInput)}
      onChange={(event) => update({ ...parameters, factorialInput: event.target.valueAsNumber })} />
    <p>输入 0–10 的整数。</p>
  </div>;
}

type KnnConfig = ReturnType<typeof knnEngine.preset>;

function sampleRows(text: string) {
  return text.trim().split(/\r?\n/).map((line) => {
    const match = /^(\d+)[\s,，]+(\d+)[\s,，]+([ab])$/i.exec(line.trim());
    return match ? { x: Number(match[1]), y: Number(match[2]), label: match[3].toUpperCase() } : null;
  });
}

export function KnnFields({ initial, parameters, update }: FieldProps & { initial: KnnConfig }) {
  const [samples, setSamples] = useState(() => initial.samples.map(({ x, y, label }) => `${x}, ${y}, ${label}`).join("\n"));
  const query = parameters.query as KnnConfig["query"];
  return <div className="simulation-fields">
    <div className="domain-fields">
      <div>
        <label htmlFor="knn-k">邻居数 K</label>
        <input id="knn-k" type="number" min={1} max={16} value={numberValue(parameters.k)}
          onChange={(event) => update({ ...parameters, k: event.target.valueAsNumber })} />
      </div>
      <div>
        <label htmlFor="knn-metric">距离算法</label>
        <select id="knn-metric" value={String(parameters.metric)} onChange={(event) => update({ ...parameters, metric: event.target.value })}>
          <option value="euclidean">欧氏距离</option><option value="manhattan">曼哈顿距离</option>
        </select>
      </div>
    </div>
    <div className="domain-fields">
      {(["x", "y"] as const).map((axis) => <div key={axis}>
        <label htmlFor={`knn-${axis}`}>待分类点 {axis}</label>
        <input id={`knn-${axis}`} type="number" min={0} max={10} value={numberValue(query[axis])}
          onChange={(event) => update({ ...parameters, query: { ...query, [axis]: event.target.valueAsNumber } })} />
      </div>)}
    </div>
    <label htmlFor="knn-samples">样本（每行 x, y, 类别）</label>
    <textarea id="knn-samples" rows={6} value={samples} maxLength={220} onChange={(event) => {
      const text = event.target.value;
      setSamples(text);
      update({ ...parameters, samples: sampleRows(text) });
    }} />
    <p>输入 2–16 个样本。坐标为 0–10。类别用 A 或 B。</p>
  </div>;
}

export function SchedulingFields({ parameters, update }: FieldProps) {
  return <div className="simulation-fields">
    <label htmlFor="simulation-policy">调度策略</label>
    <select id="simulation-policy" value={String(parameters.policy)} onChange={(event) => update({ ...parameters, policy: event.target.value })}>
      <option value="rr">时间片轮转</option><option value="fcfs">先来先服务</option>
    </select>
    {parameters.policy === "rr" && <>
      <label htmlFor="simulation-quantum">时间片</label>
      <input id="simulation-quantum" type="number" min="1" max="20" value={Number.isNaN(parameters.quantum) ? "" : parameters.quantum as number}
        onChange={(event) => update({ ...parameters, quantum: event.target.valueAsNumber })} />
    </>}
    <table className="simulation-table"><thead><tr><th>进程</th><th>到达</th><th>运行</th></tr></thead>
      <tbody>{(parameters.processes as ProcessInput[]).map((process, index, processes) => <tr key={index}>
        <th>P{index + 1}</th>{(["arrival", "burst"] as const).map((field) => <td key={field}><input type="number"
          aria-label={`P${index + 1} ${field === "arrival" ? "到达" : "运行"}`} min={field === "arrival" ? 0 : 1} max={field === "arrival" ? 40 : 25}
          value={Number.isNaN(process[field]) ? "" : process[field]}
          onChange={(event) => update({ ...parameters, processes: processes.map((entry, row) => row === index ? { ...entry, [field]: event.target.valueAsNumber } : entry) })} /></td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

export function NetworkFields({ parameters, update }: FieldProps) {
  const links = parameters.links as NetworkConfig["links"];
  return <div className="simulation-fields">
    <label htmlFor="simulation-packets">数据包数量</label>
    <input id="simulation-packets" type="number" min="1" max="30" value={Number.isNaN(parameters.packets) ? "" : parameters.packets as number}
      onChange={(event) => update({ ...parameters, packets: event.target.valueAsNumber })} />
    <table className="simulation-table"><thead><tr><th>链路</th><th>延迟 ms</th><th>丢包 %</th></tr></thead>
      <tbody>{networkLinks.map((link) => <tr key={link}><th>{link}</th>{(["delay", "loss"] as const).map((field) => <td key={field}>
        <input type="number" aria-label={`${link} ${field === "delay" ? "延迟" : "丢包"}`} min={field === "delay" ? 1 : 0} max={field === "delay" ? 200 : 100}
          value={Number.isNaN(links[link][field]) ? "" : links[link][field]}
          onChange={(event) => update({ ...parameters, links: { ...links, [link]: { ...links[link], [field]: event.target.valueAsNumber } } })} />
      </td>)}</tr>)}</tbody>
    </table>
  </div>;
}
