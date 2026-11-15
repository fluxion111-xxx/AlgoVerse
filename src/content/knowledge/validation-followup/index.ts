import { hardwareReproductionTopics } from "./graphics";
import { spatialFusionTopics } from "./inertial";
import { stationValidationTopics } from "./stations";
import { multiTitle4kTopics } from "./video";

export const validationFollowupTopics = {
  foundations: stationValidationTopics,
  programming: hardwareReproductionTopics,
  ai: [...multiTitle4kTopics, ...spatialFusionTopics],
};
