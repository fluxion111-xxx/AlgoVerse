import { aiTeaching } from "./ai";
import { advancedReviewTeaching } from "./advanced-review";
import { algorithmTeaching } from "./algorithms";
import { databaseTeaching } from "./databases";
import { coreReviewTeaching } from "./core-review";
import { coverage700Teaching } from "./coverage-700/index";
import { depthReviewTeaching } from "./depth-review";
import { foundationTeaching } from "./foundations";
import { networkTeaching } from "./networks";
import { programmingTeaching } from "./programming";
import { specializedReviewTeaching } from "./specialized-review";
import { systemTeaching } from "./systems";
import type { Teaching } from "./types";

export const teachingById: Readonly<Record<string, Teaching>> = {
  ...algorithmTeaching, ...systemTeaching, ...networkTeaching, ...programmingTeaching,
  ...databaseTeaching, ...aiTeaching, ...foundationTeaching, ...coreReviewTeaching, ...depthReviewTeaching,
  ...advancedReviewTeaching, ...specializedReviewTeaching, ...coverage700Teaching,
};
