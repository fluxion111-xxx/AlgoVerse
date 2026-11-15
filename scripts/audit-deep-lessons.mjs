import { writeFileSync } from "node:fs";
import { registerHooks } from "node:module";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.includes("/src/")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { curriculumChapters, curriculumGroups, learningTopicRoute, validateCurriculum } = await import("../src/lib/curriculum.ts");
const { getKnowledgeTopic, knowledgeEntries } = await import("../src/lib/knowledge.ts");
const { deepLessons } = await import("../src/content/lessons/index.ts");
hooks.deregister();

const errors = validateCurriculum();
// Record a topic only after its mechanism, worked case and exercise answers have been checked.
const reviewedBatches = [
  ["array-indexing", "virtual-pages", "cidr-prefix-match", "c-pointer-lifetime",
    "relational-selection-projection", "precision-recall", "bayes-rule"],
  ["dynamic-array-amortization", "translation-cache", "per-hop-delivery-probability",
    "c-allocation-ownership", "sql-inner-left-join", "confusion-matrix-miss-types", "total-probability-partition"],
  ["comparison-sort-decision-tree", "fifo-belady-anomaly", "tcp-rto-backoff", "c-realloc-temporary-pointer",
    "outer-join-on-where-predicate", "kmeans-plus-plus-distance", "conditional-independence-groups"],
  ["counting-sort", "lru-stack-distance", "tcpdump-one-sided-capture", "c-allocation-size-overflow",
    "aggregate-distinct-fanout", "silhouette-cluster-score", "joint-table-marginalize"],
  ["radix-lsd-stable-pass", "working-set-thrashing", "capture-select-loopback-or-egress", "c-unsigned-modular-arithmetic",
    "sql-having-group-filter", "adjusted-rand-label-permutation", "conditional-expectation-tower"],
  ["sorting-stability-records", "linux-reclaim-refault-working-set", "capture-filter-versus-display-filter",
    "type-check-implicit-conversion", "sql-rollup-subtotals", "dbscan-core-border-noise", "stratified-sampling-weighted-mean"],
  ["stable-merge-sort", "linux-mglru-generation-aging", "capture-snaplen-truncated-bytes",
    "constant-folding-language-rules", "olap-ratio-of-sums", "hierarchical-linkage-distance", "standard-error-mean-sqrt"],
  ["divide-merge-recurrence", "linux-reclaim-case-across-three-metrics", "capture-kernel-drops-visibility",
    "dead-code-side-effects", "columnar-analytical-scan", "distance-metrics", "ci-z-known-sigma-halfwidth"],
  ["master-theorem-balanced-case", "cgroup-memory-high-reclaim-throttle", "capture-model-hop-event-crosscheck",
    "dataflow-live-variable", "buffer-pool-pages", "knn-feature-scaling", "ci-t-unknown-sigma-df"],
];
const reviewed = new Map();
for (const [index, ids] of reviewedBatches.entries()) {
  for (const id of ids) {
    if (reviewed.has(id)) errors.push(`Topic reviewed in more than one batch: ${id}`);
    reviewed.set(id, index + 1);
  }
}
const scanned = new Set(curriculumChapters.flatMap(({ lessons }) => lessons.map(({ topic }) => topic.id)));
for (const { topic } of knowledgeEntries) {
  if (!scanned.has(topic.id)) errors.push(`No curriculum entry for ${topic.id}`);
}
for (const id of reviewed.keys()) {
  if (!deepLessons.has(id)) errors.push(`Reviewed lesson not registered: ${id}`);
}
for (const [id, lesson] of deepLessons) {
  if (!scanned.has(id) || !getKnowledgeTopic(lesson.next)) errors.push(`Broken lesson link: ${id}`);
  if (!lesson.goals.length || !lesson.sources.length || !lesson.recap.length
    || !lesson.blocks.some((block) => block.kind === "steps")
    || new Set(lesson.exercises.map(({ level }) => level)).size !== 3
    || lesson.exercises.some(({ explanation, review }) => !explanation.trim() || !lesson.blocks.some((block) => block.id === review))) {
    errors.push(`Missing teaching sections: ${id}`);
  }
}

function length(text) {
  return Array.from(text.replace(/\s+/gu, "")).length;
}

const byBody = new Map();
const byTitle = new Map();
const entries = curriculumChapters.flatMap(({ lessons }) => lessons);
function groupByValue(groups, value, id) {
  const ids = groups.get(value) ?? [];
  ids.push(id);
  groups.set(value, ids);
}
for (const { domain, topic } of entries) {
  const body = topic.sections.flatMap(({ paragraphs }) => paragraphs).join("").replace(/\s+/gu, "");
  const title = topic.title.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
  groupByValue(byBody, body, topic.id);
  groupByValue(byTitle, `${domain.id}/${title}`, topic.id);
}
function findDuplicates(groups) {
  const matches = [...groups.values()].filter((ids) => ids.length > 1);
  const peers = new Map(matches.flatMap((ids) => ids.map((id) => [id, ids.filter((other) => other !== id).join(" ")])));
  return { count: matches.length, peers };
}
const duplicateBodies = findDuplicates(byBody);
const duplicateTitles = findDuplicates(byTitle);

const records = entries.map((entry) => {
  const { domain, course, chapter, topic } = entry;
  const lesson = deepLessons.get(topic.id);
  const auditIssues = [];
  const originalLength = length(topic.sections.flatMap(({ paragraphs }) => paragraphs).join(""));
  const exerciseCount = lesson?.exercises.length ?? topic.teaching?.exercises.length ?? 0;
  const lessonLength = lesson ? length(lesson.blocks.flatMap((block) => {
    if (block.kind === "explain") return block.paragraphs;
    if (block.kind === "steps") return block.steps.map(({ text }) => text);
    return block.notes.map(({ text }) => text);
  }).join("")) : 0;
  if (!lesson && originalLength < 35) auditIssues.push("旧正文少于35字");
  else if (!lesson && originalLength <= 200) auditIssues.push("旧正文不超过200字");
  if (!lesson && !topic.teaching?.examples.length) auditIssues.push("缺少原有示例");
  if (!lesson) auditIssues.push("缺少分步课例与可调演示");
  if (exerciseCount < 3) auditIssues.push("练习少于3道");
  if (duplicateBodies.peers.has(topic.id)) auditIssues.push("旧正文精确重复，需复核");
  if (duplicateTitles.peers.has(topic.id)) auditIssues.push("模块内标题相同，需复核");
  const batch = reviewed.get(topic.id);
  return {
    domain: domain.id,
    batch,
    lesson: Boolean(lesson),
    exerciseCount,
    shortSource: originalLength < 35,
    briefSource: originalLength <= 200,
    fields: [domain.title, domain.id, course.title, course.id, chapter.title, chapter.id, topic.title, topic.id,
      batch ? "已深化" : lesson ? "已有深度课，待复审" : "待深化", batch ?? "",
      originalLength, lessonLength, exerciseCount, lesson?.demo ?? "", topic.experiments.map(({ engineId }) => engineId).join(" "),
      auditIssues.join("；"), duplicateBodies.peers.get(topic.id) ?? "", duplicateTitles.peers.get(topic.id) ?? "", learningTopicRoute(entry)],
  };
});
const summary = curriculumGroups.map((group) => {
  const own = records.filter(({ domain }) => domain === group.id);
  return {
    module: group.title,
    courses: group.courses.length,
    chapters: curriculumChapters.filter(({ group: chapterGroup }) => chapterGroup.id === group.id).length,
    topics: own.length,
    currentBatch: own.filter(({ batch }) => batch === reviewedBatches.length).length,
    reviewed: own.filter(({ batch }) => batch).length,
    existingToReview: own.filter(({ batch, lesson }) => lesson && !batch).length,
    toExpand: own.filter(({ lesson }) => !lesson).length,
  };
});

if (process.argv.includes("--write") && errors.length === 0) {
  const header = ["模块", "模块ID", "课程", "课程ID", "章节", "章节ID", "知识点", "知识点ID", "深化状态", "批次",
    "旧正文字数", "深度讲解字数", "练习题数", "可调教学演示", "关联执行器", "待检查项", "正文重复ID", "同模块同标题ID", "学习路径"];
  const csv = [header, ...records.map(({ fields }) => fields)]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  writeFileSync(new URL("../docs/课程深化进度.csv", import.meta.url), `\uFEFF${csv}\r\n`);
}
console.table(summary);
console.log(JSON.stringify({
  topics: records.length,
  deepLessons: deepLessons.size,
  reviewed: reviewed.size,
  deepExercises: records.filter(({ lesson }) => lesson).reduce((total, { exerciseCount }) => total + exerciseCount, 0),
  oldBodyUnder35: records.filter(({ shortSource }) => shortSource).length,
  shortTopicsWithoutDeepLesson: records.filter(({ shortSource, lesson }) => shortSource && !lesson).length,
  oldBodyAtMost200: records.filter(({ briefSource }) => briefSource).length,
  fewerThanThreeExercises: records.filter(({ exerciseCount }) => exerciseCount < 3).length,
  exactDuplicateBodyGroups: duplicateBodies.count,
  exactDuplicateTitleGroupsWithinModule: duplicateTitles.count,
  errors,
}, null, 2));
if (errors.length > 0) process.exitCode = 1;
