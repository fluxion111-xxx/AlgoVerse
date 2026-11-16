import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { link, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cookies } from "next/headers";
import { createPathfindingConfig, getExperimentEngine, pathfindingEngine, type EngineId, type ExperimentConfig, type ExperimentResults } from "@/lib/experimentEngines";
import type { CreatorPlanIntent } from "@/lib/experimentCreator";
import type { AgentTask } from "@/lib/experimentAgent";
import { experimentEvidence } from "@/lib/experiments/evidence";
import type { PracticeAttempts } from "@/lib/knowledgePractice";
import { quickStartQuestion, type Diagnosis, type QuickStartPlan } from "@/lib/quickStart";

const visitorCookie = "algoverse_visitor";
const taskCookie = "algoverse_task";
const workflowCookie = "algoverse_workflow";
const agentCookie = "algoverse_agent";

export type ExperimentSession = {
  id: string;
  question: string;
  engineId: EngineId;
  engineVersion: number;
  config: ExperimentConfig;
  revision?: number;
  createdAt: string;
  source?: { type: "quick-start"; model: string }
    | { type: "creator"; model: string; revisedFrom?: string; intent?: CreatorPlanIntent }
    | { type: "agent"; taskId: string }
    | { type: "workbench" };
};

type WorkflowRevision = {
  revision: number;
  question: string;
  plan?: ExperimentSession;
  previousPlan?: ExperimentSession;
};

type QuickStartDraft = Pick<ExperimentSession, "id" | "question" | "createdAt"> & { runId: string; seed: number };
type Confirmation = { confirmedAt: string };

export type ExperimentRun = {
  id: string;
  session: ExperimentSession;
  confirmedAt: string;
  completedAt: string;
  results: ExperimentResults;
  topicId?: string;
};

function isRecordId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
}

function recordPath(owner: string, collection: string, id: string) {
  const root = process.env.ALGOVERSE_DATA_DIR ?? resolve(process.cwd(), ".algoverse-data");
  const ownerFolder = createHash("sha256").update(owner).digest("hex");
  return resolve(root, ownerFolder, collection, id + ".json");
}

async function readRecord<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeOnce<T>(path: string, record: T): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const temp = path + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temp, JSON.stringify(record), { flag: "wx", mode: 0o600 });
    // Publish a complete record atomically without overwriting a concurrent submission.
    try {
      await link(temp, path);
      return record;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const saved = await readRecord<T>(path);
      if (saved === null) throw error;
      return saved;
    }
  } finally {
    await rm(temp, { force: true });
  }
}

async function visitor() {
  const jar = await cookies();
  const value = jar.get(visitorCookie)?.value;
  return value && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

async function ensureVisitor() {
  const currentOwner = await visitor();
  const owner = currentOwner ?? randomBytes(32).toString("hex");
  if (!currentOwner) {
    (await cookies()).set(visitorCookie, owner, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return owner;
}

export async function rememberExperimentTask(sessionId: string, runId?: string) {
  const jar = await cookies();
  const previousAI = jar.get(workflowCookie) ? null : await getActiveAIWorkflow();
  const options = {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  } as const;
  const value = runId ? `${sessionId}:${runId}` : sessionId;
  if (runId) jar.set(taskCookie, value, options);
  const workflow = await getExperimentWorkflow(sessionId);
  if (workflow?.isAI) {
    const run = runId ? await getExperimentRun(runId) : null;
    if (!runId || (run && (run.session.revision ?? 0) === workflow.revision)) jar.set(workflowCookie, value, options);
  } else if (previousAI) {
    jar.set(workflowCookie, previousAI.runId ? `${previousAI.sessionId}:${previousAI.runId}` : previousAI.sessionId, options);
  }
}

export async function getActiveExperimentTask() {
  const [sessionId, runId] = ((await cookies()).get(taskCookie)?.value ?? "").split(":");
  const record = await getExperimentWorkflow(sessionId);
  if (!record) return null;
  const run = runId ? await getExperimentRun(runId) : null;
  return { sessionId, runId: run?.session.id === sessionId ? run.id : undefined };
}

export async function getActiveAIWorkflow() {
  const jar = await cookies();
  const [sessionId, runId] = (jar.get(workflowCookie)?.value ?? jar.get(taskCookie)?.value ?? "").split(":");
  const record = await getExperimentWorkflow(sessionId);
  if (!record?.isAI) return null;
  const run = runId ? await getExperimentRun(runId) : null;
  return {
    sessionId,
    runId: run?.session.id === sessionId && (run.session.revision ?? 0) === record.revision ? run.id : undefined,
  };
}

function revisionPath(owner: string, id: string, revision: number) {
  return recordPath(owner, `revisions/${id}`, String(revision));
}

export async function getExperimentWorkflow(id: unknown, requestedRevision?: number) {
  const owner = await visitor();
  if (!owner || !isRecordId(id)) return null;
  const [draft, legacy] = await Promise.all([
    readRecord<WorkflowRevision>(recordPath(owner, "workflow-drafts", id)),
    readRecord<ExperimentSession>(recordPath(owner, "sessions", id)),
  ]);
  if (!draft && !legacy) return null;
  const initial = draft ?? { revision: 0, question: legacy!.question, plan: legacy! };
  let revision = requestedRevision;
  if (revision === undefined) {
    try {
      const files = await readdir(dirname(revisionPath(owner, id, 0)));
      revision = files.reduce((latest, file) => /^[1-9]\d*\.json$/.test(file) ? Math.max(latest, Number(file.slice(0, -5))) : latest, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      revision = 0;
    }
  }
  const current = revision === 0 ? initial : await readRecord<WorkflowRevision>(revisionPath(owner, id, revision));
  if (!current) return null;
  return { ...current, id, isAI: !!draft || [current.plan, current.previousPlan, legacy].some(
    (plan) => plan?.source?.type === "creator" || plan?.source?.type === "quick-start",
  ) };
}

export async function createWorkflowDraft(question: string) {
  const owner = await ensureVisitor();
  const id = randomUUID();
  await writeOnce<WorkflowRevision>(recordPath(owner, "workflow-drafts", id), { revision: 0, question });
  return id;
}

export async function saveWorkflowRevision(id: string, expected: number, question: string,
  configuration?: Pick<ExperimentSession, "engineId" | "engineVersion" | "config" | "source">) {
  const owner = await visitor();
  const current = await getExperimentWorkflow(id);
  if (!owner || !current || current.revision !== expected) return null;
  if (!configuration && current.question === question) return expected;
  if (configuration && !getExperimentEngine(configuration.engineId, configuration.engineVersion)?.validate(configuration.config)) return null;
  const revision = expected + 1;
  const next: WorkflowRevision = configuration
    ? { revision, question, plan: { ...configuration, id, revision, question, createdAt: new Date().toISOString() } }
    : { revision, question, previousPlan: current.plan ?? current.previousPlan };
  const written = await writeOnce(revisionPath(owner, id, revision), next);
  return written === next ? revision : null;
}

type RunSummary = Pick<ExperimentRun, "id" | "completedAt"> & { engineId: EngineId };
type Completion = { count: number; latest: RunSummary };
export type LearningProgress = {
  byEngine: Partial<Record<EngineId, Completion>>;
  byTopic: Partial<Record<string, Completion>>;
  readTopics: ReadonlySet<string>;
  practice: PracticeAttempts;
  recent: RunSummary[];
};

async function collectionFiles(owner: string, collection: string) {
  try { return await readdir(dirname(recordPath(owner, collection, "index"))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function hasReadTopic(id: string) {
  const owner = await visitor();
  if (!owner) return false;
  const { getKnowledgeTopic } = await import("@/lib/knowledge");
  return !!getKnowledgeTopic(id) && !!await readRecord(recordPath(owner, "read-topics", id));
}

export async function setReadTopic(id: string, read: boolean) {
  const { getKnowledgeTopic } = await import("@/lib/knowledge");
  if (!getKnowledgeTopic(id)) return;
  const owner = read ? await ensureVisitor() : await visitor();
  if (!owner) return;
  const file = recordPath(owner, "read-topics", id);
  if (read) await writeOnce(file, { readAt: new Date().toISOString() });
  else await rm(file, { force: true });
}

export async function submitKnowledgeExercise(topicId: string, exerciseId: string, selection: unknown) {
  const { gradeKnowledgeExercise } = await import("@/lib/knowledgePractice");
  const result = gradeKnowledgeExercise(topicId, exerciseId, selection);
  if (!result) return null;
  const owner = await ensureVisitor();
  const file = recordPath(owner, "practice", `${topicId}.${exerciseId}`);
  const temporary = `${file}.${randomUUID()}.tmp`;
  await mkdir(dirname(file), { recursive: true });
  try {
    await writeFile(temporary, JSON.stringify({ correct: result.correct }), { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
  return result;
}

export async function getTopicPractice(topicId: string, exerciseIds: readonly string[]) {
  const owner = await visitor();
  if (!owner || !exerciseIds.length) return {};
  const { hasPracticeExercise } = await import("@/lib/knowledgePractice");
  const entries = await Promise.all(exerciseIds.filter((id) => hasPracticeExercise(topicId, id)).map(async (id) => {
    const attempt = await readRecord<{ correct: boolean }>(recordPath(owner, "practice", `${topicId}.${id}`));
    return [id, attempt?.correct] as const;
  }));
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, boolean] => typeof entry[1] === "boolean"));
}

function countRun(previous: Completion | undefined, run: RunSummary): Completion {
  const latest = !previous || run.completedAt > previous.latest.completedAt ? run : previous.latest;
  return { count: (previous?.count ?? 0) + 1, latest };
}

async function collectRecentRuns(owner: string, onRun?: (run: RunSummary, topicId?: string) => void) {
  const files = await collectionFiles(owner, "runs");
  const ids = files.filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)).filter(isRecordId);
  const recent: RunSummary[] = [];
  for (let offset = 0; offset < ids.length; offset += 16) {
    const runs = await Promise.all(ids.slice(offset, offset + 16).map((id) => readRecord<ExperimentRun>(recordPath(owner, "runs", id))));
    for (const saved of runs) {
      if (!saved || !getExperimentEngine(saved.session.engineId, saved.session.engineVersion)) continue;
      const summary = { id: saved.id, completedAt: saved.completedAt, engineId: saved.session.engineId };
      onRun?.(summary, saved.topicId);
      recent.push(summary);
    }
    recent.sort((a, b) => b.completedAt.localeCompare(a.completedAt) || a.id.localeCompare(b.id));
    recent.splice(12);
  }
  return recent;
}

export async function getRecentExperimentRuns() {
  const owner = await visitor();
  return owner ? collectRecentRuns(owner) : [];
}

export async function getLearningProgress(): Promise<LearningProgress> {
  const owner = await visitor();
  const progress: LearningProgress = { byEngine: {}, byTopic: {}, readTopics: new Set(), practice: {}, recent: [] };
  if (!owner) return progress;
  const { getExperimentTopic, getKnowledgeTopic } = await import("@/lib/knowledge");
  const [recent, readings, practiceFiles] = await Promise.all([
    collectRecentRuns(owner, (run, topicId) => {
      const { engineId } = run;
      progress.byEngine[engineId] = countRun(progress.byEngine[engineId], run);
      const topic = getExperimentTopic(topicId, engineId)?.topic;
      if (topic) progress.byTopic[topic.id] = countRun(progress.byTopic[topic.id], run);
    }),
    collectionFiles(owner, "read-topics"),
    collectionFiles(owner, "practice"),
  ]);
  progress.recent = recent;
  progress.readTopics = new Set(readings.filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5)).filter((id) => getKnowledgeTopic(id)));
  if (practiceFiles.length) {
    const { hasPracticeExercise } = await import("@/lib/knowledgePractice");
    for (let offset = 0; offset < practiceFiles.length; offset += 16) {
      await Promise.all(practiceFiles.slice(offset, offset + 16).map(async (filename) => {
        const match = /^([a-z0-9-]+)\.([a-z0-9-]+)\.json$/.exec(filename);
        if (!match) return;
        const [, topicId, exerciseId] = match;
        if (!hasPracticeExercise(topicId, exerciseId)) return;
        const attempt = await readRecord<{ correct: boolean }>(recordPath(owner, "practice", `${topicId}.${exerciseId}`));
        if (typeof attempt?.correct === "boolean") (progress.practice[topicId] ??= {})[exerciseId] = attempt.correct;
      }));
    }
  }
  return progress;
}

async function createSession(question: string, engineId: EngineId, engineVersion: number, config: ExperimentConfig, source?: ExperimentSession["source"]) {
  const engine = getExperimentEngine(engineId, engineVersion);
  if (!engine?.validate(config)) throw new Error("Invalid experiment config");
  const owner = await ensureVisitor();
  const id = randomUUID();
  return writeOnce<ExperimentSession>(recordPath(owner, "sessions", id), {
    id, question, engineId, engineVersion, config, createdAt: new Date().toISOString(), source,
  });
}

export async function createAIExperimentSession(question: string, engineId: EngineId, version: number, config: ExperimentConfig, model: string, intent: CreatorPlanIntent) {
  return createSession(question, engineId, version, config, { type: "creator", model, intent });
}

export async function createWorkbenchSession(question: string, engineId: EngineId, version: number, config: ExperimentConfig) {
  return createSession(question, engineId, version, config, { type: "workbench" });
}

export async function startQuickStart() {
  const owner = await ensureVisitor();
  const id = randomUUID();
  return writeOnce<QuickStartDraft>(recordPath(owner, "quick-starts", id), {
    id, question: quickStartQuestion, createdAt: new Date().toISOString(),
    runId: randomUUID(), seed: randomBytes(4).readUInt32BE(0),
  });
}

export async function getQuickStart(id: unknown) {
  const owner = await visitor();
  if (!owner || !isRecordId(id)) return null;
  const draft = await readRecord<QuickStartDraft>(recordPath(owner, "quick-starts", id));
  if (!draft) return null;
  const [session, run] = await Promise.all([
    readRecord<ExperimentSession>(recordPath(owner, "sessions", id)),
    readRecord<ExperimentRun>(recordPath(owner, "runs", draft.runId)),
  ]);
  return { draft, session, run };
}

export async function saveQuickStartPlan(id: string, plan: QuickStartPlan, model: string) {
  const owner = await visitor();
  const record = await getQuickStart(id);
  if (!owner || !record) return null;
  const { draft } = record;
  const engine = pathfindingEngine;
  if (!engine || engine.domain !== plan.domain) return null;
  const config = createPathfindingConfig(draft.seed, plan.difficulty, plan.goal);
  if (!engine.validate(config)) return null;
  return writeOnce<ExperimentSession>(recordPath(owner, "sessions", draft.id), {
    id: draft.id, question: draft.question, createdAt: draft.createdAt,
    engineId: engine.id, engineVersion: engine.version, config, source: { type: "quick-start", model },
  });
}

export async function getExperimentSession(id: unknown, revision?: number) {
  const owner = await visitor();
  if (!owner || !isRecordId(id)) return null;
  const session = (await getExperimentWorkflow(id, revision))?.plan;
  if (!session) return null;
  const confirmation = await readRecord<Confirmation>(confirmationPath(owner, session));
  return { session, confirmedAt: confirmation?.confirmedAt ?? null };
}

function confirmationPath(owner: string, session: ExperimentSession) {
  return session.revision ? recordPath(owner, `confirmations/${session.id}`, String(session.revision))
    : recordPath(owner, "confirmations", session.id);
}

export async function confirmExperimentSession(id: unknown, revision?: number) {
  const owner = await visitor();
  if (!owner || !isRecordId(id)) return null;
  const session = (await getExperimentWorkflow(id, revision))?.plan;
  if (!session || !getExperimentEngine(session.engineId, session.engineVersion)?.validate(session.config)) return null;
  await writeOnce<Confirmation>(confirmationPath(owner, session), { confirmedAt: new Date().toISOString() });
  return session;
}

export async function runExperimentSession(id: unknown, runId: unknown, revision?: number, topicId?: string) {
  const owner = await visitor();
  if (!owner || !isRecordId(id) || !isRecordId(runId)) return null;
  const snapshot = await getExperimentSession(id, revision);
  if (!snapshot?.confirmedAt) return null;
  const { session, confirmedAt } = snapshot;
  const path = recordPath(owner, "runs", runId);
  const existing = await readRecord<ExperimentRun>(path);
  if (existing) return existing.session.id === id ? existing : null;
  const engine = getExperimentEngine(session.engineId, session.engineVersion);
  const results = engine?.execute(session.config);
  if (!results) return null;
  const run = await writeOnce<ExperimentRun>(path, {
    id: runId, session, confirmedAt, completedAt: new Date().toISOString(), results, topicId,
  });
  return run.session.id === id ? run : null;
}

export async function getExperimentRun(id: unknown) {
  const owner = await visitor();
  if (!owner || !isRecordId(id)) return null;
  return readRecord<ExperimentRun>(recordPath(owner, "runs", id));
}

function agentRevisionPath(owner: string, id: string, revision: number) {
  return recordPath(owner, `agent-tasks/${id}`, String(revision));
}

export async function getAgentTask(id: unknown): Promise<AgentTask | null> {
  const owner = await visitor();
  if (!owner || !isRecordId(id)) return null;
  let files: string[];
  try { files = await readdir(dirname(agentRevisionPath(owner, id, 0))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const revision = files.reduce((latest, name) => /^\d+\.json$/.test(name) ? Math.max(latest, Number(name.slice(0, -5))) : latest, 0);
  return readRecord<AgentTask>(agentRevisionPath(owner, id, revision));
}

export async function getActiveAgentTask() {
  return getAgentTask((await cookies()).get(agentCookie)?.value);
}

async function rememberAgentTask(task: AgentTask) {
  (await cookies()).set(agentCookie, task.id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return task;
}

export async function createAgentTask(goal: string, reference?: ExperimentSession, run?: ExperimentRun, importPlan = false) {
  const owner = await ensureVisitor();
  const id = randomUUID();
  const pending = importPlan && reference ? [{ id: randomUUID(), sessionId: randomUUID(), tool: reference.engineId,
    version: reference.engineVersion, config: reference.config }] : [];
  const task = await writeOnce<AgentTask>(agentRevisionPath(owner, id, 0), {
    id, revision: 0, goal, seed: randomBytes(4).readUInt32BE(0), phase: pending.length ? "confirm" : "draft",
    plan: [], pending, decisions: [], clarifications: [], requests: 0, steps: 0,
    runs: run ? [{ id: run.id, sessionId: run.session.id, tool: run.session.engineId, version: run.session.engineVersion,
      config: run.session.config, completedAt: run.completedAt, metrics: experimentEvidence(run.results) }] : [],
    ...(reference && { referenceConfig: { tool: reference.engineId, version: reference.engineVersion, config: reference.config } }),
  });
  return rememberAgentTask(task);
}

export async function saveAgentTask(current: AgentTask, changes: Partial<Omit<AgentTask, "id" | "revision" | "goal" | "seed">>) {
  const owner = await visitor();
  if (!owner || (await getAgentTask(current.id))?.revision !== current.revision) return null;
  const next = { ...current, ...changes, revision: current.revision + 1 };
  const saved = await writeOnce(agentRevisionPath(owner, current.id, next.revision), next);
  return saved === next ? rememberAgentTask(next) : null;
}

export async function runConfirmedAgentCall(task: AgentTask, callId: string) {
  const current = await getAgentTask(task.id);
  const call = current?.pending.find(({ id }) => id === callId);
  if (!current || current.revision !== task.revision || current.phase !== "running" || !call) return null;
  const owner = await visitor();
  const engine = getExperimentEngine(call.tool, call.version);
  if (!owner || !engine?.validate(call.config)) return null;
  const session = await writeOnce<ExperimentSession>(recordPath(owner, "sessions", call.sessionId), {
    id: call.sessionId, question: task.experimentGoal ?? task.goal, engineId: call.tool, engineVersion: call.version,
    config: call.config, source: { type: "agent", taskId: task.id }, createdAt: new Date().toISOString(),
  });
  if (session.source?.type !== "agent" || session.source.taskId !== task.id
    || !await confirmExperimentSession(session.id, 0)) return null;
  return runExperimentSession(session.id, call.id, 0);
}

export async function getDiagnosis(runId: unknown) {
  const owner = await visitor();
  if (!owner || !isRecordId(runId)) return null;
  return readRecord<Diagnosis>(recordPath(owner, "diagnoses", runId));
}

export async function saveDiagnosis(diagnosis: Diagnosis) {
  const owner = await visitor();
  if (!owner || !isRecordId(diagnosis.runId)) return null;
  return writeOnce(recordPath(owner, "diagnoses", diagnosis.runId), diagnosis);
}
