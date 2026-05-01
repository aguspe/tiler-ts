import { z } from "zod";

export const ReporterOptions = z.object({
  /** Output directory, relative to the project root. */
  outDir: z
    .string()
    .refine((s) => !s.startsWith("/"), "outDir must be a relative path")
    .default("tiler-report"),
  /** Preset name to load by default. */
  preset: z.string().default("test_automation"),
  /** Optional path to a tiler.config.ts (overrides preset). */
  customConfig: z.string().optional(),
  /** Capture stdout/stderr per test as a separate data source. */
  captureLogs: z.boolean().default(false),
  /** Link to Playwright's trace.zip files in the report. */
  linkTraceFiles: z.boolean().default(true),
  /** Open the HTML report in the user's browser at end of run. */
  open: z.boolean().default(false),
});
export type ReporterOptions = z.infer<typeof ReporterOptions>;
