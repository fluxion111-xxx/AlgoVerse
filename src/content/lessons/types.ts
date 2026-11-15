import type { TeachingModelId } from "../../lib/lessons/teachingModels";

type ExerciseBase = {
  id: string;
  level: "基础" | "应用" | "挑战";
  prompt: string;
  explanation: string;
  wrong: string;
  review: string;
};

export type LessonExercise = ExerciseBase & (
  | { kind: "single" | "boolean" | "code"; options: readonly string[]; answer: number }
  | { kind: "multiple"; options: readonly string[]; answer: readonly number[] }
  | { kind: "integer"; answer: number }
  | { kind: "text"; answer: readonly string[] }
);

export type LessonBlock = { id: string; title: string } & (
  | { kind: "explain"; paragraphs: readonly string[]; formula?: string }
  | { kind: "steps"; steps: readonly { label: string; text: string }[] }
  | { kind: "code"; language: "Python" | "C" | "C++" | "SQL"; source: string; notes: readonly { lines: string; text: string }[] }
);

export type DeepLesson = {
  title: string;
  intro: string;
  goals: readonly string[];
  blocks: readonly LessonBlock[];
  demo: "growth" | "sorting" | "index" | "scheduling" | "memory" | "network" | "k-means"
    | "page-replacement" | "tcp-congestion" | "transaction-concurrency" | "gradient-descent"
    | "hash-collisions" | "tree-traversal" | "graph-traversal" | "deadlock-avoidance"
    | "pathfinding" | "dynamic-routing" | "recursion-stack" | "knn-classification" | TeachingModelId;
  exercises: readonly LessonExercise[];
  recap: readonly string[];
  extension: string;
  next: string;
  sources: readonly { title: string; href: string }[];
};
