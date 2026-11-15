import { coverageReplayTopics } from "./coverage";
import { gltfComparisonTopics } from "./gltf";
import { lagSmoothingTopics } from "./lag";
import { longVideoTopics } from "./video";

export const comparativeLabTopics = {
  programming: gltfComparisonTopics,
  ai: [...longVideoTopics, ...lagSmoothingTopics],
  foundations: coverageReplayTopics,
};
