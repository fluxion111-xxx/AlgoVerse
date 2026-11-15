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

export type ExperimentTask = { sessionId: string; runId?: string };
export const workflowSteps = { question: "提出想法", config: "AI 生成实验", run: "运行对比", diagnosis: "诊断改进" } as const;
export type WorkflowStep = keyof typeof workflowSteps;

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
