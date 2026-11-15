import { COLS, ROWS } from "@/lib/pathfinding";
import type { PathfindingConfig } from "@/lib/experimentEngines";

const position = (cell: number) => `${Math.floor(cell / COLS) + 1} 行 ${cell % COLS + 1} 列`;
const density = { easy: "低", normal: "中", hard: "高" };

export function PresetDetails({ question, config, showDensity = false }: {
  question: string;
  config: PathfindingConfig;
  showDensity?: boolean;
}) {
  return (
    <dl className="preset-details">
      <div><dt>实验问题</dt><dd>{question}</dd></div>
      <div><dt>领域</dt><dd>数据结构与算法</dd></div>
      <div><dt>目标</dt><dd>{config.goalLabel}</dd></div>
      <div><dt>算法</dt><dd>Dijkstra 与 A*</dd></div>
      <div><dt>地图</dt><dd>{COLS} × {ROWS}，{config.walls.length} 个障碍</dd></div>
      {showDensity && config.difficulty && <div><dt>障碍密度</dt><dd>{density[config.difficulty]} · {(config.walls.length / (COLS * ROWS) * 100).toFixed(1)}%</dd></div>}
      <div><dt>起点 S</dt><dd>{position(config.start)}</dd></div>
      <div><dt>终点 G</dt><dd>{position(config.goal)}</dd></div>
      <div><dt>种子</dt><dd><code>{config.seed.toString(16).toUpperCase().padStart(8, "0")}</code></dd></div>
      <div><dt>障碍</dt><dd><details><summary>查看坐标</summary><p>{config.walls.map(position).join("、")}</p></details></dd></div>
    </dl>
  );
}
