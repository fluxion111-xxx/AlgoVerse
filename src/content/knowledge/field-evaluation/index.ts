import { hostRetestTopics } from "./graphics";
import { hdrObserverTopics } from "./hdr";
import { outdoorScreeningTopics } from "./trajectory";
import { liveHighFlowTopics } from "./water";

export const fieldEvaluationTopics = {
  foundations: liveHighFlowTopics,
  programming: hostRetestTopics,
  ai: [...hdrObserverTopics, ...outdoorScreeningTopics],
};
