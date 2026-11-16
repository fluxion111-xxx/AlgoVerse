import type { Difficulty } from "./pathfinding";

export const quickStartQuestion = "为什么 A* 和 Dijkstra 的搜索过程不同？";
export const quickStartSteps = ["提出想法", "AI 生成实验", "运行对比", "诊断改进"] as const;
export const diagnosisMetrics = ["visited", "pathLength", "elapsedMs"] as const;
export type DiagnosisMetric = typeof diagnosisMetrics[number];

export type QuickStartPlan = {
  domain: "algorithms";
  engine: "pathfinding";
  comparison: "dijkstra-and-astar";
  difficulty: Difficulty;
  goal: string;
};

export type Diagnosis = {
  runId: string;
  model: string;
  promptVersion: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  conclusion: string;
  explanation: string;
  suggestion: string;
  evidence: string[];
};

export type QuickStartResponse =
  | { status: "started" | "configured"; sessionId: string }
  | { status: "ready"; diagnosis: Diagnosis }
  | { status: "error"; message: string };
