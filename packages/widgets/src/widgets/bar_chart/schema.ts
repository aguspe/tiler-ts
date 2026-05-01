import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const BarChartConfig = z.object({
  group_column: SafeColumn,
  value_column: SafeColumn.optional(),
  aggregation: z.enum(["sum", "avg", "min", "max", "count", "first", "last"]).default("count"),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  palette: z.array(z.string()).optional(),
  orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
  limit: z.number().int().min(1).max(50).default(10),
});
export type BarChartConfig = z.infer<typeof BarChartConfig>;
