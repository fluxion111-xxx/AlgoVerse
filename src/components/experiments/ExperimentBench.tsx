import { randomBytes, randomUUID } from "node:crypto";
import type { ExperimentEngine } from "@/lib/experimentEngines";
import type { getExperimentContext } from "@/lib/server/experimentContext";
import { CreatorStudio } from "./CreatorStudio";

export function ExperimentBench({ engine, context: { session, run }, action, presentation }: {
  engine: ExperimentEngine;
  context: Awaited<ReturnType<typeof getExperimentContext>>;
  action: (form: FormData) => Promise<void>;
  presentation?: "plan" | "result";
}) {
  return <CreatorStudio key={run?.id ?? (session ? `${session.id}:${session.revision ?? 0}` : engine.id)} engineId={engine.id} run={run}
    draft={session ? { id: session.id, revision: session.revision ?? 0, config: session.config, generated: session.source?.type === "creator" || session.source?.type === "quick-start" } : null}
    defaultSeed={randomBytes(4).readUInt32BE(0)} nextRunId={randomUUID()} action={action} presentation={presentation} />;
}
