import {
  type DataRecord,
  type DataSource,
  type Dashboard,
  type Panel,
  testAutomationPreset,
} from "@aguspe/tiler-core";
import type { CollectContext } from "./define-config";
import type { ReporterOptions } from "./options";

export interface ResolvedConfig {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
  /** sourceId → collect hook. Reporter invokes these in onEnd. */
  collectors: Map<string, (ctx: CollectContext) => Promise<DataRecord[]>>;
}

export interface ResolveConfigArgs {
  rawOpts: ReporterOptions;
  startedAt: Date;
}

export function resolveConfig({
  rawOpts,
  startedAt,
}: ResolveConfigArgs): ResolvedConfig {
  const preset = testAutomationPreset({ now: startedAt });
  return {
    dashboard: preset.dashboard,
    dataSources: preset.dataSources,
    panels: preset.panels,
    collectors: new Map(),
  };
}
