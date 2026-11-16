"use client";

import { useEffect, useRef, useState } from "react";
import { evidencePositionToken, type RunEvidenceReference } from "@/lib/experiments/evidencePosition";
import { evidenceSnapshot, keyframeCandidates, type EvidenceExplanation } from "@/lib/experiments/keyframeEvidence";
import { type adaptEvidenceRun } from "@/lib/experiments/runEvidence";

type EvidenceRun = NonNullable<ReturnType<typeof adaptEvidenceRun>>;
type Entry = { pending: true } | { text: string } | { error: string };

export function KeyframeExplanation({ run, reference, canExplain, locate, explain }: {
  run: EvidenceRun;
  reference?: RunEvidenceReference;
  canExplain: boolean;
  locate: (reference: RunEvidenceReference) => boolean;
  explain: (reference: RunEvidenceReference, controller: AbortController) => Promise<EvidenceExplanation>;
}) {
  const [entries, setEntries] = useState<Record<string, Entry | undefined>>({});
  const active = useRef<{ token: string; controller: AbortController } | null>(null);
  const candidates = keyframeCandidates(run);
  const selected = reference && evidenceSnapshot(run, reference);
  const token = selected?.token;
  const entry = token ? entries[token] : undefined;
  const hasFrames = candidates.some(({ reference }) => reference.position.kind === "step");

  function cancel() {
    const request = active.current;
    if (!request) return;
    active.current = null;
    request.controller.abort();
    setEntries((previous) => ({ ...previous, [request.token]: undefined }));
  }

  useEffect(() => () => active.current?.controller.abort(), []);
  useEffect(() => {
    if (active.current && active.current.token !== token) cancel();
  }, [token]);

  async function load(target: RunEvidenceReference) {
    const key = evidencePositionToken(target.position);
    if (!canExplain || active.current?.token === key || (entries[key] && "text" in entries[key])) return;
    cancel();
    const request = { token: key, controller: new AbortController() };
    active.current = request;
    setEntries((previous) => ({ ...previous, [key]: { pending: true } }));
    try {
      const result = await explain(target, request.controller);
      if (active.current === request && !request.controller.signal.aborted) {
        setEntries((previous) => ({ ...previous, [key]: { text: result.explanation } }));
      }
    } catch (error) {
      if (active.current === request && !request.controller.signal.aborted) {
        setEntries((previous) => ({ ...previous, [key]: { error: error instanceof Error ? error.message : "讲解失败。请重试。" } }));
      }
    } finally {
      if (active.current === request) active.current = null;
    }
  }

  return <section className="wb-keyframe" aria-labelledby="wb-keyframe-title">
    <h3 id="wb-keyframe-title">{hasFrames ? "AI 关键帧讲解" : "AI 结果讲解"}</h3>
    {!candidates.length && <p className="wb-muted">暂无可讲解的证据。</p>}
    {candidates.length > 0 && <>
      <p className="wb-muted">{hasFrames ? "选一步，查看实测讲解。" : "本轮可讲解已保存的结果。"}</p>
      {!canExplain && (!entry || "error" in entry) && <p className="wb-muted">AI 暂不可用。仍可查看证据。</p>}
      <div className="wb-evidence-links">
        {candidates.map(({ label, reference: target }) => {
          const key = evidencePositionToken(target.position);
          return <button type="button" className="wb-button wb-link" key={key} aria-pressed={token === key}
            onClick={() => { if (locate(target)) void load(target); }}>{label}</button>;
        })}
      </div>
      {reference && selected && <div className="wb-keyframe-response" aria-live="polite">
        <strong>{selected.label}</strong>
        {entry && "pending" in entry ? <>
          <p role="status">Agent 正在讲解。</p>
          <button type="button" className="wb-button" onClick={cancel}>停止讲解</button>
        </> : entry && "text" in entry ? <><p className="wb-muted">Agent 解读</p><p>{entry.text}</p></> : <>
          {entry && "error" in entry && <p className="wb-alert" role="alert">{entry.error}</p>}
          <button type="button" className="wb-button" disabled={!canExplain}
            onClick={() => void load(reference)}>{entry ? "重试讲解" : "讲解此处"}</button>
        </>}
      </div>}
    </>}
  </section>;
}
