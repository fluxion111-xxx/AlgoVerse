import { bellmanFordLab, binarySearchLab, bloomMembershipLab, differenceArrayLab, fenwickPrefixLab, intervalSchedulingLab, kmpSearchLab, kruskalLab, longestSubsequenceLab, monotonicStackLab, rollingHashLab, slidingMaximumLab, stackQueueLab, topologicalSortLab, unionFindLab, zeroOneKnapsackLab } from "./curriculumAlgorithms";
import { causalMaskLab, classificationThresholdLab, dropoutModeLab, earlyStoppingLab, epsilonGreedyLab, imputationLeakageLab, knnScalingLab, linearRegressionLab, pcaProjectionLab, probabilityCalibrationLab, rankingMetricsLab, ridgeRegressionLab, silhouetteScoreLab, stableSoftmaxLab, stratifiedValidationLab, treeSplitLab } from "./curriculumAI";
import { bufferPoolLab, candidateKeyLab, compositeIndexLab, consistentRingLab, coveringIndexLab, foreignKeyDeleteLab, joinStrategiesLab, lsmCompactionLab, mvccVersionsLab, notInNullLab, outerJoinFilterLab, sqlGroupingLab, sqlNullLab, sqlUnionLab, sqlWindowFrameLab, walCheckpointLab } from "./curriculumDatabases";
import { arpResolutionLab, crcDetectionLab, dnsNegativeCacheLab, dnsReferralLab, ethernetLearningLab, hopLimitLab, ipv4FragmentationLab, ipv4SubnetLab, ipv6PmtuLab, linkAggregationLab, longestPrefixLab, sendWindowLab, spanningBridgeLab, tcpHandshakeLab, tcpSackLab, tcpTimeoutLab } from "./curriculumNetworks";
import { cStringLab, copyMoveLab, exceptionGuaranteeLab, gcCyclesLab, generatorExhaustionLab, loopClosureLab, microtaskQueueLab, mutableDefaultLab, mutableHashKeyLab, pointerWriteLab, pythonCopyLab, raiiCleanupLab, shortCircuitLab, unsignedWrapLab, variableScopeLab, vectorIteratorLab } from "./curriculumProgramming";
import { boundedBufferLab, cacheMappingLab, cacheWritePolicyLab, clockReplacementLab, conditionRecheckLab, copyOnWriteLab, counterMutexLab, diskSchedulingLab, feedbackQueueLab, fileLinksLab, fileOffsetLab, lockOrderingLab, priorityInheritanceLab, readerWriterLab, tlbTranslationLab, workingSetLab } from "./curriculumSystems";

export const curriculumLabs = [stackQueueLab, binarySearchLab, diskSchedulingLab, tlbTranslationLab, ipv4SubnetLab, longestPrefixLab,
  pointerWriteLab, variableScopeLab, sqlGroupingLab, joinStrategiesLab, classificationThresholdLab, epsilonGreedyLab,
  topologicalSortLab, unionFindLab, clockReplacementLab, counterMutexLab, crcDetectionLab, sendWindowLab,
  shortCircuitLab, unsignedWrapLab, sqlNullLab, compositeIndexLab, treeSplitLab, knnScalingLab,
  kmpSearchLab, kruskalLab, cacheMappingLab, boundedBufferLab, arpResolutionLab, ipv4FragmentationLab,
  pythonCopyLab, gcCyclesLab, sqlWindowFrameLab, foreignKeyDeleteLab, linearRegressionLab, pcaProjectionLab,
  monotonicStackLab, bellmanFordLab, workingSetLab, priorityInheritanceLab, tcpTimeoutLab, dnsNegativeCacheLab,
  loopClosureLab, raiiCleanupLab, sqlUnionLab, candidateKeyLab, ridgeRegressionLab, stratifiedValidationLab,
  fenwickPrefixLab, longestSubsequenceLab, copyOnWriteLab, readerWriterLab, ethernetLearningLab, linkAggregationLab,
  microtaskQueueLab, vectorIteratorLab, notInNullLab, walCheckpointLab, silhouetteScoreLab, probabilityCalibrationLab,
  intervalSchedulingLab, bloomMembershipLab, feedbackQueueLab, fileLinksLab, spanningBridgeLab, ipv6PmtuLab,
  generatorExhaustionLab, mutableHashKeyLab, bufferPoolLab, mvccVersionsLab, imputationLeakageLab, earlyStoppingLab,
  differenceArrayLab, zeroOneKnapsackLab, slidingMaximumLab, rollingHashLab,
  lockOrderingLab, fileOffsetLab, cacheWritePolicyLab, conditionRecheckLab,
  tcpHandshakeLab, tcpSackLab, hopLimitLab, dnsReferralLab,
  mutableDefaultLab, exceptionGuaranteeLab, copyMoveLab, cStringLab,
  outerJoinFilterLab, lsmCompactionLab, consistentRingLab, coveringIndexLab,
  stableSoftmaxLab, causalMaskLab, dropoutModeLab, rankingMetricsLab] as const;

export type CurriculumLab = typeof curriculumLabs[number];
export type CurriculumLabId = CurriculumLab["id"];

export function getCurriculumLab(id: unknown) {
  return curriculumLabs.find((lab) => lab.id === id);
}
