import { z } from "zod";

export const TestTimelineConfig = z.object({
  limit: z.number().int().min(1).max(200).default(50),
});
export type TestTimelineConfig = z.infer<typeof TestTimelineConfig>;
