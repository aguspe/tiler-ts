import { z } from "zod";
import { Id, Iso, Slug } from "./primitives";

export const ThemeTokens = z
  .object({
    page: z.string().optional(),
    tile: z.string().optional(),
    tile_header: z.string().optional(),
    gutter: z.string().optional(),
  })
  .strict();
export type ThemeTokens = z.infer<typeof ThemeTokens>;

export const DashboardSettings = z
  .object({
    theme: ThemeTokens.optional(),
    tv_mode: z.boolean().default(false),
  })
  .strict();
export type DashboardSettings = z.infer<typeof DashboardSettings>;

export const Dashboard = z.object({
  id: Id,
  name: z.string().min(1).max(120),
  slug: Slug,
  description: z.string().nullable().default(null),
  refresh_seconds: z.number().int().min(0).default(0),
  settings: DashboardSettings.default({ tv_mode: false }),
  created_at: Iso,
  updated_at: Iso,
});
export type Dashboard = z.infer<typeof Dashboard>;
