import { boardIirTopics } from "./board-iir";
import { gpuMaterialTopics } from "./gpu-material";
import { realVideoTopics } from "./real-video";
import { revocationTopics } from "./revocation";
import { robustSeriesTopics } from "./robust-series";
import { sensorSmoothingTopics } from "./sensor-smoothing";

export const fieldValidationTopics = {
  programming: gpuMaterialTopics,
  networks: revocationTopics,
  ai: [...realVideoTopics, ...sensorSmoothingTopics],
  foundations: [...robustSeriesTopics, ...boardIirTopics],
};
