import { maxCreatorHistory, maxCreatorReplyLength, maxQuestionLength, type CreatorTurn } from "@/lib/experimentCreator";
import { agentDialogueActive, type AgentFocus, type TutorContext } from "@/lib/experimentAgent";
import { registeredEngines } from "@/lib/experimentEngines";
import { experimentEvidence } from "@/lib/experiments/evidence";
import { experimentReviewTopics, getExperimentTopic, getKnowledgeTopic, knowledgeTopicRoute } from "@/lib/knowledge";
import { searchKnowledge } from "@/lib/knowledgeSearch";
import { AIRequestError, aiErrorResponse, aiJson, asObject, readAICredentials, requestAIJson, type AICredentials } from "@/lib/server/aiProvider";
import { readTutorResolution, replyToAgentMessage, type TutorResolution } from "@/lib/server/experimentAgent";
import { createAgentTask, getAgentTask, getExperimentRun, getTopicPractice, saveAgentTask } from "@/lib/server/experimentRecords";
import { getDeepLesson } from "@/content/lessons/index";
import { normalizeTutorFencedReply, normalizeTutorReplyJson, readTutorCodeBlocks, requestedPythonVerbatimLine, type TutorCodeBlock } from "@/lib/tutorReply";

const tutorInstructions = [
  "你是计算机助教。解答问题、解释现象或按要求生成例题。分析代码的逻辑、边界和复杂度。不能声称已运行代码。",
  "优先用 knowledge。citations 是字符串数组，只填所引用的 knowledge.id。无相关资料时，可用一般知识，并说明知识库未覆盖。",
  "experiment 存在时，只用给定参数和指标描述本轮。无 experiment 时，不能声称读取了实验。",
  "lesson 属于当前课程。只有存在 practice 时才可引用本节最近答题结果。讲练习时先给思路，除非用户要求答案。补充练习仅供自学，不声称已记录或判分。",
  "询问答题记录时，先按对应题目的 correct 回答答对或答错，再给所需的提示。没有该题记录就说明没有记录。不要从题目内容猜测答题状态。",
  "recommend 只填 available 中相关实验的 ID。无推荐时省略或填 null。",
];
const tutorCodeInstructions = [
  "用户要求原样保留或只追加代码时，以 history 中对应的旧代码为准。未改动的行逐字保留，包括引号、反斜杠、分号和空白。",
  "用户直接给出的代码片段也按原文复制。追加顶层代码时不自行增加缩进。",
  "用户要求一段完整代码时，把所有对应的行放进同一个代码块。",
];
const experimentIntent = [
  '用户明确要设计、创建、修改、重试或优化实验时，返回 {"action":"plan","focus":{"topic":"从当前问题和历史找到的对象","goal":"完整的实验目标"}}。',
  '追问「帮我设计一个实验」时，沿用上一轮已经讨论的主题。已知主题就生成 plan，样例数据可由平台选择。明确指定新主题时加 focus.switchTopic:true。修改参数可记录在 focus.constraints。',
  '问概念、区别、代码或实测结果时正常回答。不要擅自创建实验，也不要编造实验数据。',
];

function citationId(citation: unknown) {
  if (typeof citation === "string") return citation;
  const item = asObject(citation);
  if (!item || (item.id !== undefined && item.topicId !== undefined && item.id !== item.topicId)) return null;
  const id = item.id ?? item.topicId;
  return typeof id === "string" ? id : null;
}

export async function POST(request: Request) {
  try {
    const payload = asObject(await request.json().catch(() => null));
    const shared = payload?.conversation === true;
    const changingContext = shared && payload.action === "context";
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    const url = new URL(request.url);
    if (shared && ((site && site !== "same-origin" && site !== "none") || (origin && origin !== url.origin))) {
      return aiJson({ status: "error", message: "请在本站操作。" }, 403);
    }
    let task = shared && payload.agentId !== undefined ? await getAgentTask(payload.agentId) : null;
    if (shared && payload.agentId !== undefined && !task) return aiJson({ status: "error", message: "找不到这段对话。" }, 404);
    if (task && task.revision !== payload?.revision) return aiJson({ status: "error", message: "对话已更新。请刷新。" }, 409);
    const rawQuestion = typeof payload?.question === "string" ? payload.question : "";
    const question = rawQuestion.trim();
    const history = shared ? [] : payload?.history ?? [];
    if ((!changingContext && (!question || question.length > maxQuestionLength)) || !Array.isArray(history) || history.length > maxCreatorHistory) {
      return aiJson({ status: "error", message: "请输入 1–300 字。" }, 400);
    }
    const turns: (CreatorTurn & { codeBlocks?: TutorCodeBlock[] })[] = [];
    for (const entry of history) {
      const turn = asObject(entry);
      if (typeof turn?.question !== "string" || turn.question.length > maxQuestionLength
        || typeof turn.answer !== "string" || turn.answer.length > maxCreatorReplyLength) return aiJson({ status: "error", message: "对话记录有误。" }, 400);
      const codeBlocks = readTutorCodeBlocks(turn.codeBlocks, turn.answer.length);
      if (!codeBlocks) return aiJson({ status: "error", message: "对话记录有误。" }, 400);
      turns.push({ question: turn.question, answer: turn.answer, ...(codeBlocks.length > 0 && { codeBlocks }) });
    }

    const topicId = payload?.topicId ?? (shared ? task?.tutorContext?.topicId : undefined);
    const topic = getKnowledgeTopic(topicId);
    if (topicId !== undefined && !topic) return aiJson({ status: "error", message: "找不到该知识点。" }, 404);
    if (payload?.includePractice !== undefined && (typeof payload.includePractice !== "boolean" || (payload.includePractice && !topic))) {
      return aiJson({ status: "error", message: "请选择要分享练习的知识点。" }, 400);
    }
    if (shared && payload?.includeExperiment !== undefined && typeof payload.includeExperiment !== "boolean") {
      return aiJson({ status: "error", message: "实验授权有误。" }, 400);
    }
    if (!shared && payload?.runId !== undefined && payload.includeExperiment !== true) {
      return aiJson({ status: "error", message: "请先允许读取本轮实验。" }, 400);
    }
    const selected = payload?.runId == null ? null : await getExperimentRun(payload.runId);
    if ((payload?.runId != null || payload?.includeExperiment === true) && !selected) return aiJson({ status: "error", message: "找不到本轮实验。" }, 404);
    const access: TutorContext = {
      topicId: topic?.topic.id, runId: selected?.id,
      includeExperiment: payload?.includeExperiment === true, includePractice: payload?.includePractice === true,
    };
    if (changingContext) {
      if (!task) return aiJson({ status: "error", message: "找不到这段对话。" }, 404);
      if (agentDialogueActive(task) || task.phase === "running" || task.phase === "deciding") {
        return aiJson({ status: "error", message: "当前请求还在处理。" }, 409);
      }
      const saved = await saveAgentTask(task, { tutorContext: access });
      if (!saved) return aiJson({ status: "error", message: "对话已更新。请刷新。" }, 409);
      return aiJson({ status: "context", task: saved });
    }
    const credentials = readAICredentials(request);
    if (question.includes(credentials.apiKey) || (shared && /\bsk-[A-Za-z0-9_-]{16,}\b/i.test(question))) {
      return aiJson({ status: "error", message: "请先移除问题里的 Key。" }, 400);
    }
    const run = access.includeExperiment ? selected : null;
    const lesson = topic && getDeepLesson(topic.topic.id);
    const exercises = topic ? [...(topic.topic.teaching?.exercises ?? []), ...(lesson?.exercises ?? [])] : [];
    const practice = topic && payload?.includePractice === true
      ? await getTopicPractice(topic.topic.id, exercises.map(({ id }) => id)) : undefined;
    async function resolve(turns: (CreatorTurn & { codeBlocks?: TutorCodeBlock[] })[], context: { focus?: AgentFocus; pendingTool?: string }, credentials: AICredentials) {
    const runTopic = run && getExperimentTopic(run.topicId, run.session.engineId);
    const matched = searchKnowledge(question);
    const fallback = !matched.length && turns.length ? searchKnowledge(turns.at(-1)!.question) : [];
    const review = run ? experimentReviewTopics(run.session.engineId, run.topicId) : [];
    const sources = [...new Set([...(topic ? [topic] : []), ...review, ...matched, ...fallback])].slice(0, 4);
    const input = { question, history: turns, ...(shared && { conversation: context }),
      ...(lesson && { lesson: { title: lesson.title, goals: lesson.goals, material: lesson.blocks.map((block) =>
        block.kind === "code" ? block.source : block.kind === "steps" ? block.steps.map(({ text }) => text).join("\n")
          : [block.formula, ...block.paragraphs].filter(Boolean).join("\n")).join("\n").slice(0, 2400) } }),
      ...(practice && { practice: exercises.filter(({ id }) => Object.hasOwn(practice, id)).map(({ id, prompt }) => ({
        id, prompt, correct: practice[id],
      })) }),
      experiment: run ? {
      engine: run.session.engineId, parameters: run.session.config, metrics: experimentEvidence(run.results),
    } : null, knowledge: sources.map(({ domain, course, chapter, topic }) => ({
      id: topic.id, domain: domain.title, course: course.title, chapter: chapter.title, title: topic.title,
      summary: topic.summary, objectives: topic.teaching?.objectives, examples: topic.teaching?.examples,
      misconceptions: topic.teaching?.misconceptions,
      ...(topic.teaching?.reference && { reference: {
        kind: topic.teaching.reference.kind, text: topic.teaching.reference.text.slice(0, 1200),
      } }),
      excerpt: topic.sections.flatMap(({ paragraphs }) => paragraphs).join("\n").slice(0, 800),
    })), available: registeredEngines.map(({ id, creator }) => ({ id, title: creator.title })) };
    if (JSON.stringify(input).includes(credentials.apiKey)) throw new AIRequestError("请先移除问题里的 Key。", 400);

    const requestedLine = credentials.selection.provider === "siliconflow" && credentials.selection.model === "backup"
      ? requestedPythonVerbatimLine(rawQuestion) : null;
    const explainOriginal = "平台会显示用户给出的代码。answer 只写原理和解释，不要复述任何代码。";
    return requestAIJson<TutorResolution>(credentials, {
      operation: "tutor",
      instructions: [
        ...tutorInstructions,
        ...(shared ? experimentIntent : []),
        ...(requestedLine !== null ? [explainOriginal, '只输出 JSON，例如 {"answer":"用中文解释代码的含义。","citations":[],"recommend":null}。'] : [
          ...tutorCodeInstructions,
          "只输出一个 JSON 对象。answer 只放解释，不复述代码。需要展示代码时用 codeBlocks，每个块用 language 标注语言，lines 每项是一行代码，保留行首缩进。无代码时省略 codeBlocks。",
          String.raw`示例：{"answer":"打印匹配结果。","codeBlocks":[{"language":"javascript","lines":["const found = /\\d/.test(\"1\");","console.log(found);"]}],"citations":[],"recommend":null}`,
        ]),
      ].join("\n"),
      input,
      maxTokens: 1100,
      normalizeContent: normalizeTutorReplyJson,
      backupTutorFormat: {
        instructions: (requestedLine !== null ? [
          "你是计算机助教。直接解释当前 question 中代码的含义，平台会原样显示代码。",
          "只用一行普通中文文字，固定以「说明：」开头。不要写 JSON、代码围栏、引用或额外段落。不要声称运行过代码。",
        ] : [
          ...tutorInstructions,
          ...(shared ? experimentIntent : []),
          ...tutorCodeInstructions,
          '直接输出最终答复。第一行写单行 JSON，例如 {"answer":"解释。","citations":[],"recommend":null}。answer 只写解释。',
          "有代码时，紧接着用 Markdown 三反引号代码块，打开时紧跟语言名。把代码原样写在围栏内，保留引号、反斜杠、换行及缩进。",
          "代码只写在围栏内。无代码时只输出第一行。不要追加说明。",
        ]).join("\n"),
        normalizeContent: (content) => normalizeTutorFencedReply(content, requestedLine),
      },
      validate(value) {
        const output = asObject(value);
        if (shared && output?.action === "plan") {
          const focus = readTutorResolution(output);
          return focus ? { action: "plan", focus } : null;
        }
        if (typeof output?.answer !== "string" || output.answer.length > maxCreatorReplyLength) return null;
        const answer = output.answer.trim();
        const modelBlocks = readTutorCodeBlocks(output.codeBlocks, output.answer.length);
        if (!modelBlocks || (requestedLine !== null && (!answer || answer.includes("```")))) return null;
        const codeBlocks = requestedLine !== null
          ? readTutorCodeBlocks([{ language: "python", lines: [requestedLine] }], output.answer.length) : modelBlocks;
        if (!codeBlocks || (!answer && !codeBlocks.length)) return null;
        if (Object.keys(output).some((key) => !["answer", "codeBlocks", "recommend", "citations"].includes(key))) return null;
        // An optional recommendation never supplies its own destination or invalidates the answer.
        const recommendation = registeredEngines.find((engine) => engine.id === output.recommend);
        const citations = output.citations ?? [];
        if (!Array.isArray(citations) || citations.length > sources.length) return null;
        const ids = citations.map(citationId);
        if (new Set(ids).size !== ids.length) return null;
        const cited = ids.map((id) => sources.find(({ topic }) => topic.id === id));
        if (cited.some((entry) => !entry)) return null;
        const linked = recommendation && [...cited, topic, runTopic].find((entry) =>
          entry?.topic.experiments.some(({ engineId }) => engineId === recommendation.id));
        const experimentHref = recommendation && (linked
          ? `${recommendation.route}?${new URLSearchParams({ topic: linked.topic.id })}#knowledge-lab`
          : recommendation.route);
        return {
          action: "answer", observation: answer,
          tutor: {
            ...(codeBlocks.length > 0 && { codeBlocks }),
            sources: cited.flatMap((entry) => entry ? [{ title: entry.topic.title, href: knowledgeTopicRoute(entry) }] : []),
            ...(recommendation && experimentHref && { recommendation: { title: recommendation.creator.title, href: experimentHref } }),
          },
        };
      },
    });
    }
    if (!shared) {
      const { result } = await resolve(turns, {}, credentials);
      if (result.action !== "answer") throw new AIRequestError("AI 回复格式有误。", 502);
      return aiJson({ status: "answer", answer: result.observation, ...result.tutor });
    }
    task ??= await createAgentTask(question, run?.session, run ?? undefined);
    const operationId = typeof payload.operationId === "string" && /^[a-f0-9-]{36}$/i.test(payload.operationId) ? payload.operationId : undefined;
    const next = await replyToAgentMessage(task, question, credentials, operationId, undefined, {
      access, run,
      resolve: (history, context, credentials) => resolve(history.slice(-maxCreatorHistory).map((turn) => ({
        question: turn.message, answer: turn.reply ?? "", codeBlocks: turn.tutor?.codeBlocks,
      })), context, credentials),
    });
    return aiJson(next.dialogue?.error ? { status: "error", message: next.dialogue.error, task: next } : { status: "shared", task: next });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
