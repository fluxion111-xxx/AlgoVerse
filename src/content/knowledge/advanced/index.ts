import { advancedAI } from "./ai";
import { advancedAlgorithms } from "./algorithms";
import { advancedCompilers } from "./compilers";
import { advancedDatabases } from "./databases";
import { advancedFoundations } from "./foundations";
import { advancedNetworks } from "./networks";
import { advancedProgramming } from "./programming";
import { advancedSystems } from "./systems";

export const advancedTopics = {
  algorithms: advancedAlgorithms,
  "operating-systems": advancedSystems,
  networks: advancedNetworks,
  programming: [...advancedProgramming, ...advancedCompilers],
  databases: advancedDatabases,
  ai: advancedAI,
  foundations: advancedFoundations,
};
