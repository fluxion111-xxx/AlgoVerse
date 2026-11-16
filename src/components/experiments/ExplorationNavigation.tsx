"use client";

import { useEffect, useRef, useState } from "react";
import type { ExplorationChange, ExplorationSuggestion } from "@/lib/experiments/exploration";

function valueText(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function ExplorationNavigation({ legacySuggestion, unavailable, modelBlocked, blocked, generate, adopt }: {
  legacySuggestion?: string;
  unavailable: string;
  modelBlocked: boolean;
  blocked: boolean;
  generate: (controller: AbortController) => Promise<ExplorationSuggestion[]>;
  adopt: (change: ExplorationChange) => void;
}) {
  const [suggestions, setSuggestions] = useState<ExplorationSuggestion[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function refresh() {
    if (request.current || unavailable || modelBlocked) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const next = await generate(controller);
      if (!controller.signal.aborted) setSuggestions(next);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "建议生成失败。请重试。");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return <section className="wb-panel" aria-labelledby="wb-exploration-title">
    <header className="wb-panel-head"><h2 id="wb-exploration-title">AI 探究导航</h2></header>
    <div className="wb-panel-body">
      {legacySuggestion && <details className="wb-details"><summary>已有诊断建议</summary><p>{legacySuggestion}</p></details>}
      {unavailable ? <p className="wb-muted">{unavailable}</p> : <>
        {!suggestions && !loading && !error && <p className="wb-muted">用本轮实测找个方向。每条建议只改一项。</p>}
        {loading && <p className="wb-muted" role="status">正在查找下一轮方向。</p>}
        {error && <p className="wb-alert" role="alert">{error}</p>}
        {suggestions?.length === 0 && <p className="wb-muted" role="status">暂无可验证的下一轮建议。</p>}
        {suggestions?.map(({ change, parameter, controls, metrics }, index) => <article className="wb-exploration-choice" key={`${change.key}-${index}`}>
          <h3>{change.purpose}</h3>
          <p className="wb-muted">{change.reason}</p>
          <dl>
            <dt>改动</dt><dd>{parameter.label} · {valueText(parameter.before)} → {valueText(change.value)}</dd>
            <dt>保持</dt><dd>{controls.length ? <details className="wb-details">
              <summary>{controls.map(({ label }) => label).join("、")}</summary>
              <ul>{controls.map(({ key, label, value }) => <li key={key}>{label} · {valueText(value)}</li>)}</ul>
            </details> : "沿用本轮实验工具。"}</dd>
            <dt>观察</dt><dd><ul>{metrics.map(({ key, label, baseline }) => <li key={key}>{label} · 本轮 {baseline}</li>)}</ul></dd>
          </dl>
          <button type="button" className="wb-button wb-primary" onClick={() => adopt(change)} disabled={blocked || loading}>采纳并生成草稿</button>
        </article>)}
      </>}
    </div>
    {!unavailable && <footer className="wb-panel-foot">
      <button type="button" className="wb-button" disabled={modelBlocked || loading} onClick={() => void refresh()}>
        {error ? "重试" : suggestions ? "重新生成建议" : "生成探究建议"}
      </button>
    </footer>}
  </section>;
}
