"use client";

import { useState } from "react";
import { evaluateTeachingModel, teachingModels, type TeachingModelId } from "@/lib/lessons/teachingModels";

export function TeachingModelDemo({ id }: { id: TeachingModelId }) {
  const model = teachingModels[id];
  const [values, setValues] = useState(() => model.fields.map(({ initial }) => String(initial)));
  const result = evaluateTeachingModel(id, values.map((value) => value.trim() ? Number(value) : NaN));

  return <section id="lesson-demo" className="lesson-section lesson-demonstration creator-canvas" aria-labelledby="lesson-demo-title">
    <h6 id="lesson-demo-title">{model.title}</h6>
    <div className="lesson-bound-inputs lesson-model-fields">
      {model.fields.map((field, index) => {
        const change = (value: string) => setValues((previous) => previous.map((item, i) => i === index ? value : item));
        return <label key={field.label}>{field.label}
          {"choices" in field && field.choices ? <select value={values[index]} onChange={(ev) => change(ev.target.value)}>
            {field.choices.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select> : <input type="number" step={1} min={field.min} max={field.max} value={values[index]}
            onChange={(ev) => change(ev.target.value)} />}
        </label>;
      })}
    </div>
    <p role="status">{result?.caption ?? "请检查输入范围。"}</p>
    {result && <table className="simulation-table lesson-model-table">
      <thead><tr>{result.columns.map((title) => <th scope="col" key={title}>{title}</th>)}</tr></thead>
      <tbody>{result.rows.map(([label, ...cells], index) => <tr key={index}>
        <th scope="row">{label}</th>{cells.map((value, i) => <td key={i}>{value}</td>)}
      </tr>)}</tbody>
    </table>}
  </section>;
}
