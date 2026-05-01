import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const StatusGridConfig = z.object({
  group_column: SafeColumn,
  status_column: SafeColumn.default("status"),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type StatusGridConfig = z.infer<typeof StatusGridConfig>;
