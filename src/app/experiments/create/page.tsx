import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LabWorkspace } from "@/components/experiments/LabWorkspace";
import { AgentWorkbench } from "@/components/experiments/AgentWorkbench";
import { ExperimentBench } from "@/components/experiments/ExperimentBench";
import { ExperimentCreator } from "@/components/experiments/ExperimentCreator";
import { ExperimentRunReports } from "@/components/experiments/ExperimentRunReports";
import { ExperimentSteps } from "@/components/experiments/ExperimentSteps";
import { creatorObservations } from "@/lib/creatorCapabilities";
import { learningTopicRoute } from "@/lib/curriculum";
import { experimentReviewTopics, knowledgeTopicRoute } from "@/lib/knowledge";
import { getExperimentEngine, registeredEngines } from "@/lib/experimentEngines";
import { experimentDomains } from "@/lib/experiments/engine";
import { experimentTaskLinks, quickStartRoute, runAnalysisLink, withExperimentTask, workflowAISettingsRoute, workflowRoute, workflowSteps, type WorkflowStep } from "@/lib/navigation";
import { expandSavedDiagnosis } from "@/lib/server/experimentAI";
import { getExperimentContext, type ExperimentSearch } from "@/lib/server/experimentContext";
import { getActiveAIWorkflow, getActiveAgentTask, getActiveExperimentTask, getAgentTask, getDiagnosis, getExperimentRun, getQuickStart, getRecentExperimentRuns } from "@/lib/server/experimentRecords";
import type { Diagnosis } from "@/lib/quickStart";
import { runCreatorExperiment } from "../actions";
import "./creator-flow.css";
import "./agent-workbench.css";

type WorkflowSearch = ExperimentSearch & { step?: string; engine?: string; mode?: string; guide?: string; diagnose?: string; updated?: string; agentId?: string; intent?: string; new?: string };
type Context = Awaited<ReturnType<typeof getExperimentContext>>;

export const metadata: Metadata = { title: "AI 实验创造台｜AlgoVerse" };

const guidedQuestion = "请创建冒泡排序和快速排序的对比实验。用 7, 2, 9, 1, 5，观察比较次数与交换次数。";
const planIntents = { create: "创建实验", modify: "修改实验", compare: "对比实验" };

function QuestionInput({ context: { task, workflow, run }, guided = false }: { context: Context; guided?: boolean }) {
  return <ExperimentCreator key={`${task?.sessionId ?? "new"}:${task?.runId ?? "draft"}:${workflow?.revision ?? 0}:${guided}`}
    mode="question" sessionId={task?.sessionId} runId={task?.runId} revision={workflow?.revision}
    savedQuestion={run?.session.question ?? workflow?.question ?? (guided ? guidedQuestion : "")} guided={guided} />;
}

function QuestionStage({ context, guided, missingPlan = false }: { context: Context; guided?: boolean; missingPlan?: boolean }) {
  return <section className="creator-question-stage" aria-labelledby="creator-headline">
    <header>
      <p className="creator-flow-kicker">{guided ? "一分钟上手" : "AI 实验创造台"}</p>
      <h1 id="creator-headline">{missingPlan ? "先生成方案" : "提出问题"}</h1>
      <p>{guided ? "改改示例，或直接交给 AI。" : "写下你想验证的现象。"}</p>
    </header>
    <div className="creator-compose">
      <QuestionInput context={context} guided={guided} />
      <details className="creator-capabilities">
        <summary>查看 {registeredEngines.length} 个真实实验</summary>
        <dl>{Object.entries(experimentDomains).map(([domain, label]) => <div key={domain}>
          <dt>{label}</dt>
          <dd>{registeredEngines.filter((engine) => engine.domain === domain).map((engine) =>
            <Link key={engine.id} href={engine.route}>{engine.creator.title}</Link>)}</dd>
        </div>)}</dl>
      </details>
    </div>
  </section>;
}

function PlanStage({ context }: { context: Context }) {
  const plan = context.workflow?.plan;
  const engine = plan && getExperimentEngine(plan.engineId, plan.engineVersion);
  if (!plan || !engine) return <QuestionStage context={context} missingPlan />;
  const links = experimentTaskLinks({ sessionId: plan.id });
  const intent = plan.source?.type === "creator" ? plan.source.intent : undefined;

  return <section className="creator-plan-stage" aria-labelledby="creator-headline">
    <header className="creator-stage-header">
      <div><p className="creator-flow-kicker">AI 实验创造台</p><h1 id="creator-headline">设计方案</h1></div>
      <div className="creator-result-actions">
        <Link className="catalog-direct" href={links.question}>修改问题</Link>
        <a className="catalog-direct" href="#creator-parameters-title">修改配置</a>
      </div>
    </header>
    <dl className="creator-plan-summary">
      <div><dt>本次问题</dt><dd>{plan.question}</dd></div>
      <div><dt>实验领域</dt><dd>{experimentDomains[engine.domain]}</dd></div>
      <div><dt>{intent ? `${planIntents[intent]} · 已校验` : "实验类型 · 已校验"}</dt><dd>{engine.creator.title}</dd></div>
      <div><dt>实验目标</dt><dd>{plan.config.goalLabel}</dd></div>
      <div><dt>预计观察指标</dt><dd>{creatorObservations[engine.id].metrics}</dd></div>
    </dl>
    <ExperimentBench engine={engine} context={{ ...context, session: plan, run: null }} action={runCreatorExperiment} presentation="plan" />
  </section>;
}

export default async function CreatorPage({ searchParams }: { searchParams: Promise<WorkflowSearch> }) {
  const params = await searchParams;
  const explicitTask = params.sessionId !== undefined || params.runId !== undefined;

  if (params.mode === "quick-start") {
    const old = params.sessionId === undefined ? null : await getQuickStart(params.sessionId);
    if (params.sessionId !== undefined && !old) notFound();
    if (old?.run) redirect(workflowRoute("run", { sessionId: old.run.session.id, runId: old.run.id }));
    if (old?.session) redirect(workflowRoute("config", { sessionId: old.session.id }));
    redirect(quickStartRoute);
  }
  if (params.engine !== undefined && !explicitTask) {
    const engine = getExperimentEngine(params.engine);
    if (!engine) notFound();
    redirect(engine.route);
  }

  const legacyIntent = params.guide !== "1" && (params.step === "question" || (!explicitTask && params.step && Object.hasOwn(workflowSteps, params.step)))
    ? params.step : undefined;
  const useAgent = params.agentId !== undefined || params.mode === "agent" || params.intent !== undefined || legacyIntent !== undefined ||
    (params.step === undefined && params.guide !== "1" && params.diagnose !== "1");
  if (useAgent) {
    if (params.intent !== undefined && (typeof params.intent !== "string" || !Object.hasOwn(workflowSteps, params.intent))) notFound();
    const intent = (params.intent ?? legacyIntent ?? (params.mode === "question" ? "question" : undefined)) as WorkflowStep | undefined;
    const context = await getExperimentContext(explicitTask ? params : {});
    const source = context.run?.session.source;
    const sourceId = source?.type === "agent" ? source.taskId : undefined;
    const id = params.agentId ?? sourceId;
    const task = id !== undefined ? await getAgentTask(id) : explicitTask || params.new === "1" ? null : await getActiveAgentTask();
    if (id !== undefined && (!task || (context.run && !task.runs.some(({ id }) => id === context.run?.id)) ||
      (params.sessionId && !context.run && ![...task.runs, ...task.pending].some(({ sessionId }) => sessionId === params.sessionId)))) notFound();
    const legacyTask = !task && !explicitTask && params.new !== "1" ? await getActiveAIWorkflow() : null;
    const reference = context.task ? context : legacyTask ? await getExperimentContext(legacyTask) : null;
    const currentRun = context.run?.id ?? task?.runs.at(-1)?.id ?? reference?.run?.id;
    if (intent === "diagnosis") {
      const runId = currentRun ?? (!explicitTask && !params.agentId && params.new !== "1"
        ? (await getActiveExperimentTask())?.runId ?? (await getRecentExperimentRuns())[0]?.id : undefined);
      if (runId) redirect(runAnalysisLink(runId, true));
    }
    if (intent === "run" && currentRun && !task?.pending.length && task?.phase !== "running") redirect(runAnalysisLink(currentRun));
    const pairs = await Promise.all((task?.runs ?? []).map(async ({ id }) => {
      const diagnosis = await getDiagnosis(id);
      const saved = diagnosis && diagnosis.promptVersion < 5 ? await getExperimentRun(id) : null;
      return [id, diagnosis && saved ? expandSavedDiagnosis(saved, diagnosis) : diagnosis] as const;
    }));
    const diagnoses = Object.fromEntries(pairs.filter((pair): pair is readonly [string, Diagnosis] => pair[1] !== null));
    return <LabWorkspace className="catalog-page creator-studio creator-workflow theme-algorithms agent-page">
      <div className="creator-spread"><AgentWorkbench key={`${task?.id ?? reference?.task?.sessionId ?? "new"}:${intent ?? "default"}`}
        initial={task} intent={intent} diagnoses={diagnoses} initialMessage={!task ? reference?.workflow?.question : undefined}
        fresh={params.new === "1"} reference={reference?.task ?? undefined} selectedRunId={context.run?.id}
        savedPlan={!task && !reference?.run ? reference?.session?.config : undefined} />
    </div></LabWorkspace>;
  }

  const active = params.runId === undefined && (params.step !== undefined || params.mode === "resume" || params.diagnose === "1") ? await getActiveAIWorkflow() : null;
  const context = await getExperimentContext(active && (!explicitTask || active.sessionId === params.sessionId) ? active : params);
  const { workflow, task, run, engine } = context;
  const currentRun = !!run && (run.session.revision ?? 0) === workflow?.revision;
  const latestTask = workflow ? { sessionId: workflow.id, runId: currentRun ? run?.id : undefined } : null;
  const links = experimentTaskLinks(latestTask);
  const step = params.diagnose === "1" ? "diagnosis"
    : params.mode === "question" ? "question"
    : params.step ?? (run ? "run" : workflow ? "config" : "question");
  if (typeof step !== "string" || !Object.hasOwn(workflowSteps, step)) notFound();

  const reviewing = step === "run" || step === "diagnosis";
  if (reviewing && run?.session.source?.type === "agent") redirect(runAnalysisLink(run.id, step === "diagnosis"));
  const diagnosisPanel = reviewing && run && engine ? (
    <ExperimentRunReports run={run} settingsHref={workflowAISettingsRoute(workflowRoute("diagnosis", task))}>
        <div className="preset-actions" aria-label="相关知识点">
          {experimentReviewTopics(engine.id, run.topicId).map((entry) =>
            <Link key={entry.topic.id} className="catalog-direct" href={"report" in run.results ? learningTopicRoute(entry) :
              knowledgeTopicRoute(entry, entry.topic.id === run.topicId ? run.id : undefined)}>
              复习 · {entry.topic.title}
            </Link>)}
        </div>
        <Link className="catalog-direct" href={`/ai-tutor?${new URLSearchParams({ runId: run.id, from: "diagnosis" })}`}>问 AI 助教</Link>
    </ExperimentRunReports>
  ) : null;
  return <LabWorkspace className={`catalog-page creator-studio creator-workflow theme-${engine?.domain ?? "algorithms"}`}>
    <div className="creator-spread">
      <ExperimentSteps current={step as WorkflowStep} task={reviewing ? task : latestTask} hasPlan={!!workflow?.plan || !!run} />
      {params.updated === "1" && <p className="creator-flow-notice" role="status">方案已更新。请重新核对。</p>}
      {step === "question" && <QuestionStage context={context} guided={params.guide === "1"} />}
      {step === "config" && <PlanStage context={context} />}
      {reviewing && <section className="creator-result-stage" aria-labelledby="creator-headline">
        <header className="creator-stage-header">
          <div><p className="creator-flow-kicker">AI 实验创造台</p><h1 id="creator-headline">运行与分析</h1></div>
          {run && <div className="creator-result-actions">
            <a className="catalog-direct" href={step === "diagnosis" ? "#creator-workbench" : "#creator-diagnosis"}>{step === "diagnosis" ? "查看回放" : "查看诊断"}</a>
            <Link className="catalog-direct" href={workflow?.plan ? links.config : links.question}>调整后再跑</Link>
          </div>}
        </header>
        {run && engine ? <>
          <div className="creator-run-strip">
            <strong>本轮已保存</strong>
            {!currentRun && <span>正在查看历史轮次。</span>}
            <Link className="catalog-direct" href="/learning-path#study-records">查看实验记录</Link>
            <Link className="catalog-direct" href={withExperimentTask(engine.route, task)}>打开专业实验</Link>
          </div>
          <div className="creator-result-body">
            {step === "diagnosis" && diagnosisPanel}
            <ExperimentBench engine={engine} context={context} action={runCreatorExperiment} presentation="result" />
            {step !== "diagnosis" && diagnosisPanel}
          </div>
        </> : <section className="workflow-note">
          <h2>{workflow?.plan ? "等待确认运行" : "还没有可运行的方案"}</h2>
          <p>{workflow?.plan ? "先核对参数，再确认运行。" : "让 AI 从你的问题开始。"}</p>
          <Link className="catalog-jump" href={workflow ? links.config : links.question}>{workflow ? "回到设计方案" : "去提问"}</Link>
        </section>}
      </section>}
    </div>
  </LabWorkspace>;
}
