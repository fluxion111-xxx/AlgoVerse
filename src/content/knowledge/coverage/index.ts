import { aiCoverage } from "./ai";
import { algorithmCoverage } from "./algorithms";
import { databaseCoverage } from "./databases";
import { foundationCoverage } from "./foundations";
import { networkCoverage } from "./networks";
import { programmingCoverage } from "./programming";
import { systemCoverage } from "./systems";

export const coverageTopics = {
  algorithms: algorithmCoverage,
  "operating-systems": systemCoverage,
  networks: networkCoverage,
  programming: programmingCoverage,
  databases: databaseCoverage,
  ai: aiCoverage,
  foundations: foundationCoverage,
};
