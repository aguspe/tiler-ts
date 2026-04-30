import { z } from "zod";
import { SafeColumn } from "./primitives";

export const TimeWindow = z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]);
export type TimeWindow = z.infer<typeof TimeWindow>;

export const Bucket = z.enum(["30s", "1m", "5m", "1h", "1d"]);
export type Bucket = z.infer<typeof Bucket>;

export const Aggregation = z.enum(["sum", "avg", "min", "max", "count", "last", "first"]);
export type Aggregation = z.infer<typeof Aggregation>;

export const DataBackedConfig = z.object({
  value_column: SafeColumn.optional(),
  group_column: SafeColumn.optional(),
  aggregation: Aggregation.default("count"),
  time_window: TimeWindow.default("24h"),
  bucket: Bucket.optional(),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  color: z.string().optional(),
  palette: z.array(z.string()).optional(),
});
export type DataBackedConfig = z.infer<typeof DataBackedConfig>;
