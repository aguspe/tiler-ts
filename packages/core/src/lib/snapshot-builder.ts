import { getWidget } from "../registry";
import type { Dashboard } from "../schema/dashboard";
import type { DataRecord } from "../schema/data_record";
import type { DataSource } from "../schema/data_source";
import type { Panel } from "../schema/panel";
import type { ResolvedEntry, TilerSnapshot } from "../schema/snapshot";

export interface BuildSnapshotInput {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
  records: DataRecord[];
  now: Date;
}

/**
 * Pre-resolve every panel's widget data and bake the result into a TilerSnapshot.
 *
 * Resolvers run server-side (Node) — the browser bundle never re-runs them.
 * Time-window filtering happens inside each resolver per its own config.
 */
export async function buildSnapshot(input: BuildSnapshotInput): Promise<TilerSnapshot> {
  const resolved: Record<string, ResolvedEntry> = {};

  for (const panel of input.panels) {
    const widget = getWidget(panel.widget_type);
    if (!widget) {
      resolved[panel.id] = { resolved: null, empty: true };
      continue;
    }
    if (!widget.resolve) {
      resolved[panel.id] = { resolved: null, empty: false };
      continue;
    }
    const sourceRecords = panel.data_source_id
      ? input.records.filter((r) => r.data_source_id === panel.data_source_id)
      : [];
    try {
      const data = await widget.resolve({
        panel,
        records: sourceRecords,
        now: input.now,
      });
      resolved[panel.id] = data;
    } catch (err) {
      resolved[panel.id] = {
        resolved: { error: err instanceof Error ? err.message : String(err) },
        empty: true,
      };
    }
  }

  return {
    version: 1,
    generated_at: input.now.toISOString(),
    dashboard: input.dashboard,
    panels: input.panels,
    data_sources: input.dataSources,
    records: input.records,
    resolved,
  };
}
