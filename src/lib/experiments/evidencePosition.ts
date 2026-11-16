export type EvidencePosition =
  | { kind: "metric" | "result"; key: string }
  | { kind: "step"; key: string; step: number };

export type RunEvidenceReference = {
  researchId: string;
  sessionId: string;
  runId: string;
  position: EvidencePosition;
};

export function evidencePositionToken(position: EvidencePosition) {
  return position.kind === "step" ? `step:${position.key}:${position.step}` : `${position.kind}:${position.key}`;
}

export function parseEvidencePosition(value: unknown): EvidencePosition | undefined {
  if (typeof value !== "string" || value.length > 80) return;
  const match = /^(metric|result|step):([A-Za-z][A-Za-z0-9_-]{0,63})(?::([1-9][0-9]{0,5}))?$/.exec(value);
  if (!match) return;
  const [, kind, key, step] = match;
  if (kind === "step" && step) return { kind, key, step: Number(step) };
  if ((kind === "metric" || kind === "result") && !step) return { kind, key };
}
