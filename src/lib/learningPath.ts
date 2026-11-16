import { getDeepLesson } from "@/content/lessons/index";
import { learningTopicRoute } from "./curriculum";
import { getKnowledgeTopic, knowledgeEntries, type KnowledgeEntry } from "./knowledge";
import { getPracticeExercise, practiceSummary, type PracticeAttempts, type PracticeDetails } from "./knowledgePractice";

type TopicProgress = {
  readTopics: ReadonlySet<string>;
  byTopic: Readonly<Record<string, unknown>>;
  practice?: PracticeAttempts;
  practiceDetails?: PracticeDetails;
};
type StudyGoal = KnowledgeEntry["domain"]["id"];
type Mistake = { topic: string; prompt: string; selected: string[]; explanation: string; hint?: string };
type Suggestion = {
  entry: KnowledgeEntry;
  href: string;
  angle: string;
  reason: string;
  practice: string;
  check: string;
  mistake?: Mistake;
};

export function suggestionStep(value: unknown) {
  const step = typeof value === "string" && /^\d{1,6}$/.test(value) ? Number(value) : value;
  return typeof step === "number" && Number.isSafeInteger(step) && step >= 0 && step < 1_000_000 ? step : 0;
}

export function topicTouched(id: string, progress: TopicProgress) {
  return progress.readTopics.has(id) || Boolean(progress.byTopic[id]) || practiceSummary(progress.practice?.[id]).answered > 0;
}

function collectMistakes(progress: TopicProgress, domainId?: StudyGoal) {
  return Object.entries(progress.practice ?? {}).flatMap(([topicId, attempts]) => {
    const entry = getKnowledgeTopic(topicId);
    if (!entry || (domainId && entry.domain.id !== domainId)) return [];
    return Object.entries(attempts).flatMap(([exerciseId, correct]) => {
      const question = correct === false ? getPracticeExercise(topicId, exerciseId) : undefined;
      if (!question) return [];
      const detail = progress.practiceDetails?.[topicId]?.[exerciseId];
      const { exercise } = question;
      const options = "options" in exercise ? exercise.options : [];
      const selected = Array.isArray(detail?.selectedOptions) ? detail.selectedOptions.flatMap((index) =>
        Number.isInteger(index) && options[index] !== undefined ? [options[index]] : []) : [];
      return [{ entry, question, selected, attemptedAt: detail?.attemptedAt ?? "" }];
    });
  }).sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt) || a.entry.topic.id.localeCompare(b.entry.topic.id)
    || a.question.exercise.id.localeCompare(b.question.exercise.id));
}

function mistakeSuggestion(mistakes: ReturnType<typeof collectMistakes>, progress: TopicProgress, domainId: StudyGoal | undefined, step: number): Suggestion {
  const { entry: original, question, selected } = mistakes[step % mistakes.length];
  const { exercise, interactive } = question;
  const mistake = {
    topic: original.topic.title, prompt: exercise.prompt, selected, explanation: exercise.explanation,
    hint: "wrong" in exercise ? exercise.wrong : undefined,
  };
  const reason = mistake.explanation;
  const href = learningTopicRoute(original, domainId);
  const retry = href.replace("#knowledge-topic", interactive ? `#lesson-exercise-${exercise.id}` : "#knowledge-practice");

  switch (Math.floor(step / mistakes.length) % 3) {
    case 0: {
      const entry = firstPrerequisite(original, progress);
      return entry !== original
        ? { entry, href: learningTopicRoute(entry, domainId), angle: "补上基础", mistake, reason,
          practice: "先看先修例子。再回到错题。", check: "说出这题用到了哪条规则。" }
        : { entry, href: retry, angle: "找出错点", mistake, reason,
          practice: mistake.hint || "圈出会改变答案的条件。", check: "说出原答案错在哪一步。" };
    }
    case 1:
      return { entry: original, href, angle: "对照验证", mistake, reason,
        practice: "只改一个条件。比较两种结果。", check: "说清结果为什么会变。" };
    default:
      return { entry: original, href: retry, angle: "重新作答", mistake, reason,
        practice: "盖住解析。先写两步，再作答。", check: "用题目条件核对每一步。" };
  }
}

export function learningSuggestion(progress: TopicProgress, domainId?: StudyGoal, step = 0): Suggestion | null {
  const position = suggestionStep(step);
  const mistakes = collectMistakes(progress, domainId);
  if (mistakes.length) return mistakeSuggestion(mistakes, progress, domainId, position);

  const entries = domainId ? knowledgeEntries.filter(({ domain }) => domain.id === domainId) : knowledgeEntries;
  const candidates: Suggestion[] = [];
  const seen = new Set<string>();
  for (const target of entries) {
    if (candidates.length >= 8) break;
    if (topicTouched(target.topic.id, progress)) continue;
    const entry = firstPrerequisite(target, progress);
    if (seen.has(entry.topic.id)) continue;
    seen.add(entry.topic.id);
    candidates.push({
      entry, href: learningTopicRoute(entry, domainId), angle: entry === target ? "先猜再读" : "补上基础",
      reason: entry.topic.summary,
      practice: "先猜例子的结果。再翻开讲解。",
      check: "换个输入，看看能否说对。",
    });
  }
  for (const entry of entries) {
    if (candidates.length >= 12) break;
    if (progress.byTopic[entry.topic.id] || seen.has(entry.topic.id)) continue;
    const experiment = entry.topic.experiments[0];
    if (!experiment) continue;
    candidates.push({
      entry, href: learningTopicRoute(entry, domainId).replace("#knowledge-topic", getDeepLesson(entry.topic.id) ? "#lesson-demo" : "#knowledge-topic"),
      angle: "动手验证", reason: "这节还没留下实验记录。",
      practice: experiment.prompt, check: "只改一项，比较前后结果。",
    });
  }
  if (!candidates.length) return null;
  const candidate = candidates[position % candidates.length];
  switch ((position + Math.floor(position / candidates.length)) % 3) {
    case 1:
      return { ...candidate, angle: "画个例子", practice: "画出一个最小例子。", check: "说清每一步用到的条件。" };
    case 2:
      return { ...candidate, angle: "找个反例", practice: "拿掉一个条件，再试一遍。", check: "找出结论不再成立的地方。" };
    default:
      return candidate;
  }
}

function firstPrerequisite(next: KnowledgeEntry, progress: TopicProgress) {
  const visited = new Set<string>();
  function first(entry: KnowledgeEntry): KnowledgeEntry {
    visited.add(entry.topic.id);
    for (const id of entry.topic.prerequisiteIds ?? []) {
      const prerequisite = getKnowledgeTopic(id);
      const { answered, correct } = practiceSummary(progress.practice?.[id]);
      if (prerequisite && !visited.has(id) && (!topicTouched(id, progress) || correct < answered)) return first(prerequisite);
    }
    return entry;
  }
  return first(next);
}
