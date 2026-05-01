import type { Dashboard } from "./schema/dashboard";
import type { DataRecord } from "./schema/data_record";
import type { DataSource } from "./schema/data_source";
import type { Panel } from "./schema/panel";
import type {
  DashboardInput,
  DataRecordInput,
  DataSourceInput,
  PanelInput,
  RecordQuery,
  TilerStore,
} from "./store";
import { newId } from "./ulid";

export class MemoryStore implements TilerStore {
  private dashboards = new Map<string, Dashboard>();
  private panels = new Map<string, Panel>();
  private dataSources = new Map<string, DataSource>();
  private records = new Map<string, DataRecord>();

  // ─── dashboards ────────────────────────────────────────────────────────
  async listDashboards(): Promise<Dashboard[]> {
    return [...this.dashboards.values()];
  }
  async getDashboard(slug: string): Promise<Dashboard | null> {
    for (const d of this.dashboards.values()) if (d.slug === slug) return d;
    return null;
  }
  async upsertDashboard(input: DashboardInput): Promise<Dashboard> {
    const now = new Date().toISOString();
    const id = input.id ?? newId();
    const existing = this.dashboards.get(id);
    const merged: Dashboard = {
      id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      refresh_seconds: input.refresh_seconds ?? 0,
      settings: input.settings ?? { tv_mode: false },
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.dashboards.set(id, merged);
    return merged;
  }
  async deleteDashboard(id: string): Promise<void> {
    this.dashboards.delete(id);
    for (const [pid, p] of this.panels) if (p.dashboard_id === id) this.panels.delete(pid);
  }

  // ─── panels ────────────────────────────────────────────────────────────
  async listPanels(dashboardId: string): Promise<Panel[]> {
    return [...this.panels.values()].filter((p) => p.dashboard_id === dashboardId);
  }
  async upsertPanel(input: PanelInput): Promise<Panel> {
    const now = new Date().toISOString();
    const id = input.id ?? newId();
    const existing = this.panels.get(id);
    const merged: Panel = {
      id,
      dashboard_id: input.dashboard_id,
      data_source_id: input.data_source_id ?? null,
      title: input.title,
      widget_type: input.widget_type,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      config: input.config ?? {},
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.panels.set(id, merged);
    return merged;
  }
  async deletePanel(id: string): Promise<void> {
    this.panels.delete(id);
  }

  // ─── data sources ──────────────────────────────────────────────────────
  async listDataSources(): Promise<DataSource[]> {
    return [...this.dataSources.values()];
  }
  async getDataSource(slug: string): Promise<DataSource | null> {
    for (const s of this.dataSources.values()) if (s.slug === slug) return s;
    return null;
  }
  async getDataSourceByToken(token: string): Promise<DataSource | null> {
    for (const s of this.dataSources.values()) if (s.webhook_token === token) return s;
    return null;
  }
  async upsertDataSource(input: DataSourceInput): Promise<DataSource> {
    const now = new Date().toISOString();
    const id = input.id ?? newId();
    const existing = this.dataSources.get(id);
    const merged: DataSource = {
      id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      schema_definition: input.schema_definition ?? [],
      ingestion_methods: input.ingestion_methods,
      webhook_token: input.webhook_token,
      active: input.active ?? true,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.dataSources.set(id, merged);
    return merged;
  }
  async deleteDataSource(id: string): Promise<void> {
    this.dataSources.delete(id);
    for (const [rid, r] of this.records) if (r.data_source_id === id) this.records.delete(rid);
  }

  // ─── records ───────────────────────────────────────────────────────────
  async insertRecord(input: DataRecordInput): Promise<DataRecord> {
    const id = input.id ?? newId();
    const record: DataRecord = {
      id,
      data_source_id: input.data_source_id,
      payload: input.payload,
      recorded_at: input.recorded_at,
      source_ref: input.source_ref ?? null,
      ingested_via: input.ingested_via,
      created_at: new Date().toISOString(),
    };
    this.records.set(id, record);
    return record;
  }
  async insertRecordsBatch(inputs: DataRecordInput[]): Promise<number> {
    for (const input of inputs) await this.insertRecord(input);
    return inputs.length;
  }
  async queryRecords(opts: RecordQuery): Promise<DataRecord[]> {
    let result = [...this.records.values()].filter((r) => r.data_source_id === opts.dataSourceId);
    if (opts.since) {
      const since = opts.since;
      result = result.filter((r) => r.recorded_at >= since);
    }
    if (opts.until) {
      const until = opts.until;
      result = result.filter((r) => r.recorded_at <= until);
    }
    if (opts.filter) {
      const filter = opts.filter;
      result = result.filter((r) => Object.entries(filter).every(([k, v]) => r.payload[k] === v));
    }
    if (opts.orderBy === "recorded_at_desc") {
      result.sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1));
    } else {
      result.sort((a, b) => (a.recorded_at > b.recorded_at ? 1 : -1));
    }
    if (opts.limit !== undefined) result = result.slice(0, opts.limit);
    return result;
  }
  async pruneRecords(opts: { olderThan: string }): Promise<number> {
    let pruned = 0;
    for (const [id, r] of this.records) {
      if (r.recorded_at < opts.olderThan) {
        this.records.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  // ─── lifecycle ─────────────────────────────────────────────────────────
  async migrate(): Promise<void> {
    /* in-memory, nothing to migrate */
  }
  async close(): Promise<void> {
    this.dashboards.clear();
    this.panels.clear();
    this.dataSources.clear();
    this.records.clear();
  }
}
