import { approximationTopics } from "./approximation";
import { compilerTopics } from "./compiler";
import { directoryTopics } from "./directory";
import { inferenceTopics } from "./inference";
import { mathematicsTopics } from "./mathematics";
import { optimizationErrorTopics } from "./optimization-error";

export const advancedReasoningTopics = {
  algorithms: approximationTopics,
  "operating-systems": directoryTopics,
  programming: compilerTopics,
  ai: inferenceTopics,
  foundations: [...mathematicsTopics, ...optimizationErrorTopics],
};
