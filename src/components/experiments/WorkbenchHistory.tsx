"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkbenchHistoryItem, WorkbenchView } from "@/lib/workbenchHistory";
import { containsTemporaryAIKey } from "@/lib/temporaryAI";
import { agentPhases } from "./WorkbenchActivity";
import { WorkbenchIcon } from "./WorkbenchIcon";

const dateFormat = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" });
const url = "/api/experiments/history";

export async function workbenchHistoryRequest<T>(method: "GET" | "POST" | "PUT", body?: object, signal?: AbortSignal) {
  const response = await fetch(url, {
    method, cache: "no-store", signal, keepalive: method === "PUT",
    ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message ?? "请求失败。请重试。");
  return data as T;
}

export function useWorkbenchView(id: string | undefined, { focus, runId, evidence, hypothesis, draftQuestion }: WorkbenchView) {
  const queued = useRef(Promise.resolve());
  const pending = useRef<() => void>(undefined);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    let current = true;
    let submitted = false;
    setSaved(false);
    setError("");
    const save = () => {
      if (submitted) return;
      submitted = true;
      if (containsTemporaryAIKey(hypothesis ?? "") || containsTemporaryAIKey(draftQuestion ?? "")) {
        if (current) setError("请先移除草稿里的 Key。");
        return;
      }
      queued.current = queued.current.then(async () => {
        try {
          await workbenchHistoryRequest("PUT", { id, focus, runId, evidence, hypothesis, draftQuestion });
          if (current) setSaved(true);
        } catch (failure) {
          if (current) setError(failure instanceof Error ? failure.message : "保存失败。请重试。");
        }
      });
    };
    const timeout = window.setTimeout(save, 240);
    pending.current = save;
    window.addEventListener("pagehide", save);
    return () => {
      current = false;
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", save);
      if (pending.current === save) pending.current = undefined;
    };
  }, [id, focus, runId, evidence, hypothesis, draftQuestion, attempt]);

  return {
    saved, error, retry: () => setAttempt((value) => value + 1),
    flush: () => { pending.current?.(); return queued.current; },
  };
}

export function WorkbenchHistory({ currentId, blocked, close, open }: {
  currentId?: string; blocked: boolean; close: () => void; open: (href: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ items: WorkbenchHistoryItem[]; partial: boolean }>();
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); };
  }, []);

  useEffect(() => {
    const request = new AbortController();
    void workbenchHistoryRequest<{ items: WorkbenchHistoryItem[]; partial: boolean }>("GET", undefined, request.signal)
      .then((data) => { if (!request.signal.aborted) setResult(data); })
      .catch((failure) => { if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "历史读取失败。"); });
    return () => request.abort();
  }, [attempt]);

  return <dialog className="wb-research-history" id="wb-research-history" ref={dialog} aria-labelledby="wb-history-title"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="wb-history-drawer">
      <header className="wb-activity-head">
        <div className="wb-activity-title"><WorkbenchIcon icon="history" width={19} /><h2 id="wb-history-title">实验历史</h2></div>
        <button type="button" className="wb-button" onClick={close} aria-label="关闭实验历史"><WorkbenchIcon icon="x" width={17} /></button>
      </header>
      <div className="wb-history-list">
        {error || result?.partial ? <div className="wb-history-feedback">
          <p className="wb-alert" role="alert">{error || "部分历史无法读取。"}</p>
          <button className="wb-button" type="button" onClick={() => { setError(""); setResult(undefined); setAttempt(attempt + 1); }}>重试</button>
        </div> : !result ? <p role="status" className="wb-muted">正在读取历史。</p>
          : !result.items.length && <p className="wb-muted">暂无实验历史。</p>}
        {!!result?.items.length && <ul>{result.items.map(({ id, title, question, href, phase, rounds, updatedAt }) => <li key={id}>
          <button type="button" aria-current={id === currentId ? "true" : undefined} className="wb-history-item"
            disabled={blocked && id !== currentId} onClick={() => id === currentId ? close() : open(href)}>
            <span className="wb-history-entry-title"><strong>{title}</strong>{id === currentId && <small>当前研究</small>}</span>
            {question && <span className="wb-history-question">{question}</span>}
            <span className="wb-history-meta"><span>{agentPhases[phase]}</span><span>{rounds} 轮实测</span>
              <time dateTime={updatedAt}>{dateFormat.format(new Date(updatedAt))}</time></span>
          </button>
        </li>)}</ul>}
      </div>
    </div>
  </dialog>;
}
