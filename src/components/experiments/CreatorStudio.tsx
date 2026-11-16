"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@iconify/react";
import { SimulationWorkbench } from "./SimulationParameters";
import { PathfindingMapEditor, ResultSheet, SavedPathfindingReplay } from "@/components/PathfindingWorkbench";
import { createPathfindingConfig, getExperimentEngine, pathfindingEngine, type EngineId, type ExperimentConfig, type PathfindingConfig } from "@/lib/experimentEngines";
import { COLS, ROWS, type Difficulty } from "@/lib/pathfinding";
import type { ExperimentRun } from "@/lib/server/experimentRecords";

type Draft = { id: string; revision: number; config: ExperimentConfig; generated: boolean };
const difficulties = [{ id: "easy", label: "低" }, { id: "normal", label: "中" }, { id: "hard", label: "高" }] as const;

function RunButton({ hasRun }: { hasRun: boolean }) {
  const { pending } = useFormStatus();
  return <button className="creator-submit" type="submit" disabled={pending}>
    <Icon icon={pending ? "lucide:loader-circle" : "lucide:play"} width={17} aria-hidden="true" />
    {pending ? "正在运行…" : hasRun ? "再跑一次" : "确认并运行"}
  </button>;
}

export function CreatorStudio({ draft, engineId, run, nextRunId, defaultSeed, action, presentation }: {
  draft: Draft | null;
  engineId: EngineId;
  run: ExperimentRun | null;
  nextRunId: string;
  defaultSeed: number;
  action: (data: FormData) => Promise<void>;
  presentation?: "plan" | "result";
}) {
  const [edited, setEdited] = useState(false);
  const engine = getExperimentEngine(engineId)!;
  const initial = useMemo(() => draft?.config ?? engine.preset(defaultSeed), [draft, engine, defaultSeed]);
  const [difficulty, setDifficulty] = useState<Difficulty | "">(draft ? "" : "normal");
  const [seed, setSeed] = useState("seed" in initial ? initial.seed : defaultSeed);
  const [editingMap, setEditingMap] = useState(false);
  const [customMap, setCustomMap] = useState<Pick<PathfindingConfig, "start" | "goal" | "walls"> | null>(null);
  const preset = useMemo(() => engineId === "pathfinding" && difficulty
    ? createPathfindingConfig(seed, difficulty, initial.goalLabel) : initial, [engineId, difficulty, initial, seed]);
  const config = customMap && "walls" in preset ? { ...preset, ...customMap, difficulty: undefined } : preset;
  const validMap = !customMap || pathfindingEngine.validate(config);
  const showRun = !!run && (engineId === "pathfinding" ? !difficulty && !customMap : !edited);

  function changeMap() {
    setSeed(window.crypto.getRandomValues(new Uint32Array(1))[0]);
    setCustomMap(null);
    if (!difficulty) setDifficulty("difficulty" in initial ? initial.difficulty ?? "normal" : "normal");
  }

  const readOnly = presentation === "result";
  const canvasStatus = showRun ? "本轮已计算"
    : !validMap ? "请检查地图" : edited || customMap || (draft && difficulty && engineId === "pathfinding")
      ? "参数已调整" : draft?.generated ? "配置待运行" : "手动实验 · 可运行";

  return (
      <section className="creator-canvas" id="creator-workbench" aria-labelledby="creator-workbench-title" data-presentation={presentation}>
        <header className="creator-canvas-head">
          <div>
            <p className="creator-canvas-label"><Icon icon="lucide:scan-line" width={17} aria-hidden="true" />{presentation === "plan" ? "参数与预览" : "动态实验工作台"}</p>
            <h2 id="creator-workbench-title">{engine.creator.title}</h2>
          </div>
          <div className="creator-canvas-actions">
            <p className="creator-canvas-status" role="status"><i aria-hidden="true" />{canvasStatus}</p>
            {showRun && <a className="creator-tool" href="#experiment-replay">查看回放<Icon icon="lucide:arrow-down" width={15} aria-hidden="true" /></a>}
          </div>
        </header>
        {engineId === "pathfinding" && "walls" in config ? <div className="creator-console">
          {!readOnly && <aside className="creator-parameters" aria-labelledby="creator-parameters-title">
            <h3 id="creator-parameters-title" tabIndex={-1}>{presentation === "plan" ? "推荐参数" : "实验参数"}</h3>
            <form action={action}>
              {draft && <><input type="hidden" name="sessionId" value={draft.id} /><input type="hidden" name="revision" value={draft.revision} /></>}
              <input type="hidden" name="runId" value={nextRunId} />
              {(customMap || difficulty) && <input type="hidden" name="seed" value={config.seed} />}
              {customMap ? <input type="hidden" name="parameters" value={JSON.stringify({ goalLabel: config.goalLabel, map: { kind: "custom", ...customMap } })} />
                : difficulty && <input type="hidden" name="difficulty" value={difficulty} />}
              <label htmlFor="creator-density">障碍密度</label>
              <select id="creator-density" value={difficulty} onChange={(event) => { setDifficulty(event.target.value as Difficulty | ""); setCustomMap(null); }}>
                {draft && <option value="">{draft.generated ? "沿用 AI 地图" : "沿用原地图"}</option>}
                {difficulties.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              </select>
              <dl className="creator-map-specs">
                <div><dt>网格</dt><dd>{COLS} × {ROWS}</dd></div>
                <div><dt>障碍</dt><dd>{config.walls.length} 格</dd></div>
                <div><dt>种子</dt><dd>{config.seed.toString(16).toUpperCase().padStart(8, "0")}</dd></div>
              </dl>
              <div className="creator-param-actions">
                <button className="creator-tool" type="button" onClick={changeMap}><Icon icon="lucide:shuffle" width={16} aria-hidden="true" />换张地图</button>
                <button className="creator-tool" type="button" aria-expanded={editingMap} aria-controls="creator-map-editor" onClick={() => setEditingMap((value) => !value)}>
                  {editingMap ? "收起编辑" : "编辑地图"}
                </button>
              </div>
              {!validMap && <p className="preset-error" role="status">请给起终点留一条路。</p>}
              {presentation === "plan" && validMap && <p className="creator-validation" role="status">地图校验通过。</p>}
              <fieldset className="creator-param-actions" disabled={!validMap}><RunButton hasRun={showRun} /></fieldset>
            </form>
          </aside>}

          <div className="creator-stage" id="experiment-replay" tabIndex={-1}>
            <div id="creator-map-editor" hidden={!editingMap}>
              {editingMap && <PathfindingMapEditor map={{ start: config.start, goal: config.goal, walls: config.walls }} onChange={setCustomMap} />}
            </div>
            {showRun && "dijkstra" in run.results ? <SavedPathfindingReplay key={run.id} map={config} results={run.results} studio /> : <>
              <div className="creator-stage-head"><h3>地图预览</h3><p>直走 1，斜走 √2。</p></div>
              {draft?.generated && presentation !== "plan" && <p className="creator-preview-goal">观察目标 · {draft.config.goalLabel}</p>}
              <div className="experiment-sheets">
                <ResultSheet algorithm="dijkstra" map={config} frame={0} />
                <ResultSheet algorithm="astar" map={config} frame={0} />
              </div>
            </>}
          </div>
        </div> : engineId !== "pathfinding" && !("walls" in initial) && <SimulationWorkbench engineId={engineId} initial={initial} results={run?.results}
          action={action} sessionId={draft?.id} revision={draft?.revision} nextRunId={nextRunId} runButton={(hasRun) => <RunButton hasRun={hasRun} />}
          onEdited={setEdited} presentation={presentation} />}

        {showRun && <div className="creator-canvas-actions">
          <a className="creator-record" href="#run-report-title">查看实验报告<Icon icon="lucide:arrow-down" width={15} aria-hidden="true" /></a>
          <a className="creator-record" href="#creator-diagnosis">诊断本轮结果<Icon icon="lucide:arrow-down" width={15} aria-hidden="true" /></a>
        </div>}
      </section>
  );
}
