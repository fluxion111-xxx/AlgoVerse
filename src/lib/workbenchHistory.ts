import { workbenchFocus, type WorkbenchFocus } from "./navigation";
import type { AgentTask } from "./experimentAgent";

export type WorkbenchView = { focus: WorkbenchFocus; runId?: string; hypothesis?: string; draftQuestion?: string };
export type WorkbenchHistoryItem = {
  id: string;
  href: string;
  title: string;
  question: string;
  updatedAt: string;
  phase: AgentTask["phase"];
  rounds: number;
};

export function isWorkbenchFocus(value: unknown): value is WorkbenchFocus {
  return Object.values(workbenchFocus).some((focus) => focus === value);
}
