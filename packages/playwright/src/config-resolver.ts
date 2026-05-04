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

  const dashboard: Dashboard = rawOpts.dashboard
    ? ({ ...preset.dashboard, ...rawOpts.dashboard } as Dashboard)
    : preset.dashboard;

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

  // Merge user data sources, materialize the resolver-managed fields,
  // collect their collectors, and validate uniqueness.
  const iso = startedAt.toISOString();
  const presetSlugs = new Set(preset.dataSources.map((d) => d.slug));
  const userSources: DataSource[] = [];
  const collectors: ResolvedConfig["collectors"] = new Map();
  for (const entry of rawOpts.dataSources) {
    if (presetSlugs.has(entry.source.slug)) {
      throw new Error(
        `[tiler-playwright] duplicate data source slug "${entry.source.slug}" — preset already defines it`,
      );
    }
    if (userSources.some((s) => s.slug === entry.source.slug)) {
      throw new Error(
        `[tiler-playwright] duplicate data source slug "${entry.source.slug}" in user dataSources`,
      );
    }
    const materialized: DataSource = {
      ...entry.source,
      id: entry.source.id ?? newId(),
      created_at: iso,
      updated_at: iso,
    };
    userSources.push(materialized);
    collectors.set(materialized.id, entry.collect);
  }
  const allSources: DataSource[] = [...preset.dataSources, ...userSources];

  const testRuns = preset.dataSources.find((d) => d.slug === "test_runs");

  const presetMaxY = keptPanels.length
    ? Math.max(...keptPanels.map((p) => p.y + p.height))
    : 0;
  let cursorY = presetMaxY;

  const userPanels: Panel[] = rawOpts.panels.map((p) => {
    let dataSourceId: string | null = p.data_source_id ?? null;
    if (!dataSourceId && p.data_source_slug) {
      const match = allSources.find((s) => s.slug === p.data_source_slug);
      if (!match) {
        throw new Error(
          `[tiler-playwright] panel "${p.title}" data_source_slug "${p.data_source_slug}" not found`,
        );
      }
      dataSourceId = match.id;
    }
    if (!dataSourceId) {
      dataSourceId = testRuns ? testRuns.id : null;
    }
    if (!dataSourceId) {
      throw new Error(
        `[tiler-playwright] panel "${p.title}" needs a data_source_id (no preset test_runs source available)`,
      );
    }
    let y: number;
    if (p.y !== undefined) {
      y = p.y;
    } else {
      y = cursorY;
      cursorY += p.height;
    }
    return {
      id: newId(),
      dashboard_id: dashboard.id,
      data_source_id: dataSourceId,
      title: p.title,
      widget_type: p.widget_type,
      x: p.x,
      y,
      width: p.width,
      height: p.height,
      config: p.config,
      created_at: iso,
      updated_at: iso,
    };
  });

  return {
    dashboard,
    dataSources: allSources,
    panels: [...keptPanels, ...userPanels],
    collectors,
  };
}
