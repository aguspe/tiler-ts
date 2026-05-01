import { z } from "zod";

export const NumberWithDeltaConfig = z.object({
  value_column: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/)
    .optional(),
  aggregation: z.enum(["sum", "avg", "min", "max", "count", "first", "last"]).default("count"),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  delta_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d"]).default("24h"),
  sparkline_bucket: z.enum(["30s", "1m", "5m", "1h", "1d"]).default("1h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  color: z.string().optional(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(6).default(0),
});
export type NumberWithDeltaConfig = z.infer<typeof NumberWithDeltaConfig>;
