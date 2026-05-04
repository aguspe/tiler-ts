import type { DataRecord, DataSourceInput, Panel } from "@aguspe/tiler-core";

export interface PlaywrightTilerConfig {
  /** Drop preset panels by exact title before merging user panels. */
  excludePanels?: string[];

  /** Extra panels appended after preset panels. `y` is optional —
   *  omitted panels are auto-placed below the lowest preset panel. */
  panels?: UserPanel[];

  /** Extra data sources alongside the preset's `test_runs`.
   *  `collect()` runs at the end of the test run; its returned records
   *  are merged into the snapshot, with `data_source_id` rebound to the
   *  source you provided here. */
  dataSources?: Array<{
    source: DataSourceInput;
    collect: (ctx: CollectContext) => Promise<DataRecord[]>;
  }>;

  /** Override dashboard metadata. */
  dashboard?: { name?: string; slug?: string; description?: string };
}

export interface UserPanel
  extends Omit<
    Panel,
    "id" | "dashboard_id" | "data_source_id" | "created_at" | "updated_at" | "y"
  > {
  /** Optional — auto-placed below the preset panels if absent. */
  y?: number;
  /** Explicit binding to a data source. Wins over `data_source_slug`. */
  data_source_id?: string;
  /** Alternate binding by slug — looked up in preset + user sources. */
  data_source_slug?: string;
}

export interface CollectContext {
  outDir: string;
  startedAt: Date;
  endedAt: Date;
}

export function definePlaywrightConfig(
  c: PlaywrightTilerConfig,
): PlaywrightTilerConfig {
  return c;
}
