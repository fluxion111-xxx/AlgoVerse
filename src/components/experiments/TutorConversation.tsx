"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { availableAIModels, canUseAITransport } from "@/lib/aiSettings";
import { agentDialogueActive, type AgentTask, type TutorConversationSummary } from "@/lib/experimentAgent";
import { maxQuestionLength } from "@/lib/experimentCreator";
import { agentWorkbenchLink, tutorConversationLink, tutorResumeCookie, tutorRoute, workflowAISettingsRoute } from "@/lib/navigation";
import { isPlatformModel, platformModels } from "@/lib/platformAI";
import { fetchWithTemporaryAI, requestAgentTask, selectPlatformAIModel, selectTemporaryAIModel, useActiveAI, useTemporaryAI } from "@/lib/temporaryAI";
import { NavigationLink } from "../NavigationLink";
import { CatalogIcon } from "./CatalogEffects";
import { LazyTutorReply } from "./LazyTutorReply";

type Reference = { title: string; href: string };
type Metric = { id: string; label: string; value: string };
type RunOption = Reference & { id: string; completedAt: string; metrics?: Metric[] };
type Conversation = Pick<AgentTask, "id" | "goal" | "revision" | "dialogue" | "tutorContext">;
type ActiveRequest = { controller: AbortController; operationId: string };
type Feedback = { kind: "error" | "stopped"; text: string };

type TutorProps = {
  initialTask?: Conversation;
  initialHistory: TutorConversationSummary[];
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
const historyDate = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", timeZone: "Asia/Shanghai" });

function ReferenceLink({ reference, children }: { reference: Reference; children?: string }) {
  return <Link className="tutor-reference-link" href={reference.href} target="_blank" rel="noopener" title="在新标签页查看">
    {children ?? reference.title}<CatalogIcon icon="lucide:arrow-up-right" width={14} />
  </Link>;
}

export function TutorConversation({ initialTask, initialHistory, initial, choices, topicId, reference, returnToDiagnosis, missingRun }: TutorProps) {
  const router = useRouter();
  const connection = useActiveAI();
  const { mode, platformModel } = useTemporaryAI();
  const [task, setTask] = useState(initialTask);
  const [conversations, setConversations] = useState(initialHistory);
  const [question, setQuestion] = useState(initialTask?.dialogue?.error ? initialTask.dialogue.pending ?? "" : "");
  const [selected, setSelected] = useState(initialTask?.tutorContext?.runId ?? initial?.id ?? "");
  const [include, setInclude] = useState(initialTask?.tutorContext?.includeExperiment ?? false);
  const [includePractice, setIncludePractice] = useState(initialTask?.tutorContext?.includePractice ?? false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [ready, setReady] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [revealedRevision, setRevealedRevision] = useState<number>();
  const [stopping, setStopping] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(initialTask?.dialogue?.error ? { kind: "error", text: initialTask.dialogue.error } : null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyToggle = useRef<HTMLButtonElement>(null);
  const historyClose = useRef<HTMLButtonElement>(null);
  const pending = useRef<ActiveRequest | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const panelToggle = useRef<HTMLButtonElement>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const transcriptContent = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const restored = task && agentDialogueActive(task) ? task.dialogue : undefined;
  const activeText = requestText || restored?.pending;
  const busy = !!activeText || stopping;
  const history = task?.dialogue?.turns ?? [];
  const options = initial ? [initial, ...choices.filter(({ id }) => id !== initial.id)] : choices;
  const context = options.find(({ id }) => id === selected);
  const latest = history.at(-1);
  const references = [...(reference ? [reference] : []), ...(latest?.tutor?.sources ?? [])]
    .filter(({ href }, index, all) => all.findIndex((entry) => entry.href === href) === index);
  const recentCode = history.findLastIndex(({ tutor, reply }) => tutor?.codeBlocks?.length || /(?:^|\n) {0,3}(?:`{3,}|~{3,})/.test(reply ?? ""));
  const hasContext = !!(references.length || options.length || recentCode >= 0);
  const sideOpen = hasContext && panelOpen;
  const personalSelection = connection && "selection" in connection ? connection.selection : undefined;
  const personalModels = personalSelection ? availableAIModels(personalSelection.provider,
    personalSelection.provider === "qwen" ? personalSelection.region : undefined) : [];
  const settingsParams = new URLSearchParams();
  if (selected) settingsParams.set("runId", selected);
  if (topicId) settingsParams.set("topic", topicId);
  if (task) settingsParams.set("agentId", task.id);
  if (returnToDiagnosis && selected === initial?.id) settingsParams.set("from", "diagnosis");
  const settingsHref = workflowAISettingsRoute(settingsParams.size ? `${tutorRoute}?${settingsParams}` : tutorRoute);

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
      request?.controller.abort();
    };
  }, []);

  useEffect(() => {
    if (sideOpen) panelTitle.current?.focus({ preventScroll: true });
  }, [sideOpen]);

  useEffect(() => {
    if (historyOpen) historyClose.current?.focus({ preventScroll: true });
  }, [historyOpen]);

  const activeId = task?.id;
  useEffect(() => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${tutorResumeCookie}=${activeId ?? "new"}; Path=${tutorRoute}; Max-Age=2592000; SameSite=Lax${secure}`;
    if (!activeId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("agentId")) return;
    url.searchParams.set("agentId", activeId);
    window.history.replaceState(null, "", url);
  }, [activeId]);

  useEffect(() => {
    const id = task?.id;
    if (!id || !restored || requestText || stopping) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      void requestAgentTask({ action: "status", id }, undefined, controller.signal).then((next) => {
        setTask((current) => current?.id === next.id && current.revision <= next.revision ? next : current);
      }).catch(() => {});
    }, 1500);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [task?.id, restored, requestText, stopping]);

  function closePanel() {
    setPanelOpen(false);
    panelToggle.current?.focus();
  }

  function closeHistory() {
    setHistoryOpen(false);
    historyToggle.current?.focus({ preventScroll: true });
  }

  function rememberConversation(next?: Conversation) {
    setTask(next);
    const url = new URL(window.location.href);
    if (next) {
      url.searchParams.set("agentId", next.id);
      url.searchParams.delete("new");
      const entry = { id: next.id, title: next.goal, updatedAt: new Date().toISOString() };
      setConversations((current) => [entry, ...current.filter(({ id }) => id !== next.id)]);
    } else {
      url.searchParams.delete("agentId");
      url.searchParams.set("new", "1");
    }
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }

  function clearDialogue() {
    rememberConversation();
    setFeedback(null);
    setConfirmClear(false);
  }

  function startNewConversation() {
    setQuestion("");
    setSelected("");
    setInclude(false);
    setIncludePractice(false);
    if (topicId || initial) {
      router.push(`${tutorRoute}?new=1`);
      return;
    }
    clearDialogue();
    input.current?.focus();
  }

  function usePrompt(prompt: string) {
    setQuestion(prompt);
    setFeedback(null);
    input.current?.focus();
  }

  async function stop() {
    const request = pending.current;
    const operationId = request?.operationId ?? restored?.operationId;
    if (stopping || !operationId) return;
    pending.current = null;
    request?.controller.abort();
    setRequestText("");
    setStopping(true);
    try {
      if (task) {
        const stopRequest = () => requestAgentTask({ action: "stop", id: task.id, operationId });
        setTask(await stopRequest().catch(stopRequest));
      }
      setFeedback({ kind: "stopped", text: "已停止。可以重试。" });
    } catch {
      setFeedback({ kind: "error", text: "停止失败。请刷新。" });
    } finally {
      setStopping(false);
    }
    input.current?.focus({ preventScroll: true });
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy || pending.current || confirmClear) return;
    const text = question.trim();
    if (!text) { input.current?.focus(); return; }
    if (!connection || !canUseAITransport(window.location)) {
      setFeedback({ kind: "error", text: connection ? "请通过 HTTPS 使用 AI。" : "请先配置 AI 服务。" });
      return;
    }

    const request = { controller: new AbortController(), operationId: crypto.randomUUID() };
    pending.current = request;
    follow.current = true;
    setRequestText(text);
    setFeedback(null);
    try {
      const response = await fetchWithTemporaryAI("/api/ai/tutor", connection, {
        conversation: true, question: text, topicId, operationId: request.operationId,
        ...(task && { agentId: task.id, revision: task.revision }),
        runId: context?.id, includeExperiment: include && !!context, includePractice: includePractice && !!topicId,
      }, request.controller.signal);
      const result = await response.json();
      if (pending.current !== request) return;
      if (result.task) rememberConversation(result.task);
      if (!response.ok || result.status !== "shared") {
        setFeedback({ kind: "error", text: result.message ?? "请求失败，请重试。" });
        return;
      }
      setQuestion("");
      setRevealedRevision(result.task?.revision);
      if (result.workbench && result.task) router.push(agentWorkbenchLink({ agentId: result.task.id }));
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
    if (event.key === "Escape" && !event.defaultPrevented) {
      if (historyOpen) closeHistory();
      else if (sideOpen) closePanel();
    }
  }}>
    <aside id="tutor-history" className="tutor-history" aria-labelledby="tutor-history-title" data-open={historyOpen}>
      <div className="tutor-history-head">
        <h2 id="tutor-history-title">对话历史</h2>
        <button className="tutor-tool-link tutor-history-close" type="button" ref={historyClose} onClick={closeHistory} aria-label="收起历史">
          <CatalogIcon icon="lucide:x" width={19} />
        </button>
      </div>
      <button className="tutor-history-new" type="button" disabled={busy} onClick={() => {
        setHistoryOpen(false);
        if (question.trim()) setConfirmClear(true);
        else startNewConversation();
      }}><CatalogIcon icon="lucide:plus" width={17} />新对话</button>
      <nav className="tutor-history-list" aria-label="历史会话">
        {conversations.length ? <ul>{conversations.map(({ id, title, updatedAt }) => <li key={id}>
          <NavigationLink href={tutorConversationLink(id)} prefetch={false} title={title} aria-current={activeId === id ? "page" : undefined}
            onNavigate={() => setHistoryOpen(false)}>
            <CatalogIcon icon="lucide:message-square" width={15} />
            <span>{title}</span><time dateTime={updatedAt}>{historyDate.format(new Date(updatedAt))}</time>
          </NavigationLink>
        </li>)}</ul> : <p>聊过的问题会留在这里。</p>}
      </nav>
    </aside>
    {historyOpen && <button className="tutor-history-backdrop" type="button" tabIndex={-1} aria-label="关闭对话历史" onClick={closeHistory} />}
    <header className="tutor-toolbar">
      <div className="tutor-heading">
        <button className="tutor-tool-link tutor-history-toggle" type="button" ref={historyToggle}
          aria-controls="tutor-history" aria-expanded={historyOpen} onClick={() => { setPanelOpen(false); setHistoryOpen(true); }}>
          <CatalogIcon icon="lucide:panel-left" width={19} /><span className="sr-only">对话历史</span>
        </button>
        <h1>阿洛</h1>
      </div>
      <div className="tutor-tools">
        <Link className="tutor-tool-link" href={settingsHref} aria-label="AI 服务设置" title="AI 服务设置">
          <CatalogIcon icon="lucide:settings-2" width={17} /><span>设置</span>
        </Link>
        {hasContext && <button className="tutor-panel-toggle" type="button" ref={panelToggle} aria-expanded={sideOpen}
          aria-controls="tutor-context-panel" onClick={() => sideOpen ? closePanel() : setPanelOpen(true)}>
          <CatalogIcon icon="lucide:panel-right" width={18} />{include || includePractice ? "已授权" : "上下文"}
        </button>}
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

            <ol className="tutor-turns">{history.map((turn, index) => <li key={index} id={`tutor-turn-${index}`}>
              <div className="tutor-user-message"><span className="sr-only">你说</span><p className="tutor-question">{turn.message}</p></div>
              {(turn.reply !== undefined || turn.stopped) && <div className="tutor-assistant-message">
                <p className="tutor-turn-label">阿洛</p>
                {turn.reply !== undefined && <LazyTutorReply answer={turn.reply} codeBlocks={turn.tutor?.codeBlocks}
                  reveal={task?.revision === revealedRevision && index === history.length - 1} />}
                {!!(turn.tutor?.sources.length || turn.tutor?.recommendation || (turn.action === "run" && task)) &&
                  <div className="tutor-reply-actions">
                    {!!turn.tutor?.sources.length && <div className="tutor-sources">
                      <strong>知识引用</strong>{turn.tutor.sources.map((source) => <ReferenceLink key={source.href} reference={source} />)}
                    </div>}
                    {turn.tutor?.recommendation && <ReferenceLink reference={turn.tutor.recommendation} />}
                    {turn.action === "run" && task && <NavigationLink className="tutor-reference-link" href={agentWorkbenchLink({ agentId: task.id })}>
                      打开实验工作台 <CatalogIcon icon="lucide:arrow-up-right" width={14} />
                    </NavigationLink>}
                  </div>}
                {turn.stopped && <p className="tutor-pending">已停止。</p>}
              </div>}
            </li>)}</ol>
            {activeText && <div className="tutor-pending-turn">
              <div className="tutor-user-message"><span className="sr-only">你说</span><p className="tutor-question">{activeText}</p></div>
              <div className="tutor-assistant-message">
                <p className="tutor-turn-label">阿洛</p>
                <p className="tutor-pending" role="status"><span aria-hidden="true" />正在回答…</p>
              </div>
            </div>}
            <p className="sr-only" role="status">{!busy && history.length ? `阿洛已回复。共 ${history.length} 轮。` : ""}</p>
          </div>
        </div>

        <div className="tutor-composer" id="tutor-composer">
          {confirmClear && <div className="tutor-confirm" role="group" aria-label="开启新对话">
            <p>放下这条草稿？</p>
            <button type="button" onClick={startNewConversation}>开启新对话</button>
            <button type="button" onClick={() => { setConfirmClear(false); input.current?.focus(); }}>继续编辑</button>
          </div>}
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
            <div className="tutor-editor-actions">
              <span id="tutor-question-count">{question.length} / {maxQuestionLength}</span>
              {mode === "platform" || personalSelection ? <div className="tutor-model-picker">
                <label className="sr-only" htmlFor="tutor-model">切换模型</label>
                <select id="tutor-model" lang="en" value={personalSelection?.model ?? platformModel} disabled={!ready || busy} onChange={(event) => {
                  const model = event.target.value;
                  if (mode === "platform" && isPlatformModel(model)) selectPlatformAIModel(model);
                  else if (mode === "byok") selectTemporaryAIModel(model);
                  setFeedback(null);
                }}>
                  {mode === "platform" ? Object.entries(platformModels).map(([id, title]) => <option key={id} value={id}>{title}</option>)
                    : personalModels.map(({ apiId, label }) => <option key={apiId} value={apiId}>{label}</option>)}
                </select>
                <CatalogIcon icon="lucide:chevron-down" width={15} />
              </div> : <NavigationLink className="tutor-model-link" href={settingsHref}>配置模型 <CatalogIcon icon="lucide:chevron-down" width={15} /></NavigationLink>}
              {busy ? <button key="stop" className="tutor-send" type="button" disabled={stopping} onClick={() => void stop()} aria-label="停止接收" title="停止接收">
                <CatalogIcon icon="lucide:square" width={15} /><span>停止</span>
              </button> : <button key="send" className="tutor-send" type="submit" disabled={!ready || confirmClear || !question.trim()}
                aria-label="发送给阿洛" title="发送给阿洛"><CatalogIcon icon="lucide:arrow-up" width={17} /><span>发送</span></button>}
            </div>
          </div>
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
              }} />允许阿洛读取参数和结果</label>
            </>}
            <p>更换实验或授权会开新对话。</p>
            {returnToDiagnosis && <Link className="tutor-reference-link" href={returnToDiagnosis}>返回本轮诊断</Link>}
          </fieldset>}
          {recentCode >= 0 && <section className="tutor-context-section">
            <h3><CatalogIcon icon="lucide:code-xml" width={16} />代码</h3>
            <a className="tutor-reference-link" href={`#tutor-turn-${recentCode}`} onClick={closePanel}>查看回复中的代码 <CatalogIcon icon="lucide:arrow-up-right" width={14} /></a>
          </section>}
        </div>
      </aside>}
    </div>
  </form>;
}
