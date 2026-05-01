import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const ColumnSpec = z.object({
  key: SafeColumn,
  label: z.string().optional(),
  format: z.enum(["text", "number", "datetime", "percent", "ms"]).default("text"),
});
export type ColumnSpec = z.infer<typeof ColumnSpec>;

export const TableConfig = z.object({
  columns: z.array(ColumnSpec).min(1),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  pagination: z.boolean().default(true),
  page_size: z.number().int().min(5).max(100).default(20),
  order_by: z.enum(["recorded_at_asc", "recorded_at_desc"]).default("recorded_at_desc"),
});
export type TableConfig = z.infer<typeof TableConfig>;
