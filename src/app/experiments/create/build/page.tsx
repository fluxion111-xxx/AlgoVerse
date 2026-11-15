import { redirect } from "next/navigation";
import { workflowRoute } from "@/lib/navigation";
import { getExperimentContext, type ExperimentSearch } from "@/lib/server/experimentContext";

export default async function BuildPage({ searchParams }: { searchParams: Promise<ExperimentSearch> }) {
  const { task } = await getExperimentContext(await searchParams);
  redirect(workflowRoute("config", task));
}
