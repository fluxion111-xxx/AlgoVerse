import "server-only";
import { randomBytes } from "node:crypto";
import { creatorAnswerIntents, maxCreatorReplyLength, type CreatorAnswerIntent, type CreatorPlanIntent, type CreatorRequest } from "@/lib/experimentCreator";
import { creatorCapabilities, creatorObservations } from "@/lib/creatorCapabilities";
import { getExperimentEngine, type EngineId, type ExperimentConfig, type ExperimentEngine } from "@/lib/experimentEngines";
import { experimentDomains, goalLabel } from "@/lib/experiments/engine";
import { asObject, requestAIJson, type AICredentials } from "./aiProvider";

type CreatorContext = { engine: EngineId; version: number; question: string; config: ExperimentConfig; metrics?: Record<string, string> };
type CreatorDecision = { intent: CreatorAnswerIntent; answer: string; recommend?: EngineId }
  | { intent: CreatorPlanIntent; engineId: EngineId; version: number; config: ExperimentConfig };

const instructions = `你是 AlgoVerse 实验创造台。结合 question、conversation 和 currentExperiment 理解用户想做什么。只输出一个 JSON 对象。
先区分知识问题和动手请求。已明确要求的平台做不到的实验，直接用 unsupported。只有信息缺失才用 clarify。
- unsupported：用户明确要求的实验、技术或关键条件超出 capabilities。说清缺少什么。例如要求在真实显卡训练 Transformer 并测量显存，或在真实网卡抓包，属于 unsupported。用户已经说明研究对象时无需追问。可以推荐相关实验，但要说明差别。
- clarify：缺少研究对象或关键目标，或想修改但没有当前实验。只问一个关键问题。不要自行假设需要对比。结合 conversation 处理用户的补充。
- knowledge：解释概念、原理、复杂度，或只谈理论差异。问指针是什么就直接解释地址和访问。问丢包原因先解释，可推荐 network-transmission。
- modify：在 currentExperiment 上调整配置。沿用同一引擎和版本。parameters 只写需要修改的顶层字段；若改某个列表或嵌套对象，提交该字段的完整新值，保留其他输入。改寻路要用 map 字段。
- analyze：解释当前已运行的结果，只依据 currentExperiment.metrics。带斜杠的对比指标按 comparison 中的顺序。概括本轮观察，避免推广到其他输入。没有指标时用 clarify，请用户先运行。
- compare：用户要求对照观察两种或多种方案，且同一引擎能在一轮计算全部请求项。即使第一次创建实验，也必须用 compare。例如“比较冒泡排序和快速排序”用 compare + sorting，“比较 Dijkstra 与 A*”用 compare + pathfinding。仅能选有 comparison 且覆盖所有请求项的引擎。
- create：用户想模拟或演示单个实验场景，未要求对比。明确目标但未给输入时，可选一组能观察该现象的小规模数据。例如“模拟 CPU 时间片轮转”用 create + cpu-scheduling，policy 为 rr。
capabilities 是可运行实验的完整清单。选覆盖用户需求的引擎，遵守参数范围和模型限制。单轮多套 CPU 调度策略超出现有引擎能力。不要把相似实验当成用户想要的实验。没有实测数据时不报结果。
knowledge、unsupported 答复格式：{"intent":"knowledge","answer":"写真实解释","recommend":null}。总是给出 recommend 字段。能用实验观察同一现象时，填引擎 ID。问数据包为何丢失时，回答原因，同时填 "recommend":"network-transmission"。指针概念入门可填 null。answer 不写引擎 ID 或 HTML，每句尽量不超过 15 字。
analyze 答复格式：{"intent":"analyze","answer":"引用本轮实测指标"}。
澄清格式：{"intent":"clarify","question":"你想验证什么现象？"}，只用 intent 和 question。
方案示例：{"intent":"compare","engine":"sorting","version":1,"parameters":{"goalLabel":"比较交换次数","values":[7,2,9,4,3]}}。
寻路示例：{"intent":"compare","engine":"pathfinding","version":1,"parameters":{"goalLabel":"比较访问节点数","map":{"kind":"random","difficulty":"normal"}}}。
create、compare 要提交全部必需参数，goalLabel 写具体验证目标，尽量不超过 15 字。modify 只提交改动字段。parameters 只能用该引擎的参数字段。不要抄入描述、规则、指标或代码。`;

function configureRevision(engine: ExperimentEngine, current: ExperimentConfig, parameters: Record<string, unknown>) {
  if (!Object.keys(parameters).length || !engine.validate(current)) return null;
  if ("walls" in current) {
    if (Object.hasOwn(parameters, "map")) {
      return engine.configure({ goalLabel: current.goalLabel, ...parameters }, randomBytes(4).readUInt32BE(0));
    }
    const goal = goalLabel(parameters.goalLabel);
    return goal && Object.keys(parameters).length === 1 ? { ...current, goalLabel: goal } : null;
  }
  // The seed is run metadata, not an input field the model can change.
  if ("seed" in current) {
    const { seed, ...input } = current;
    return engine.configure({ ...input, ...parameters }, seed);
  }
  return engine.configure({ ...current, ...parameters }, 0);
}

export async function interpretCreatorRequest({ question, history }: CreatorRequest, current: CreatorContext | null, credentials: AICredentials) {
  return requestAIJson<CreatorDecision>(credentials, {
    operation: "experiment_creator",
    instructions,
    input: { domains: experimentDomains, capabilities: creatorCapabilities, currentExperiment: current, conversation: history ?? [], question },
    maxTokens: 1200,
    validate(value) {
      const object = asObject(value);
      if (!object) return null;
      const { intent, recommend, engine: id, version, parameters } = object;
      const answer = intent === "clarify" ? object.question : object.answer;
      const answerIntent = creatorAnswerIntents.find((allowed) => allowed === intent);
      const recommendation = getExperimentEngine(recommend);
      if (answerIntent === "analyze" && !current?.metrics) return null;
      const validRecommendation = (intent === "knowledge" || intent === "unsupported") && (recommend === null || !!recommendation);
      if (answerIntent && (recommend === undefined ? Object.keys(object).length === 2 : validRecommendation && Object.keys(object).length === 3) && typeof answer === "string"
        && answer.trim() && answer.length <= maxCreatorReplyLength) {
        return { intent: answerIntent, answer: answer.trim(), ...(recommendation && { recommend: recommendation.id }) };
      }
      if ((intent !== "create" && intent !== "modify" && intent !== "compare") || Object.keys(object).length !== 4 || typeof version !== "number") return null;
      const engine = getExperimentEngine(id, version);
      const input = asObject(parameters);
      if (!engine || !input || (intent === "compare" && !creatorObservations[engine.id].comparison)) return null;
      const config = intent === "modify"
        ? current && current.engine === id && current.version === version && configureRevision(engine, current.config, input)
        : engine.configure(input, randomBytes(4).readUInt32BE(0));
      return config && engine.validate(config) ? { intent, engineId: engine.id, version: engine.version, config } : null;
    },
  });
}
