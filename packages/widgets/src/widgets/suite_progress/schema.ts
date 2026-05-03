import { z } from "zod";

export const SuiteProgressConfig = z.object({
  good_threshold: z.number().min(0).max(100).default(90),
  warn_threshold: z.number().min(0).max(100).default(70),
});
export type SuiteProgressConfig = z.infer<typeof SuiteProgressConfig>;
