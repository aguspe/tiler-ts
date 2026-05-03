import { z } from "zod";

export const TestListConfig = z.object({
  limit: z.number().int().min(1).max(500).default(200),
  show_failures_only: z.boolean().default(false),
});
export type TestListConfig = z.infer<typeof TestListConfig>;
