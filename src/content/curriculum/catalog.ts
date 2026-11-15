import { algorithmCurriculum } from "./algorithms";
import { aiCurriculum } from "./ai";
import { databaseCurriculum } from "./databases";
import { foundationCurriculum } from "./foundations";
import { networkCurriculum } from "./networks";
import { systemCurriculum } from "./operating-systems";
import { programmingCurriculum } from "./programming";
import { undergraduateDatabases, undergraduateFoundations, undergraduateNetworks, undergraduateProgramming, undergraduateSystems } from "./undergraduate";
import { coreDepthFoundations } from "./core-depth";
import type { CurriculumCourse } from "./types";
import type { Course } from "@/lib/courses";

export type KnowledgeAreaId = Course["slug"] | "foundations";
export const foundationsTitle = "共享数学与理论基础";

export const courseCatalogs = {
  algorithms: algorithmCurriculum,
  "operating-systems": [...systemCurriculum, ...undergraduateSystems],
  networks: [...networkCurriculum, ...undergraduateNetworks],
  programming: [...programmingCurriculum, ...undergraduateProgramming],
  databases: [...databaseCurriculum, ...undergraduateDatabases],
  ai: aiCurriculum,
  foundations: [...foundationCurriculum, ...undergraduateFoundations, ...coreDepthFoundations],
} satisfies Record<KnowledgeAreaId, readonly CurriculumCourse[]>;
