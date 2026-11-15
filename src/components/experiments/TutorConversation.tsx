"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { canUseAITransport, getAIModel } from "@/lib/aiSettings";
import { maxCreatorHistory, maxQuestionLength, type CreatorTurn } from "@/lib/experimentCreator";
import { workflowAISettingsRoute } from "@/lib/navigation";
import { isPlatformModel, platformModels } from "@/lib/platformAI";
import { fetchWithTemporaryAI, selectPlatformAIModel, useActiveAI, useTemporaryAI } from "@/lib/temporaryAI";
import type { TutorCodeBlock } from "@/lib/tutorReply";
import { CatalogIcon } from "./CatalogEffects";
import { TutorReply } from "./TutorReply";

type Reference = { title: string; href: string };
type Metric = { id: string; label: string; value: string };
type RunOption = Reference & { id: string; completedAt: string; metrics?: Metric[] };
type Reply = { answer: string; codeBlocks?: TutorCodeBlock[]; sources: Reference[]; recommendation?: Reference };
type TutorTurn = CreatorTurn & Reply & { id: number };
type Feedback = { kind: "error" | "stopped"; text: string };

type TutorProps = {
  initial: RunOption | null;
  choices: RunOption[];
  topicId?: string;
  reference?: Reference;
  returnToDiagnosis?: string;
  missingRun: boolean;
};

const examples = [
  { icon: "lucide:book-open", label: "讲个概念", question: "TCP 和 UDP 有何区别？" },
  { icon: "lucide:code-xml", label: "分析代码", question: "分析这段代码的逻辑和复杂度：\n" },
  { icon: "lucide:flask-conical", label: "看懂实验", question: "快排怎样分区？" },
];
const moreExamples = ["时间片用完会怎样？", "递归怎样压栈？", "B+ 树怎样查范围？", "KNN 的 K 有什么用？"];

function ReferenceLink({ reference, children }: { reference: Reference; children?: string }) {
  return <Link className="tutor-reference-link" href={reference.href} target="_blank" rel="noopener" title="在新标签页查看">
    {children ?? reference.title}<CatalogIcon icon="lucide:arrow-up-right" width={14} />
  </Link>;
}

export function TutorConversation({ initial, choices, topicId, reference, returnToDiagnosis, missingRun }: TutorProps) {
  const connection = useActiveAI();
  const { mode, platformModel } = useTemporaryAI();
  const [history, setHistory] = useState<TutorTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState(initial?.id ?? "");
  const [include, setInclude] = useState(false);
  const [includePractice, setIncludePractice] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [ready, setReady] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const nextTurn = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const panelToggle = useRef<HTMLButtonElement>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const transcriptContent = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const busy = !!requestText;
  const options = initial ? [initial, ...choices.filter(({ id }) => id !== initial.id)] : choices;
  const context = options.find(({ id }) => id === selected);
  const latest = history.at(-1);
  const references = [...(reference ? [reference] : []), ...(latest?.sources ?? [])]
    .filter(({ href }, index, all) => all.findIndex((entry) => entry.href === href) === index);
  const recentCode = [...history].reverse().find(({ codeBlocks, answer }) => codeBlocks?.length || /(?:^|\n) {0,3}(?:`{3,}|~{3,})/.test(answer));
  const hasContext = !!(references.length || options.length || recentCode);
  const sideOpen = hasContext && panelOpen;
  const settingsParams = new URLSearchParams();
  if (selected) settingsParams.set("runId", selected);
  if (topicId) settingsParams.set("topic", topicId);
  if (returnToDiagnosis && selected === initial?.id) settingsParams.set("from", "diagnosis");
  const settingsHref = workflowAISettingsRoute(settingsParams.size ? `/ai-tutor?${settingsParams}` : "/ai-tutor");

  useEffect(() => {
    setReady(true);
    const rail = transcript.current;
    const content = transcriptContent.current;
    const resize = new ResizeObserver(() => {
      if (follow.current && rail) rail.scrollTop = rail.scrollHeight;
    });
    if (rail) resize.observe(rail);
    if (content) resize.observe(content);
    return () => {
      resize.disconnect();
      const request = pending.current;
      pending.current = null;
      request?.abort();
    };
  }, []);

  useEffect(() => {
    if (sideOpen) panelTitle.current?.focus({ preventScroll: true });
  }, [sideOpen]);

  function closePanel() {
    setPanelOpen(false);
    panelToggle.current?.focus();
  }

  function clearDialogue() {
    setHistory([]);
    setFeedback(null);
    setConfirmClear(false);
  }

  function usePrompt(prompt: string) {
    setQuestion(prompt);
    setFeedback(null);
    input.current?.focus();
  }

  function stop() {
    const request = pending.current;
    pending.current = null;
    request?.abort();
    setRequestText("");
    setFeedback({ kind: "stopped", text: "已停止接收。草稿已保留。" });
    input.current?.focus({ preventScroll: true });
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || pending.current || confirmClear) return;
    const text = question.trim();
    if (!text) { input.current?.focus(); return; }
    if (!connection || !canUseAITransport(window.location)) {
      setFeedback({ kind: "error", text: connection ? "请通过 HTTPS 使用 AI。" : "请先配置 AI 服务。" });
      return;
    }

    const request = new AbortController();
    pending.current = request;
    follow.current = true;
    setRequestText(text);
    setFeedback(null);
    try {
      const response = await fetchWithTemporaryAI("/api/ai/tutor", connection, {
        question: text, history: history.map(({ question, answer, codeBlocks }) => ({ question, answer, codeBlocks })), topicId,
        ...(include && context && { runId: context.id, includeExperiment: true }),
        ...(includePractice && topicId && { includePractice: true }),
      }, request.signal);
      const result = await response.json();
      if (pending.current !== request) return;
      if (!response.ok || result.status !== "answer") {
        setFeedback({ kind: "error", text: result.message ?? "请求失败，请重试。" });
        return;
      }
      const turn: TutorTurn = { id: nextTurn.current++, question: text, answer: result.answer, codeBlocks: result.codeBlocks,
        sources: result.sources, recommendation: result.recommendation };
      setHistory((turns) => [...turns, turn].slice(-maxCreatorHistory));
      setQuestion("");
    } catch {
      if (pending.current === request) setFeedback({ kind: "error", text: "连接失败，请重试。" });
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setRequestText("");
      }
    }
  }

  return <form className="tutor-workspace" onSubmit={send} onKeyDown={(event) => {
    if (sideOpen && event.key === "Escape" && !event.defaultPrevented) closePanel();
  }}>
    <header className="tutor-toolbar">
      <h1>AI 助教</h1>
      <div className="tutor-tools">
        {mode === "platform" ? <>
          <label className="sr-only" htmlFor="tutor-model">平台免费 AI 模型</label>
          <select id="tutor-model" lang="en" value={platformModel} disabled={!ready || busy} onChange={(event) => {
            if (isPlatformModel(event.target.value)) selectPlatformAIModel(event.target.value);
            setFeedback(null);
          }}>
            {Object.entries(platformModels).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
        </> : <span className="tutor-model-name">{connection && "selection" in connection ? getAIModel(connection.selection).label : "请先配置 AI 服务。"}</span>}
        <Link className="tutor-tool-link" href={settingsHref} aria-label="AI 服务设置" title="AI 服务设置">
          <CatalogIcon icon="lucide:settings-2" width={17} /><span>设置</span>
        </Link>
        {hasContext && <button className="tutor-panel-toggle" type="button" ref={panelToggle} aria-expanded={sideOpen}
          aria-controls="tutor-context-panel" onClick={() => sideOpen ? closePanel() : setPanelOpen(true)}>
          <CatalogIcon icon="lucide:panel-right" width={18} />{include || includePractice ? "已授权" : "上下文"}
        </button>}
        {(history.length > 0 || question) && <button className="tutor-tool-link tutor-new" type="button" disabled={busy}
          onClick={() => setConfirmClear(true)} aria-label="新对话" title="新对话"><CatalogIcon icon="lucide:plus" width={17} /><span>新对话</span></button>}
      </div>
    </header>

    <div className="tutor-board" data-panel={sideOpen ? "open" : "closed"}>
      <section className="tutor-desk" aria-label="对话工作台">
        <div className="tutor-transcript" ref={transcript} tabIndex={0} aria-label="对话记录" onScroll={(event) => {
          const node = event.currentTarget;
          follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
        }}>
          <div className="tutor-thread" ref={transcriptContent}>
            {missingRun && <p className="tutor-missing" role="status">找不到这轮实验。</p>}
            {confirmClear && <div className="tutor-confirm" role="group" aria-label="确认清空对话">
              <p>清空对话和草稿？</p>
              <button type="button" onClick={() => { clearDialogue(); setQuestion(""); setInclude(false); setIncludePractice(false); input.current?.focus(); }}>确认清空</button>
              <button type="button" onClick={() => setConfirmClear(false)}>继续聊</button>
            </div>}

            {!history.length && !busy && <div className="tutor-intro">
              <h2>从一个问题开始。</h2>
              <p>拆开原理。看懂实验。</p>
              <div className="tutor-prompts" role="group" aria-label="示例问题">
                {examples.map(({ icon, label, question: example }) => <button type="button" key={label} disabled={!ready}
                  onClick={() => usePrompt(label === "看懂实验" && include ? "这轮实验的结果说明了什么？" : example)}>
                  <CatalogIcon icon={icon} width={17} />{label}<CatalogIcon icon="lucide:arrow-up-right" width={14} />
                </button>)}
              </div>
              <details className="tutor-more-prompts">
                <summary>更多示例</summary>
                <div>{moreExamples.map((example) => <button key={example} type="button" disabled={!ready} onClick={() => usePrompt(example)}>{example}</button>)}</div>
              </details>
            </div>}

            <ol className="tutor-turns">{history.map((turn, index) => <li key={turn.id} id={`tutor-turn-${turn.id}`}>
              <p className="tutor-turn-label">你的问题</p><p className="tutor-question">{turn.question}</p>
              <p className="tutor-turn-label tutor-reply-label"><CatalogIcon icon="lucide:triangle" width={16} />助教回复</p>
              <TutorReply answer={turn.answer} codeBlocks={turn.codeBlocks} reveal={index === history.length - 1} />
              {turn.sources.length > 0 && <div className="tutor-sources">
                <strong>知识引用</strong>{turn.sources.map((source) => <ReferenceLink key={source.href} reference={source} />)}
              </div>}
              {turn.recommendation && <ReferenceLink reference={turn.recommendation} />}
            </li>)}</ol>
            {busy && <div className="tutor-pending-turn">
              <p className="tutor-turn-label">你的问题</p><p className="tutor-question">{requestText}</p>
              <p className="tutor-pending" role="status"><span aria-hidden="true" />助教正在回答。</p>
            </div>}
            <p className="sr-only" role="status">{!busy && history.length ? `助教已回复。共 ${history.length} 轮。` : ""}</p>
          </div>
        </div>

        <div className="tutor-composer" id="tutor-composer">
          {feedback && <div className="tutor-feedback" data-kind={feedback.kind}>
            <p role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p>
            <button type="button" onClick={() => input.current?.form?.requestSubmit()}>重试</button>
          </div>}
          <div className="tutor-editor">
            <label className="sr-only" htmlFor="tutor-question">你想弄懂什么？</label>
            <div className="tutor-input-stack" data-value={question}>
              <textarea ref={input} id="tutor-question" rows={1} maxLength={maxQuestionLength} value={question}
                readOnly={!ready || busy} required aria-describedby="tutor-question-count" placeholder="提个问题，或贴一段代码…"
                onChange={(event) => { setQuestion(event.target.value); setFeedback(null); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (!busy) event.currentTarget.form?.requestSubmit();
                  }
                }} />
            </div>
            {busy ? <button key="stop" className="tutor-send" type="button" onClick={(event) => { event.preventDefault(); stop(); }} aria-label="停止接收" title="停止接收">
              <CatalogIcon icon="lucide:square" width={15} /><span>停止</span>
            </button> : <button key="send" className="tutor-send" type="submit" disabled={!ready || confirmClear || !question.trim()}
              aria-label="发送给助教" title="发送给助教"><CatalogIcon icon="lucide:arrow-up" width={17} /><span>发送</span></button>}
          </div>
          <div className="tutor-editor-foot"><span className="tutor-keyboard-hint">Enter 发送 · Shift + Enter 换行</span>
            <span id="tutor-question-count">{question.length} / {maxQuestionLength}</span></div>
        </div>
      </section>

      {hasContext && <aside className="tutor-sidebar" id="tutor-context-panel" aria-labelledby="tutor-context-title" aria-hidden={!sideOpen} inert={!sideOpen}>
        <div className="tutor-sidebar-inner">
          <header><h2 tabIndex={-1} ref={panelTitle} id="tutor-context-title">上下文</h2>
            <button className="tutor-tool-link" type="button" onClick={closePanel} aria-label="收起上下文" title="收起上下文"><CatalogIcon icon="lucide:x" width={16} />收起</button>
          </header>
          {references.length > 0 && <section className="tutor-context-section">
            <h3><CatalogIcon icon="lucide:book-open" width={16} />知识参考</h3>
            {references.map((source) => <ReferenceLink key={source.href} reference={source} />)}
            {topicId && <label className="tutor-consent"><input type="checkbox" checked={includePractice} disabled={busy} onChange={(event) => {
              setIncludePractice(event.target.checked); clearDialogue();
            }} />允许读取本节答题正误</label>}
          </section>}
          {options.length > 0 && <fieldset className="tutor-context-section">
            <legend><CatalogIcon icon="lucide:flask-conical" width={16} />实验结果</legend>
            <label htmlFor="tutor-run">选择一轮实验</label>
            <select id="tutor-run" value={selected} disabled={busy} onChange={(event) => {
              setSelected(event.target.value); setInclude(false); clearDialogue();
            }}>
              <option value="">只问知识</option>
              {options.map(({ id, title, completedAt }) => <option key={id} value={id}>{title} · {completedAt.slice(0, 16).replace("T", " ")} UTC</option>)}
            </select>
            {context && <>
              {context.metrics?.length ? <dl className="tutor-context-metrics">
                {context.metrics.map(({ id, label, value }) => <div key={id}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl> : null}
              <ReferenceLink reference={context}>查看所选实验</ReferenceLink>
              <label className="tutor-consent"><input type="checkbox" checked={include} disabled={busy} onChange={(event) => {
                setInclude(event.target.checked); clearDialogue();
              }} />允许助教读取参数和结果</label>
            </>}
            <p>更换实验或授权会开新对话。</p>
            {returnToDiagnosis && <Link className="tutor-reference-link" href={returnToDiagnosis}>返回本轮诊断</Link>}
          </fieldset>}
          {recentCode && <section className="tutor-context-section">
            <h3><CatalogIcon icon="lucide:code-xml" width={16} />代码</h3>
            <a className="tutor-reference-link" href={`#tutor-turn-${recentCode.id}`} onClick={closePanel}>查看回复中的代码 <CatalogIcon icon="lucide:arrow-up-right" width={14} /></a>
          </section>}
        </div>
      </aside>}
    </div>
  </form>;
}
