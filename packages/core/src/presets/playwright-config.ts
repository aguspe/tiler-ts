import type { DataRecord } from "../schema/data_record";
import type { DataSource } from "../schema/data_source";
import type { DataSourceInput } from "../store";
import type { Dashboard } from "../schema/dashboard";
import type { Panel } from "../schema/panel";
import { newId } from "../ulid";
import type { PresetOutput } from "./types";

/**
 * A user-authored panel — same shape as `UserPanel` in
 * `@aguspe/tiler-playwright`, declared standalone in core to avoid
 * inverting the dep direction. The two interfaces are kept structurally
 * identical by code review and a structural-assignability test in the
 * playwright package.
 */
export interface UserPanelInput
  extends Omit<
    Panel,
    "id" | "dashboard_id" | "data_source_id" | "created_at" | "updated_at" | "y"
  > {
  /** Optional — auto-placed below the cursor if absent. */
  y?: number;
  data_source_id?: string;
  data_source_slug?: string;
}

/**
 * Same shape as `PlaywrightTilerConfig` from `@aguspe/tiler-playwright`,
 * declared standalone in core so server-side seeding does not require
 * tiler-playwright at runtime.
 */
export interface DashboardConfig {
  /** Ignored on server seeding (no preset to exclude from). */
  excludePanels?: string[];
  panels?: UserPanelInput[];
  dataSources?: Array<{
    source: DataSourceInput;
    /** Ignored on server. Records arrive via `/ingest/:slug` at runtime. */
    collect?: (ctx: unknown) => Promise<DataRecord[]>;
  }>;
  dashboard?: { name?: string; slug?: string; description?: string };
}

export interface PlaywrightConfigToPresetArgs {
  config: DashboardConfig;
  now: Date;
}

/**
 * Materialize a `DashboardConfig` (the shape produced by
 * `definePlaywrightConfig({...})`) into a `PresetOutput` ready to seed
 * into the server's store. Fills ids, timestamps, dashboard defaults;
 * resolves panel `data_source_slug` against user-defined sources;
 * auto-places panels with omitted `y`.
 */
export function playwrightConfigToPresetOutput({
  config,
  now,
}: PlaywrightConfigToPresetArgs): PresetOutput {
  const iso = now.toISOString();

  const dashId = newId();
  const dashboard: Dashboard = {
    id: dashId,
    name: config.dashboard?.name ?? "Dashboard",
    slug: config.dashboard?.slug ?? `dash-${dashId}`,
    description: config.dashboard?.description ?? "",
    refresh_seconds: 0,
    settings: { tv_mode: false },
    created_at: iso,
    updated_at: iso,
  };

  const dataSources: DataSource[] = (config.dataSources ?? []).map((entry) => ({
    ...entry.source,
    id: entry.source.id ?? newId(),
    created_at: iso,
    updated_at: iso,
  }));

  let cursorY = 0;
  const panels: Panel[] = (config.panels ?? []).map((p) => {
    let dataSourceId: string | null = p.data_source_id ?? null;
    if (!dataSourceId && p.data_source_slug) {
      const match = dataSources.find((s) => s.slug === p.data_source_slug);
      if (!match) {
        throw new Error(
          `[tiler-core] panel "${p.title}" data_source_slug "${p.data_source_slug}" not found`,
        );
      }
      dataSourceId = match.id;
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
      config: p.config ?? {},
      created_at: iso,
      updated_at: iso,
    };
  });

  return { dashboard, dataSources, panels };
}
