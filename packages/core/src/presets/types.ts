import type { Dashboard } from "../schema/dashboard";
import type { DataSource } from "../schema/data_source";
import type { Panel } from "../schema/panel";

export interface PresetOutput {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
}

export interface PresetOptions {
  /** Reference time for any time-dependent IDs / timestamps. Defaults to `new Date()`. */
  now?: Date;
  /** Override the default dashboard slug. */
  slug?: string;
}
