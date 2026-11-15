import { crossDomainCoverageTopics } from "./coverage";
import { crossHostGraphicsTopics } from "./graphics";
import { fullLengthVideoTopics } from "./video";
import { sixDofFusionTopics } from "./vio";

export const verificationLabTopics = {
  foundations: crossDomainCoverageTopics,
  programming: crossHostGraphicsTopics,
  ai: [...fullLengthVideoTopics, ...sixDofFusionTopics],
};
