import "server-only";
import { randomBytes } from "node:crypto";
import { creatorAnswerIntents, maxCreatorReplyLength, type CreatorAnswerIntent, type CreatorRequest } from "@/lib/experimentCreator";
import { registeredEngines, type EngineId, type ExperimentConfig } from "@/lib/experimentEngines";
import { experimentDomains } from "@/lib/experiments/engine";
import { asObject, requestAIJson, type AICredentials } from "./aiProvider";

type CreatorContext = { engine: string; version: number; question: string; config: ExperimentConfig; metrics?: Record<string, string> };
type CreatorDecision = { intent: CreatorAnswerIntent; answer: string; recommend?: EngineId }
  | { intent: "create" | "modify"; engineId: EngineId; version: number; config: ExperimentConfig };
const capabilities = registeredEngines.map(({ id, version, domain, creator }) => ({ id, version, domain, ...creator }));

const instructions = `你是 AlgoVerse 实验创造台。按用户实际语义和上下文判断意图。只输出一个 JSON 对象。
闲聊用 chat；计算机概念问答用 knowledge；学习算法原理、步骤或复杂度用 algorithm。直接给出有用的中文回答。用户提到某个算法，并不代表要运行实验。
只有用户想创建或修改一个可运行的实验时，才生成配置。按 capabilities 中的描述和参数选择引擎，不能超出其模型范围。未列出的实验、算法或规则属于 unsupported。解释缺少的能力；可推荐相关引擎。网络丢包的原理问题先解释，适合时用 recommend 推荐网络仿真，不要直接创建。
需要确认意图，或要修改但 currentExperiment 为空时用 clarify。明确的实验请求若未指定数据，可以构造小规模输入。修改时只改指定参数，其余沿用 currentExperiment。只比较算法原理时用 compare。若用户要分析已运行结果，用 analyze 并以 currentExperiment.metrics 为依据。没有指标时用 clarify，并请用户先运行。
输出格式二选一：
1. {"intent":"knowledge","answer":"这里写实际回答","recommend":"network-transmission"}。intent 可用 chat、knowledge、algorithm、compare、analyze、clarify、unsupported。recommend 可省略，只能是相关引擎 ID。answer 用短段落，不输出 HTML 或声称已运行。
2. {"intent":"create","engine":"sorting","version":1,"parameters":{"goalLabel":"比较交换次数","values":[7,2,9,4,3]}}。engine 和 version 按能力表选，parameters 严格使用对应引擎字段。修改时 intent 用 modify。禁止输出代码、统计、结果或额外字段。`;

export async function interpretCreatorRequest({ question, history }: CreatorRequest, current: CreatorContext | null, credentials: AICredentials) {
  return requestAIJson<CreatorDecision>(credentials, {
    operation: "experiment_creator",
    instructions,
    input: { domains: experimentDomains, capabilities, currentExperiment: current, conversation: history ?? [], question },
    maxTokens: 1200,
    validate(value) {
      const object = asObject(value);
      if (!object) return null;
      const { intent, answer, recommend, engine: id, version, parameters } = object;
      const answerIntent = creatorAnswerIntents.find((allowed) => allowed === intent);
      const recommendation = registeredEngines.find((entry) => entry.id === recommend);
      if (answerIntent === "analyze" && !current?.metrics) return null;
      if (answerIntent && (recommend === undefined ? Object.keys(object).length === 2 : !!recommendation && Object.keys(object).length === 3) && typeof answer === "string"
        && answer.trim() && answer.length <= maxCreatorReplyLength) {
        return { intent: answerIntent, answer: answer.trim(), ...(recommendation && { recommend: recommendation.id }) };
      }
      if ((intent !== "create" && intent !== "modify") || Object.keys(object).length !== 4) return null;
      const engine = registeredEngines.find((entry) => entry.id === id && entry.version === version);
      if (!engine || (intent === "modify" && (!current || current.engine !== id || current.version !== version))) return null;
      const config = engine.configure(parameters, randomBytes(4).readUInt32BE(0));
      return config && engine.validate(config) ? { intent, engineId: engine.id, version: engine.version, config } : null;
    },
  });
}
