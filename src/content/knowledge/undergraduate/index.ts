import { distributedTopics } from "./distributed";
import { embeddedTopics } from "./embedded";
import { ethicsTopics } from "./ethics";
import { flowTopics } from "./flow";
import { graphicsTopics } from "./graphics";
import { interactionTopics } from "./interaction";
import { languageTopics } from "./languages";
import { machineLearningTopics } from "./machine-learning";
import { parallelTopics } from "./parallel";
import { retrievalTopics } from "./retrieval";
import { signalTopics } from "./signals";
import { theoryTopics } from "./theory";
import { wirelessTopics } from "./wireless";

export const undergraduateTopics = {
  algorithms: flowTopics,
  "operating-systems": [...parallelTopics, ...distributedTopics, ...embeddedTopics],
  networks: wirelessTopics,
  programming: [...graphicsTopics, ...interactionTopics, ...ethicsTopics, ...languageTopics],
  databases: retrievalTopics,
  ai: machineLearningTopics,
  foundations: [...signalTopics, ...theoryTopics],
};
