import { z } from "zod";

export const PassRateConfig = z.object({
  status_column: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/)
    .default("status"),
  pass_value: z.string().default("pass"),
  good_threshold: z.number().min(0).max(100).default(90),
  warn_threshold: z.number().min(0).max(100).default(70),
});
export type PassRateConfig = z.infer<typeof PassRateConfig>;
