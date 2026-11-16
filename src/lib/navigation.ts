export const siteNavigation = [
  { label: "首页", href: "/" },
  { label: "实验中心", href: "/experiments" },
  { label: "学习路径", href: "/learning-path" },
  { label: "AI 助教", href: "/ai-tutor" },
] as const;

export const creatorRoute = "/experiments/create";
export const quickStartRoute = `${creatorRoute}?guide=1`;
export const buildRoute = "/experiments/create/build";
export const diagnosisRoute = "/experiments/diagnosis";
export const tutorRoute = "/ai-tutor";
export const tutorResumeCookie = "algoverse_tutor_resume";

export function tutorConversationLink(agentId: string) {
  return `${tutorRoute}?${new URLSearchParams({ agentId })}`;
}

export type ExperimentTask = { sessionId: string; runId?: string };
export const workflowSteps = { question: "提出想法", config: "AI 生成实验", run: "运行对比", diagnosis: "诊断改进" } as const;
export type WorkflowStep = keyof typeof workflowSteps;
export const workbenchFocus = { question: "idea", config: "plan", run: "run", diagnosis: "analysis" } as const satisfies Record<WorkflowStep, string>;
export type WorkbenchFocus = typeof workbenchFocus[WorkflowStep];

export function agentWorkbenchLink({ agentId, focus, intent, fresh, sessionId, runId, evidence }: {
  agentId?: string; focus?: WorkbenchFocus; intent?: WorkflowStep; fresh?: boolean; sessionId?: string; runId?: string; evidence?: string;
} = {}) {
  const query = new URLSearchParams();
  if (agentId) query.set("agentId", agentId);
  if (intent) query.set("intent", intent);
  if (focus) query.set("focus", focus);
  if (fresh) query.set("new", "1");
  if (sessionId) query.set("sessionId", sessionId);
  if (runId) query.set("runId", runId);
  if (focus === "run" && runId && evidence) query.set("evidence", evidence);
  return query.size ? `${creatorRoute}?${query}` : creatorRoute;
}

export function runAnalysisLink(runId: string, diagnosis = false) {
  return `/experiments/runs/${encodeURIComponent(runId)}?view=analysis${diagnosis ? "#run-diagnosis" : ""}`;
}

export function withExperimentTask(route: string, task?: ExperimentTask | null) {
  if (!task) return route;
  const [path, query] = route.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("sessionId", task.sessionId);
  if (task.runId) params.set("runId", task.runId);
  return `${path}?${params}`;
}

export function workflowRoute(step: WorkflowStep, task?: ExperimentTask | null) {
  return withExperimentTask(`${creatorRoute}?step=${step}`, task);
}

export function workflowAISettingsRoute(returnTo: string) {
  return `/ai-settings?${new URLSearchParams({ returnTo })}`;
}

export function experimentTaskLinks(task?: ExperimentTask | null) {
  return {
    question: workflowRoute("question", task),
    config: workflowRoute("config", task),
    run: workflowRoute("run", task),
    diagnosis: workflowRoute("diagnosis", task),
  };
}
