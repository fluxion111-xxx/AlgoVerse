import { binarySearchLab, stackQueueLab } from "./curriculumAlgorithms";
import { classificationThresholdLab, epsilonGreedyLab } from "./curriculumAI";
import { joinStrategiesLab, sqlGroupingLab } from "./curriculumDatabases";
import { ipv4SubnetLab, longestPrefixLab } from "./curriculumNetworks";
import { pointerWriteLab, variableScopeLab } from "./curriculumProgramming";
import { diskSchedulingLab, tlbTranslationLab } from "./curriculumSystems";

export const curriculumLabs = [stackQueueLab, binarySearchLab, diskSchedulingLab, tlbTranslationLab, ipv4SubnetLab, longestPrefixLab,
  pointerWriteLab, variableScopeLab, sqlGroupingLab, joinStrategiesLab, classificationThresholdLab, epsilonGreedyLab] as const;

export type CurriculumLab = typeof curriculumLabs[number];
export type CurriculumLabId = CurriculumLab["id"];

export function getCurriculumLab(id: unknown) {
  return curriculumLabs.find((lab) => lab.id === id);
}
