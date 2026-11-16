"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COLS, ROWS, START, GOAL, initialWalls, search, shortestStepCount, type Algorithm, type SearchResult } from "@/lib/pathfinding";
import { pathfindingReport } from "@/lib/experiments/report";
import { PresetSubmit } from "@/components/experiments/PresetSubmit";

const tools = [
  { id: "wall", label: "障碍", icon: "lucide:brick-wall" },
  { id: "start", label: "起点", icon: "lucide:map-pin" },
  { id: "goal", label: "终点", icon: "lucide:flag" },
] as const;

const algorithmNames = { dijkstra: "Dijkstra", astar: "A*" } satisfies Record<Algorithm, string>;
const cells = Array.from({ length: COLS * ROWS }, (_, node) => node);
const gridColumns = { gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` };

type MapTool = (typeof tools)[number]["id"];
type MapState = { start: number; goal: number; walls: readonly number[] };
type RunResult = { algorithm: Algorithm; result: SearchResult };
type Replay = { runs: RunResult[]; frame: number; maxFrame: number; playing: boolean };
type AlgorithmChoice = Algorithm | "both";

const defaultMap: MapState = { start: START, goal: GOAL, walls: initialWalls };

function cellKind(node: number, map: MapState) {
  if (node === map.start) return "start";
  if (node === map.goal) return "goal";
  return map.walls.includes(node) ? "wall" : "empty";
}

const cellNames = { start: "起点", goal: "终点", wall: "障碍", empty: "空地" };
const cellMarks = { start: "S", goal: "G", wall: "", empty: "" };

function MapEditor({ map, onEdit }: { map: MapState; onEdit: (node: number) => void }) {
  const [focusCell, setFocusCell] = useState(START);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, node: number) {
    const x = node % COLS;
    const y = Math.floor(node / COLS);
    const moves: Partial<Record<string, number>> = {
      ArrowLeft: x > 0 ? node - 1 : node,
      ArrowRight: x < COLS - 1 ? node + 1 : node,
      ArrowUp: y > 0 ? node - COLS : node,
      ArrowDown: y < ROWS - 1 ? node + COLS : node,
    };
    const next = moves[event.key];

    if (next === undefined) return;
    event.preventDefault();
    buttons.current[next]?.focus();
  }

  return (
    <div className="experiment-map experiment-map-edit" style={gridColumns} role="group" aria-label="编辑网格地图" aria-describedby="experiment-keyboard-tip">
      {cells.map((node) => {
        const kind = cellKind(node, map);
        const row = Math.floor(node / COLS) + 1;
        const column = node % COLS + 1;
        return (
          <button
            key={node}
            type="button"
            className={`experiment-cell is-${kind}`}
            aria-label={`${row}行${column}列 ${cellNames[kind]}`}
            tabIndex={focusCell === node ? 0 : -1}
            ref={(element) => { buttons.current[node] = element; }}
            onFocus={() => setFocusCell(node)}
            onKeyDown={(event) => moveFocus(event, node)}
            onClick={() => onEdit(node)}
          >
            {cellMarks[kind]}
          </button>
        );
      })}
    </div>
  );
}

function editMap(map: MapState, tool: MapTool, node: number): { map?: MapState; notice?: string } {
  if (tool === "wall") {
    if (node === map.start || node === map.goal) return { notice: "起终点不能放障碍。" };
    const walls = map.walls.includes(node) ? map.walls.filter((wall) => wall !== node) : [...map.walls, node];
    return { map: { ...map, walls } };
  }
  if (node === map[tool]) return {};
  if (node === map[tool === "start" ? "goal" : "start"] || map.walls.includes(node)) return { notice: "请选择一块空地。" };
  return { map: { ...map, [tool]: node } };
}

export function PathfindingMapEditor({ map, onChange }: { map: MapState; onChange: (next: MapState) => void }) {
  const [tool, setTool] = useState<MapTool>("wall");
  const [notice, setNotice] = useState("");
  return <>
    <div className="experiment-tools" role="group" aria-label="地图工具">
      {tools.map(({ id, label, icon }) => <button key={id} type="button" className="experiment-tool" aria-pressed={tool === id}
        onClick={() => { setTool(id); setNotice(""); }}><Icon icon={icon} width={18} aria-hidden="true" />{label}</button>)}
    </div>
    <p className="sr-only" id="experiment-keyboard-tip">方向键移动，回车编辑。</p>
    <MapEditor map={map} onEdit={(node) => {
      const next = editMap(map, tool, node);
      if (next.map) onChange(next.map);
      setNotice(next.notice ?? "");
    }} />
    <p className="experiment-map-tip" role="status">{notice || (tool === "wall" ? "点格子，添加或移除障碍。" : "点一块空地。")}</p>
  </>;
}

export function PathfindingMapView({ map, visits = [], path = [], current, label }: {
  map: MapState;
  visits?: readonly number[];
  path?: readonly number[];
  current?: number;
  label?: string;
}) {
  const visited = new Set(visits);
  const points = path.map((node) => `${node % COLS + 0.5},${Math.floor(node / COLS) + 0.5}`).join(" ");
  return (
    <div className="experiment-map" style={gridColumns} role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : true}>
      {cells.map((node) => {
        const kind = cellKind(node, map);
        return (
          <span key={node} className={`experiment-cell is-${kind}${visited.has(node) ? " is-visited" : ""}${node === current ? " is-current" : ""}`}>
            {cellMarks[kind]}
          </span>
        );
      })}
      {path.length > 1 && (
        <svg className="experiment-path" viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none">
          <polyline points={points} />
        </svg>
      )}
    </div>
  );
}

export function ResultSheet({ algorithm, map, result, frame }: {
  algorithm: Algorithm;
  map: MapState;
  result?: SearchResult;
  frame: number;
}) {
  const visits = result?.visited.slice(0, frame) ?? [];
  const complete = !!result && frame >= result.visited.length;
  const path = complete ? result.path : [];
  const elapsed = complete ? result.elapsedMs : null;
  const status = !result ? "等待运行" : !complete ? "搜索中" : path.length ? "找到路径" : "没有找到路";

  return (
    <article className={`experiment-result is-${algorithm}`} aria-label={`${algorithmNames[algorithm]} 结果`}>
      <div className="experiment-result-head">
        <h3>{algorithmNames[algorithm]}</h3>
        <span className="experiment-result-status">{status}</span>
      </div>
      <PathfindingMapView map={map} visits={visits} path={path} current={complete ? undefined : visits.at(-1)} />
      <dl className="experiment-metrics">
        <div><dt>访问节点</dt><dd>{result ? visits.length : "—"}</dd></div>
        <div><dt>路径长度</dt><dd>{complete && result.pathLength !== null ? result.pathLength.toFixed(2) : "—"}</dd></div>
        <div><dt>运行耗时</dt><dd>{elapsed === null ? "—" : elapsed < 0.01 ? "<0.01" : elapsed.toFixed(2)}<small> ms</small></dd></div>
      </dl>
    </article>
  );
}

export function SavedPathfindingReplay({ map, results, guide, studio = false }: {
  map: MapState;
  results: Record<Algorithm, SearchResult>;
  guide?: { next: string; auto: boolean };
  studio?: boolean;
}) {
  const router = useRouter();
  const maxFrame = Math.max(results.dijkstra.visited.length, results.astar.visited.length);
  const [frame, setFrame] = useState(guide || studio ? 0 : maxFrame);
  const [playing, setPlaying] = useState(guide?.auto ?? false);
  useEffect(() => {
    if (studio && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(true);
  }, [studio]);
  const complete = frame >= maxFrame;
  const auto = guide?.auto ?? false;
  const next = guide?.next;

  useEffect(() => {
    if (!playing || complete) return;
    const timer = window.setInterval(() => setFrame((value) => Math.min(value + 1, maxFrame)), 125);
    return () => window.clearInterval(timer);
  }, [playing, complete, maxFrame]);

  useEffect(() => {
    if (!auto || !complete || !next) return;
    const timer = window.setTimeout(() => router.replace(next, { scroll: false }), 1500);
    return () => window.clearTimeout(timer);
  }, [auto, complete, next, router]);

  return (
    <section className="experiment-results preset-replay" aria-labelledby="saved-replay-title">
      <div className="experiment-section-head experiment-results-head">
        <h2 id="saved-replay-title">运行轨迹</h2>
        <div className="experiment-legend" aria-label="结果图例"><span><i />已访问</span><span><i />最终路径</span></div>
      </div>
      <label className="experiment-actions">
        回放进度
        <input type="range" min={0} max={maxFrame} value={frame} onChange={(event) => { setPlaying(false); setFrame(Number(event.target.value)); }} />
        <span>{frame} / {maxFrame}</span>
      </label>
      {(guide || studio) && (
        <div className="preset-actions">
          <button type="button" className="experiment-control" onClick={() => {
            if (complete) setFrame(0);
            setPlaying(complete || !playing);
          }}>{studio && <Icon icon={playing && !complete ? "lucide:pause" : "lucide:play"} width={16} aria-hidden="true" />}{complete ? "重播" : playing ? "暂停" : "播放"}</button>
          {studio && <>
            <button type="button" className="experiment-control" disabled={complete} onClick={() => { setPlaying(false); setFrame((value) => Math.min(value + 1, maxFrame)); }}><Icon icon="lucide:step-forward" width={16} aria-hidden="true" />单步</button>
            <button type="button" className="experiment-control" onClick={() => { setPlaying(false); setFrame(0); }}><Icon icon="lucide:rotate-ccw" width={16} aria-hidden="true" />重置</button>
          </>}
          {guide && <Link className="experiment-run" href={guide.next}>继续看诊断</Link>}
        </div>
      )}
      {studio && <p className="sr-only" role="status">{complete ? "回放结束。" : playing ? "正在回放搜索。" : frame === 0 ? "回放位于起点。" : "回放已暂停。"}</p>}
      <div className="experiment-sheets">
        <ResultSheet algorithm="dijkstra" map={map} result={results.dijkstra} frame={frame} />
        <ResultSheet algorithm="astar" map={map} result={results.astar} frame={frame} />
      </div>
      <p className="experiment-footnote">服务端计算。耗时不含回放。</p>
    </section>
  );
}

export function PathfindingWorkbench({ save }: { save?: (form: FormData) => Promise<void> }) {
  const [map, setMap] = useState(defaultMap);
  const [tool, setTool] = useState<MapTool>("wall");
  const [choice, setChoice] = useState<AlgorithmChoice>("both");
  const [replay, setReplay] = useState<Replay | null>(null);
  const [notice, setNotice] = useState("");
  const algorithms: Algorithm[] = choice === "both" ? ["dijkstra", "astar"] : [choice];
  const canAdvance = !!replay && replay.frame < replay.maxFrame;
  const playing = replay?.playing ?? false;
  const report = replay && !canAdvance ? pathfindingReport(map.walls.length,
    Object.fromEntries(replay.runs.map(({ algorithm, result }) => [algorithm, result]))) : null;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setReplay((current) => {
        if (!current?.playing) return current;
        const frame = Math.min(current.frame + 1, current.maxFrame);
        return { ...current, frame, playing: frame < current.maxFrame };
      });
    }, 130);
    return () => window.clearInterval(timer);
  }, [playing]);

  function edit(node: number) {
    const next = editMap(map, tool, node);
    if (next.notice) setNotice(next.notice);
    if (!next.map) return;
    setMap(next.map);
    setReplay(null);
    setNotice("地图已更新。");
  }

  function reset() {
    setMap(defaultMap);
    setTool("wall");
    setReplay(null);
    setNotice("已还原默认地图。");
  }

  function run() {
    const runs = algorithms.map((algorithm) => ({ algorithm, result: search(algorithm, map.walls, map) }));
    const maxFrame = Math.max(...runs.map(({ result }) => result.visited.length));
    const autoPlay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReplay({ runs, frame: 0, maxFrame, playing: autoPlay && maxFrame > 0 });
    setNotice("");
  }

  function step() {
    setReplay((current) => current && { ...current, frame: Math.min(current.frame + 1, current.maxFrame), playing: false });
  }

  const status = !replay ? "选好算法，再运行。"
    : canAdvance ? playing ? "正在播放搜索。" : "已暂停，可单步查看。"
      : replay.runs.every(({ result }) => result.pathLength === null) ? "终点不通。试着移开障碍。" : "搜索结束。";

  return (
    <div className="experiment-workbench">
      <section className="experiment-editor" aria-labelledby="experiment-edit-title">
        <div className="experiment-section-head">
          <h2 id="experiment-edit-title">编辑地图</h2>
          <button className="experiment-reset" type="button" onClick={reset}>
            <Icon icon="lucide:rotate-ccw" width={16} aria-hidden="true" />重置地图
          </button>
        </div>
        <div className="experiment-tools" role="group" aria-label="地图工具">
          {tools.map(({ id, label, icon }) => (
            <button key={id} type="button" className="experiment-tool" aria-pressed={tool === id} onClick={() => { setTool(id); setNotice(""); }}>
              <Icon icon={icon} width={18} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <p className="sr-only" id="experiment-keyboard-tip">方向键移动，回车编辑。</p>
        <MapEditor map={map} onEdit={edit} />
        <p className="experiment-map-tip" role="status">{notice || (tool === "wall" ? "点格子，添加或移除障碍。" : "点一块空地。")}</p>
        <p className="experiment-rule"><Icon icon="lucide:move-up-right" width={16} aria-hidden="true" />直走 1，斜走 √2。</p>
      </section>

      <section className="experiment-results" aria-labelledby="experiment-results-title">
        <div className="experiment-section-head experiment-results-head">
          <h2 id="experiment-results-title">运行与对比</h2>
          <div className="experiment-legend" aria-label="结果图例">
            <span><i />已访问</span><span><i />最终路径</span>
          </div>
        </div>
        <div className="experiment-actions">
          <label className="experiment-choice">
            <span>算法</span>
            <select value={choice} onChange={(event) => { setChoice(event.target.value as AlgorithmChoice); setReplay(null); }}>
              <option value="both">双算法对比</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A*</option>
            </select>
          </label>
          <button className="experiment-run" type="button" onClick={run}>
            <Icon icon={replay ? "lucide:rotate-cw" : "lucide:play"} width={17} aria-hidden="true" />{replay ? "重新运行" : "运行实验"}
          </button>
          <button type="button" className="experiment-control" disabled={!canAdvance} onClick={() => setReplay((current) => current && { ...current, playing: !current.playing })}>
            <Icon icon={playing ? "lucide:pause" : "lucide:play"} width={16} aria-hidden="true" />{playing ? "暂停" : "继续"}
          </button>
          <button type="button" className="experiment-control" disabled={!canAdvance} onClick={step}>
            <Icon icon="lucide:step-forward" width={16} aria-hidden="true" />单步
          </button>
        </div>
        <div className="experiment-progress">
          <p role="status">{status}</p>
          {replay && <span>第 {replay.frame} / {replay.maxFrame} 步</span>}
        </div>
        <div className={`experiment-sheets${algorithms.length === 1 ? " is-single" : ""}`}>
          {algorithms.map((algorithm) => (
            <ResultSheet key={algorithm} algorithm={algorithm} map={map} result={replay?.runs.find((entry) => entry.algorithm === algorithm)?.result} frame={replay?.frame ?? 0} />
          ))}
        </div>
        <p className="experiment-footnote">本地计算。耗时不含播放。</p>
        {report && <section className="experiment-path-report" aria-labelledby="path-report-title">
          <h3 id="path-report-title">本轮实验报告</h3>
          <h4 className="experiment-report-label">最终结论</h4>
          <p className="experiment-report-lead">{report.conclusion}</p>
          <h4 className="experiment-report-label">详细报告</h4>
          <p className="experiment-report-copy">{report.detail}</p>
          <h4 className="experiment-report-label">本地诊断</h4>
          <p className="experiment-report-copy">{report.explanation}</p>
        </section>}
        {save && replay && shortestStepCount(map) !== null && <form className="preset-actions" action={save}>
          <input type="hidden" name="parameters" value={JSON.stringify({ goalLabel: "对比两种搜索过程。", map: { kind: "custom", ...map } })} />
          <PresetSubmit className="experiment-run" pending="正在保存…">用此图运行并保存对比</PresetSubmit>
        </form>}
      </section>
    </div>
  );
}
