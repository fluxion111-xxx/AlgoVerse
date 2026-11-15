import { asymptoticLesson } from "./asymptotic";
import { sortingLesson } from "./sorting";
import { indexLesson } from "./b-plus";
import { schedulingLesson } from "./cpu-scheduling";
import { memoryAllocationLesson } from "./memory-allocation";
import { networkTransmissionLesson } from "./network-transmission";
import { kMeansLesson } from "./k-means";
import { pageReplacementLesson } from "./page-replacement";
import { tcpCongestionLesson } from "./tcp-congestion";
import { transactionConcurrencyLesson } from "./transaction-concurrency";
import { gradientDescentLesson } from "./gradient-descent";
import { hashCollisionsLesson } from "./hash-collisions";
import { treeTraversalLesson } from "./tree-traversal";
import { graphTraversalLesson } from "./graph-traversal";
import { deadlockAvoidanceLesson } from "./deadlock-avoidance";
import { pathfindingLesson } from "./pathfinding";
import { dynamicRoutingLesson } from "./dynamic-routing";
import { recursionStackLesson } from "./recursion-stack";
import { knnClassificationLesson } from "./knn-classification";
import { arrayIndexingLesson } from "./array-indexing";
import { virtualPagesLesson } from "./virtual-pages";
import { cidrPrefixLesson } from "./cidr-prefix-match";
import { pointerLifetimeLesson } from "./c-pointer-lifetime";
import { selectionProjectionLesson } from "./relational-selection-projection";
import { precisionRecallLesson } from "./precision-recall";
import { bayesRuleLesson } from "./bayes-rule";
import { dynamicArrayLesson } from "./dynamic-array-amortization";
import { translationCacheLesson } from "./translation-cache";
import { perHopDeliveryLesson } from "./per-hop-delivery-probability";
import { allocationOwnershipLesson } from "./c-allocation-ownership";
import { sqlJoinLesson } from "./sql-inner-left-join";
import { confusionMatrixLesson } from "./confusion-matrix-miss-types";
import { totalProbabilityLesson } from "./total-probability-partition";
import { conditionalIndependenceLesson } from "./conditional-independence-groups";
import { comparisonSortDecisionTreeLesson } from "./comparison-sort-decision-tree";
import { fifoBeladyAnomalyLesson } from "./fifo-belady-anomaly";
import { tcpRtoBackoffLesson } from "./tcp-rto-backoff";
import { reallocTemporaryPointerLesson } from "./c-realloc-temporary-pointer";
import { outerJoinPredicateLesson } from "./outer-join-on-where-predicate";
import { kMeansPlusPlusLesson } from "./kmeans-plus-plus-distance";
import { countingSortLesson } from "./counting-sort";
import { lruStackDistanceLesson } from "./lru-stack-distance";
import { captureVantageLesson } from "./tcpdump-one-sided-capture";
import { allocationSizeOverflowLesson } from "./c-allocation-size-overflow";
import { aggregateFanoutLesson } from "./aggregate-distinct-fanout";
import { silhouetteScoreLesson } from "./silhouette-cluster-score";
import { jointMarginalLesson } from "./joint-table-marginalize";
import { radixLsdLesson } from "./radix-lsd-stable-pass";
import { workingSetLesson } from "./working-set-thrashing";
import { captureInterfaceLesson } from "./capture-select-loopback-or-egress";
import { unsignedModularLesson } from "./c-unsigned-modular-arithmetic";
import { sqlHavingLesson } from "./sql-having-group-filter";
import { adjustedRandLesson } from "./adjusted-rand-label-permutation";
import { conditionalExpectationLesson } from "./conditional-expectation-tower";
import { sortingStabilityLesson } from "./sorting-stability-records";
import { reclaimRefaultLesson } from "./linux-reclaim-refault-working-set";
import { captureFilterLesson } from "./capture-filter-versus-display-filter";
import { implicitConversionLesson } from "./type-check-implicit-conversion";
import { rollupSubtotalsLesson } from "./sql-rollup-subtotals";
import { dbscanNeighborhoodLesson } from "./dbscan-core-border-noise";
import { stratifiedSamplingLesson } from "./stratified-sampling-weighted-mean";
import { stableMergeLesson } from "./stable-merge-sort";
import { mglruAgingLesson } from "./linux-mglru-generation-aging";
import { snaplenLesson } from "./capture-snaplen-truncated-bytes";
import { constantFoldingLesson } from "./constant-folding-language-rules";
import { ratioOfSumsLesson } from "./olap-ratio-of-sums";
import { hierarchicalLinkageLesson } from "./hierarchical-linkage-distance";
import { sampleMeanErrorLesson } from "./standard-error-mean-sqrt";
import { divideMergeRecurrenceLesson } from "./divide-merge-recurrence";
import { reclaimMetricsLesson } from "./linux-reclaim-case-across-three-metrics";
import { captureKernelDropsLesson } from "./capture-kernel-drops-visibility";
import { deadCodeSideEffectsLesson } from "./dead-code-side-effects";
import { columnarScanLesson } from "./columnar-analytical-scan";
import { distanceMetricsLesson } from "./distance-metrics";
import { knownSigmaIntervalLesson } from "./ci-z-known-sigma-halfwidth";
import { balancedMasterTheoremLesson } from "./master-theorem-balanced-case";
import { memoryHighLesson } from "./cgroup-memory-high-reclaim-throttle";
import { hopCrosscheckLesson } from "./capture-model-hop-event-crosscheck";
import { liveVariablesLesson } from "./dataflow-live-variable";
import { bufferPoolLesson } from "./buffer-pool-pages";
import { knnFeatureScalingLesson } from "./knn-feature-scaling";
import { unknownSigmaIntervalLesson } from "./ci-t-unknown-sigma-df";
import type { DeepLesson } from "./types";

export const deepLessons: ReadonlyMap<string, DeepLesson> = new Map([
  ["asymptotic-bounds", asymptoticLesson],
  ["sorting-comparisons", sortingLesson],
  ["b-plus-index", indexLesson],
  ["cpu-time-slices", schedulingLesson],
  ["heap-fit-fragmentation", memoryAllocationLesson],
  ["packet-routing", networkTransmissionLesson],
  ["kmeans-assignment-update", kMeansLesson],
  ["page-replacement-lru", pageReplacementLesson],
  ["tcp-cwnd-rwnd", tcpCongestionLesson],
  ["mvcc-row-versions", transactionConcurrencyLesson],
  ["gradient-descent-step", gradientDescentLesson],
  ["open-addressing", hashCollisionsLesson],
  ["binary-tree-traversal", treeTraversalLesson],
  ["bfs-unweighted-distance", graphTraversalLesson],
  ["banker-safe-sequence", deadlockAvoidanceLesson],
  ["weighted-paths", pathfindingLesson],
  ["link-state-routing", dynamicRoutingLesson],
  ["recursion-stack", recursionStackLesson],
  ["knn-voting", knnClassificationLesson],
  ["array-indexing", arrayIndexingLesson],
  ["virtual-pages", virtualPagesLesson],
  ["cidr-prefix-match", cidrPrefixLesson],
  ["c-pointer-lifetime", pointerLifetimeLesson],
  ["relational-selection-projection", selectionProjectionLesson],
  ["precision-recall", precisionRecallLesson],
  ["bayes-rule", bayesRuleLesson],
  ["dynamic-array-amortization", dynamicArrayLesson],
  ["translation-cache", translationCacheLesson],
  ["per-hop-delivery-probability", perHopDeliveryLesson],
  ["c-allocation-ownership", allocationOwnershipLesson],
  ["sql-inner-left-join", sqlJoinLesson],
  ["confusion-matrix-miss-types", confusionMatrixLesson],
  ["total-probability-partition", totalProbabilityLesson],
  ["conditional-independence-groups", conditionalIndependenceLesson],
  ["comparison-sort-decision-tree", comparisonSortDecisionTreeLesson],
  ["fifo-belady-anomaly", fifoBeladyAnomalyLesson],
  ["tcp-rto-backoff", tcpRtoBackoffLesson],
  ["c-realloc-temporary-pointer", reallocTemporaryPointerLesson],
  ["outer-join-on-where-predicate", outerJoinPredicateLesson],
  ["kmeans-plus-plus-distance", kMeansPlusPlusLesson],
  ["counting-sort", countingSortLesson],
  ["lru-stack-distance", lruStackDistanceLesson],
  ["tcpdump-one-sided-capture", captureVantageLesson],
  ["c-allocation-size-overflow", allocationSizeOverflowLesson],
  ["aggregate-distinct-fanout", aggregateFanoutLesson],
  ["silhouette-cluster-score", silhouetteScoreLesson],
  ["joint-table-marginalize", jointMarginalLesson],
  ["radix-lsd-stable-pass", radixLsdLesson],
  ["working-set-thrashing", workingSetLesson],
  ["capture-select-loopback-or-egress", captureInterfaceLesson],
  ["c-unsigned-modular-arithmetic", unsignedModularLesson],
  ["sql-having-group-filter", sqlHavingLesson],
  ["adjusted-rand-label-permutation", adjustedRandLesson],
  ["conditional-expectation-tower", conditionalExpectationLesson],
  ["sorting-stability-records", sortingStabilityLesson],
  ["linux-reclaim-refault-working-set", reclaimRefaultLesson],
  ["capture-filter-versus-display-filter", captureFilterLesson],
  ["type-check-implicit-conversion", implicitConversionLesson],
  ["sql-rollup-subtotals", rollupSubtotalsLesson],
  ["dbscan-core-border-noise", dbscanNeighborhoodLesson],
  ["stratified-sampling-weighted-mean", stratifiedSamplingLesson],
  ["stable-merge-sort", stableMergeLesson],
  ["linux-mglru-generation-aging", mglruAgingLesson],
  ["capture-snaplen-truncated-bytes", snaplenLesson],
  ["constant-folding-language-rules", constantFoldingLesson],
  ["olap-ratio-of-sums", ratioOfSumsLesson],
  ["hierarchical-linkage-distance", hierarchicalLinkageLesson],
  ["standard-error-mean-sqrt", sampleMeanErrorLesson],
  ["divide-merge-recurrence", divideMergeRecurrenceLesson],
  ["linux-reclaim-case-across-three-metrics", reclaimMetricsLesson],
  ["capture-kernel-drops-visibility", captureKernelDropsLesson],
  ["dead-code-side-effects", deadCodeSideEffectsLesson],
  ["columnar-analytical-scan", columnarScanLesson],
  ["distance-metrics", distanceMetricsLesson],
  ["ci-z-known-sigma-halfwidth", knownSigmaIntervalLesson],
  ["master-theorem-balanced-case", balancedMasterTheoremLesson],
  ["cgroup-memory-high-reclaim-throttle", memoryHighLesson],
  ["capture-model-hop-event-crosscheck", hopCrosscheckLesson],
  ["dataflow-live-variable", liveVariablesLesson],
  ["buffer-pool-pages", bufferPoolLesson],
  ["knn-feature-scaling", knnFeatureScalingLesson],
  ["ci-t-unknown-sigma-df", unknownSigmaIntervalLesson],
]);

export function getDeepLesson(topicId: string) {
  return deepLessons.get(topicId);
}
