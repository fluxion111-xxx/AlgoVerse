import { containsPossibleAIKey } from "@/lib/aiSettings";
import { maxCreatorHistory, maxCreatorReplyLength, maxQuestionLength, type CreatorTurn } from "@/lib/experimentCreator";
import { agentDialogueActive, hasAgentOperation, isAgentOperationId, type AgentFocus, type AgentTask, type TutorContext } from "@/lib/experimentAgent";
import { registeredEngines } from "@/lib/experimentEngines";
import { experimentEvidence } from "@/lib/experiments/evidence";
import { experimentReviewTopics, getExperimentTopic, getKnowledgeTopic, knowledgeTopicRoute } from "@/lib/knowledge";
import { searchKnowledge } from "@/lib/knowledgeSearch";
import { agentWorkbenchLink } from "@/lib/navigation";
import { AIRequestError, aiErrorResponse, aiJson, asObject, readAICredentials, requestAIJson, type AICredentials, type AIStageTrace } from "@/lib/server/aiProvider";
import { containsSavedAIKey, readCredentialSession } from "@/lib/server/aiCredentialSession";
import { readAgentFocus, readPlanFocus, recentAgentTurns, replyToAgentMessage, type TutorResolution } from "@/lib/server/experimentAgent";
import { createAgentTask, getAgentTask, getExperimentRun, getTopicPractice, saveAgentTask } from "@/lib/server/experimentRecords";
import { getDeepLesson } from "@/content/lessons/index";
import { formatTutorFormulas, maxTutorTextLength, normalizeTutorFencedReply, normalizeTutorFormulaJSON, normalizeTutorReplyJson, readPlainTutorPreview, readTutorAnswerPreview, readTutorCodeBlocks, requestedPythonVerbatimLine, splitTutorText, tutorMetaMarker, tutorPlanMarker, type TutorCodeBlock } from "@/lib/tutorReply";

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
  '用户要求设计、创建、试跑、修改或继续实验时，返回 {"action":"plan","focus":{"topic":"对象与方法","goal":"完整的实验目标"}}。',
  '例如，用户先问「冒泡排序和快速排序谁更快？」再说「请你帮我实验」，必须返回 {"action":"plan","focus":{"topic":"冒泡排序和快速排序","goal":"用同一组输入比较冒泡排序和快速排序的比较及交换次数"}}。',
  '用最近对话和 conversation.focus 补全「帮我实验」「跑一下看看」里的省略。已知对象时直接返回 plan；缺少样例数据时平台可选择。保留明确给定的数值、方法和限制，在 focus.constraints 记录。',
  '问谁更快、概念、区别、代码或实测结果时直接回答。技术答复附上 focus.topic，并在有清楚的可测目标时写 focus.goal。改话题时在 focus 中加 switchTopic:true。闲聊可省略 focus。',
  '只在当前请求和对话均未说明实验对象时问一个问题。不要在回答中声称已运行。平台只接收 plan 对象来打开工作台。',
];
const experimentFollowUp = /^(?:请(?:你|您)?)?(?:(?:帮我|给我|替我|来)?(?:设计|做|跑|运行|执行)?(?:一?[个次轮场组])?(?:这个|那个|刚才的)?实验(?:一下|看看|吧)?|(?:帮我)?(?:跑|试|验证)(?:一下|看看|一遍|吧))[。.!！]?$/u;

function citationId(citation: unknown) {
  if (typeof citation === "string") return citation;
  const item = asObject(citation);
  if (!item || (item.id !== undefined && item.topicId !== undefined && item.id !== item.topicId)) return null;
  const id = item.id ?? item.topicId;
  return typeof id === "string" ? id : null;
}

function tutorJson(text: string) {
  try { return asObject(JSON.parse(text)); } catch { return null; }
}

function sharedReply(task: AgentTask, operationId?: string) {
  const turn = operationId ? task.dialogue?.turns.find((entry) => entry.operationId === operationId) : task.dialogue?.turns.at(-1);
  if (!turn && agentDialogueActive(task)) return aiJson({ status: "pending", task });
  if (task.dialogue?.error && (!operationId || !turn)) {
    return aiJson({ status: "error", message: task.dialogue.error, code: task.dialogue.errorCode, task });
  }
  if (!turn && operationId && task.dialogue?.operationId === operationId && task.dialogue.pending) {
    return aiJson({ status: "error", message: "回复中断。可重试。", task });
  }
  if (turn?.stopped) return aiJson({ status: "stopped", task });
  const workbench = turn === task.dialogue?.turns.at(-1) && turn?.action === "run" && task.phase === "confirm"
    ? agentWorkbenchLink({ agentId: task.id }) : undefined;
  return aiJson({ status: "shared", task, workbench });
}

function streamTutorReply(run: (delta: (text: string) => void) => Promise<Response>) {
  const encoder = new TextEncoder();
  let disconnected = false;
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: object) => {
        if (!disconnected) controller.enqueue(encoder.encode("data: " + JSON.stringify(event) + "\n\n"));
      };
      send({ type: "ready" });
      void (async () => {
        try {
          const response = await run((text) => send({ type: "delta", text }));
          send({ type: "result", status: response.status, body: await response.json() });
        } catch (error) {
          const response = aiErrorResponse(error);
          send({ type: "result", status: response.status, retryAfter: response.headers.get("Retry-After"), body: await response.json() });
        } finally {
          if (!disconnected) controller.close();
        }
      })();
    },
    cancel() { disconnected = true; },
  }), { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "private, no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const payload = asObject(await request.json().catch(() => null));
    const shared = payload?.conversation === true;
    const changingContext = shared && payload.action === "context";
    const starting = shared && payload.action === "start";
    const operationId = isAgentOperationId(payload?.operationId) ? payload.operationId : undefined;
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    if (shared && ((site && site !== "same-origin" && site !== "none") || (origin && origin !== `${url.protocol}//${host}`))) {
      return aiJson({ status: "error", message: "请在本站操作。" }, 403);
    }
    if (starting && (!operationId || payload.agentId !== undefined)) return aiJson({ status: "error", message: "会话请求格式有误。" }, 400);
    let task = shared ? await getAgentTask(payload.agentId ?? operationId) : null;
    if (shared && payload.agentId !== undefined && !task) return aiJson({ status: "error", message: "找不到这段对话。" }, 404);
    if (task && !starting && !changingContext && operationId
      && (task.dialogue?.operationId === operationId || hasAgentOperation(task, operationId))) return sharedReply(task, operationId);
    if (task && payload?.agentId !== undefined && task.revision !== payload.revision) {
      return aiJson({ status: "error", message: "对话已更新。请重试。", task }, 409);
    }
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
    if (question.includes(credentials.apiKey) || containsSavedAIKey(request, question)
      || (shared && containsPossibleAIKey(question))) {
      return aiJson({ status: "error", message: "请先移除问题里的 Key。" }, 400);
    }
    const run = access.includeExperiment ? selected : null;
    if (starting) {
      task ??= await createAgentTask(question, run?.session, run ?? undefined, { tutorContext: access, researchId: operationId });
      return aiJson({ status: "started", task });
    }
    const streaming = shared && !!operationId && credentials.selection.provider === "deepseek"
      && request.headers.get("accept")?.split(",").some((type) => type.trim() === "text/event-stream");
    const plainTutor = shared && credentials.visitor === undefined;
    const forbiddenOutput = plainTutor ? [credentials.apiKey, ...Object.values(readCredentialSession(request)?.providers ?? {}).map(({ apiKey }) => apiKey)] : [];
    const lesson = topic && getDeepLesson(topic.topic.id);
    const exercises = topic ? [...(topic.topic.teaching?.exercises ?? []), ...(lesson?.exercises ?? [])] : [];
    const practice = topic && payload?.includePractice === true
      ? await getTopicPractice(topic.topic.id, exercises.map(({ id }) => id)) : undefined;
    async function resolve(turns: (CreatorTurn & { codeBlocks?: TutorCodeBlock[] })[], context: { focus?: AgentFocus; pendingTool?: string }, credentials: AICredentials,
      trace?: AIStageTrace, publish?: (text: string) => void) {
    const runTopic = run && getExperimentTopic(run.topicId, run.session.engineId);
    const matched = searchKnowledge(question);
    const fallback = !matched.length && turns.length ? searchKnowledge(turns.at(-1)!.question) : [];
    const review = run ? experimentReviewTopics(run.session.engineId, run.topicId) : [];
    const sources = [...new Set([...(topic ? [topic] : []), ...review, ...matched, ...fallback])].slice(0, 4);
    const relatedTools = new Set(sources.flatMap(({ topic }) => topic.experiments.map(({ engineId }) => engineId)));
    const available = registeredEngines.filter(({ id }) => !plainTutor || relatedTools.has(id) || run?.session.engineId === id || context.pendingTool === id)
      .map(({ id, creator }) => ({ id, title: creator.title }));
    // The shared DeepSeek conversation already ends with this question as a user message.
    const input = { ...(!(shared && credentials.selection.provider === "deepseek") && { question }),
      ...(shared ? { conversation: context } : { history: turns }),
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
    })), available };
    const serialized = JSON.stringify(input);
    if (serialized.includes(credentials.apiKey) || containsSavedAIKey(request, serialized)) throw new AIRequestError("请先移除问题里的 Key。", 400);

    const requestedLine = credentials.selection.provider === "siliconflow" && credentials.selection.model === "backup"
      ? requestedPythonVerbatimLine(rawQuestion) : null;
    const explainOriginal = "平台会显示用户给出的代码。answer 只写原理和解释，不要复述任何代码。";
    const hasSecret = (text: string) => forbiddenOutput.some((key) => text.includes(key)) || containsPossibleAIKey(text);
    let published = "";
    const options = {
      operation: "tutor" as const, trace,
      ...(publish && { tutorStream: { onContent(content: string) {
        const preview = readPlainTutorPreview(content) || readTutorAnswerPreview(content);
        if (hasSecret(preview)) throw new AIRequestError("AI 回复校验失败。请重试。", 502);
        // Keep an unfinished key-like suffix on the server until it can be checked.
        const safe = preview.replace(/s(?:k(?:-[a-z0-9_.-]*)?)?$/i, "");
        if (!safe.startsWith(published) || safe.length === published.length || !safe.trim()) return;
        if (!published) console.info("AlgoVerse tutor stream", JSON.stringify({ traceId: trace?.id, firstAnswerMs: Date.now() - started }));
        publish(safe.slice(published.length));
        published = safe;
      } } }),
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
      ...(shared && { dialogue: [...turns.flatMap(({ question, answer, codeBlocks }) => [
        { role: "user" as const, content: question },
        ...(answer || codeBlocks?.length ? [{ role: "assistant" as const, content: codeBlocks?.length ? JSON.stringify({ answer, codeBlocks }) : answer }] : []),
      ]), { role: "user" as const, content: question }] }),
      maxTokens: 1100,
      retryFormat: shared,
      normalizeContent: normalizeTutorReplyJson,
      ...(shared && credentials.selection.provider === "deepseek" && { normalizeBeforeParse: normalizeTutorFormulaJSON }),
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
        normalizeContent: (content: string) => normalizeTutorFencedReply(content, requestedLine),
      },
      validate(value: unknown, answerLimit = maxCreatorReplyLength): TutorResolution | null {
        const output = asObject(value);
        if (plainTutor && hasSecret(JSON.stringify(value) ?? "")) return null;
        if (shared && output?.action === "plan") {
          const focus = readPlanFocus(output);
          return focus ? { action: "plan", focus } : null;
        }
        if (!output) return null;
        const rawAnswer = shared ? output.answer ?? output.observation : output.answer;
        if (typeof rawAnswer !== "string" || rawAnswer.length > answerLimit) return null;
        const answer = (shared && credentials.selection.provider === "deepseek" ? formatTutorFormulas(rawAnswer) : rawAnswer).trim();
        const modelBlocks = readTutorCodeBlocks(output.codeBlocks, rawAnswer.length);
        if (!modelBlocks || (requestedLine !== null && (!answer || answer.includes("```")))) return null;
        const codeBlocks = requestedLine !== null
          ? readTutorCodeBlocks([{ language: "python", lines: [requestedLine] }], rawAnswer.length) : modelBlocks;
        if (!codeBlocks || (!answer && !codeBlocks.length)) return null;
        if (Object.keys(output).some((key) => !["answer", "codeBlocks", "recommend", "citations"].includes(key)
          && !(shared && (key === "focus" || key === "observation"
            || (key === "action" && (output.action === "answer" || output.action === "clarify")))))) return null;
        if (shared && output.answer !== undefined && output.observation !== undefined && output.answer !== output.observation) return null;
        // An optional recommendation never supplies its own destination or invalidates the answer.
        const recommendation = available.some(({ id }) => id === output.recommend)
          ? registeredEngines.find((engine) => engine.id === output.recommend) : undefined;
        const citations = output.citations ?? [];
        if (!shared && (!Array.isArray(citations) || citations.length > sources.length)) return null;
        const ids = Array.isArray(citations) ? citations.map(citationId) : [];
        const cited = [...new Set(ids)].flatMap((id) => sources.filter(({ topic }) => topic.id === id));
        if (!shared && cited.length !== ids.length) return null;
        const linked = recommendation && [...cited, topic, runTopic].find((entry) =>
          entry?.topic.experiments.some(({ engineId }) => engineId === recommendation.id));
        const experimentHref = recommendation && (linked
          ? `${recommendation.route}?${new URLSearchParams({ topic: linked.topic.id })}#knowledge-lab`
          : recommendation.route);
        return {
          action: "answer", observation: answer, focus: shared ? readAgentFocus(output.focus) : undefined,
          tutor: {
            ...(codeBlocks.length > 0 && { codeBlocks }),
            sources: cited.map((entry) => ({ title: entry.topic.title, href: knowledgeTopicRoute(entry) })),
            ...(recommendation && experimentHref && { recommendation: { title: recommendation.creator.title, href: experimentHref } }),
          },
        };
      },
    };
    if (!plainTutor) return requestAIJson<TutorResolution>(credentials, options);
    return requestAIJson<TutorResolution>(credentials, {
      ...options,
      retryFormat: false,
      instructions: [
        "你是计算机助教。普通问答直接用自然语言或 Markdown 回答。用代码围栏展示完整代码。公式用易读的数学符号或 LaTeX。",
        "结合会话与 knowledge 回答。可用一般知识补充。只使用已授权的 experiment 和 practice；不要声称运行了代码或读取了未提供的实测、练习。",
        "保留用户明确给出的参数、方法和限制。如果用户明确要求设计、创建或继续实验，才使用下面的交接格式。仅问概念、原理、结果或代码时直接回答。",
        tutorPlanMarker + '\n{"action":"plan","focus":{"topic":"实验主题","goal":"实验目标","constraints":"用户给出的必要约束"}}',
        '普通回复不需要元数据。如需附上知识引用、实验推荐或更新会话主题，可在正文后加一个独立的末行，使用给定的 knowledge.id 和 available.id：',
        tutorMetaMarker + ' {"citations":["knowledge.id"],"recommend":"available.id","focus":{"topic":"主题"}}',
      ].join("\n"),
      parseText(content) {
        if (hasSecret(content)) throw new AIRequestError("AI 回复校验失败。请重试。", 502);
        if (content.startsWith(tutorPlanMarker + "\n") || content.startsWith(tutorPlanMarker + "\r\n")) {
          const intent = tutorJson(content.slice(tutorPlanMarker.length).trim());
          return intent?.action === "plan" ? options.validate(intent) : null;
        }
        // Accept a valid older answer envelope without requiring one from the model.
        const legacy = /^[{\x60]/.test(content) ? tutorJson(normalizeTutorReplyJson(normalizeTutorFormulaJSON(content))) : null;
        if (legacy && typeof legacy.answer === "string" && (Array.isArray(legacy.citations) || Array.isArray(legacy.codeBlocks))) {
          const decoded = options.validate(legacy, maxTutorTextLength);
          if (decoded?.action === "answer") return decoded;
          if (!legacy.answer.trim()) throw new AIRequestError("AI 未返回正文，请重试。", 502);
          return options.validate({ answer: legacy.answer }, maxTutorTextLength);
        }
        const { answer, metadata } = splitTutorText(content);
        const details = metadata ? tutorJson(metadata) : null;
        if (!answer.trim()) throw new AIRequestError("AI 未返回正文，请重试。", 502);
        return options.validate({ answer, citations: details?.citations, recommend: details?.recommend, focus: details?.focus }, maxTutorTextLength);
      },
    });
    }
    if (!shared) {
      const { result } = await resolve(turns, {}, credentials);
      if (result.action !== "answer") throw new AIRequestError("AI 回复格式有误。", 502);
      return aiJson({ status: "answer", answer: result.observation, ...result.tutor });
    }
    task ??= await createAgentTask(question, run?.session, run ?? undefined, { tutorContext: access, researchId: operationId });
    const currentTask = task;
    const reply = async (publish?: (text: string) => void) => {
    const next = await replyToAgentMessage(currentTask, question, credentials, operationId, undefined, {
      access, run,
      async resolve(history, context, credentials, trace) {
        const focus = context.focus;
        if (!plainTutor && focus && experimentFollowUp.test(question.normalize("NFKC"))) {
          return { action: "plan", focus: { ...focus, goal: focus.goal ?? focus.topic } };
        }
        const { result, model } = await resolve(recentAgentTurns(history, maxCreatorHistory).map((turn) => ({
          question: turn.message, answer: turn.reply ?? "", codeBlocks: turn.tutor?.codeBlocks,
        })), context, credentials, trace, publish);
        return { ...result, model };
      },
    });
    return sharedReply(next, operationId);
    };
    return streaming ? streamTutorReply(reply) : await reply();
  } catch (error) {
    return aiErrorResponse(error);
  }
}
