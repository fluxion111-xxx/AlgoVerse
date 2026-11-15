import { compilerTopics } from "./compiler";
import { distributedTransactionTopics } from "./distributed-transactions";
import { fileSystemTopics } from "./filesystem";
import { optimizationTopics } from "./optimization";
import { stochasticProcessTopics } from "./stochastic-processes";

export const coreDepthTopics = {
  "operating-systems": fileSystemTopics,
  databases: distributedTransactionTopics,
  programming: compilerTopics,
  foundations: [...stochasticProcessTopics, ...optimizationTopics],
};
