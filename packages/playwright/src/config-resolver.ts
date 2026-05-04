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

  const excludeSet = new Set(rawOpts.excludePanels);
  const presetTitles = new Set(preset.panels.map((p) => p.title));
  for (const t of excludeSet) {
    if (!presetTitles.has(t)) {
      console.warn(
        `[tiler-playwright] excludePanels: "${t}" did not match any preset panel`,
      );
    }
  }
  const keptPanels = preset.panels.filter((p) => !excludeSet.has(p.title));

  return {
    dashboard: preset.dashboard,
    dataSources: preset.dataSources,
    panels: keptPanels,
    collectors: new Map(),
  };
}
