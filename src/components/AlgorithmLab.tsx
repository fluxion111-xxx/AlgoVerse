"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { pathfindingRoute } from "@/lib/courses";
import { creatorRoute } from "@/lib/navigation";
import { COLS, ROWS, type Algorithm, type Difficulty, type RandomMap, type SearchResult, type TimedSearchResult } from "@/lib/pathfinding";
import { useLabStore } from "@/store/labStore";
import "./algorithm-sandbox.css";

const CELL = 31;
const PAD = 14;
const WIDTH = COLS * CELL + PAD * 2;
const HEIGHT = ROWS * CELL + PAD * 2;
const names = { dijkstra: "Dijkstra", astar: "A*" };
const difficulties = { easy: "简单", normal: "普通", hard: "困难" };
const seedText = (seed: number) => seed.toString(16).toUpperCase().padStart(8, "0");

function center(node: number) {
  return {
    x: PAD + (node % COLS + 0.5) * CELL,
    y: PAD + (Math.floor(node / COLS) + 0.5) * CELL,
  };
}

function Metric({ value, label }: { value: string; label: string }) {
  return <span className="metric"><small>{label}</small><strong>{value}</strong></span>;
}

function Graph({ algorithm, result, frame, map }: {
  algorithm: Algorithm;
  result: SearchResult | null;
  frame: number;
  map: RandomMap | null;
}) {
  const grid = useId();
  const visits = result?.visited.slice(0, frame) ?? [];
  const segments = Math.max(0, frame - (result?.visited.length ?? 0));
  const path = result && segments > 0 ? result.path.slice(0, segments + 1) : [];
  const points = path.map((node) => {
    const { x, y } = center(node);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="graph-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img"
      aria-label={`${names[algorithm]} 寻路沙盘`} data-seed={map?.seed} data-start={map?.start} data-goal={map?.goal}>
      <defs>
        <pattern id={grid} width={CELL} height={CELL} patternUnits="userSpaceOnUse" x={PAD} y={PAD}>
          <path d={`M ${CELL} 0 H 0 V ${CELL}`} fill="none" stroke="#756c5a" strokeOpacity=".62" />
          <path d="M15.5 13v5m-2.5-2.5h5" stroke="#938670" strokeOpacity=".27" strokeWidth=".8" />
        </pattern>
      </defs>
      <rect x={PAD} y={PAD} width={COLS * CELL} height={ROWS * CELL} fill={`url(#${grid})`} stroke="#605646" />
      {map?.walls.map((node) => {
        const { x, y } = center(node);
        return (
          <g key={node} className="sandbox-wall" data-cell={node} transform={`translate(${x},${y})`}>
            <rect x="-10" y="-6" width="26" height="22" rx="3" fill="#141211" opacity=".66" />
            <path d="M-12 -9 11 -9 11 9 7 13-12 13Z" fill="#302823" stroke="#171511" />
            <path d="M-12 7 7 7 11 3 11 9 7 13-12 13Z" fill="#4c4034" />
            <path d="M-12 -9-8 -13H11V3L7 7H-12Z" fill="#796958" stroke="#9b8a73" strokeWidth=".75" />
            <path d="M-7 -10H8M-9 -7V3" stroke="#b9a58b" strokeOpacity=".58" strokeWidth=".75" />
          </g>
        );
      })}
      {visits.filter((node) => node !== map?.start && node !== map?.goal).map((node) => {
        const { x, y } = center(node);
        return <circle key={node} className="sandbox-visit" cx={x} cy={y} r="5" />;
      })}
      {points && <polyline className="sandbox-path" points={points} />}
      {path.slice(1, -1).map((node) => {
        const { x, y } = center(node);
        return <circle key={node} className="sandbox-path-pin" cx={x} cy={y} r="3.2" />;
      })}
      {map && (
        <>
          <g transform={`translate(${center(map.start).x},${center(map.start).y})`}>
            <circle r="13" cy="2" fill="#141211" />
            <circle r="11" fill="#4d6354" stroke="#c3ceb1" strokeWidth="1.5" />
            <text className="sandbox-marker" y="4.5">S</text>
          </g>
          <g transform={`translate(${center(map.goal).x},${center(map.goal).y})`}>
            <path d="M0 -14 14 0 0 16-14 0Z" fill="#141211" />
            <path d="M0 -12 12 0 0 12-12 0Z" fill="#835235" stroke="#ecc399" strokeWidth="1.5" />
            <text className="sandbox-marker" y="4.5">G</text>
          </g>
        </>
      )}
    </svg>
  );
}

function AlgorithmCard({ algorithm, result, frame, map, position, onSelect }: {
  algorithm: Algorithm;
  result: TimedSearchResult | null;
  frame: number;
  map: RandomMap | null;
  position: "左侧" | "右侧";
  onSelect: (algorithm: Algorithm) => void;
}) {
  const isAStar = algorithm === "astar";
  const count = Math.min(frame, result?.visited.length ?? 0);
  const reached = result && frame >= result.visited.length;
  const elapsed = reached ? result.elapsedMs : result?.visitElapsedMs[count - 1];
  return (
    <div className={`algorithm-card ${isAStar ? "algorithm-card-green" : ""}`}>
      <label className="algorithm-title">
        <span>{names[algorithm]}</span><small>{isAStar ? "启发式" : "最短路"}</small><Icon icon="lucide:chevron-down" width={17} aria-hidden="true" />
        <select aria-label={`${position}算法`} value={algorithm} onChange={(event) => onSelect(event.target.value as Algorithm)}>
          <option value="dijkstra">Dijkstra 最短路</option>
          <option value="astar">A* 启发式</option>
        </select>
      </label>
      <Graph key={map?.seed} algorithm={algorithm} result={result} frame={frame} map={map} />
      <div className="metric-row">
        <Metric value={result ? String(count) : "—"} label="访问节点" />
        <Metric value={reached ? result.pathLength?.toFixed(2) ?? "—" : "—"} label="路径长度" />
        <Metric value={elapsed?.toFixed(3) ?? "—"} label="耗时 ms" />
      </div>
    </div>
  );
}

function DifficultyOptions() {
  return Object.entries(difficulties).map(([value, label]) => <option key={value} value={value}>{label}</option>);
}

function RoundReport({ map, results, finished, reproduce }: {
  map: RandomMap | null;
  results: { dijkstra: SearchResult; astar: SearchResult } | null;
  finished: boolean;
  reproduce: (difficulty: Difficulty, seed: number) => void;
}) {
  const report = useRef<HTMLDivElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const seed = String(data.get("seed"));
    const difficulty = data.get("difficulty") as Difficulty;
    reproduce(difficulty, Number.parseInt(seed, 16));
    report.current?.hidePopover();
  }

  const saved = finished ? results : null;
  return (
    <div className="sandbox-report" id="sandbox-report" ref={report} popover="auto" role="dialog" aria-labelledby="sandbox-report-title">
      <header>
        <h2 id="sandbox-report-title">本轮实验报告</h2>
        <button type="button" popoverTarget="sandbox-report" popoverTargetAction="hide" aria-label="关闭报告">关闭</button>
      </header>
      {map && <p>{difficulties[map.difficulty]} · {map.walls.length} 个障碍 · 种子 <code>{seedText(map.seed)}</code></p>}
      {saved ? (
        <table>
          <caption>耗时为算法实际计算时间。</caption>
          <thead><tr><th>算法</th><th>访问节点</th><th>路径长度</th><th>耗时 ms</th></tr></thead>
          <tbody>
            {(Object.keys(names) as Algorithm[]).map((algorithm) => {
              const result = saved[algorithm];
              return <tr key={algorithm}><th scope="row">{names[algorithm]}</th><td>{result.visited.length}</td><td>{result.pathLength?.toFixed(2)}</td><td>{result.elapsedMs.toFixed(3)}</td></tr>;
            })}
          </tbody>
        </table>
      ) : <p>跑完后看本轮数据。</p>}
      <form key={map?.seed} onSubmit={submit}>
        <label>种子
          <input name="seed" required pattern="[0-9A-Fa-f]{8}" maxLength={8} autoComplete="off" spellCheck={false}
            defaultValue={map ? seedText(map.seed) : ""} title="输入 8 位十六进制种子" />
        </label>
        <label>难度 <select name="difficulty" defaultValue={map?.difficulty ?? "normal"}><DifficultyOptions /></select></label>
        <button type="submit">复现对比</button>
      </form>
    </div>
  );
}

export function AlgorithmLab() {
  const [leftAlgorithm, setLeftAlgorithm] = useState<Algorithm>("dijkstra");
  const rightAlgorithm = leftAlgorithm === "dijkstra" ? "astar" : "dijkstra";
  const [speed, setSpeed] = useState(1);
  const { map, results, frame, lastFrame, running, difficulty, setDifficulty, ensureMap, run, randomize, togglePlayback, tick, step, reset, reproduce } = useLabStore();

  useEffect(() => { ensureMap(); }, [ensureMap]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(tick, 110 / speed);
    return () => window.clearInterval(timer);
  }, [map, running, speed, tick]);

  const finished = !!results && frame === lastFrame;
  const dijkstraVisits = results?.dijkstra.visited.length ?? 0;
  const astarVisits = results?.astar.visited.length ?? 0;
  let visitNote = "点运行，看访问差异。";
  if (running) visitNote = "正在观察搜索过程。";
  if (finished && dijkstraVisits === astarVisits) visitNote = "访问节点数一样。";
  if (finished && dijkstraVisits > astarVisits) visitNote = `A* 少访 ${Math.round((1 - astarVisits / dijkstraVisits) * 100)}% 节点`;
  if (finished && dijkstraVisits < astarVisits) visitNote = "Dijkstra 访问更少。";
  const routeNote = finished
    ? results.astar.path.length && results.dijkstra.path.length ? "两种算法都找到路。" : "终点不通，试试移开障碍。"
    : "跑完再看有没有路。";
  const playback = running ? "暂停" : "播放";

  return (
    <section className="lab-assembly" id="lab">
      <div className="lab-shadow-sheet" aria-hidden="true" />
      <div className="lab-window">
        <div className="window-top"><span className="window-dots"><i /><i /><i /></span><span className="window-code">ALGOVERSE / LAB-01</span><span className="window-actions"><i /><i /><i /></span></div>
        <div className="lab-inner pathfinding-sandbox" data-frame={frame}>
          <Link className="lab-tape" href={pathfindingRoute}><Icon icon="lucide:flask-conical" width={25} /><span>算法对比实验</span></Link>
          <div className="lab-intro">
            <span className="sandbox-seed"><span className="live-dot" aria-hidden="true" />种子 <code>{map ? seedText(map.seed) : "--------"}</code></span>
            <div className="sandbox-settings">
              <label title="下一张地图的难度">难度 <select aria-label="地图难度" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}><DifficultyOptions /></select></label>
              <label>速度 <select aria-label="动画速度" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
              </select></label>
            </div>
          </div>
          <div className="algorithm-grid grid">
            <AlgorithmCard algorithm={leftAlgorithm} result={results?.[leftAlgorithm] ?? null} frame={frame} map={map} position="左侧" onSelect={setLeftAlgorithm} />
            <AlgorithmCard algorithm={rightAlgorithm} result={results?.[rightAlgorithm] ?? null} frame={frame} map={map} position="右侧" onSelect={(algorithm) => setLeftAlgorithm(algorithm === "astar" ? "dijkstra" : "astar")} />
          </div>
          <div className="lab-controls">
            <button type="button" className="run-button" onClick={run}><Icon icon="lucide:play" width={16} aria-hidden="true" />运行对比</button>
            <button type="button" onClick={randomize} aria-label="重新随机地图" title="重新随机地图"><Icon icon="lucide:shuffle" width={16} aria-hidden="true" /><span>换图</span></button>
            <button type="button" onClick={togglePlayback} disabled={!results} aria-label={playback} title={playback}><Icon icon={running ? "lucide:pause" : "lucide:play"} width={16} aria-hidden="true" /><span>{playback}</span></button>
            <button type="button" onClick={step} disabled={!results || finished} aria-label="单步执行" title="单步执行"><Icon icon="lucide:step-forward" width={16} aria-hidden="true" /><span>单步</span></button>
            <button type="button" onClick={reset} disabled={!results} aria-label="重置实验" title="重置实验"><Icon icon="lucide:undo-2" width={16} aria-hidden="true" /><span>重置</span></button>
            <button type="button" popoverTarget="sandbox-report" aria-label="本轮实验报告" title="本轮实验报告"><Icon icon="lucide:clipboard-list" width={16} aria-hidden="true" /><span>报告</span></button>
          </div>
          <span className="sr-only" role="status">{finished ? "对比完成。可查看报告。" : running ? "正在运行对比。" : results ? "对比已暂停。" : "地图已就绪。"}</span>
          <RoundReport map={map} results={results} finished={finished} reproduce={reproduce} />
        </div>
      </div>
      <aside className="diagnosis-note" id="lab-diagnosis">
        <Link className="diagnosis-heading" href={`${creatorRoute}?mode=resume`}><Icon icon="lucide:sparkles" width={23} /><span>AI 诊断建议</span></Link>
        <p className="demo-label">规则演示 · 未接入 AI</p>
        <ul>
          <li><Icon icon="lucide:check" width={18} />{visitNote}</li>
          <li><Icon icon="lucide:check" width={18} />{routeNote}</li>
          <li><Icon icon="lucide:check" width={18} />{finished ? "再改障碍，看看差别" : "等结果跑完再对比"}</li>
        </ul>
        <span className="note-swoosh" aria-hidden="true" />
      </aside>
    </section>
  );
}
