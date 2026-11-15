import type { ExperimentConfig } from "@/lib/experimentEngines";

type Config = Extract<ExperimentConfig, { topology: unknown[] } | { commands: unknown[] } | { schedule: unknown[] }>;
type Parameters = Record<string, unknown>;

const words = (line: string) => line.trim().split(/[\s,，]+/);
const whole = (value: string) => /^-?\d+$/.test(value) ? Number(value) : null;
const eachLine = (text: string, parse: (tokens: string[]) => unknown) => text.trim().split(/\r?\n/).map((line) => parse(words(line)));

export function RoutingMemoryTransactionFields({ config, parameters, update }: {
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
  function text(name: string, label: string, value: string, rows: number, parse: (value: string) => unknown) {
    return <div>
      <label htmlFor={`lab-${name}`}>{label}</label>
      <textarea id={`lab-${name}`} rows={rows} defaultValue={value} maxLength={600} onChange={(event) => set(name, parse(event.target.value))} />
    </div>;
  }
  return <div className="simulation-fields">
    {"topology" in config && <>
      {number("routerCount", "路由器数（2–10）", 2, 10)}
      <div className="domain-fields">{number("source", "源路由器", 0, 9)}{number("destination", "目标路由器", 0, 9)}</div>
      {text("topology", "双向链路", config.topology.map(({ from, to, cost }) => `${from}, ${to}, ${cost}`).join("\n"), 5,
        (value) => eachLine(value, (tokens) => tokens.length === 3 ? { from: whole(tokens[0]), to: whole(tokens[1]), cost: whole(tokens[2]) } : null))}
      <p>每行两端编号和原成本。</p>
      <div className="domain-fields">{number("changedLink", "变更行号（从 0 起）", 0, 35)}{number("newCost", "新成本（0 为断开）", 0, 99)}</div>
    </>}
    {"commands" in config && <>
      {number("heapSize", "堆容量（4–256）", 4, 256)}
      {text("commands", "分配与释放", config.commands.map((op) => op.action === "alloc" ? `alloc ${op.id} ${op.size}` : `free ${op.id}`).join("\n"), 7,
        (value) => eachLine(value, ([action, id, size, ...extra]) => {
          if (extra.length || !id) return null;
          if (action === "alloc" && size !== undefined) return { action, id: id.toUpperCase(), size: whole(size) };
          return action === "free" && size === undefined ? { action, id: id.toUpperCase() } : null;
        }))}
      <p>每行一条。最多 32 条。</p><p>如 alloc A 8 或 free A。</p>
    </>}
    {"schedule" in config && <>
      {text("initialRows", "初始行值", config.initialRows.join(", "), 1, (value) => words(value).map(whole))}
      <p>最多 6 行，编号从 0 起。</p>
      {text("schedule", "事务交错顺序", config.schedule.map((op) =>
        [op.tx, op.action, ...("row" in op ? [op.row] : []), ...("value" in op ? [op.value] : []),
          ...("guard" in op && op.guard ? ["if", op.guard.row, op.guard.equals] : [])].join(" ")).join("\n"), 8,
        (value) => eachLine(value, ([tx, action, row, entry, condition, guardRow, equals, ...extra]) => {
          if (extra.length || !action) return null;
          if (action === "write" && row !== undefined && entry !== undefined) {
            const op = { tx, action, row: whole(row), value: whole(entry) };
            if (condition === undefined) return op;
            return condition === "if" && guardRow !== undefined && equals !== undefined
              ? { ...op, guard: { row: whole(guardRow), equals: whole(equals) } } : null;
          }
          if (condition !== undefined) return null;
          if (action === "read" && row !== undefined && entry === undefined) return { tx, action, row: whole(row) };
          return row === undefined && ["begin", "commit", "rollback"].includes(action) ? { tx, action } : null;
        }))}
      <p>事务名用 A 或 B。</p><p>如 A begin、A read 0。</p><p>如 B write 0 30、B commit。</p>
      <p>也可用条件写入。</p><p><code>A write 0 0 if 1 1</code></p><p>行 1 为 1 时，行 0 写 0。</p>
    </>}
  </div>;
}
