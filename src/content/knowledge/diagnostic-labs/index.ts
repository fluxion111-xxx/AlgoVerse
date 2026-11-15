import { hydrologyTopics } from "./hydrology";
import { pixelTopics } from "./pixels";
import { videoTopics } from "./video";
import { visualInertialTopics } from "./visual-inertial";

export const diagnosticLabTopics = {
  programming: pixelTopics,
  ai: [...videoTopics, ...visualInertialTopics],
  foundations: hydrologyTopics,
};
