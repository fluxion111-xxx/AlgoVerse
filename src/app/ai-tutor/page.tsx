import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Header } from "@/components/Header";
import { TutorConversation } from "@/components/experiments/TutorConversation";
import { getExperimentEngine } from "@/lib/experimentEngines";
import { evidenceLabels, experimentEvidence } from "@/lib/experiments/evidence";
import { getExperimentTopic, getKnowledgeTopic, knowledgeTopicRoute } from "@/lib/knowledge";
import { getActiveExperimentTask, getAgentTask, getExperimentRun, getRecentExperimentRuns, getTutorHistory } from "@/lib/server/experimentRecords";
import { tutorResumeCookie, withExperimentTask, workflowRoute } from "@/lib/navigation";
import "../home-editorial.css";
import "../story-editorial.css";
import "./tutor-editorial.css";

export const metadata: Metadata = { title: "阿洛（Arlo）｜AlgoVerse" };

type TutorParams = { runId?: string; from?: string; topic?: string; agentId?: string; new?: string };

export default async function TutorPage({ searchParams }: { searchParams: Promise<TutorParams> }) {
  const [{ runId, from, topic, agentId, new: fresh }, history, recent, jar] = await Promise.all([
    searchParams,
    getTutorHistory(),
    getRecentExperimentRuns(),
    cookies(),
  ]);
  const resume = jar.get(tutorResumeCookie)?.value;
  const canResume = agentId === undefined && runId === undefined && topic === undefined && from === undefined && fresh !== "1" && resume !== "new";
  const activeId = agentId ?? (canResume ? history.find(({ id }) => id === resume)?.id ?? history[0]?.id : undefined);
  const saved = activeId === undefined ? null : await getAgentTask(activeId);
  const initialTask = saved?.tutorContext
    ? { id: saved.id, goal: saved.goal, revision: saved.revision, tutorContext: saved.tutorContext, dialogue: saved.dialogue }
    : undefined;
  const entry = getKnowledgeTopic(initialTask ? initialTask.tutorContext.topicId : topic);
  const selectedRun = initialTask ? initialTask.tutorContext.runId : runId;
  const run = initialTask || selectedRun !== undefined || entry || fresh === "1" || resume === "new"
    ? await getExperimentRun(selectedRun)
    : await getActiveExperimentTask().then((task) => getExperimentRun(task?.runId));
  const engine = run && getExperimentEngine(run.session.engineId, run.session.engineVersion);
  const task = run ? { sessionId: run.session.id, runId: run.id } : null;
  const aiRun = run?.session.source?.type === "creator" || run?.session.source?.type === "quick-start";
  const runTopic = run && getExperimentTopic(run.topicId, run.session.engineId);
  const choices = recent.flatMap(({ id, engineId, completedAt }) => {
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
      <TutorConversation key={`${initialTask?.id ?? (fresh === "1" ? "fresh" : "new")}:${run?.id ?? "general"}:${focus?.topic.id ?? ""}`}
        initialTask={initialTask}
        initialHistory={history}
        initial={initial} choices={choices} topicId={entry?.topic.id}
        reference={reference} returnToDiagnosis={returnToDiagnosis} missingRun={selectedRun !== undefined && !run} />
    </main>
  </div>;
}
