import { courseCatalogs, foundationsTitle } from "@/content/curriculum/catalog";
import { getExperimentEngine } from "./experimentEngines";
import { hasCompleteTeaching, knowledgeDomains, knowledgeEntries, type KnowledgeEntry } from "./knowledge";

export const curriculumGroups = [
  ...knowledgeDomains.map(({ id, title }) => ({ id, title, courses: courseCatalogs[id] })),
  { id: "foundations" as const, title: foundationsTitle, courses: courseCatalogs.foundations },
];

export type CurriculumGroup = (typeof curriculumGroups)[number];
export type CurriculumScope = { module?: string; course?: string; chapter?: string };

export const chapterFilters = {
  all: "全部章节",
  outline: "仅有目录",
  readable: "已有正文",
  complete: "教学已完善",
  lab: "可运行实验",
} as const;
export type ChapterFilter = keyof typeof chapterFilters;
type ChapterStatus = "outline" | "readable" | "complete";

function chapterKey(module: string, course: string, chapter: string) {
  return `${module}/${course}/${chapter}`;
}

const lessonsByChapter = new Map<string, KnowledgeEntry[]>();
for (const entry of knowledgeEntries) {
  const key = chapterKey(entry.domain.id, entry.course.id, entry.chapter.id);
  const lessons = lessonsByChapter.get(key) ?? [];
  lessons.push(entry);
  lessonsByChapter.set(key, lessons);
}

export const curriculumChapters = curriculumGroups.flatMap((group) => group.courses.flatMap((course) =>
  course.chapters.map(([id, title, coverage]) => {
    const key = chapterKey(group.id, course.id, id);
    const lessons = lessonsByChapter.get(key) ?? [];
    const hasLab = lessons.some(({ topic, domain }) =>
      topic.experiments.some(({ engineId }) => getExperimentEngine(engineId)?.domain === domain.id));
    const status: ChapterStatus = !lessons.length ? "outline" : lessons.every(({ topic }) => hasCompleteTeaching(topic)) ? "complete" : "readable";
    return { key, group, course, id, title, coverage, lessons, status, hasLab };
  }),
));

const chaptersByKey = new Map(curriculumChapters.map((chapter) => [chapter.key, chapter]));

// Chapter-level study links can point to a syllabus while lessons are still being written.
const preparation = {
  "algorithms/algorithm-basics/correctness": ["foundations/discrete-mathematics/proofs"],
  "algorithms/algorithm-design/approximation-guarantees": ["algorithms/algorithm-design/greedy", "foundations/optimization-methods/linear-programming"],
  "programming/compiler-basics/parsing": ["foundations/formal-languages/context-free"],
  "programming/compiler-basics/type-checking": ["programming/programming-languages/types"],
  "programming/compiler-basics/runtime-representation": ["programming/runtime-memory/function-calls"],
  "programming/compiler-basics/compiler-end-to-end": ["programming/compiler-basics/type-checking", "programming/compiler-basics/intermediate-representation"],
  "programming/compiler-basics/source-parsing-lab": ["programming/compiler-basics/parsing", "programming/compiler-basics/type-checking"],
  "programming/compiler-basics/ssa-construction": ["programming/compiler-basics/intermediate-representation"],
  "programming/compiler-basics/loop-ssa": ["programming/compiler-basics/ssa-construction"],
  "programming/compiler-basics/register-allocation": ["programming/compiler-basics/intermediate-representation", "programming/compiler-basics/loop-ssa"],
  "programming/compiler-basics/native-codegen-lab": ["programming/compiler-basics/source-parsing-lab", "programming/compiler-basics/ssa-construction"],
  "programming/computer-graphics/perspective-rasterization": ["programming/computer-graphics/camera-projection", "programming/computer-graphics/rasterization"],
  "programming/computer-graphics/gpu-raster-materials": ["programming/computer-graphics/perspective-rasterization", "programming/computer-graphics/lighting-rendering"],
  "programming/computer-graphics/pbr-scene-device-comparison": ["programming/computer-graphics/gpu-raster-materials"],
  "programming/computer-graphics/gltf-cross-host-comparison": ["programming/computer-graphics/pbr-scene-device-comparison"],
  "programming/computer-graphics/gltf-pixel-attribution": ["programming/computer-graphics/gltf-cross-host-comparison"],
  "programming/computer-graphics/gltf-host-reproduction": ["programming/computer-graphics/gltf-pixel-attribution"],
  "programming/computer-graphics/gltf-independent-host-validation": ["programming/computer-graphics/gltf-host-reproduction"],
  "programming/computer-graphics/gltf-replication-evidence": ["programming/computer-graphics/gltf-independent-host-validation"],
  "programming/computer-graphics/gltf-host-evidence-audit": ["programming/computer-graphics/gltf-replication-evidence"],
  "programming/computer-graphics/gltf-physical-host-matching": ["programming/computer-graphics/gltf-host-evidence-audit"],
  "programming/computer-graphics/gltf-retest-evidence": ["programming/computer-graphics/gltf-physical-host-matching"],
  "operating-systems/digital-logic/boolean-algebra": ["foundations/discrete-mathematics/logic"],
  "operating-systems/file-systems/crash-testing": ["operating-systems/file-systems/durable-file-updates"],
  "operating-systems/computer-architecture/pipeline-cache-analysis": ["operating-systems/computer-architecture/pipeline", "operating-systems/computer-architecture/caches"],
  "operating-systems/computer-architecture/out-of-order-execution": ["operating-systems/computer-architecture/pipeline-cache-analysis"],
  "operating-systems/computer-architecture/mesi-coherence": ["operating-systems/computer-architecture/caches", "operating-systems/computer-architecture/multicore"],
  "operating-systems/computer-architecture/directory-coherence": ["operating-systems/computer-architecture/mesi-coherence"],
  "operating-systems/file-systems/linux-device-io": ["operating-systems/computer-organization/io", "operating-systems/file-systems/storage-devices"],
  "operating-systems/parallel-computing/mpi-messaging": ["operating-systems/processes/process-thread"],
  "operating-systems/parallel-computing/mpi-collectives": ["operating-systems/parallel-computing/mpi-messaging", "operating-systems/parallel-computing/parallel-patterns"],
  "operating-systems/parallel-computing/mpi-cross-node": ["operating-systems/parallel-computing/mpi-messaging", "operating-systems/parallel-computing/mpi-collectives"],
  "operating-systems/memory-management/linux-reclaim": ["operating-systems/memory-management/fault-diagnostics"],
  "operating-systems/processes/syscall-tracing": ["operating-systems/processes/kernel-entry", "operating-systems/file-systems/file-interfaces"],
  "operating-systems/memory-management/fault-diagnostics": ["operating-systems/memory-management/demand-paging"],
  "networks/cryptography/security-goals": ["foundations/probability-and-statistics/conditional-probability"],
  "networks/routing-and-switching/packet-trace-diagnostics": ["networks/routing-and-switching/capture-evidence", "networks/internet/transport-layer"],
  "networks/routing-and-switching/ipv6-transition": ["networks/internet/network-layer"],
  "networks/routing-and-switching/dual-end-capture": ["networks/routing-and-switching/capture-evidence"],
  "networks/network-security/threat-model-workshop": ["networks/network-security/threat-models"],
  "networks/web-security/authorization-audit": ["networks/web-security/authorization", "networks/network-security/threat-model-workshop"],
  "networks/web-security/service-authorization-regression": ["networks/web-security/authorization-audit", "networks/web-security/sessions"],
  "networks/web-security/role-revocation-cache-isolation": ["networks/web-security/service-authorization-regression"],
  "networks/web-security/online-revocation-cdn-verification": ["networks/web-security/role-revocation-cache-isolation"],
  "databases/database-design/dependencies": ["foundations/discrete-mathematics/sets-and-relations"],
  "databases/transaction-management/distributed-atomic-commit": ["databases/transaction-management/recovery", "operating-systems/distributed-systems/systems-model"],
  "databases/transaction-management/aries-recovery-trace": ["databases/transaction-management/recovery"],
  "databases/transaction-management/aries-fuzzy-checkpoints": ["databases/transaction-management/aries-recovery-trace"],
  "databases/storage-and-query/query-plan-diagnostics": ["databases/storage-and-query/cost-optimization", "databases/storage-and-query/index-structures"],
  "foundations/stochastic-processes/process-basics": ["foundations/probability-and-statistics/joint-distributions"],
  "foundations/probability-and-statistics/interval-coverage": ["foundations/probability-and-statistics/inference"],
  "foundations/probability-and-statistics/dependent-heavy-tail-inference": ["foundations/probability-and-statistics/interval-coverage"],
  "foundations/probability-and-statistics/nonstationary-heavy-tails": ["foundations/probability-and-statistics/dependent-heavy-tail-inference"],
  "foundations/probability-and-statistics/real-heavy-tail-backtesting": ["foundations/probability-and-statistics/nonstationary-heavy-tails"],
  "foundations/probability-and-statistics/heavy-tail-interval-replay": ["foundations/probability-and-statistics/real-heavy-tail-backtesting", "foundations/probability-and-statistics/interval-coverage"],
  "foundations/probability-and-statistics/nonfinancial-tail-coverage": ["foundations/probability-and-statistics/heavy-tail-interval-replay"],
  "foundations/probability-and-statistics/cross-domain-conditional-coverage": ["foundations/probability-and-statistics/nonfinancial-tail-coverage"],
  "foundations/probability-and-statistics/station-forward-coverage": ["foundations/probability-and-statistics/cross-domain-conditional-coverage"],
  "foundations/probability-and-statistics/auditable-station-forecasting": ["foundations/probability-and-statistics/station-forward-coverage"],
  "foundations/probability-and-statistics/public-forecast-revision": ["foundations/probability-and-statistics/auditable-station-forecasting"],
  "foundations/probability-and-statistics/cross-day-approved-coverage": ["foundations/probability-and-statistics/public-forecast-revision"],
  "foundations/probability-and-statistics/live-high-flow-verification": ["foundations/probability-and-statistics/cross-day-approved-coverage"],
  "foundations/signals-and-systems/fourier-computation": ["foundations/signals-and-systems/frequency-domain"],
  "foundations/signals-and-systems/digital-filtering": ["foundations/signals-and-systems/fourier-computation", "foundations/signals-and-systems/linear-systems"],
  "foundations/signals-and-systems/fixed-point-filtering": ["foundations/signals-and-systems/digital-filtering"],
  "foundations/signals-and-systems/embedded-iir-validation": ["foundations/signals-and-systems/fixed-point-filtering"],
  "foundations/signals-and-systems/target-iir-cycle-measurement": ["foundations/signals-and-systems/embedded-iir-validation"],
  "foundations/stochastic-processes/continuous-time-chains": ["foundations/stochastic-processes/arrival-processes", "foundations/stochastic-processes/markov-long-run"],
  "foundations/optimization-methods/convex-models": ["foundations/calculus/multivariable"],
  "foundations/optimization-methods/numerical-error-and-stopping": ["foundations/optimization-methods/unconstrained-methods", "foundations/optimization-methods/constrained-methods", "foundations/numerical-analysis/floating-point"],
  "ai/ai-foundations/graphical-model-inference": ["ai/ai-foundations/probabilistic-reasoning", "foundations/stochastic-processes/markov-transitions"],
  "ai/ai-foundations/variational-inference": ["ai/ai-foundations/graphical-model-inference"],
  "ai/ai-foundations/particle-filtering": ["ai/ai-foundations/graphical-model-inference", "foundations/stochastic-processes/markov-transitions"],
  "ai/ai-foundations/particle-path-degeneracy": ["ai/ai-foundations/particle-filtering"],
  "ai/ai-foundations/recorded-sensor-smoothing": ["ai/ai-foundations/particle-path-degeneracy", "foundations/probability-and-statistics/nonstationary-heavy-tails"],
  "ai/ai-foundations/nonlinear-trajectory-smoothing": ["ai/ai-foundations/recorded-sensor-smoothing"],
  "ai/ai-foundations/multisite-fixed-lag-smoothing": ["ai/ai-foundations/nonlinear-trajectory-smoothing"],
  "ai/ai-foundations/raw-vio-lag-latency": ["ai/ai-foundations/multisite-fixed-lag-smoothing"],
  "ai/ai-foundations/six-dof-fixed-lag-delivery": ["ai/ai-foundations/raw-vio-lag-latency"],
  "ai/ai-foundations/spatial-vio-fixed-lag": ["ai/ai-foundations/six-dof-fixed-lag-delivery"],
  "ai/ai-foundations/vio-map-recovery-delivery": ["ai/ai-foundations/spatial-vio-fixed-lag"],
  "ai/ai-foundations/cross-scene-loop-timing": ["ai/ai-foundations/vio-map-recovery-delivery"],
  "ai/ai-foundations/long-loop-exposure-benchmark": ["ai/ai-foundations/cross-scene-loop-timing"],
  "ai/ai-foundations/outdoor-vio-loop-screening": ["ai/ai-foundations/long-loop-exposure-benchmark"],
  "ai/computer-vision/digital-image-processing": ["ai/computer-vision/image-formation"],
  "ai/computer-vision/video-processing": ["ai/computer-vision/digital-image-processing", "foundations/signals-and-systems/digital-filtering"],
  "ai/computer-vision/video-rate-distortion": ["ai/computer-vision/video-processing"],
  "ai/computer-vision/real-video-codec-comparison": ["ai/computer-vision/video-rate-distortion"],
  "ai/computer-vision/raw-video-codec-benchmark": ["ai/computer-vision/real-video-codec-comparison"],
  "ai/computer-vision/long-hd-codec-comparison": ["ai/computer-vision/raw-video-codec-benchmark"],
  "ai/computer-vision/native-hd-uhd-encoding": ["ai/computer-vision/long-hd-codec-comparison"],
  "ai/computer-vision/uhd-equal-rate-perception": ["ai/computer-vision/native-hd-uhd-encoding"],
  "ai/computer-vision/multi-title-4k-rate-quality": ["ai/computer-vision/uhd-equal-rate-perception"],
  "ai/computer-vision/natural-hdr-full-rate": ["ai/computer-vision/multi-title-4k-rate-quality"],
  "ai/computer-vision/hdr10plus-frame-audit": ["ai/computer-vision/natural-hdr-full-rate"],
  "ai/computer-vision/hdr10plus-multisource-display": ["ai/computer-vision/hdr10plus-frame-audit"],
  "ai/computer-vision/hdr10plus-observer-validation": ["ai/computer-vision/hdr10plus-multisource-display"],
  "ai/unsupervised-learning/dimension-reduction": ["foundations/linear-algebra/eigenvalues"],
  "ai/deep-learning/backpropagation": ["foundations/calculus/differentiation"],
  "ai/supervised-learning/linear-models": ["foundations/numerical-analysis/numerical-systems"],
} satisfies Record<string, readonly string[]>;

export function chapterPreparation(key: string) {
  return (Object.hasOwn(preparation, key) ? preparation[key as keyof typeof preparation] : [])
    .map((target) => chaptersByKey.get(target))
    .filter((chapter) => chapter !== undefined);
}

export function resolveCurriculumScope(scope: CurriculumScope) {
  const group = curriculumGroups.find(({ id }) => id === scope.module);
  const course = group?.courses.find(({ id }) => id === scope.course);
  const chapter = group && course && scope.chapter ? chaptersByKey.get(chapterKey(group.id, course.id, scope.chapter)) : undefined;
  return { group, course, chapter };
}

export function matchesCurriculumScope(
  entry: { module: string; course: string; chapter: string }, scope: CurriculumScope,
) {
  return (!scope.module || entry.module === scope.module)
    && (!scope.course || entry.course === scope.course)
    && (!scope.chapter || entry.chapter === scope.chapter);
}

export function matchesChapterFilter(chapter: (typeof curriculumChapters)[number], filter: ChapterFilter) {
  if (filter === "all") return true;
  if (filter === "lab") return chapter.hasLab;
  if (filter === "readable") return chapter.lessons.length > 0;
  return chapter.status === filter;
}

function searchText(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s·、，。/]+/g, "");
}

const chapterIndex = curriculumChapters.map((chapter) => {
  const { group, course, id, title, coverage } = chapter;
  const fields = [[title, 8], [course.title, 5], [coverage, 3], [group.title, 2], [id, 2], [course.id, 2]] as const;
  return {
    chapter,
    fields: fields.map(([value, weight]) => [searchText(value), weight] as const),
  };
});

export function searchCurriculum(query: string, scope: CurriculumScope = {}, filter: ChapterFilter = "all") {
  const words = query.trim().split(/\s+/).map(searchText).filter(Boolean);
  if (!words.length) return [];
  return chapterIndex.flatMap(({ chapter, fields }) => {
    if (!matchesCurriculumScope({ module: chapter.group.id, course: chapter.course.id, chapter: chapter.id }, scope)
      || !matchesChapterFilter(chapter, filter)) return [];
    let score = 0;
    for (const word of words) {
      const match = Math.max(0, ...fields.map(([field, weight]) => field === word ? weight * 2 : field.includes(word) ? weight : 0));
      if (!match) return [];
      score += match;
    }
    return [{ chapter, score }];
  }).sort((left, right) => right.score - left.score).map(({ chapter }) => chapter);
}

export function curriculumRoute(scope: CurriculumScope = {}, goal?: string, search?: { q?: string; page?: number; status?: ChapterFilter }) {
  const params = new URLSearchParams();
  if (goal) params.set("goal", goal);
  if (scope.module) params.set("module", scope.module);
  if (scope.course) params.set("course", scope.course);
  if (scope.chapter) params.set("chapter", scope.chapter);
  if (search?.status && search.status !== "all") params.set("status", search.status);
  if (search?.q) params.set("q", search.q);
  if (search?.page && search.page > 1) params.set("page", String(search.page));
  return `/learning-path${params.size ? `?${params}` : ""}#knowledge-map`;
}

export function learningTopicRoute({ domain, course, chapter, topic }: KnowledgeEntry, goal?: string) {
  const href = curriculumRoute({ module: domain.id, course: course.id, chapter: chapter.id }, goal);
  return `${href.split("#", 1)[0]}&topic=${encodeURIComponent(topic.id)}#knowledge-topic`;
}

export function validateCurriculum() {
  const errors: string[] = [];
  const ids = new Set<string>();
  function checkId(id: string, key: string) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) errors.push(`Invalid ID: ${key}`);
    if (ids.has(key)) errors.push(`Duplicate ID: ${key}`);
    ids.add(key);
  }
  for (const { id, courses } of curriculumGroups) {
    checkId(id, id);
    for (const course of courses) {
      checkId(course.id, `${id}/${course.id}`);
      if (!course.title.trim() || !course.chapters.length || !course.sources.length
        || course.sources.some(({ title, href }) => !title.trim() || URL.parse(href)?.protocol !== "https:")) {
        errors.push(`Incomplete course: ${id}/${course.id}`);
      }
    }
  }
  for (const chapter of curriculumChapters) {
    checkId(chapter.id, chapter.key);
    if (!chapter.title.trim() || !chapter.coverage.trim()) errors.push(`Incomplete chapter: ${chapter.key}`);
  }
  for (const [key, [entry]] of lessonsByChapter) {
    const chapter = chaptersByKey.get(key);
    if (!chapter) errors.push(`Unlisted teaching chapter: ${key}`);
    else if (chapter.course.title !== entry.course.title || chapter.title !== entry.chapter.title) {
      errors.push(`Mismatched teaching titles: ${key}`);
    }
  }
  for (const [key, targets] of Object.entries(preparation)) {
    if (!chaptersByKey.has(key) || targets.some((target) => target === key || !chaptersByKey.has(target))) {
      errors.push(`Invalid chapter reference: ${key}`);
    }
  }
  const topics = new Map(knowledgeEntries.map(({ topic }) => [topic.id, topic]));
  const active = new Set<string>();
  const visited = new Set<string>();
  function checkPrerequisites(id: string) {
    if (active.has(id)) { errors.push(`Prerequisite cycle: ${id}`); return; }
    if (visited.has(id)) return;
    active.add(id);
    for (const prerequisite of topics.get(id)?.prerequisiteIds ?? []) {
      if (!topics.has(prerequisite)) errors.push(`Missing prerequisite: ${id} → ${prerequisite}`);
      else checkPrerequisites(prerequisite);
    }
    active.delete(id);
    visited.add(id);
  }
  for (const { domain, topic } of knowledgeEntries) {
    checkId(topic.id, `topic/${topic.id}`);
    if (!topic.summary.trim() || !topic.sections.some(({ paragraphs }) => paragraphs.some((text) => text.trim()))
      || !topic.sources.length || topic.sources.some(({ href }) => URL.parse(href)?.protocol !== "https:")) {
      errors.push(`Incomplete knowledge topic: ${topic.id}`);
    }
    if (topic.relatedTopicIds?.some((id) => id === topic.id || !topics.has(id))) errors.push(`Invalid related topic: ${topic.id}`);
    if (topic.experiments.some(({ engineId }) => getExperimentEngine(engineId)?.domain !== domain.id)) errors.push(`Invalid topic experiment: ${topic.id}`);
    if (topic.teaching && !hasCompleteTeaching(topic)) errors.push(`Invalid teaching content: ${topic.id}`);
    checkPrerequisites(topic.id);
  }
  return errors;
}
