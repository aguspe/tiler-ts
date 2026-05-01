import { z } from "zod";
import { Dashboard } from "./dashboard";
import { DataRecord } from "./data_record";
import { DataSource } from "./data_source";
import { Panel } from "./panel";
import { Iso } from "./primitives";

/** Per-panel resolved widget data, baked into the snapshot at build time. */
export const ResolvedEntry = z.object({
  resolved: z.unknown(),
  empty: z.boolean(),
});
export type ResolvedEntry = z.infer<typeof ResolvedEntry>;

export const TilerSnapshot = z.object({
  version: z.literal(1),
  generated_at: Iso,
  dashboard: Dashboard,
  panels: z.array(Panel),
  data_sources: z.array(DataSource),
  records: z.array(DataRecord),
  /** Resolved widget data keyed by `panel.id`. Browsers consume this directly. */
  resolved: z.record(ResolvedEntry).default({}),
});
export type TilerSnapshot = z.infer<typeof TilerSnapshot>;
