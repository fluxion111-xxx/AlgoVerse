import { knowledgeEntries, type KnowledgeEntry } from "./knowledge";

export const maxKnowledgeQueryLength = 300;

let segmenter: Intl.Segmenter | undefined;
const ignored = new Set(["的", "了", "吗", "和", "与", "及", "怎么", "什么", "如何", "为什么", "区别", "比较", "解释", "实验", "这", "这个", "一下", "请", "帮", "能", "会", "是", "the", "and", "how", "what", "why", "is"]);
const technicalNames = /[a-z][a-z0-9]*(?:[+*]+)?/g;
const hasHan = /\p{Script=Han}/u;

function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[‐‑–—]/g, "-").trim();
}

function terms(normalized: string) {
  const names = normalized.match(technicalNames) ?? [];
  segmenter ??= new Intl.Segmenter("zh-CN", { granularity: "word" });
  const words = [...segmenter.segment(normalized.replace(technicalNames, " "))]
    .filter(({ isWordLike, segment }) => isWordLike && segment.length >= 2 && hasHan.test(segment))
    .map(({ segment }) => segment);
  return [...new Set([...names, ...words])].filter((word) => !ignored.has(word));
}

function buildSearchIndex() {
  return knowledgeEntries.map((entry) => {
    const { topic, course, chapter } = entry;
    const title = normalize(topic.title);
    const fields = [
      [topic.title, 8], [topic.summary, 4], [`${course.title} ${chapter.title}`, 2],
      [topic.sections.map(({ title, paragraphs }) => [title, ...paragraphs].join(" ")).join(" "), 2],
    ] as const;
    return {
      entry, title,
      fields: fields.map(([value, weight]) => {
        const text = normalize(value);
        // Chinese keywords already match substrings, so only technical names need a token index.
        return { text, names: new Set(text.match(technicalNames)), weight };
      }),
    };
  });
}

let searchable: ReturnType<typeof buildSearchIndex> | undefined;

export function searchKnowledge(query: string, domainId?: KnowledgeEntry["domain"]["id"]) {
  const phrase = normalize(query.slice(0, maxKnowledgeQueryLength));
  if (!phrase) return [];
  const keywords = terms(phrase).map((word) => ({ word, isHan: hasHan.test(word), isName: /^[a-z]/.test(word) }));
  searchable ??= buildSearchIndex();
  return searchable.flatMap(({ entry, title, fields }) => {
    if (domainId && entry.domain.id !== domainId) return [];
    const exact = title === phrase;
    if (!exact && !keywords.length) return [];
    const score = fields.reduce((total, field, index) => {
      const matches = keywords.filter(({ word, isHan }) => isHan ? field.text.includes(word) : field.names.has(word));
      // Technical names in a topic title should outrank generic words repeated in prose.
      const namedMatches = index === 0 ? matches.filter(({ isName }) => isName).length : 0;
      return total + field.weight * (matches.length + namedMatches + (phrase.length > 2 && field.text.includes(phrase) ? 2 : 0));
    }, 0);
    return exact || score >= 2 ? [{ entry, score, exact }] : [];
  }).sort((left, right) => Number(right.exact) - Number(left.exact) || right.score - left.score).map(({ entry }) => entry);
}
