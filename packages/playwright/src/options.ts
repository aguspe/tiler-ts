import { DataRecord, DataSource } from "@aguspe/tiler-core";
import { z } from "zod";
import type { CollectContext } from "./define-config";

const UserPanelSchema = z.object({
  widget_type: z.string().min(1),
  title: z.string().min(1).max(200),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).optional(),
  width: z.number().int().min(1).max(12),
  height: z.number().int().min(1).max(12),
  config: z.record(z.unknown()).default({}),
  data_source_id: z.string().optional(),
  data_source_slug: z.string().optional(),
});

export type UserPanelParsed = z.infer<typeof UserPanelSchema>;

// DataSource minus resolver-managed fields, with id optional.
const DataSourceInputSchema = DataSource.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({ id: z.string().optional() });

const DataSourceWithCollectSchema = z.object({
  source: DataSourceInputSchema,
  collect: z.custom<(ctx: CollectContext) => Promise<DataRecord[]>>(
    (val) => typeof val === "function",
    { message: "collect must be a function" },
  ),
});

export type DataSourceWithCollect = z.infer<typeof DataSourceWithCollectSchema>;

export const ReporterOptions = z.object({
  /** Output directory. Relative paths resolve against `process.cwd()`. */
  outDir: z.string().min(1).default("tiler-report"),
  /** Preset to seed the dashboard. Currently only "test_automation". */
  preset: z.enum(["test_automation"]).default("test_automation"),
  /** Drop preset panels by exact title before merging user panels. */
  excludePanels: z.array(z.string()).default([]),
  /** Extra panels appended to the dashboard. */
  panels: z.array(UserPanelSchema).default([]),
  /** Extra data sources, each with an async `collect()` hook. */
  dataSources: z.array(DataSourceWithCollectSchema).default([]),
  /** Override dashboard metadata (name/slug/description). */
  dashboard: z
    .object({
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  /** Path to a tiler.config.ts. Loaded with jiti. */
  config: z.string().optional(),
  /** @deprecated — use `config` instead. Kept for one minor version. */
  customConfig: z.string().optional(),
  /** Capture stdout/stderr per test. */
  captureLogs: z.boolean().default(false),
  /** Link to Playwright's trace.zip files in the report. */
  linkTraceFiles: z.boolean().default(true),
  /** Open the HTML report when the run ends. */
  open: z.boolean().default(false),
});

export type ReporterOptions = z.infer<typeof ReporterOptions>;
