import { z } from "zod";

export const MeterConfig = z.object({
  value_column: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/)
    .optional(),
  aggregation: z.enum(["sum", "avg", "min", "max", "count", "first", "last"]).default("avg"),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  min: z.number().default(0),
  max: z.number().default(100),
  target: z.number().optional(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(6).default(0),
});
export type MeterConfig = z.infer<typeof MeterConfig>;
