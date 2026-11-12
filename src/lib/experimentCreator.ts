import type { Course } from "./courses";

export const maxQuestionLength = 300;

export type CreatorRequest = { question: string };

// The integration will return a simulator plan, then explain its real result.
export type CreatorResponse =
  | { status: "unavailable" | "invalid"; message: string }
  | {
      status: "ready";
      plan: {
        course: Course["slug"];
        topic: string;
        simulator: { id: "pathfinding"; start: number; goal: number; walls: number[] };
      };
    };
