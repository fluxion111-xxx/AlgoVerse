"use server";

import { notFound, redirect } from "next/navigation";
import { randomBytes, randomUUID } from "node:crypto";
import { containsPossibleAIKey } from "@/lib/aiSettings";
import { getExperimentEngine, pathfindingEngine, type ExperimentConfig } from "@/lib/experimentEngines";
import { agentWorkbenchLink, workflowRoute, withExperimentTask } from "@/lib/navigation";
import { maxQuestionLength } from "@/lib/experimentCreator";
import { getExperimentTopic } from "@/lib/knowledge";
import { confirmExperimentSession, createWorkbenchSession, createWorkflowDraft, getExperimentRun, getExperimentWorkflow, getQuickStart, rememberExperimentTask, runExperimentSession, saveWorkbenchView, saveWorkflowRevision } from "@/lib/server/experimentRecords";

export async function saveExperimentQuestion(form: FormData): Promise<{ sessionId: string; revision: number } | { error: string }> {
  const input = form.get("question");
  const question = typeof input === "string" ? input.trim() : "";
  if (!question || question.length > maxQuestionLength) return { error: "请输入 1–300 字。" };
  if (containsPossibleAIKey(question)) return { error: "请先移除问题里的 Key。" };
  const id = form.get("sessionId");
  if (id !== null) {
    const current = await getExperimentWorkflow(id);
    if (!current) return { error: "找不到本次会话。" };
    if (form.get("revision") !== String(current.revision)) return { error: "会话已更新，请刷新。" };
    const revision = await saveWorkflowRevision(current.id, current.revision, question);
    if (revision === null) return { error: "会话已更新，请刷新。" };
    const runId = form.get("runId");
    const run = revision === current.revision ? await getExperimentRun(runId) : null;
    await rememberExperimentTask(current.id, run?.session.id === current.id ? run.id : undefined);
    return { sessionId: current.id, revision };
  }
  const sessionId = await createWorkflowDraft(question);
  await rememberExperimentTask(sessionId);
  return { sessionId, revision: 0 };
}

export async function openExperimentQuestion(_error: string, form: FormData): Promise<string> {
  const question = form.get("question");
  if (typeof question !== "string" || !question.trim()) return "先写下你的问题。";

  let saved: Awaited<ReturnType<typeof saveExperimentQuestion>>;
  try {
    const draft = new FormData();
    draft.set("question", question.replace(/\r\n?/gu, "\n"));
    saved = await saveExperimentQuestion(draft);
    if (!("error" in saved) && await saveWorkbenchView(saved.sessionId, { focus: "idea" }) !== "saved") {
      return "无法保存。请检查本站 Cookie。";
    }
  } catch {
    return "保存失败，请重试。";
  }
  if ("error" in saved) return saved.error;
  redirect(agentWorkbenchLink({ focus: "idea", sessionId: saved.sessionId }));
}

export async function executePreset(form: FormData) {
  const run = await runExperimentSession(form.get("sessionId"), form.get("runId"));
  if (!run) notFound();
  await rememberExperimentTask(run.session.id, run.id);
  redirect("/experiments/runs/" + run.id);
}

export async function runCreatorExperiment(form: FormData) {
  return runConfiguredExperiment(form);
}

export async function runLabExperiment(form: FormData) {
  return runConfiguredExperiment(form, true);
}

export async function runKnowledgeExperiment(topicId: string, form: FormData) {
  return runConfiguredExperiment(form, true, topicId);
}

export async function saveQuickComparison(form: FormData) {
  const comparison = new FormData();
  comparison.set("runId", randomUUID());
  comparison.set("engineId", pathfindingEngine.id);
  comparison.set("seed", "0");
  comparison.set("parameters", form.get("parameters") ?? "");
  return runLabExperiment(comparison);
}

function runRoute(run: NonNullable<Awaited<ReturnType<typeof getExperimentRun>>>, lab: boolean) {
  const engine = getExperimentEngine(run.session.engineId, run.session.engineVersion);
  const task = { sessionId: run.session.id, runId: run.id };
  const route = lab && engine ? withExperimentTask(engine.route, task) : workflowRoute("run", task);
  return `${route}${lab && run.topicId ? "#knowledge-lab" : "#creator-workbench"}`;
}

async function runConfiguredExperiment(form: FormData, lab = false, topicId?: string) {
  const sessionId = form.get("sessionId");
  const runId = form.get("runId");
  const record = sessionId ? await getExperimentWorkflow(sessionId) : null;
  if (typeof runId !== "string" || (sessionId && !record)) notFound();

  const existing = await getExperimentRun(runId);
  if (existing) {
    if ((sessionId && existing.session.id !== sessionId) || (topicId && existing.topicId !== topicId)) notFound();
    await rememberExperimentTask(existing.session.id, existing.id);
    redirect(runRoute(existing, lab));
  }

  const selectedRevision = form.get("revision");
  const revision = selectedRevision === null ? record?.revision : Number(selectedRevision);
  if (selectedRevision !== null && (typeof selectedRevision !== "string" || !/^\d+$/.test(selectedRevision)
    || !Number.isSafeInteger(revision) || !record)) notFound();
  const selected = record && revision !== record.revision ? await getExperimentWorkflow(sessionId, revision) : record;
  if (record && !selected?.plan) notFound();
  let session = selected?.plan;
  let updatedConfig: ExperimentConfig | undefined;
  const engineId = session?.engineId ?? form.get("engineId") ?? pathfindingEngine.id;
  const engine = getExperimentEngine(engineId, session?.engineVersion);
  if (!engine) notFound();
  if (topicId !== undefined && !getExperimentTopic(topicId, engine.id)) notFound();
  const parameters = form.get("parameters");
  const difficulty = form.get("difficulty");
  const seedValue = form.get("seed");
  const mapSeed = typeof seedValue === "string" && /^\d{1,10}$/.test(seedValue) ? Number(seedValue) : NaN;
  const validMapSeed = Number.isInteger(mapSeed) && mapSeed <= 0xffffffff;
  if (parameters !== null) {
    if (typeof parameters !== "string" || parameters.length > 4096 || (engine.id === pathfindingEngine.id && !validMapSeed)) notFound();
    let input: unknown;
    try { input = JSON.parse(parameters); } catch { notFound(); }
    const original = session?.config;
    const seed = engine.id === pathfindingEngine.id ? mapSeed
      : original && "seed" in original ? original.seed : randomBytes(4).readUInt32BE(0);
    const config = engine.configure(input, seed);
    if (!config) notFound();
    updatedConfig = config;
  } else if (difficulty !== null || !session) {
    if (engine.id !== pathfindingEngine.id || !validMapSeed) notFound();
    const config = pathfindingEngine.configure({
      goalLabel: session?.config.goalLabel ?? "比较两种算法的搜索过程。",
      map: { kind: "random", difficulty },
    }, mapSeed);
    if (!config) notFound();
    updatedConfig = config;
  }
  let nextRevision = revision;
  if (updatedConfig && session) {
    const saved = await saveWorkflowRevision(session.id, revision ?? 0, session.question, {
      engineId: engine.id, engineVersion: engine.version, config: updatedConfig, source: session.source,
    });
    if (saved === null) redirect(workflowRoute("run", { sessionId: session.id }) + "&updated=1");
    nextRevision = saved;
  } else if (updatedConfig) {
    session = await createWorkbenchSession(engine.creator.title, engine.id, engine.version, updatedConfig);
  }
  if (!session || !await confirmExperimentSession(session.id, nextRevision)) notFound();
  const run = await runExperimentSession(session.id, runId, nextRevision, topicId);
  if (!run) notFound();
  await rememberExperimentTask(session.id, run.id);
  redirect(runRoute(run, lab));
}

export async function runQuickStart(form: FormData) {
  const record = await getQuickStart(form.get("sessionId"));
  if (!record?.session) notFound();
  if (!record.run && !await confirmExperimentSession(record.draft.id)) notFound();
  const run = record.run ?? await runExperimentSession(record.draft.id, record.draft.runId);
  if (!run) notFound();
  await rememberExperimentTask(run.session.id, run.id);
  redirect("/experiments/runs/" + run.id + (form.get("auto") === "0" ? "?auto=0" : ""));
}
