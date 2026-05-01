import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const CommentsConfig = z.object({
  body_column: SafeColumn.default("body"),
  author_column: SafeColumn.default("author"),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  limit: z.number().int().min(1).max(200).default(20),
});
export type CommentsConfig = z.infer<typeof CommentsConfig>;
