import { defineEngine, experimentDomains, fields, goalLabel, integer } from "./engine";

type Field = { label: string; hint: string } & (
  { kind: "integer"; min: number; max: number }
  | { kind: "list"; min: number; max: number; minItems: number; maxItems: number }
  | { kind: "rows"; columns: readonly (readonly [number, number])[]; minItems: number; maxItems: number }
  | { kind: "text"; maxLength: number; multiline?: boolean }
);
type InputFields = Record<string, Field>;
type InputValues<F extends InputFields> = { [Key in keyof F]: F[Key]["kind"] extends "integer" ? number :
  F[Key]["kind"] extends "list" ? number[] : F[Key]["kind"] extends "rows" ? number[][] : string };
type Config<F extends InputFields> = InputValues<F> & { goalLabel: string };

type Metric = string | number;
type Step = readonly [string | number, ...(string | number)[]];
type Report = { conclusion: string; detail: string; explanation: string; suggestion: string };

export type CurriculumTrace = { steps: readonly Step[]; report: Report; metrics: Record<string, string> };

function validField(field: Field, value: unknown) {
  if (field.kind === "integer") return integer(value, field.min, field.max);
  if (field.kind === "text") return typeof value === "string" && value.trim().length > 0 && value.length <= field.maxLength;
  if (!Array.isArray(value) || !integer(value.length, field.minItems, field.maxItems)) return false;
  if (field.kind === "list") return [...value].every((item) => integer(item, field.min, field.max));
  return [...value].every((row) => Array.isArray(row) && row.length === field.columns.length &&
    field.columns.every(([min, max], index) => integer(row[index], min, max)));
}

export function defineCurriculumLab<const Id extends string, const F extends InputFields, const M extends Record<string, string>>(lab: {
  id: Id;
  domain: keyof typeof experimentDomains;
  title: string;
  description: string;
  comparison?: string;
  topics: readonly string[];
  input: F;
  defaults: Config<F>;
  check?: (config: Config<F>) => boolean;
  columns: readonly [string, ...string[]];
  metricLabels: M;
  focusMetric: keyof M & string;
  alternateTrial: string;
  run: (config: Config<F>) => { steps: readonly Step[]; report: Report; metrics: Record<keyof M, Metric> };
}) {
  const entries: [string, Field][] = Object.entries(lab.input);
  function configure(value: unknown): Config<F> | null {
    const input = fields(value, ["goalLabel", ...entries.map(([key]) => key)]);
    const goal = goalLabel(input?.goalLabel);
    if (!input || !goal || !entries.every(([key, field]) => validField(field, input[key]))) return null;
    const config = { ...input, goalLabel: goal } as Config<F>;
    return !lab.check || lab.check(config) ? config : null;
  }
  const engine = defineEngine({
    id: lab.id, version: 1, domain: lab.domain, route: `/experiments/${lab.domain}/${lab.id}`,
    creator: { title: lab.title, description: lab.description, parameters: {
      goalLabel: "1–100 字的实验目标", ...Object.fromEntries(entries.map(([key, field]) => [key, field.hint])),
    } },
    preset: (): Config<F> => structuredClone(lab.defaults),
    configure,
    validate: (value): value is Config<F> => configure(value) !== null,
    run(config: Config<F>): { kind: Id } & CurriculumTrace {
      const { steps, report, metrics } = lab.run(config);
      return { kind: lab.id, steps, report, metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, String(value)])) };
    },
  });
  return { ...engine, curriculum: {
    fields: entries, columns: lab.columns, metricLabels: lab.metricLabels, focusMetric: lab.focusMetric,
    topics: lab.topics, comparison: lab.comparison, alternateTrial: lab.alternateTrial,
  } };
}

export const sequenceText = (values: readonly number[]) => values.join("、") || "空";
export const gapText = (left: number, right: number, leftName: string, rightName: string, unit: string) =>
  left === right ? "两种方法计数相同。" : `${left < right ? leftName : rightName}少 ${Math.abs(left - right)} ${unit}。`;
