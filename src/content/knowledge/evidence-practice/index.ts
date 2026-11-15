import { authorizationTopics } from "./authorization";
import { fixedPointTopics } from "./fixed-point";
import { inferenceTopics } from "./inference";
import { crossNodeTopics } from "./mpi";
import { particleTopics } from "./particle";
import { rasterTopics } from "./raster";
import { videoTopics } from "./video";

export const evidencePracticeTopics = {
  programming: rasterTopics,
  "operating-systems": crossNodeTopics,
  networks: authorizationTopics,
  ai: [...videoTopics, ...particleTopics],
  foundations: [...inferenceTopics, ...fixedPointTopics],
};
