import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PathfindingWorkbench } from "@/components/PathfindingWorkbench";
import { LabWorkspace } from "@/components/experiments/LabWorkspace";
import { ExperimentBench } from "@/components/experiments/ExperimentBench";
import { pathfindingEngine } from "@/lib/experimentEngines";
import { getExperimentTopic, knowledgeTopicRoute } from "@/lib/knowledge";
import { quickStartRoute, workflowRoute } from "@/lib/navigation";
import { getExperimentContext, type ExperimentSearch } from "@/lib/server/experimentContext";
import { runKnowledgeExperiment, runLabExperiment, saveQuickComparison } from "../../actions";

export const metadata: Metadata = {
  title: "路径搜索实验｜AlgoVerse 智算万象",
  description: "编辑地图，比较 Dijkstra 和 A* 的寻路过程。",
};

export default async function PathfindingPage({ searchParams }: {
  searchParams: Promise<ExperimentSearch & { mode?: string; topic?: string | string[] }>;
}) {
  const { mode, topic, ...params } = await searchParams;
  if (mode === "quick" && topic === undefined && params.sessionId === undefined && params.runId === undefined) redirect(quickStartRoute);
  const context = await getExperimentContext(params);
  if (context.task && context.engine?.id !== pathfindingEngine.id) notFound();
  if (mode === "quick" && topic === undefined && context.task) redirect(workflowRoute(context.run ? "run" : "config", context.task));
  const entry = getExperimentTopic(context.run?.topicId ?? topic, pathfindingEngine.id);
  if (topic !== undefined && (!entry || (context.run && context.run.topicId !== topic))) notFound();
  if (context.task && !context.run && !context.confirmedAt && context.workflow?.isAI) redirect(workflowRoute("config", context.task));
  const algorithmBack = { href: "/experiments/algorithms", label: "返回算法目录" };

  if (context.session || entry) return <LabWorkspace className="catalog-page creator-studio theme-algorithms"
    back={entry ? { href: knowledgeTopicRoute(entry, context.run?.id), label: "返回知识点" } : algorithmBack}>
    <div className="creator-spread">
      <header className="workflow-title" id={entry ? "knowledge-lab" : undefined}>
        <h1>路径搜索实验</h1><p>在同一张图上比寻路。</p>
        {entry && <p>{entry.topic.title} · {context.run ? "本轮结果已保存" : "来自知识探索"}</p>}
        {context.run && context.workflow?.isAI && <Link className="catalog-direct" href={workflowRoute("run", context.task)}>返回本轮对比</Link>}
      </header>
      <ExperimentBench engine={context.engine ?? pathfindingEngine} context={context}
        action={entry ? runKnowledgeExperiment.bind(null, entry.topic.id) : runLabExperiment} />
    </div>
  </LabWorkspace>;

  return <LabWorkspace className="experiment-page" back={algorithmBack}>
    <div className="experiment-content">
      <header className="experiment-intro">
        <p className="experiment-kicker">实验中心</p>
        <h1>路径搜索实验</h1>
        <p>画一张地图，看两种算法怎么走。</p>
      </header>
      <PathfindingWorkbench save={saveQuickComparison} />
    </div>
  </LabWorkspace>;
}
