"use client";

import dynamic from "next/dynamic";
import type { DeepLesson } from "@/content/lessons/types";
import type { TeachingModelId } from "@/lib/lessons/teachingModels";

function loading() {
  return <section id="lesson-demo" className="lesson-section" role="status">正在打开演示…</section>;
}

const GrowthDemo = dynamic(() => import("./GrowthLessonDemo").then((mod) => mod.GrowthLessonDemo), { loading });
const SortingDemo = dynamic(() => import("./SortingLessonDemo").then((mod) => mod.SortingLessonDemo), { loading });
const IndexDemo = dynamic(() => import("./IndexLessonDemo").then((mod) => mod.IndexLessonDemo), { loading });
const ModelDemo = dynamic(() => import("./TeachingModelDemo").then((mod) => mod.TeachingModelDemo), { loading });
const SimulationDemo = dynamic(() => import("./LessonSimulation").then((mod) => mod.SimulationLessonDemo), { loading });

type DemoProps = { model: TeachingModelId } | { demo: Exclude<DeepLesson["demo"], TeachingModelId> };

export function LessonDemo(props: DemoProps) {
  if ("model" in props) return <ModelDemo id={props.model} />;
  const { demo } = props;
  if (demo === "growth") return <GrowthDemo />;
  if (demo === "sorting") return <SortingDemo />;
  if (demo === "index") return <IndexDemo />;
  return <SimulationDemo id={demo} />;
}
