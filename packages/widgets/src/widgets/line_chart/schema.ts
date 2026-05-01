import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const LineChartConfig = z.object({
  value_column: SafeColumn.optional(),
  group_column: SafeColumn.optional(),
  aggregation: z.enum(["sum", "avg", "min", "max", "count", "first", "last"]).default("count"),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("7d"),
  bucket: z.enum(["30s", "1m", "5m", "1h", "1d"]).default("1h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  palette: z.array(z.string()).optional(),
});
export type LineChartConfig = z.infer<typeof LineChartConfig>;
