import type { ExperimentConfig } from "@/lib/experimentEngines";

type ExpandedConfig = Extract<ExperimentConfig, { references: number[] } | { operations: unknown[] } | { points: unknown[] } | { curvature: number }>;
type Params = Record<string, unknown>;

function rows(text: string, parse: (line: string) => unknown) {
  return text.trim().split(/\r?\n/).map((line) => parse(line.trim()));
}

function points(text: string) {
  return rows(text, (line) => {
    const match = /^(-?\d+)[\s,，]+(-?\d+)$/.exec(line);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
  });
}

export function ExpandedLabFields({ initial, values, onChange }: {
  initial: ExpandedConfig;
  values: Params;
  onChange: (next: Params) => void;
}) {
  function number(name: string, label: string, min: number, max: number, step: number | "any" = 1) {
    const value = values[name];
    return <div key={name}>
      <label htmlFor={`lab-${name}`}>{label}</label>
      <input id={`lab-${name}`} type="number" min={min} max={max} step={step}
        value={typeof value === "number" && Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange({ ...values, [name]: event.target.valueAsNumber })} />
    </div>;
  }

  return <div className="simulation-fields">
    {"references" in initial && <>
      {number("frameCount", "页框数（1–8）", 1, 8)}
      <label htmlFor="lab-references">页号序列</label>
      <textarea id="lab-references" rows={3} maxLength={220} defaultValue={initial.references.join(", ")}
        onChange={(event) => onChange({ ...values, references: event.target.value.trim().split(/[\s,，]+/).map((value) => /^\d+$/.test(value) ? Number(value) : null) })} />
      <p>最多 48 项。页号 0–99。</p>
    </>}
    {"operations" in initial && <>
      {number("capacity", "表容量（2–12）", 2, 12)}
      <label htmlFor="lab-operations">操作序列</label>
      <textarea id="lab-operations" rows={7} maxLength={400} defaultValue={initial.operations.map(({ action, key }) => `${action} ${key}`).join("\n")}
        onChange={(event) => onChange({ ...values, operations: rows(event.target.value, (line) => {
          const match = /^(insert|find|delete)\s+(-?\d+)$/i.exec(line);
          return match ? { action: match[1].toLowerCase(), key: Number(match[2]) } : null;
        }) })} />
      <p>每行一个操作，最多 24 行。</p><p>格式如 insert 4、find 4 或 delete 4。</p>
    </>}
    {"points" in initial && <>
      {number("maxIterations", "轮次上限（1–20）", 1, 20)}
      <label htmlFor="lab-points">二维样本（2–24 个）</label>
      <textarea id="lab-points" rows={4} maxLength={250} defaultValue={initial.points.map(({ x, y }) => `${x}, ${y}`).join("\n")}
        onChange={(event) => onChange({ ...values, points: points(event.target.value) })} />
      <label htmlFor="lab-centers">不同的初始中心（2–5 个）</label>
      <textarea id="lab-centers" rows={3} maxLength={60} defaultValue={initial.initialCenters.map(({ x, y }) => `${x}, ${y}`).join("\n")}
        onChange={(event) => onChange({ ...values, initialCenters: points(event.target.value) })} />
      <p>每行 x, y。整数 −20 至 20。</p>
    </>}
    {"curvature" in initial && <>
      <div className="domain-fields">
        {number("start", "起点（−20 至 20）", -20, 20)}
        {number("target", "最小点（−20 至 20）", -20, 20)}
        {number("curvature", "曲率（1–10）", 1, 10)}
        {number("learningRate", "学习率（0.001–2）", 0.001, 2, "any")}
      </div>
      {number("maxSteps", "步数上限（1–32）", 1, 32)}
      <p>起点、最小点和曲率用整数。</p>
    </>}
  </div>;
}
