import { publicForecastTopics } from "./forecasts";
import { hostProofTopics } from "./graphics";
import { hdrMetadataTopics } from "./hdr";
import { navigationEvidenceTopics } from "./trajectory";

export const evidenceCompletionTopics = {
  foundations: publicForecastTopics,
  programming: hostProofTopics,
  ai: [...hdrMetadataTopics, ...navigationEvidenceTopics],
};
