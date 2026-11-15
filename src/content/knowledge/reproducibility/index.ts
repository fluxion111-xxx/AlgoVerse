import { physicalHostTopics } from "./graphics";
import { hdrDisplayTopics } from "./hdr";
import { crossDayTopics } from "./hydrology";
import { longLoopTopics } from "./trajectory";

export const reproducibilityTopics = {
  foundations: crossDayTopics,
  programming: physicalHostTopics,
  ai: [...hdrDisplayTopics, ...longLoopTopics],
};
