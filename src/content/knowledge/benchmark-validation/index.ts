import { boardMeasurementTopics } from "./board-measurement";
import { edgeSecurityTopics } from "./edge-security";
import { pbrTopics } from "./pbr-scene";
import { rawVideoTopics } from "./raw-video";
import { tailReplayTopics } from "./tail-replay";
import { trajectoryTopics } from "./trajectory";

export const benchmarkValidationTopics = {
  programming: pbrTopics,
  networks: edgeSecurityTopics,
  ai: [...rawVideoTopics, ...trajectoryTopics],
  foundations: [...boardMeasurementTopics, ...tailReplayTopics],
};
