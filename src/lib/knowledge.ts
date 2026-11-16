import { algorithms } from "@/content/knowledge/algorithms";
import { artificialIntelligence } from "@/content/knowledge/ai";
import { databases } from "@/content/knowledge/databases";
import { networks } from "@/content/knowledge/networks";
import { operatingSystems } from "@/content/knowledge/operating-systems";
import { programming } from "@/content/knowledge/programming";
import { courseCatalogs, foundationsTitle, type KnowledgeAreaId } from "@/content/curriculum/catalog";
import { coreTopics } from "@/content/knowledge/core/index";
import { coverageTopics } from "@/content/knowledge/coverage/index";
import { depthTopics } from "@/content/knowledge/depth/index";
import { advancedTopics } from "@/content/knowledge/advanced/index";
import { specializedTopics } from "@/content/knowledge/specialized/index";
import { coverage700Topics } from "@/content/knowledge/coverage-700/index";
import { undergraduateTopics } from "@/content/knowledge/undergraduate/index";
import { coreDepthTopics } from "@/content/knowledge/core-depth/index";
import { appliedCoreTopics } from "@/content/knowledge/applied-core/index";
import { systemsPracticeTopics } from "@/content/knowledge/systems-practice/index";
import { advancedReasoningTopics } from "@/content/knowledge/advanced-reasoning/index";
import { measurementPracticeTopics } from "@/content/knowledge/measurement-practice/index";
import { evidencePracticeTopics } from "@/content/knowledge/evidence-practice/index";
import { fieldValidationTopics } from "@/content/knowledge/field-validation/index";
import { benchmarkValidationTopics } from "@/content/knowledge/benchmark-validation/index";
import { comparativeLabTopics } from "@/content/knowledge/comparative-labs/index";
import { diagnosticLabTopics } from "@/content/knowledge/diagnostic-labs/index";
import { verificationLabTopics } from "@/content/knowledge/verification-labs/index";
import { validationFollowupTopics } from "@/content/knowledge/validation-followup/index";
import { prospectiveValidationTopics } from "@/content/knowledge/prospective-validation/index";
import { evidenceCompletionTopics } from "@/content/knowledge/evidence-completion/index";
import { reproducibilityTopics } from "@/content/knowledge/reproducibility/index";
import { fieldEvaluationTopics } from "@/content/knowledge/field-evaluation/index";
import type { CoreTopic } from "@/content/knowledge/core/types";
import { teachingById } from "@/content/knowledge/teaching/index";
import { refineTeaching, reviewedTopicIds } from "@/content/knowledge/quality/index";
import type { EngineId } from "./experimentEngines";
import { curriculumLabs } from "./experiments/curriculumLabs";

export type KnowledgeTopic = {
  id: string;
  title: string;
  difficulty?: "基础" | "进阶" | "拓展";
  summary: string;
  sections: readonly { title: string; paragraphs: readonly string[] }[];
  sources: readonly { title: string; href: string }[];
  prerequisiteIds?: readonly string[];
  relatedTopicIds?: readonly string[];
  experiments: readonly { engineId: EngineId; label: string; prompt: string }[];
  teaching?: {
    difficulty: "基础" | "进阶" | "拓展";
    objectives: readonly string[];
    examples: readonly string[];
    misconceptions: readonly string[];
    reference?: { kind: "formula" | "code"; text: string };
    exercises: readonly { id: string; prompt: string; options: readonly string[]; answer: number; explanation: string }[];
  };
};

type KnowledgeChapter = { id: string; title: string; topics: readonly KnowledgeTopic[] };
type KnowledgeCourse = { id: string; title: string; chapters: readonly KnowledgeChapter[] };
export type KnowledgeDomain = { id: KnowledgeAreaId; title: string; courses: readonly KnowledgeCourse[] };

export type KnowledgeEntry = {
  domain: KnowledgeDomain;
  course: KnowledgeCourse;
  chapter: KnowledgeChapter;
  topic: KnowledgeTopic;
};

function addCoreTopics(domain: KnowledgeDomain, additions: readonly CoreTopic[]): KnowledgeDomain {
  const courses = new Map(domain.courses.map((course) => [course.id, {
    id: course.id, title: course.title,
    chapters: new Map(course.chapters.map((chapter) => [chapter.id, { ...chapter, topics: [...chapter.topics] }])),
  }]));
  const catalog = courseCatalogs[domain.id];
  const outlines = new Map(catalog.map((course) => [course.id, {
    title: course.title, chapters: new Map(course.chapters.map(([id, title]) => [id, title])),
  }]));
  for (const { courseId, chapterId, topic } of additions) {
    const courseOutline = outlines.get(courseId);
    const chapterOutline = courseOutline?.chapters.get(chapterId);
    if (!courseOutline || !chapterOutline) throw new Error(`Unknown chapter for ${topic.id}: ${domain.id}/${courseId}/${chapterId}`);
    const course = courses.get(courseId) ?? { id: courseId, title: courseOutline.title, chapters: new Map() };
    const chapter = course.chapters.get(chapterId) ?? { id: chapterId, title: chapterOutline, topics: [] };
    chapter.topics.push(topic);
    course.chapters.set(chapterId, chapter);
    courses.set(courseId, course);
  }
  return { ...domain, courses: [...courses.values()].map((course) => ({ ...course,
    chapters: [...course.chapters.values()].map((chapter) => ({ ...chapter, topics: chapter.topics.map(teach) })),
  })) };
}

const topicBatches: readonly Partial<Record<KnowledgeAreaId, readonly CoreTopic[]>>[] = [
  coreTopics, coverageTopics, depthTopics, advancedTopics, specializedTopics, coverage700Topics, undergraduateTopics, coreDepthTopics,
  appliedCoreTopics, systemsPracticeTopics, advancedReasoningTopics, measurementPracticeTopics,
  evidencePracticeTopics, fieldValidationTopics, benchmarkValidationTopics, comparativeLabTopics, diagnosticLabTopics,
  verificationLabTopics,
  validationFollowupTopics,
  prospectiveValidationTopics,
  evidenceCompletionTopics,
  reproducibilityTopics,
  fieldEvaluationTopics,
];

const curriculumExperiments = new Map<string, KnowledgeTopic["experiments"][number][]>();
for (const { id, creator, curriculum } of curriculumLabs) {
  for (const topicId of curriculum.topics) {
    const experiments = curriculumExperiments.get(topicId) ?? [];
    experiments.push({ engineId: id, label: `运行${creator.title}`, prompt: curriculum.alternateTrial });
    curriculumExperiments.set(topicId, experiments);
  }
}

function withTopicBatches(domain: KnowledgeDomain) {
  return addCoreTopics(domain, topicBatches.flatMap((batch) => batch[domain.id] ?? []));
}

export const knowledgeDomains: readonly KnowledgeDomain[] = [
  algorithms, operatingSystems, networks, programming, databases, artificialIntelligence,
].map(withTopicBatches);

const foundationKnowledge = withTopicBatches({ id: "foundations", title: foundationsTitle, courses: [] });

const topicsById = new Map<string, KnowledgeEntry>();
const firstTopicByDomain = new Map<KnowledgeDomain["id"], KnowledgeEntry>();

function teach(topic: KnowledgeTopic): KnowledgeTopic {
  const teaching = Object.hasOwn(teachingById, topic.id) ? teachingById[topic.id] : topic.teaching;
  const experiments = curriculumExperiments.get(topic.id);
  return refineTeaching({ ...topic,
    ...(teaching && { difficulty: teaching.difficulty, teaching }),
    ...(experiments && { experiments: [...topic.experiments, ...experiments] }),
  });
}

for (const domain of [...knowledgeDomains, foundationKnowledge]) {
  for (const course of domain.courses) {
    for (const chapter of course.chapters) {
      for (const topic of chapter.topics) {
        const entry = { domain, course, chapter, topic };
        if (topicsById.has(topic.id)) throw new Error(`Duplicate knowledge topic: ${topic.id}`);
        topicsById.set(topic.id, entry);
        if (!firstTopicByDomain.has(domain.id)) firstTopicByDomain.set(domain.id, entry);
      }
    }
  }
}
for (const id of Object.keys(teachingById)) {
  if (!topicsById.has(id)) throw new Error(`Teaching notes refer to unknown topic: ${id}`);
}
for (const id of reviewedTopicIds) {
  if (!topicsById.has(id)) throw new Error(`Teaching review refers to unknown topic: ${id}`);
}
for (const lab of curriculumLabs) {
  for (const id of lab.curriculum.topics) {
    if (topicsById.get(id)?.domain.id !== lab.domain) throw new Error(`Invalid knowledge topic for ${lab.id}: ${id}`);
  }
}

export function getDefaultKnowledgeTopic(domainId: KnowledgeDomain["id"]) {
  return firstTopicByDomain.get(domainId);
}

export function getKnowledgeTopic(id: unknown) {
  return typeof id === "string" ? topicsById.get(id) : undefined;
}

export const knowledgeEntries: readonly KnowledgeEntry[] = [...topicsById.values()];

export function hasCompleteTeaching(topic: KnowledgeTopic) {
  const { teaching } = topic;
  return !!teaching
    && topic.summary.trim().length > 0
    && topic.sections.some(({ paragraphs }) => paragraphs.some((paragraph) => paragraph.trim()))
    && topic.sources.some(({ title, href }) => title.trim() && URL.parse(href)?.protocol === "https:")
    && [teaching.objectives, teaching.examples, teaching.misconceptions].every((items) => items.some((item) => item.trim()))
    && teaching.exercises.length > 0
    && teaching.exercises.every(({ id, prompt, options, answer, explanation }) =>
      /^[a-z][a-z0-9-]*$/.test(id) && prompt.trim() && explanation.trim() && options.length >= 2
      && new Set(options.map((option) => option.trim())).size === options.length
      && options.every((option) => option.trim()) && Number.isInteger(answer) && answer >= 0 && answer < options.length)
    && new Set(teaching.exercises.map(({ id }) => id)).size === teaching.exercises.length;
}

export function getExperimentTopic(id: unknown, engineId: EngineId) {
  const entry = getKnowledgeTopic(id);
  return entry?.topic.experiments.some((experiment) => experiment.engineId === engineId) ? entry : undefined;
}

export function experimentReviewTopics(engineId: EngineId, topicId?: string) {
  const explicit = getExperimentTopic(topicId, engineId);
  const matching = knowledgeEntries.filter(({ topic }) => topic.experiments.some((experiment) => experiment.engineId === engineId));
  return explicit ? [explicit, ...matching.filter((entry) => entry !== explicit)] : matching;
}

export function knowledgeTopicRoute({ domain, course, chapter, topic }: KnowledgeEntry, runId?: string) {
  if (domain.id === "foundations") {
    const params = new URLSearchParams({ module: domain.id, course: course.id, chapter: chapter.id, topic: topic.id });
    return `/learning-path?${params}#knowledge-topic`;
  }
  const params = new URLSearchParams({ view: "knowledge", topic: topic.id });
  if (runId) params.set("runId", runId);
  return `/experiments/${domain.id}?${params}#knowledge-topic`;
}
