import { prospectiveForecastTopics } from "./forecast";
import { glTFReproductionTopics } from "./graphics";
import { naturalHdrVideoTopics } from "./hdr";
import { onlineMappingTopics } from "./mapping";

export const prospectiveValidationTopics = {
  foundations: prospectiveForecastTopics,
  programming: glTFReproductionTopics,
  ai: [...naturalHdrVideoTopics, ...onlineMappingTopics],
};
