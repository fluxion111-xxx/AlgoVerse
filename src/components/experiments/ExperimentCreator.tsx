"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { canUseAITransport } from "@/lib/aiSettings";
import { maxCreatorHistory, maxQuestionLength, type CreatorAnswer, type CreatorRequest, type CreatorResponse, type CreatorTurn } from "@/lib/experimentCreator";
import { experimentTaskLinks, quickStartRoute, workflowRoute, workflowAISettingsRoute } from "@/lib/navigation";
import { fetchWithTemporaryAI, useActiveAI } from "@/lib/temporaryAI";
import { LabIcon } from "./LabIcon";
import { saveExperimentQuestion } from "@/app/experiments/actions";

const examples = [
  { label: "CPU 调度", question: "为什么 CPU 会进行进程调度？" },
  { label: "排序算法", question: "冒泡排序怎么交换数字？" },
  { label: "网络传输", question: "数据包怎么找到下一站？" },
  { label: "聚类分析", question: "散点多了，怎么分成几组？" },
];

const answerLabels = { knowledge: "知识解答", analyze: "本轮分析", clarify: "需要补充", unsupported: "暂不支持" };
const studioExamples = [
  { label: "CPU 调度", question: "模拟 3 个进程做时间片轮转。" },
  { label: "排序算法", question: "比较冒泡排序和快速排序。" },
  { label: "网络传输", question: "为什么网络会丢包？" },
  { label: "数据结构", question: "链表插入和数组插入有什么区别？" },
  { label: "寻路对比", question: "创建一个 Dijkstra 和 A* 的寻路对比实验。" },
];
const answerIcons = { knowledge: "lucide:book-open", analyze: "lucide:chart-line", clarify: "lucide:circle-help", unsupported: "lucide:circle-alert" };

export function ExperimentCreator({ mode = "catalog", sessionId, runId, revision, savedQuestion = "", guided = false }: {
  mode?: "catalog" | "question";
  sessionId?: string;
  runId?: string;
  revision?: number;
  savedQuestion?: string;
  guided?: boolean;
}) {
  const studio = mode !== "catalog";
  const router = useRouter();
  const connection = useActiveAI();
  const input = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<AbortController | null>(null);
  const [question, setQuestion] = useState(savedQuestion);
  const [history, setHistory] = useState<CreatorTurn[]>([]);
  const [answer, setAnswer] = useState<CreatorAnswer | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || generated) return;

    const text = question.trim();
    if (!text) {
      setError("先写下你的问题。");
      input.current?.focus();
      return;
    }
    if (studio && !connection) {
      setError("请先配置 AI 服务。");
      return;
    }
    if (studio && !canUseAITransport(window.location)) {
      setError("请通过 HTTPS 使用 AI。");
      return;
    }

    const controller = new AbortController();
    pending.current = controller;
    setChecking(true);
    setError("");
    setAnswer(null);
    try {
      if (!studio) {
        const form = new FormData();
        form.set("question", text);
        const saved = await saveExperimentQuestion(form);
        if (pending.current !== controller) return;
        if ("error" in saved) { setError(saved.error); return; }
        router.push(workflowRoute("question", saved));
        return;
      }
      const response = await fetchWithTemporaryAI("/api/experiments/creator", connection,
        { question: text, history, sessionId, runId, revision } satisfies CreatorRequest, controller.signal);
      const result: CreatorResponse | null = await response.json().catch(() => null);
      if (pending.current !== controller) return;
      if (response.ok && result?.status === "ready") {
        setGenerated(true);
        setAnswer(null);
        setHistory([]);
        router.push(workflowRoute("config", { sessionId: result.sessionId }));
        router.refresh();
      } else if (response.ok && result?.status === "answer") {
        setAnswer(result);
        setHistory((turns) => [...turns, { question: text, answer: result.answer }].slice(-maxCreatorHistory));
      } else {
        setError(result?.status === "error" ? result.message : "请求失败，请重试。");
      }
    } catch {
      if (pending.current === controller) setError("连接失败，请再试一次。");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setChecking(false);
      }
    }
  }

  function useExample(example: string) {
    setQuestion(example);
    setError("");
    input.current?.focus();
  }

  const activeTask = sessionId ? { sessionId, runId } : null;
  const settingsHref = workflowAISettingsRoute(activeTask || !guided ? experimentTaskLinks(activeTask).question : quickStartRoute);

  const form = (
    <form className={studio ? "creator-page-form" : undefined} onSubmit={submit} aria-busy={checking || generated}>
      <div className={studio ? undefined : "lab-question"}>
        <label className={studio ? undefined : "sr-only"} htmlFor="creator-question">{studio ? "你想研究什么？" : "你想弄懂什么？"}</label>
        <textarea
          id="creator-question"
          ref={input}
          rows={studio ? 3 : 1}
          maxLength={maxQuestionLength}
          placeholder={sessionId ? "想改参数，还是试个新问题？" : studio ? "比如：比较冒泡与快速排序。" : "比如：CPU 怎么轮流调度？"}
          value={question}
          readOnly={checking || generated}
          onChange={(event) => { setQuestion(event.target.value); setError(""); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {studio ? (
          <div className="creator-compose-actions">
            <Link className="creator-settings-link" href={settingsHref}><Icon icon="lucide:key-round" width={16} aria-hidden="true" />AI 服务设置</Link>
            <span className="creator-count">{question.length} / {maxQuestionLength}</span>
            <button className="creator-submit" type="submit" disabled={checking || generated}>
              {generated ? "方案已生成" : checking ? "AI 正在分析…" : error ? "重试分析" : "交给 AI"}<Icon icon="lucide:arrow-up-right" width={19} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button className="lab-creator-submit" type="submit" aria-label="在工作台打开问题" disabled={checking} data-empty={!question.trim()}>
            <LabIcon name="arrow" />
          </button>
        )}
      </div>
      {studio ? (
        <>
          {!sessionId && <div className="creator-inspiration" aria-label="实验灵感">
            <span>实验灵感</span>
            {studioExamples.map(({ label, question: example }) => <button key={label} type="button" aria-pressed={question === example}
              disabled={checking || generated} onClick={() => useExample(example)}>{label}</button>)}
          </div>}
          {checking && <p className="creator-ai-progress" role="status">AI 正在分析问题。</p>}
          {error && <p className="preset-error" role="alert">{error}</p>}
          {answer && <div className="creator-answer" data-intent={answer.intent} role="status">
            <h3><Icon icon={answerIcons[answer.intent]} width={18} aria-hidden="true" />{answerLabels[answer.intent]}</h3>
            <p>{answer.answer}</p>
            {answer.alternatives?.map(({ title, href }) => <Link key={href} className="catalog-direct" href={href}>{title}</Link>)}
            {answer.intent === "unsupported" && !answer.alternatives?.length && <Link className="catalog-direct" href="/experiments">查看可用实验</Link>}
          </div>}
        </>
      ) : (
        <>
          <div className="lab-examples">
            {examples.map(({ label, question: example }) => (
              <button key={label} type="button" disabled={checking} onClick={() => useExample(example)}>{label}</button>
            ))}
          </div>
          <p className="lab-creator-feedback" role="status">
            {error}
          </p>
        </>
      )}
    </form>
  );

  if (studio) {
    return form;
  }

  return (
    <section className="lab-creator" aria-labelledby="creator-title">
      <h2 id="creator-title"><span>AI</span> 实验创造台</h2>
      <p>用一句话，生成你的实验。</p>
      {form}
    </section>
  );
}
