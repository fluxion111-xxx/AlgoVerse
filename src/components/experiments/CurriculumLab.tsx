"use client";

import { useEffect, useRef, useState } from "react";
import type { CurriculumLab } from "@/lib/experiments/curriculumLabs";
import type { CurriculumTrace } from "@/lib/experiments/curriculumLab";
import { Controls, useReplay } from "./SimulationReplay";

type Lab = CurriculumLab["curriculum"];

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => Array.isArray(item) ? item.join(", ") : item).join(Array.isArray(value[0]) ? "\n" : ", ");
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function integers(input: string) {
  const text = input.trim().replaceAll("−", "-");
  return text ? text.split(/[\s,，]+/).map((value) => /^-?\d+$/.test(value) ? Number(value) : null) : [];
}

export function CurriculumFields({ lab, parameters, update }: {
  lab: Lab;
  parameters: Record<string, unknown>;
  update: (values: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState(() => Object.fromEntries(lab.fields.map(([name]) => [name, formatValue(parameters[name])])));
  const edit = (name: string, kind: Lab["fields"][number][1]["kind"], text: string) => {
    setDraft((current) => ({ ...current, [name]: text }));
    const value = kind === "list" ? integers(text) : kind === "rows" ? text.split(/\r?\n/).filter((line) => line.trim()).map(integers) : text;
    update({ ...parameters, [name]: value });
  };

  return <div className="simulation-fields">
    {lab.fields.map(([name, field]) => {
      const id = `lab-${name}`;
      const description = `${id}-help`;
      const number = parameters[name];
      return <div className="curriculum-lab-field" key={name}>
        <label htmlFor={id}>{field.label}</label>
        {field.kind === "integer" ? <input type="number" id={id} aria-describedby={description} min={field.min} max={field.max} step={1}
          value={typeof number === "number" && Number.isFinite(number) ? number : ""}
          onChange={(event) => update({ ...parameters, [name]: event.target.valueAsNumber })} />
          : field.kind === "text" && !field.multiline ? <input id={id} aria-describedby={description} value={draft[name]} maxLength={field.maxLength}
            onChange={(event) => edit(name, field.kind, event.target.value)} />
            : <textarea id={id} aria-describedby={description} rows={field.kind === "list" ? 2 : 4} value={draft[name]}
              maxLength={field.kind === "text" ? field.maxLength : 1200} onChange={(event) => edit(name, field.kind, event.target.value)} />}
        <p id={description}>{field.kind === "rows" ? "每行一组。" : ""}{field.hint}</p>
      </div>;
    })}
  </div>;
}

export function CurriculumReplay({ lab, results, description }: { lab: Lab; results?: CurriculumTrace; description: string }) {
  const replay = useReplay(results?.steps.length ?? 0, 450);
  const table = useRef<HTMLDivElement>(null);
  const previousStep = useRef(0);
  useEffect(() => {
    if (table.current && replay.step === 0) table.current.scrollTop = 0;
    if (table.current && replay.step > previousStep.current) table.current.scrollTop = table.current.scrollHeight;
    previousStep.current = replay.step;
  }, [replay.step]);
  return <div className="simulation-view">
    {results && <div className="curriculum-trace-actions">
      <Controls replay={replay} />
      <button type="button" className="experiment-control" disabled={replay.step === replay.length} onClick={() => {
        replay.setPlaying(false);
        replay.setStep(replay.length);
      }}>查看全部</button>
    </div>}
    <section className="simulation-panel" aria-labelledby="curriculum-trace-title">
      <h3 id="curriculum-trace-title">实验轨迹</h3>
      {results ? <>
        {!replay.step && <p>播放或单步查看。</p>}
        <div ref={table} className="curriculum-trace-table" role="region" aria-label="运行步骤" tabIndex={0}>
          <table className="simulation-table">
            <thead><tr>{lab.columns.map((header, index) => <th key={index} scope="col">{header}</th>)}</tr></thead>
            <tbody>{results.steps.slice(0, replay.step).map((step, index) => <tr key={index} data-active={index === replay.step - 1}>
              {step.map((cell, column) => column === 0 ? <th key={column} scope="row">{cell}</th> : <td key={column}>{cell}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </> : <p>{description}</p>}
    </section>
  </div>;
}
