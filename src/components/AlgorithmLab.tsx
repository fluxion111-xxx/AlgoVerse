"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { motion, useReducedMotion } from "motion/react";
import { COLS, GOAL, ROWS, START, search, type Algorithm, type SearchResult } from "@/lib/pathfinding";
import { useLabStore } from "@/store/labStore";

const CELL = 31;
const PAD = 14;
const WIDTH = COLS * CELL + PAD * 2;
const HEIGHT = ROWS * CELL + PAD * 2;

function center(node: number) {
  return {
    x: PAD + (node % COLS) * CELL + CELL / 2,
    y: PAD + Math.floor(node / COLS) * CELL + CELL / 2,
  };
}

function Metric({ icon, value, label }: { icon: string; value: string; label: string }) {
  return <span className="metric"><Icon icon={icon} width={17} /><strong>{value}</strong><small>{label}</small></span>;
}

function Graph({ algorithm, result, frame, walls, onToggle }: {
  algorithm: Algorithm;
  result: SearchResult | null;
  frame: number;
  walls: number[];
  onToggle: (node: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const currentVisits = result?.visited.slice(0, frame) ?? [];
  const visited = new Set(currentVisits);
  const complete = result ? frame >= result.visited.length : false;
  const path = complete ? result?.path ?? [] : [];
  const points = path.map((node) => {
    const point = center(node);
    return `${point.x},${point.y}`;
  }).join(" ");

  return (
    <svg className="graph-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${algorithm === "astar" ? "A 星" : "Dijkstra"} 寻路网格，点击格子可改变障碍`}>
      <defs>
        <pattern id={`grid-${algorithm}`} width={CELL} height={CELL} patternUnits="userSpaceOnUse" x={PAD} y={PAD}>
          <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="#dfd2c3" strokeWidth="1" />
        </pattern>
        <linearGradient id={`route-${algorithm}`} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor={algorithm === "astar" ? "#86c63d" : "#ffb82d"} />
          <stop offset="1" stopColor={algorithm === "astar" ? "#318619" : "#e4520b"} />
        </linearGradient>
      </defs>
      <rect x={PAD} y={PAD} width={COLS * CELL} height={ROWS * CELL} fill={`url(#grid-${algorithm})`} />
      {Array.from({ length: COLS * ROWS }, (_, node) => {
        const { x, y } = center(node);
        const isWall = walls.includes(node);
        const isVisited = visited.has(node) && node !== START && node !== GOAL;
        return (
          <g key={node}>
            {isVisited && !complete && <rect x={x - 12} y={y - 12} width="24" height="24" rx="4" fill={algorithm === "astar" ? "#dce8cd" : "#fbe1c9"} />}
            {isWall && <rect x={x - 14} y={y - 14} width="28" height="28" rx="3" fill="#6e685e" />}
            {node !== START && node !== GOAL && <rect className="graph-hit" x={x - CELL / 2} y={y - CELL / 2} width={CELL} height={CELL} fill="transparent" onClick={() => onToggle(node)}>
              <title>{isWall ? "移除障碍" : "添加障碍"}</title>
            </rect>}
          </g>
        );
      })}
      {path.length > 1 && <motion.polyline points={points} fill="none" stroke={algorithm === "astar" ? "#36813d" : "#db651c"} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }} />}
      {path.slice(1, -1).map((node) => {
        const { x, y } = center(node);
        return <circle key={node} cx={x} cy={y} r="6" fill={`url(#route-${algorithm})`} pointerEvents="none" />;
      })}
      {[START, GOAL].map((node) => {
        const { x, y } = center(node);
        return <g key={node} pointerEvents="none"><circle cx={x} cy={y} r="13" fill={`url(#route-${algorithm})`} /><text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize="15" fontWeight="800">{node === START ? "S" : "G"}</text></g>;
      })}
    </svg>
  );
}

function AlgorithmCard({ algorithm, result, frame, walls, onToggle, position, onSelect }: {
  algorithm: Algorithm;
  result: SearchResult | null;
  frame: number;
  walls: number[];
  onToggle: (node: number) => void;
  position: "左侧" | "右侧";
  onSelect: (algorithm: Algorithm) => void;
}) {
  const isAStar = algorithm === "astar";
  const count = Math.min(frame, result?.visited.length ?? 0);
  const time = result ? (result.elapsedMs < 1 ? "<1" : result.elapsedMs.toFixed(1)) : "—";
  return (
    <div className={`algorithm-card ${isAStar ? "algorithm-card-green" : ""}`}>
      <label className="algorithm-title">
        <span>{isAStar ? "A*" : "Dijkstra"}</span><small>{isAStar ? "启发式" : "最短路"}</small><Icon icon="lucide:chevron-down" width={17} aria-hidden="true" />
        <select aria-label={`${position}算法`} value={algorithm} onChange={(event) => onSelect(event.target.value === "astar" ? "astar" : "dijkstra")}>
          <option value="dijkstra">Dijkstra 最短路</option>
          <option value="astar">A* 启发式</option>
        </select>
      </label>
      <Graph algorithm={algorithm} result={result} frame={frame} walls={walls} onToggle={onToggle} />
      <div className="metric-row">
        <Metric icon="lucide:zap" value={time} label="ms" />
        <Metric icon="lucide:layers-2" value={String(count)} label="访问节点" />
      </div>
    </div>
  );
}

export function AlgorithmLab() {
  const [leftAlgorithm, setLeftAlgorithm] = useState<Algorithm>("dijkstra");
  const rightAlgorithm = leftAlgorithm === "dijkstra" ? "astar" : "dijkstra";
  const { walls, results, frame, running, toggleWall, resetWalls, setResults, setFrame, setRunning } = useLabStore();
  const maxFrame = useMemo(() => Math.max(results?.dijkstra.visited.length ?? 0, results?.astar.visited.length ?? 0), [results]);

  useEffect(() => {
    const computed = { dijkstra: search("dijkstra", walls), astar: search("astar", walls) };
    setResults(computed);
    setFrame(Math.max(computed.dijkstra.visited.length, computed.astar.visited.length));
    // Initial map preview; later edits are run with the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running || !results) return;
    const timer = window.setInterval(() => {
      const next = useLabStore.getState().frame + 2;
      if (next >= maxFrame) {
        setFrame(maxFrame);
        setRunning(false);
      } else {
        setFrame(next);
      }
    }, 70);
    return () => window.clearInterval(timer);
  }, [running, results, maxFrame, setFrame, setRunning]);

  function run() {
    setResults({ dijkstra: search("dijkstra", walls), astar: search("astar", walls) });
    setFrame(0);
    setRunning(true);
  }

  function reset() {
    resetWalls();
    const defaults = useLabStore.getState().walls;
    const computed = { dijkstra: search("dijkstra", defaults), astar: search("astar", defaults) };
    setResults(computed);
    setFrame(Math.max(computed.dijkstra.visited.length, computed.astar.visited.length));
  }

  const finished = !!results && frame >= maxFrame;
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

  return (
    <section className="lab-assembly" id="lab">
      <div className="lab-shadow-sheet" aria-hidden="true" />
      <div className="lab-window">
        <div className="window-top"><span className="window-dots"><i /><i /><i /></span><span className="window-code">ALGOVERSE / LAB-01</span><span className="window-actions"><i /><i /><i /></span></div>
        <div className="lab-inner">
          <div className="lab-tape"><Icon icon="lucide:flask-conical" width={25} /><span>算法对比实验</span></div>
          <div className="lab-intro"><span className="live-dot" />点格子，改障碍。<span className="lab-data-note">本地实时计算</span></div>
          <div className="algorithm-grid grid">
            <AlgorithmCard algorithm={leftAlgorithm} result={results?.[leftAlgorithm] ?? null} frame={frame} walls={walls} onToggle={toggleWall} position="左侧" onSelect={setLeftAlgorithm} />
            <AlgorithmCard algorithm={rightAlgorithm} result={results?.[rightAlgorithm] ?? null} frame={frame} walls={walls} onToggle={toggleWall} position="右侧" onSelect={(algorithm) => setLeftAlgorithm(algorithm === "astar" ? "dijkstra" : "astar")} />
          </div>
          <div className="lab-controls">
            <button className="run-button" onClick={run}><Icon icon={running ? "lucide:rotate-cw" : "lucide:play"} width={17} />{running ? "重新运行" : "运行对比"}</button>
            <button className="reset-button" onClick={reset}><Icon icon="lucide:undo-2" width={16} />重置地图</button>
            <span className="lab-hint">点击网格，试试改路。</span>
          </div>
        </div>
      </div>
      <aside className="diagnosis-note">
        <div className="diagnosis-heading"><Icon icon="lucide:sparkles" width={23} /><span>AI 诊断建议</span></div>
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
