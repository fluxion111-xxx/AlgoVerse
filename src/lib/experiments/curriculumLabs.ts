import { bellmanFordLab, binarySearchLab, kmpSearchLab, kruskalLab, monotonicStackLab, stackQueueLab, topologicalSortLab, unionFindLab } from "./curriculumAlgorithms";
import { classificationThresholdLab, epsilonGreedyLab, knnScalingLab, linearRegressionLab, pcaProjectionLab, ridgeRegressionLab, stratifiedValidationLab, treeSplitLab } from "./curriculumAI";
import { candidateKeyLab, compositeIndexLab, foreignKeyDeleteLab, joinStrategiesLab, sqlGroupingLab, sqlNullLab, sqlUnionLab, sqlWindowFrameLab } from "./curriculumDatabases";
import { arpResolutionLab, crcDetectionLab, dnsNegativeCacheLab, ipv4FragmentationLab, ipv4SubnetLab, longestPrefixLab, sendWindowLab, tcpTimeoutLab } from "./curriculumNetworks";
import { gcCyclesLab, loopClosureLab, pointerWriteLab, pythonCopyLab, raiiCleanupLab, shortCircuitLab, unsignedWrapLab, variableScopeLab } from "./curriculumProgramming";
import { boundedBufferLab, cacheMappingLab, clockReplacementLab, counterMutexLab, diskSchedulingLab, priorityInheritanceLab, tlbTranslationLab, workingSetLab } from "./curriculumSystems";

export const curriculumLabs = [stackQueueLab, binarySearchLab, diskSchedulingLab, tlbTranslationLab, ipv4SubnetLab, longestPrefixLab,
  pointerWriteLab, variableScopeLab, sqlGroupingLab, joinStrategiesLab, classificationThresholdLab, epsilonGreedyLab,
  topologicalSortLab, unionFindLab, clockReplacementLab, counterMutexLab, crcDetectionLab, sendWindowLab,
  shortCircuitLab, unsignedWrapLab, sqlNullLab, compositeIndexLab, treeSplitLab, knnScalingLab,
  kmpSearchLab, kruskalLab, cacheMappingLab, boundedBufferLab, arpResolutionLab, ipv4FragmentationLab,
  pythonCopyLab, gcCyclesLab, sqlWindowFrameLab, foreignKeyDeleteLab, linearRegressionLab, pcaProjectionLab,
  monotonicStackLab, bellmanFordLab, workingSetLab, priorityInheritanceLab, tcpTimeoutLab, dnsNegativeCacheLab,
  loopClosureLab, raiiCleanupLab, sqlUnionLab, candidateKeyLab, ridgeRegressionLab, stratifiedValidationLab] as const;

export type CurriculumLab = typeof curriculumLabs[number];
export type CurriculumLabId = CurriculumLab["id"];

export function getCurriculumLab(id: unknown) {
  return curriculumLabs.find((lab) => lab.id === id);
}
