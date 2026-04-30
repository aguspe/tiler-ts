import { z } from "zod";

export const ClockConfig = z.object({
  format: z.enum(["24h", "12h"]).default("24h"),
  timezone: z.string().default("UTC"),
  show_seconds: z.boolean().default(false),
});
export type ClockConfig = z.infer<typeof ClockConfig>;
