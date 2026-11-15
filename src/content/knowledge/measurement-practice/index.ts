import { imageVideoTopics } from "./image-video";
import { intervalTopics } from "./intervals";
import { mpiTopics } from "./mpi";
import { securityTopics } from "./security";
import { sequentialTopics } from "./sequential";
import { signalTopics } from "./signals";

export const measurementPracticeTopics = {
  "operating-systems": mpiTopics,
  networks: securityTopics,
  ai: [...imageVideoTopics, ...sequentialTopics],
  foundations: [...intervalTopics, ...signalTopics],
};
