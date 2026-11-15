import { architecturePracticeTopics } from "./architecture";
import { ariesPracticeTopics } from "./aries-checkpoints";
import { compilerPracticeTopics } from "./compiler-ssa";
import { ipv6CaptureTopics } from "./ipv6-capture";
import { linuxPracticeTopics } from "./linux-io-reclaim";

export const systemsPracticeTopics = {
  "operating-systems": [...architecturePracticeTopics, ...linuxPracticeTopics],
  networks: ipv6CaptureTopics,
  databases: ariesPracticeTopics,
  programming: compilerPracticeTopics,
};
