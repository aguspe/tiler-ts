import { z } from "zod";

const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const ListConfig = z.object({
  columns: z.array(SafeColumn).min(1).default(["payload"]),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  limit: z.number().int().min(1).max(500).default(20),
  order_by: z.enum(["recorded_at_asc", "recorded_at_desc"]).default("recorded_at_desc"),
});
export type ListConfig = z.infer<typeof ListConfig>;
