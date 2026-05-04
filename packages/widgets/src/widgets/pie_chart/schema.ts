import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const PieChartConfig = z.object({
  group_column: SafeColumn,
  aggregation: z.enum(["count", "sum"]).default("count"),
  value_column: SafeColumn.optional(),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  /** Index-based fallback palette. Used when a slice's name is not in `palette_map`. */
  palette: z.array(z.string()).optional(),
  /** Map slice names to specific colors. Wins over `palette` for matching names. */
  palette_map: z.record(z.string()).optional(),
  donut: z.boolean().default(false),
});
export type PieChartConfig = z.infer<typeof PieChartConfig>;
