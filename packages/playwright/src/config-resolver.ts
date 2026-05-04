import {
  type DataRecord,
  type DataSource,
  type Dashboard,
  type Panel,
  newId,
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

  const iso = startedAt.toISOString();
  const testRuns = preset.dataSources.find((d) => d.slug === "test_runs");

  const userPanels: Panel[] = rawOpts.panels.map((p) => {
    const dataSourceId =
      p.data_source_id ??
      (testRuns ? testRuns.id : null);
    if (!dataSourceId) {
      throw new Error(
        `[tiler-playwright] panel "${p.title}" needs a data_source_id (no preset test_runs source available)`,
      );
    }
    return {
      id: newId(),
      dashboard_id: preset.dashboard.id,
      data_source_id: dataSourceId,
      title: p.title,
      widget_type: p.widget_type,
      x: p.x,
      y: p.y ?? 0, // auto-place comes in Task 8
      width: p.width,
      height: p.height,
      config: p.config,
      created_at: iso,
      updated_at: iso,
    };
  });

  return {
    dashboard: preset.dashboard,
    dataSources: preset.dataSources,
    panels: [...keptPanels, ...userPanels],
    collectors: new Map(),
  };
}
