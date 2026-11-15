import { aiReview700 } from "./ai";
import { algorithmsReview700 } from "./algorithms";
import { databasesReview700 } from "./databases";
import { foundationsReview700 } from "./foundations";
import { networksReview700 } from "./networks";
import { operatingSystemsReview700 } from "./operating-systems";
import { programmingReview700 } from "./programming";

export const coverage700Teaching = {
  ...algorithmsReview700, ...operatingSystemsReview700, ...networksReview700, ...programmingReview700,
  ...databasesReview700, ...aiReview700, ...foundationsReview700,
};
