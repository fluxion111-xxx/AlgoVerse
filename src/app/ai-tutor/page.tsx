import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { TutorConversation } from "@/components/experiments/TutorConversation";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { getExperimentTopic, getKnowledgeTopic, knowledgeTopicRoute } from "@/lib/knowledge";
import { getActiveExperimentTask, getExperimentRun, getLearningProgress } from "@/lib/server/experimentRecords";
import { withExperimentTask, workflowRoute } from "@/lib/navigation";
import "../home-editorial.css";
import "../story-editorial.css";
import "./tutor-editorial.css";

export const metadata: Metadata = { title: "AI 助教｜AlgoVerse" };

export default async function TutorPage({ searchParams }: { searchParams: Promise<{ runId?: string; from?: string; topic?: string }> }) {
  const { runId, from, topic } = await searchParams;
  const entry = getKnowledgeTopic(topic);
  const [active, progress] = await Promise.all([
    runId !== undefined || entry ? Promise.resolve(runId) : getActiveExperimentTask().then((task) => task?.runId),
    getLearningProgress(),
  ]);
  const run = await getExperimentRun(active);
  const engine = run && getExperimentEngine(run.session.engineId, run.session.engineVersion);
  const task = run ? { sessionId: run.session.id, runId: run.id } : null;
  const aiRun = run?.session.source?.type === "creator" || run?.session.source?.type === "quick-start";
  const runTopic = run && getExperimentTopic(run.topicId, run.session.engineId);
  const choices = progress.recent.flatMap(({ id, engineId, completedAt }) => {
    const option = getExperimentEngine(engineId);
    return option ? [{ id, title: option.creator.title, completedAt, href: `/experiments/runs/${id}` }] : [];
  });
  const initial = engine && run && task ? {
    id: run.id, title: engine.creator.title, completedAt: run.completedAt,
    href: from === "diagnosis" ? workflowRoute("diagnosis", task) : aiRun ? workflowRoute("run", task) : withExperimentTask(engine.route, task),
    metrics: Object.entries(experimentEvidence(run.results)).map(([id, value]) => ({ id, label: evidenceLabels[id] ?? id, value })),
  } : null;
  const focus = entry ?? runTopic;
  const reference = focus ? {
    title: focus.topic.title, href: knowledgeTopicRoute(focus, runTopic === focus ? run?.id : undefined),
  } : undefined;
  const returnToDiagnosis = from === "diagnosis" ? initial?.href : undefined;

  return <div className="editorial-home editorial-tutor">
    <a className="editorial-skip" href="#main-content">跳到正文</a>
    <Header action={{ href: "#tutor-question", label: "问个问题" }} />
    <main id="main-content">
      <TutorConversation key={`${run?.id ?? "general"}:${focus?.topic.id ?? ""}`}
        initial={initial} choices={choices} topicId={entry?.topic.id}
        reference={reference} returnToDiagnosis={returnToDiagnosis} missingRun={runId !== undefined && !run} />
    </main>
  </div>;
}
