import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LabWorkspace } from "@/components/experiments/LabWorkspace";
import { ExperimentBench } from "@/components/experiments/ExperimentBench";
import { ExperimentCreator } from "@/components/experiments/ExperimentCreator";
import { ExperimentSteps } from "@/components/experiments/ExperimentSteps";
import { QuickStartDiagnosis } from "@/components/experiments/QuickStartDiagnosis";
import { experimentReviewTopics, knowledgeTopicRoute } from "@/lib/knowledge";
import { getExperimentEngine, registeredEngines, type EngineId } from "@/lib/experimentEngines";
import { experimentDomains } from "@/lib/experiments/engine";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { experimentTaskLinks, quickStartRoute, withExperimentTask, workflowAISettingsRoute, workflowRoute, workflowSteps, type WorkflowStep } from "@/lib/navigation";
import { getExperimentContext, type ExperimentSearch } from "@/lib/server/experimentContext";
import { getActiveAIWorkflow, getDiagnosis, getQuickStart } from "@/lib/server/experimentRecords";
import { runCreatorExperiment } from "../actions";
import "./creator-flow.css";

type WorkflowSearch = ExperimentSearch & { step?: string; engine?: string; mode?: string; guide?: string; diagnose?: string; updated?: string };
type Context = Awaited<ReturnType<typeof getExperimentContext>>;

export const metadata: Metadata = { title: "AI 实验创造台｜AlgoVerse" };

const guidedQuestion = "请创建冒泡排序和快速排序的对比实验。用 7, 2, 9, 1, 5，观察比较次数与交换次数。";
const outputLabels: Record<EngineId, string> = {
  pathfinding: "访问节点、路径长度、耗时",
  sorting: "比较次数、交换次数、排序结果",
  "cpu-scheduling": "等待、周转、响应、进程切换",
  "network-transmission": "路由、送达、丢包、延迟",
  "memory-visualization": "阶乘结果、最大栈深、调用次数",
  "b-plus-tree": "树高、分裂次数、访问节点、命中键",
  "knn-classification": "分类结果、邻居距离、投票",
  "page-replacement": "缺页次数、页命中次数",
  "hash-collisions": "检查次数、冲突、满表失败",
  "k-means": "迭代轮次、簇大小、簇内平方距离和",
  "gradient-descent": "执行步数、损失变化、最终位置",
  "tree-traversal": "访问顺序、节点数",
  "graph-traversal": "BFS 和 DFS 顺序、不可达顶点",
  "deadlock-avoidance": "原状态、请求决策、安全序列",
  "tcp-congestion": "拥塞窗口、慢启动阈值、重传",
  "dynamic-routing": "变更前后路径、路由成本",
  "memory-allocation": "分配失败次数、空块、碎片",
  "transaction-concurrency": "提交值、写冲突、读取记录",
};

function QuestionInput({ context: { task, workflow }, guided = false }: { context: Context; guided?: boolean }) {
  return <ExperimentCreator key={`${task?.sessionId ?? "new"}:${workflow?.revision ?? 0}:${guided}`}
    mode="question" sessionId={task?.sessionId} runId={task?.runId} revision={workflow?.revision}
    savedQuestion={workflow?.question ?? (guided ? guidedQuestion : "")} guided={guided} />;
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

  return <section className="creator-plan-stage" aria-labelledby="creator-headline">
    <header className="creator-stage-header">
      <div><p className="creator-flow-kicker">AI 实验创造台</p><h1 id="creator-headline">设计方案</h1></div>
      <Link className="catalog-direct" href={links.question}>修改问题</Link>
    </header>
    <dl className="creator-plan-summary">
      <div><dt>本次问题</dt><dd>{plan.question}</dd></div>
      <div><dt>{context.workflow?.isAI ? "匹配执行器" : "执行器"} · 已校验</dt><dd>{engine.creator.title}</dd></div>
      <div><dt>运行后可看</dt><dd>{outputLabels[engine.id]}</dd></div>
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

  const active = params.runId === undefined && (params.step !== undefined || params.mode === "resume" || params.diagnose === "1") ? await getActiveAIWorkflow() : null;
  const context = await getExperimentContext(active && (!explicitTask || active.sessionId === params.sessionId) ? active : params);
  const { workflow, task, run, engine } = context;
  const currentRun = !!run && (run.session.revision ?? 0) === workflow?.revision;
  const latestTask = workflow ? { sessionId: workflow.id, runId: currentRun ? run?.id : undefined } : null;
  const links = experimentTaskLinks(latestTask);
  const step = params.mode === "resume" ? (latestTask?.runId ? "run" : workflow ? "config" : "question")
    : params.diagnose === "1" ? "diagnosis"
    : params.mode === "question" ? "question"
    : params.step ?? (run ? "run" : workflow ? "config" : "question");
  if (typeof step !== "string" || !Object.hasOwn(workflowSteps, step)) notFound();
  if (params.mode === "resume") redirect(workflowRoute(step as WorkflowStep, latestTask));

  const reviewing = step === "run" || step === "diagnosis";
  const selectedDiagnosis = reviewing && run ? await getDiagnosis(run.id) : null;
  const diagnosisPanel = reviewing && run && engine ? (
    <section className="creator-diagnosis-split" id="creator-diagnosis" aria-label="结果诊断">
      <section className="workflow-note workflow-metrics" aria-labelledby="diagnosis-metrics-title">
        <h2 id="diagnosis-metrics-title">本轮实测指标</h2>
        <p>{engine.creator.title}</p>
        <dl className="preset-details">{Object.entries(experimentEvidence(run.results)).map(([metric, value]) => <div key={metric}>
          <dt>{evidenceLabels[metric]}</dt><dd>{value}</dd>
        </div>)}</dl>
      </section>
      <section className="workflow-note workflow-diagnosis-report" aria-label="AI 诊断报告">
        <QuickStartDiagnosis diagnosis={selectedDiagnosis} runId={run.id} auto={false} results={run.results} studio
          settingsHref={workflowAISettingsRoute(workflowRoute("diagnosis", task))} />
        <div className="preset-actions" aria-label="相关知识点">
          {experimentReviewTopics(engine.id, run.topicId).map((entry) =>
            <Link key={entry.topic.id} className="catalog-direct" href={knowledgeTopicRoute(entry, entry.topic.id === run.topicId ? run.id : undefined)}>
              复习 · {entry.topic.title}
            </Link>)}
        </div>
        <Link className="catalog-direct" href={`/ai-tutor?${new URLSearchParams({ runId: run.id, from: "diagnosis" })}`}>问 AI 助教</Link>
      </section>
    </section>
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
