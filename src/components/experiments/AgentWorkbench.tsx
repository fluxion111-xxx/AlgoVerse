"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { agentCooldown, agentDialogueActive, isAgentConfirmation, type AgentRun, type AgentTask } from "@/lib/experimentAgent";
import { AIResponseError, readAIResponse } from "@/lib/aiHttp";
import { formatAIRetryTime, type AICooldown } from "@/lib/aiRateLimit";
import { maxQuestionLength } from "@/lib/experimentCreator";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { agentWorkbenchLink, workbenchFocus, workflowAISettingsRoute, workflowSteps, type ExperimentTask, type WorkbenchFocus, type WorkflowStep } from "@/lib/navigation";
import type { Diagnosis } from "@/lib/quickStart";
import { containsTemporaryAIKey, fetchWithTemporaryAI, requestAgentTask as agentRequest, useAIModelChoices } from "@/lib/temporaryAI";
import { AIModelSelect } from "./AIModelSelect";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { WorkbenchActivity, agentPhases } from "./WorkbenchActivity";
import { useWorkbenchView, WorkbenchHistory, workbenchHistoryRequest } from "./WorkbenchHistory";
import { AnalysisStage, PlanStage, ResearchStage, RoundPicker, RunStage, StageEmpty, proposalHypothesis, type Plan, type RunDetails } from "./WorkbenchStages";
import { adaptEvidenceRun, resolveEvidence } from "@/lib/experiments/runEvidence";
import { evidencePositionToken, parseEvidencePosition, type RunEvidenceReference } from "@/lib/experiments/evidencePosition";

const steps = Object.keys(workflowSteps) as WorkflowStep[];
const stageDetails = {
  idea: { icon: "lightbulb", description: "写下问题，带上你的猜想。" },
  plan: { icon: "clipboard-list", description: "核对条件，再确认运行。" },
  run: { icon: "play", description: "看回放，读实测指标。" },
  analysis: { icon: "scan-search", description: "对照证据，想想下一轮。" },
} as const;

type SendAction = "message" | "retry-message" | "decide" | "approve" | "import" | "status";
type ActiveRequest = { controller: AbortController; operationId: string; taskId?: string };

const statusReadError = "读取状态失败。请刷新状态。";

export function AgentWorkbench({ initial, initialQuestion = "", initialFocus, initialGuess, reference, referenceRun, savedPlan, fresh, selectedRunId, initialEvidence, diagnoses = {}, restoreError }: {
  initial: AgentTask | null;
  initialQuestion?: string;
  initialFocus?: WorkbenchFocus;
  initialGuess?: string;
  restoreError?: string;
  reference?: ExperimentTask;
  referenceRun?: AgentRun;
  savedPlan?: Plan;
  fresh?: boolean;
  selectedRunId?: string;
  initialEvidence?: string;
  diagnoses?: Record<string, Diagnosis>;
}) {
  const router = useRouter();
  const startFocus = initialFocus ?? (initial?.pending.length || savedPlan ? "plan" : initial?.runs.length || referenceRun ? "run" : "idea");
  const [task, setTask] = useState(initial);
  const [focus, setFocus] = useState<WorkbenchFocus>(startFocus);
  const [message, setMessage] = useState(initialQuestion);
  const [guess, setGuess] = useState(initialGuess);
  const [selectedRun, setSelectedRun] = useState(selectedRunId);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [evidenceError, setEvidenceError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState("");
  const historyToggle = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<"deciding" | "running" | "status" | null>(null);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState("");
  const [runDetails, setRunDetails] = useState<Record<string, RunDetails>>({});
  const [reports, setReports] = useState(diagnoses);
  const [diagnosing, setDiagnosing] = useState<string>();
  const [diagnosisError, setDiagnosisError] = useState<{ id: string; message: string }>();
  const [requestCooldown, setRequestCooldown] = useState<AICooldown>();
  const [clock, setClock] = useState<number>();
  const models = useAIModelChoices("workbench");
  const connection = models.active;
  const active = useRef<ActiveRequest | null>(null);
  const uncertainOperation = useRef<{ operationId: string; input: string; message?: string } | null>(null);
  const diagnosisRequest = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drawerToggle = useRef<HTMLButtonElement>(null);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const navigation = useRef(0);
  const view = useRef({ focus: startFocus, selectedRun: selectedRunId });

  const runs = task?.runs ?? (referenceRun ? [referenceRun] : []);
  const firstRun = task?.dialogue?.focus?.firstRun ?? 0;
  const latest = runs.length > firstRun ? runs.at(-1) : undefined;
  const explicitRun = runs.find(({ id }) => id === selectedRun);
  const run = explicitRun ?? latest;
  const number = run ? runs.indexOf(run) + 1 : 0;
  const draftQuestion = reference && !referenceRun && !savedPlan ? message : initialQuestion;
  const originalQuestion = task?.goal ?? draftQuestion;
  const question = originalQuestion.split("\n我的猜想：")[0];
  const target = task?.dialogue?.focus?.goal ?? task?.experimentGoal ?? task?.dialogue?.focus?.topic ?? "";
  const hasResearch = !!(question || target);
  const activePlan = !!task?.pending.length || (!task && !!savedPlan);
  const savedGuess = proposalHypothesis(task, task?.pending[0] ?? latest);
  const hypothesis = guess ?? savedGuess ?? "";
  const dialogueBusy = !!task && agentDialogueActive(task);
  const expired = !!task?.leaseUntil && task.leaseUntil <= Date.now();
  const workBusy = !!task && (task.phase === "running" || task.phase === "deciding") && !expired;
  const activeUntil = dialogueBusy ? task?.dialogue?.activeUntil : workBusy ? task?.leaseUntil : undefined;
  const blocked = !!busy || dialogueBusy || workBusy;
  const provider = connection && ("selection" in connection ? connection.selection.provider : "siliconflow");
  const savedCooldown = agentCooldown(task, provider, 0);
  const cooldown = requestCooldown && requestCooldown.provider === provider && requestCooldown.until > (savedCooldown?.until ?? 0)
    ? requestCooldown : savedCooldown;
  const retryUntil = cooldown?.until ?? 0;
  const retrySeconds = clock === undefined ? undefined : Math.max(0, Math.ceil((retryUntil - clock) / 1000));
  const modelCooling = !!cooldown && (retrySeconds === undefined || retrySeconds > 0);
  const modelBlocked = blocked || modelCooling || !!diagnosing || !connection;
  const maySend = !blocked && (!modelBlocked || !!task && isAgentConfirmation(task, message));
  const waitHint = modelCooling ? (retrySeconds === undefined ? "等待恢复" : formatAIRetryTime(retrySeconds)) : "";
  const runningNow = busy === "running" || (workBusy && task?.phase === "running");
  const restoredOperation = dialogueBusy ? task?.dialogue?.operationId : workBusy && task?.phase === "deciding" ? task.operationId : undefined;
  const canStop = busy === "deciding" || (!busy && !!restoredOperation);
  const retryRun = task?.phase === "tool-error" || (task?.phase === "running" && expired);
  const canApprove = !!task?.pending.length && !task.dialogue?.pending && !blocked && (task.phase === "confirm" || retryRun);
  const canContinue = !!task && !task.dialogue?.pending && (task.phase === "ai-error" || (task.phase === "observe" && task.autoContinue === true)
    || (task.phase === "deciding" && expired));
  const savedError = error || task?.dialogue?.error || task?.error || "";
  const visibleError = waitHint ? `${cooldown?.message} ${waitHint}`
    : cooldown && savedError === cooldown.message ? "现在可以重试。" : savedError;
  const hasReply = !!task?.dialogue?.turns.at(-1)?.action;
  const activityStatus = busy === "status" ? "正在更新" : busy === "running" ? "工具运行中"
    : busy === "deciding" || dialogueBusy ? "Agent 正在回复"
    : task && task.phase !== "draft" ? retryRun && expired ? "运行中断" : agentPhases[task.phase] : "";
  const completed = {
    idea: activePlan || !!latest || !!target || !!(initialQuestion && reference),
    plan: !activePlan && !!latest,
    run: !!latest,
    analysis: !!latest && (!!reports[latest.id] || !!task?.decisions.at(-1)?.evidence.length && task.phase === "finished"
      || !!task?.dialogue?.turns.some((turn) => turn.action === "explain" && turn.evidence.some(({ from, to }) => from === runs.length || to === runs.length))),
  };
  const researchId = task?.id ?? reference?.sessionId;
  const position = focus === "run" ? parseEvidencePosition(evidence) : undefined;
  const evidenceData = position && explicitRun ? runDetails[explicitRun.id] : null;
  const currentEvidence = researchId && position && explicitRun && evidenceData
    ? resolveEvidence(adaptEvidenceRun(researchId, explicitRun, evidenceData),
      { researchId, sessionId: explicitRun.sessionId, runId: explicitRun.id, position }) : null;
  const storage = useWorkbenchView(evidenceData === undefined ? undefined : researchId, { focus, runId: explicitRun?.id,
    evidence: currentEvidence?.token, hypothesis: guess,
    draftQuestion: task || referenceRun || savedPlan ? undefined : message });

  async function leave(href: string) {
    await storage.flush();
    router.push(href);
  }

  async function newResearch() {
    if (blocked || creating) return;
    setCreating(true);
    setCreationError("");
    try {
      await storage.flush();
      const question = researchId ? "" : message;
      const hypothesis = researchId ? undefined : guess;
      if (containsTemporaryAIKey(question) || containsTemporaryAIKey(hypothesis ?? "")) throw new Error("请先移除草稿里的 Key。");
      const { id } = await workbenchHistoryRequest<{ id: string }>("POST", { question });
      await workbenchHistoryRequest("PUT", { id, focus: "idea", hypothesis });
      router.push(agentWorkbenchLink({ sessionId: id, focus: "idea" }));
    } catch (failure) {
      setCreationError(failure instanceof Error ? failure.message : "新建失败。请重试。");
    } finally {
      setCreating(false);
    }
  }

  function closeHistory() {
    setHistoryOpen(false);
    requestAnimationFrame(() => historyToggle.current?.focus());
  }

  function workbenchHref(nextFocus: WorkbenchFocus, id?: string, picked?: AgentRun, position?: string) {
    return agentWorkbenchLink({
      agentId: id, focus: nextFocus, fresh: !id && fresh,
      ...(!id && reference),
      ...(picked && { sessionId: picked.sessionId, runId: picked.id }),
      evidence: position,
    });
  }
  const settingsHref = workflowAISettingsRoute(workbenchHref(focus, task?.id, explicitRun, evidence));

  function show(nextFocus: WorkbenchFocus, pickedId = view.current.selectedRun, current = task, manual = true, position?: string) {
    if (manual) navigation.current++;
    if (nextFocus !== view.current.focus || pickedId !== view.current.selectedRun) canvas.current?.scrollTo({ top: 0, behavior: "instant" });
    view.current = { focus: nextFocus, selectedRun: pickedId };
    setFocus(nextFocus);
    setSelectedRun(pickedId);
    setEvidence(position);
    setEvidenceError("");
    const picked = (current?.runs ?? runs).find(({ id }) => id === pickedId);
    // Keep the router's current state. This view already owns the navigation change.
    window.history.replaceState(window.history.state, "", workbenchHref(nextFocus, current?.id, picked, position));
  }

  function prefill(text: string) {
    setMessage(text);
    input.current?.focus();
  }

  function promptForQuestion() {
    show("idea");
    input.current?.focus();
  }

  async function send(action: SendAction, text = message, startingGoal?: string) {
    text = text.trim();
    if (active.current || blocked || (action === "message" && !text)) return false;
    if (action === "message" && text.length > maxQuestionLength) {
      setError("请把指令缩到 300 字。");
      return false;
    }
    const confirmation = action === "message" && !!task && isAgentConfirmation(task, text);
    const waiting = task?.dialogue;
    if (action === "message" && !confirmation && waiting?.pending === text
      && (waiting.pendingRound === undefined || waiting.pendingRound === (explicitRun ? number : null))) {
      action = "retry-message";
    }
    const needsModel = (action === "message" && !confirmation) || action === "retry-message" || action === "decide";
    if (needsModel && !connection) { setError(models.current.reason); return false; }
    if (needsModel && (diagnosisRequest.current || retryUntil > Date.now())) return false;
    const running = action === "approve" || (confirmation && task?.phase === "confirm");
    if (running && !canApprove) return false;
    const sentText = action === "retry-message" ? waiting?.pending : action === "message" ? text : undefined;
    const retryInput = JSON.stringify([action, sentText, explicitRun?.id]);
    const uncertain = uncertainOperation.current;
    const request = { controller: new AbortController(),
      operationId: needsModel && uncertain?.input === retryInput ? uncertain.operationId : crypto.randomUUID(), taskId: task?.id };
    if (needsModel) uncertainOperation.current = { input: retryInput, operationId: request.operationId, message: sentText };
    const { signal } = request.controller;
    const startNavigation = navigation.current;
    active.current = request;
    setError("");
    setRecovery("");
    setBusy(running ? "running" : needsModel ? "deciding" : "status");
    try {
      let current = task;
      if (!current && (action === "message" || action === "import")) {
        current = await agentRequest({
          action: "start", operationId: request.operationId, goal: startingGoal ?? (draftQuestion || (action === "import" ? savedPlan?.config.goalLabel : text)),
          ...reference, ...(action === "import" && { importPlan: true }),
        }, connection, signal);
        if (signal.aborted) return false;
        request.taskId = current.id;
        setTask(current);
        show(action === "import" && navigation.current === startNavigation ? "plan" : view.current.focus, view.current.selectedRun, current, false);
      }
      if (!current || action === "import") return !!current;
      const next = await agentRequest({
        action, operationId: request.operationId, id: current.id, revision: current.revision,
        ...(needsModel && explicitRun && { selectedRunId: explicitRun.id }),
        ...(action === "message" && { message: text }),
      }, needsModel ? connection : undefined, signal);
      if (signal.aborted) return false;
      setTask(next);
      if (needsModel && !agentDialogueActive(next) && next.phase !== "deciding") uncertainOperation.current = null;
      const newTurn = (action === "message" || action === "retry-message") && !confirmation
        && next.dialogue && !next.dialogue.pending && next.dialogue.turns.length > (current.dialogue?.turns.length ?? 0)
        ? next.dialogue.turns.at(-1) : undefined;
      if (action === "message" && !next.dialogue?.pending) setMessage((draft) => draft.trim() === text ? "" : draft);
      if (action === "retry-message" && newTurn) setMessage((draft) => draft.trim() === current.dialogue?.pending ? "" : draft);
      const navigated = navigation.current !== startNavigation;
      if (running && next.runs.length > current.runs.length) {
        show(navigated ? view.current.focus : "run", navigated ? view.current.selectedRun : "", next, false);
      } else if (!navigated && newTurn?.action === "explain" && newTurn.evidence.length) {
        const cited = newTurn.evidence.at(-1);
        show("analysis", next.runs[(cited?.to ?? 1) - 1]?.id, next, false);
      } else if (!navigated && (newTurn?.action === "run" || (action === "decide" && next.phase === "confirm"))) {
        show("plan", view.current.selectedRun, next, false);
      } else if (!navigated && action === "decide" && next.phase === "finished") {
        show("analysis", view.current.selectedRun, next, false);
      }
      if (running && next.phase === "observe" && next.autoContinue === true && connection
        && !diagnosisRequest.current && retryUntil <= Date.now()) {
        setBusy("deciding");
        const analyzed = await agentRequest({ action: "decide", id: next.id, revision: next.revision, operationId: request.operationId }, connection, signal);
        if (!signal.aborted) setTask(analyzed);
      }
      return !signal.aborted && !next.dialogue?.error;
    } catch (failure) {
      if (!signal.aborted) {
        if (provider && failure instanceof AIResponseError && failure.retryAfter) {
          setRequestCooldown({ provider, until: Date.now() + failure.retryAfter * 1000, message: failure.message });
        }
        setError(failure instanceof Error ? failure.message : "请求失败。请重试。");
        if (request.taskId && action !== "status" && failure instanceof AIResponseError && !failure.retryAfter
          && (failure.status === 0 || failure.status === 409 || failure.status >= 500)) {
          const snapshot = await agentRequest({ action: "status", id: request.taskId }, undefined, signal).catch(() => null);
          if (snapshot?.id === request.taskId && !signal.aborted) {
            setTask((current) => current?.id === snapshot.id && current.revision <= snapshot.revision ? snapshot : current);
            const stayed = navigation.current === startNavigation;
            if (running && snapshot.runs.length > runs.length) {
              if (stayed) show("run", "", snapshot, false);
              setError("");
              setRecovery("运行记录已同步。");
            } else if (!confirmation && (action === "message" || action === "retry-message")) {
              const sent = action === "retry-message" ? waiting?.pending : text;
              const restored = snapshot.dialogue?.turns.at(-1);
              if (snapshot.dialogue && !snapshot.dialogue.pending && snapshot.dialogue.turns.length > (waiting?.turns.length ?? 0)
                && restored?.action && restored.operationId === request.operationId && restored.message === sent) {
                uncertainOperation.current = null;
                setMessage((draft) => draft.trim() === sent ? "" : draft);
                if (stayed && restored.action === "run") show("plan", view.current.selectedRun, snapshot, false);
                setError("");
                setRecovery("Agent 回复已同步。");
                return true;
              }
              if (snapshot.dialogue?.operationId === request.operationId && snapshot.dialogue.error) uncertainOperation.current = null;
            } else if (action === "decide" && snapshot.operationId === request.operationId && snapshot.phase !== "deciding") {
              uncertainOperation.current = null;
              setError("");
            }
          }
        }
      }
      return false;
    } finally {
      if (active.current === request) {
        active.current = null;
        setBusy(null);
      }
    }
  }

  async function stop() {
    const request = active.current;
    const operationId = request?.operationId ?? restoredOperation;
    if (!canStop || !operationId) return;
    uncertainOperation.current = null;
    active.current = null;
    request?.controller.abort();
    setBusy("status");
    try {
      const id = request?.taskId ?? task?.id;
      if (id) {
        const stopRequest = () => agentRequest({ action: "stop", id, operationId });
        setTask(await stopRequest().catch(stopRequest));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "停止失败。请刷新。");
    } finally {
      setBusy(null);
      input.current?.focus();
    }
  }

  const taskId = task?.id;
  useEffect(() => {
    if (!retryUntil) return;
    setClock(Date.now());
    if (retryUntil <= Date.now()) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now >= retryUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  useEffect(() => {
    if (busy || !activeUntil || !taskId) return;
    const deadline = activeUntil;
    const controller = new AbortController();
    const { signal } = controller;
    const expire = window.setTimeout(() => setClock(Date.now()), Math.max(0, deadline - Date.now()) + 20);
    async function poll() {
      let nextDelay = 1500;
      try {
        const next = await agentRequest({ action: "status", id: taskId }, undefined, signal);
        if (!signal.aborted) {
          setTask((current) => current?.id === next.id && current.revision <= next.revision ? next : current);
          setError((current) => current === statusReadError ? "" : current);
          const uncertain = uncertainOperation.current;
          if (uncertain && !agentDialogueActive(next) && next.phase !== "deciding") {
            const savedReply = next.dialogue?.turns.some(({ action, operationId }) => !!action && operationId === uncertain.operationId);
            if (savedReply || next.dialogue?.operationId === uncertain.operationId || next.operationId === uncertain.operationId) {
              uncertainOperation.current = null;
              if (savedReply) {
                setMessage((draft) => draft.trim() === uncertain.message ? "" : draft);
                setError("");
                setRecovery("Agent 回复已同步。");
              }
            }
          }
        }
      } catch {
        if (!signal.aborted) setError((current) => current || statusReadError);
        nextDelay = 3000;
      }
      if (!signal.aborted && Date.now() < deadline) timer = window.setTimeout(() => void poll(), nextDelay);
    }
    let timer = window.setTimeout(() => void poll(), 1500);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(expire);
    };
  }, [busy, activeUntil, taskId]);

  const visibleRunId = focus === "run" || focus === "analysis" ? run?.id : undefined;
  const details = visibleRunId ? runDetails[visibleRunId] : undefined;
  const detailIds = focus === "analysis" && run ? runs.map(({ id }) => id).join(",") : visibleRunId ?? "";
  useEffect(() => {
    const missing = detailIds ? detailIds.split(",").filter((id) => runDetails[id] === undefined) : [];
    if (!missing.length) return;
    const controller = new AbortController();
    const query = taskId ? `?${new URLSearchParams({ agentId: taskId })}` : "";
    void Promise.all(missing.map(async (id) => {
      const path = `/api/experiments/runs/${encodeURIComponent(id)}/replay${query}`;
      const payload: RunDetails = await fetch(path, { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : null).catch(() => null);
      return [id, payload] as const;
    })).then((pairs) => {
      if (!controller.signal.aborted) setRunDetails((current) => ({ ...current, ...Object.fromEntries(pairs) }));
    });
    return () => controller.abort();
  }, [detailIds, runDetails, taskId]);

  function showEvidence(reference: RunEvidenceReference) {
    const target = runs.find(({ id, sessionId }) => id === reference.runId && sessionId === reference.sessionId);
    const adapted = researchId && target ? adaptEvidenceRun(researchId, target, runDetails[target.id]) : null;
    if (!target || !resolveEvidence(adapted, reference)) {
      setEvidenceError("找不到这条证据。");
      return;
    }
    show("run", target.id, task, true, evidencePositionToken(reference.position));
  }

  useEffect(() => () => {
    active.current?.controller.abort();
    diagnosisRequest.current?.abort();
  }, []);

  useEffect(() => {
    if (!drawer) return;
    drawerClose.current?.focus();
    const desktop = window.matchMedia("(min-width: 901px)");
    const dismiss = () => { if (desktop.matches) setDrawer(false); };
    desktop.addEventListener("change", dismiss);
    return () => desktop.removeEventListener("change", dismiss);
  }, [drawer]);

  async function diagnose(runId: string) {
    if (diagnosisRequest.current || active.current || !connection || blocked || retryUntil > Date.now()) return;
    const controller = new AbortController();
    diagnosisRequest.current = controller;
    setDiagnosing(runId);
    setDiagnosisError(undefined);
    try {
      const response = await fetchWithTemporaryAI(`/api/experiments/runs/${runId}/diagnosis`, connection, {}, controller.signal);
      const { diagnosis } = await readAIResponse<{ diagnosis?: Diagnosis }>(response);
      if (diagnosis?.runId !== runId || !Array.isArray(diagnosis.evidence)) throw new Error("未收到本轮诊断。请重试。");
      if (!controller.signal.aborted) setReports((current) => ({ ...current, [runId]: diagnosis }));
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (provider && failure instanceof AIResponseError && failure.retryAfter) {
          setRequestCooldown({ provider, until: Date.now() + failure.retryAfter * 1000, message: failure.message });
        }
        setDiagnosisError({ id: runId, message: failure instanceof Error ? failure.message : "诊断失败。请重试。" });
      }
    } finally {
      if (diagnosisRequest.current === controller) {
        diagnosisRequest.current = null;
        setDiagnosing(undefined);
      }
    }
  }

  function closeDrawer() {
    setDrawer(false);
    requestAnimationFrame(() => drawerToggle.current?.focus());
  }

  function planResearch() {
    const draft = message.trim();
    const goal = draft || question;
    if (!goal) { input.current?.focus(); return; }
    const prefix = draft || !task ? "请设计实验。\n" : "请根据当前问题设计实验。";
    const request = draft || !task ? prefix + goal : prefix;
    const inherited = !draft || draft === question ? savedGuess : undefined;
    const note = (guess ?? inherited ?? "").trim().replace(/\s+/gu, " ");
    const text = (request.length + (note ? note.length + 6 : 0) <= maxQuestionLength ? request : goal)
      + (note ? `\n我的猜想：${note}` : "");
    void send("message", text, goal).then((ok) => {
      if (!ok) return;
      setMessage((current) => current.trim() === draft ? "" : current);
      setGuess(undefined);
    });
  }

  function selectRound(id: string) { show(focus, id); }
  function openRun(id: string) {
    if (drawer) closeDrawer();
    show("run", id);
  }
  function retryDetails() {
    if (run) setRunDetails((current) => ({ ...current, [run.id]: undefined }));
  }

  const stage = steps.find((step) => workbenchFocus[step] === focus)!;
  const experiment = task?.pending[0] ?? savedPlan ?? latest;
  const experimentName = experiment && !task?.pending.some(({ tool }) => tool !== experiment.tool)
    ? getExperimentEngine(experiment.tool, experiment.version)?.creator.title : undefined;
  const displayTitle = focus === "idea" ? experimentName ?? "实验会话" : target || question || "未命名研究";
  return <main className="algoverse-workbench" onKeyDown={(event) => {
    if (drawer && event.key === "Escape") { event.preventDefault(); closeDrawer(); }
  }}>
    <header className="wb-top" inert={drawer}>
      <div className="wb-brand-row">
        <Link className="wb-brand" href="/" aria-label="AlgoVerse 智算万象，首页" onNavigate={(event) => { event.preventDefault(); void leave("/"); }}><WorkbenchIcon icon="triangle" width={21} /><b>AlgoVerse</b></Link>
        <span className="wb-brand-divider" aria-hidden="true" />
        <span className="wb-product">动态实验工作台</span>
      </div>
      <nav className="wb-top-tools" aria-label="工作台操作">
        <div className="wb-model-picker">
          <AIModelSelect id="wb-ai-model" models={models} disabled={blocked || !!diagnosing} />
          <WorkbenchIcon icon="chevron-down" width={15} />
        </div>
        <button type="button" className="wb-button wb-top-link" title="实验历史" aria-label="实验历史" aria-haspopup="dialog"
          aria-expanded={historyOpen} ref={historyToggle} onClick={() => setHistoryOpen(true)}>
          <WorkbenchIcon icon="history" width={16} /><span>实验历史</span>
        </button>
        <Link className="wb-button wb-top-link" href="/experiments" title="实验中心" aria-label="实验中心"
          onNavigate={(event) => { event.preventDefault(); void leave("/experiments"); }}><WorkbenchIcon icon="layout-grid" width={16} /><span>实验中心</span></Link>
        <Link className="wb-button wb-top-link" href={settingsHref} title="AI 设置" aria-label="AI 设置"
          onNavigate={(event) => { event.preventDefault(); void leave(settingsHref); }}><WorkbenchIcon icon="settings-2" width={16} /><span>AI 设置</span></Link>
      </nav>
    </header>
    <div className="wb-frame">
      <div className="wb-session" inert={drawer}>
        <div className="wb-session-name" data-research-heading={focus === "idea" || undefined}>
          <span className="wb-session-icon"><WorkbenchIcon icon="folder-open" width={19} /></span>
          <div>
            {(focus !== "idea" || experimentName) && <p>实验会话</p>}
            <h1 title={displayTitle}>{displayTitle}</h1>
          </div>
        </div>
        <div className="wb-session-actions">
          <span className="wb-chip" data-tone={storage.saved && !restoreError ? "good" : undefined}><i aria-hidden="true" />
            {storage.error || creationError ? "保存失败" : restoreError ? "恢复异常" : storage.saved ? "已保存" : researchId || creating ? "保存中" : "未开始"}</span>
          {runs.length > 0 && <button type="button" className="wb-button wb-history" onClick={() => show("run", selectedRun || latest?.id || runs.at(-1)?.id)}>
            <WorkbenchIcon icon="history" width={16} />{runs.length} 轮记录
          </button>}
          <button type="button" className="wb-button wb-new" aria-label="新建会话" title="新建会话"
            disabled={blocked || creating} onClick={() => void newResearch()}><WorkbenchIcon icon="plus" width={16} /><span>新建</span></button>
        </div>
      </div>
      <nav className="wb-steps" data-focus={focus} aria-label="实验阶段" inert={drawer}>
        {steps.map((step, index) => {
          const value = workbenchFocus[step];
          return <button key={step} type="button" aria-current={focus === value ? "step" : undefined} data-complete={completed[value]}
            aria-controls="wb-canvas" onClick={() => show(value)}>
            <span className="wb-step-index">{String(index + 1).padStart(2, "0")}</span><span>{workflowSteps[step]}</span>
            {completed[value] && <span className="wb-step-done"><WorkbenchIcon icon="check" width={14} /><span className="sr-only">已完成</span></span>}
          </button>;
        })}
      </nav>
      <div className="wb-main" data-collapsed={collapsed}>
        <section className="wb-canvas" id="wb-canvas" aria-labelledby="wb-stage-title" inert={drawer}>
          <header className="wb-canvas-head">
            <div className="wb-stage-name">
              <span className="wb-stage-icon"><WorkbenchIcon icon={stageDetails[focus].icon} width={21} /></span>
              <div><h2 id="wb-stage-title">{workflowSteps[stage]}</h2><p>{stageDetails[focus].description}</p></div>
            </div>
            <div className="wb-stage-actions">
              {(focus === "analysis" || (focus === "run" && !run)) && <RoundPicker runs={runs} run={run} select={selectRound} />}
              <button type="button" className="wb-button wb-open-drawer" ref={drawerToggle} aria-expanded={drawer} aria-controls="wb-activity" onClick={() => setDrawer(true)}>
                <WorkbenchIcon icon="panel-right-open" width={17} /><span>{hasReply ? "回复" : "活动"}</span>
                {(hasReply || activityStatus || visibleError) && <i aria-hidden="true" />}
              </button>
            </div>
          </header>
          <div className="wb-canvas-body" ref={canvas}>
            {focus === "idea" && <ResearchStage question={originalQuestion} target={target} hypothesis={hypothesis} onHypothesis={setGuess}
              prefill={prefill} submit={planResearch} blocked={blocked} canSubmit={!modelBlocked && !!(message.trim() || question)} hasPlan={activePlan || !!latest}
              showPlan={() => show("plan")} />}
            {focus === "plan" && <PlanStage task={task} savedPlan={!task ? savedPlan : undefined} lastRun={latest} hasResearch={hasResearch} blocked={blocked} modelBlocked={modelBlocked} canApprove={canApprove}
              retry={retryRun} approve={() => void send("approve")} edit={() => prefill("把实验参数改为：")} importPlan={() => void send("import")}
              showRun={() => show("run", latest?.id)} ask={hasResearch ? planResearch : promptForQuestion} />}
            {focus === "run" && (run ? <RunStage run={run} runs={runs} details={details} number={number} selectRound={selectRound}
              researchId={researchId} evidence={evidence}
              retry={retryDetails} showAnalysis={() => show("analysis")} />
              : <StageEmpty icon="chart-no-axes-column" title={runningNow ? "正在运行实验" : "这里还没有实测"}
                description={runningNow ? "结果就绪后会显示在这里。" : activePlan ? "先确认方案，再运行。" : "先设计方案，再确认运行。"}>
                <button type="button" className="wb-button" onClick={() => show("plan")}>查看实验方案 <WorkbenchIcon icon="arrow-right" width={16} /></button>
              </StageEmpty>)}
            {focus === "analysis" && (run ? <AnalysisStage run={run} runs={runs} task={task} details={details} diagnosis={reports[run.id]}
              researchId={researchId} runDetails={runDetails} showEvidence={showEvidence} evidenceError={evidenceError}
              diagnosing={diagnosing === run.id} diagnosisError={diagnosisError?.id === run.id ? diagnosisError.message : ""}
              blocked={blocked} modelBlocked={modelBlocked} canDiagnose={!!connection} canAdopt={run.id === latest?.id && !activePlan}
              retry={retryDetails} diagnose={() => void diagnose(run.id)} stopDiagnosis={() => diagnosisRequest.current?.abort()}
              discuss={prefill} adopt={(text) => void send("message", text)} />
              : <StageEmpty icon="scan-search" title="暂无可验证证据" description="跑完一轮，再来看证据。">
                <button type="button" className="wb-button" onClick={() => show("run")}>查看运行区 <WorkbenchIcon icon="arrow-right" width={16} /></button>
              </StageEmpty>)}
          </div>
        </section>
        {drawer && <div className="wb-backdrop" aria-hidden="true" onClick={closeDrawer} />}
        <aside className="wb-activity" id="wb-activity" data-drawer={drawer} aria-labelledby="wb-activity-title"
          role={drawer ? "dialog" : undefined} aria-modal={drawer || undefined}>
          <header className="wb-activity-head">
            <div className="wb-activity-title"><WorkbenchIcon icon="activity" width={19} /><h2 id="wb-activity-title">Agent 活动</h2></div>
            <button type="button" className="wb-button wb-activity-close" ref={drawerClose} aria-label="关闭活动" onClick={closeDrawer}><WorkbenchIcon icon="x" width={18} /></button>
            <button type="button" className="wb-button wb-collapse" aria-expanded={!collapsed} aria-controls="wb-activity-content"
              aria-label={collapsed ? "展开 Agent 活动" : "收起 Agent 活动"} title={collapsed ? "展开 Agent 活动" : "收起 Agent 活动"}
              onClick={() => setCollapsed(!collapsed)}><WorkbenchIcon icon={collapsed ? "panel-right-open" : "panel-right-close"} width={19} /></button>
          </header>
          <div className="wb-activity-content" id="wb-activity-content">
            <WorkbenchActivity task={task} status={diagnosing ? "AI 正在诊断" : activityStatus} error={visibleError} blocked={blocked} modelBlocked={modelBlocked}
              inFlight={busy === "deciding" || busy === "running" || dialogueBusy || workBusy || !!diagnosing}
              retryReply={() => void send("retry-message")} retryAnalysis={canContinue ? () => void send("decide") : undefined}
              recover={task && error ? () => void send("status") : undefined} openRun={openRun} />
          </div>
        </aside>
      </div>
      <footer className="wb-dock" inert={drawer}>
        <div className="wb-dock-head">
          <label htmlFor="agent-message"><WorkbenchIcon icon="sparkles" width={17} /> AI 实验指令</label>
          {visibleError ? <span className="wb-dock-error" role={waitHint ? undefined : "alert"}>{visibleError}</span>
            : recovery ? <span className="wb-dock-context" role="status">{recovery}</span>
            : models.current.reason ? <span className="wb-dock-context" role="status">{models.current.reason}</span>
            : explicitRun && <span className="wb-dock-context">引用第 {number} 轮</span>}
        </div>
        {(storage.error || creationError || restoreError) && <div className="wb-save-feedback wb-dock-error" role="alert">
          {storage.error || creationError || restoreError}
          {storage.error && <button type="button" className="wb-button" onClick={storage.retry}>重试保存</button>}
        </div>}
        <form className="wb-composer" onSubmit={(event) => { event.preventDefault(); void send("message"); }}>
          <textarea id="agent-message" ref={input} value={message} onChange={(event) => setMessage(event.target.value)}
            rows={1} maxLength={maxQuestionLength} placeholder="提问、改参数，或分析本轮。"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (maySend) event.currentTarget.form?.requestSubmit();
              }
            }} />
          {canStop ? <button className="wb-button" type="button" onClick={() => void stop()}><WorkbenchIcon icon="square" width={15} /> 停止</button>
            : <button className="wb-button wb-primary" type="submit" disabled={!maySend || !message.trim()}><WorkbenchIcon icon="arrow-up" width={17} /> 发送</button>}
        </form>
        <p className="wb-keyboard"><kbd>Enter</kbd> 发送 <span /> <kbd>Shift + Enter</kbd> 换行</p>
      </footer>
    </div>
    {historyOpen && <WorkbenchHistory currentId={researchId} blocked={blocked || creating} close={closeHistory}
      open={(href) => { closeHistory(); void leave(href); }} />}
  </main>;
}
