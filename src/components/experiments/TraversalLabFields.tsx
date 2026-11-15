import type { ExperimentConfig } from "@/lib/experimentEngines";

type Config = Extract<ExperimentConfig, { nodes: unknown[] } | { edges: unknown[] } | { allocation: unknown[] } | { signals: unknown[] }>;
type Parameters = Record<string, unknown>;

function tokens(text: string) {
  const value = text.trim();
  return value ? value.split(/[\s,，]+/) : [];
}

function vector(text: string) {
  return tokens(text).map((token) => /^\d+$/.test(token) ? Number(token) : null);
}

export function TraversalLabFields({ config, parameters, update }: {
  config: Config; parameters: Parameters; update: (value: Parameters) => void;
}) {
  const set = (name: string, value: unknown) => update({ ...parameters, [name]: value });
  function number(name: string, label: string, min: number, max: number) {
    const value = parameters[name];
    return <div>
      <label htmlFor={`lab-${name}`}>{label}</label>
      <input id={`lab-${name}`} type="number" min={min} max={max} value={typeof value === "number" && Number.isFinite(value) ? value : ""}
        onChange={(event) => set(name, event.target.valueAsNumber)} />
    </div>;
  }
  function text(name: string, label: string, value: string, rows: number, parse: (text: string) => unknown) {
    return <div>
      <label htmlFor={`lab-${name}`}>{label}</label>
      <textarea id={`lab-${name}`} rows={rows} maxLength={480} defaultValue={value} onChange={(event) => set(name, parse(event.target.value))} />
    </div>;
  }

  return <div className="simulation-fields">
    {"nodes" in config && <>
      {text("nodes", "树节点", config.nodes.map((node) => node ?? "-").join(", "), 4,
        (value) => tokens(value).map((token) => token === "-" ? null : /^-?\d+$/.test(token) ? Number(token) : token))}
      <p>按层填槽。短横线表示空。</p><p>子槽编号为 2i+1 和 2i+2。</p><p>最多 31 槽。根必须存在。</p>
    </>}
    {"edges" in config && <>
      <div className="domain-fields">{number("vertexCount", "顶点数", 1, 12)}{number("startVertex", "起点", 0, 11)}</div>
      <label htmlFor="lab-directed">方向</label>
      <select id="lab-directed" value={String(parameters.directed)} onChange={(event) => set("directed", event.target.value === "true")}>
        <option value="false">无向图</option><option value="true">有向图</option>
      </select>
      {text("edges", "边列表", config.edges.map((edge) => edge.join(", ")).join("\n"), 5,
        (value) => value.trim() ? value.trim().split(/\r?\n/).map(vector) : [])}
      <p>每行一条边，如 0, 2。</p><p>顶点从 0 编号。</p>
    </>}
    {"allocation" in config && <>
      {text("available", "可用资源", config.available.join(", "), 1, vector)}
      {text("allocation", "已分配量", config.allocation.map((row) => row.join(", ")).join("\n"), 5, (value) => value.trim().split(/\r?\n/).map(vector))}
      {text("maximum", "最大需求", config.maximum.map((row) => row.join(", ")).join("\n"), 5, (value) => value.trim().split(/\r?\n/).map(vector))}
      <p>每行一个进程，最多 8 行。</p>
      {number("process", "请求进程编号", 0, 7)}
      {text("request", "本次请求", config.request.join(", "), 1, vector)}
      <p>向量列数一致，最多 4 列。</p>
    </>}
    {"signals" in config && <>
      <div className="domain-fields">{number("initialWindow", "初始窗口", 1, 24)}{number("initialThreshold", "慢启动阈值", 2, 48)}</div>
      {text("signals", "信号序列", config.signals.join(", "), 4, tokens)}
      <p>ack 新确认，dup 重复确认。</p><p>timeout 超时。最多 48 条。</p>
    </>}
  </div>;
}
