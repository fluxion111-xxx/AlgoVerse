export const maxQuestionLength = 300;
export const maxCreatorReplyLength = 1800;
export const maxCreatorHistory = 4;

export const creatorAnswerIntents = ["knowledge", "analyze", "clarify", "unsupported"] as const;
export type CreatorAnswerIntent = typeof creatorAnswerIntents[number];
export type CreatorPlanIntent = "create" | "modify" | "compare";
export type CreatorTurn = { question: string; answer: string };
export type CreatorRequest = { question: string; history?: CreatorTurn[]; sessionId?: string; runId?: string; revision?: number };

export type CreatorAnswer = {
  status: "answer";
  intent: CreatorAnswerIntent;
  answer: string;
  alternatives?: { title: string; href: string }[];
};

export type CreatorResponse =
  | CreatorAnswer
  | { status: "ready"; sessionId: string }
  | { status: "error"; message: string };
