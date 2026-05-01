import Database from "better-sqlite3";
import {
  newId,
  type Dashboard,
  type DashboardInput,
  type DataRecord,
  type DataRecordInput,
  type DataSource,
  type DataSourceInput,
  type IngestionMethod,
  type Panel,
  type PanelInput,
  type RecordQuery,
  type TilerStore,
} from "@aguspe/tiler-core";
import { migrate } from "./migrations";

// ─── row → domain helpers ─────────────────────────────────────────────────────

function rowToDashboard(row: Record<string, unknown>): Dashboard {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    slug: row["slug"] as string,
    description: (row["description"] as string | null) ?? null,
    refresh_seconds: row["refresh_seconds"] as number,
    settings: JSON.parse(row["settings"] as string) as Dashboard["settings"],
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
  };
}

function rowToDataSource(row: Record<string, unknown>): DataSource {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    slug: row["slug"] as string,
    description: (row["description"] as string | null) ?? null,
    schema_definition: JSON.parse(row["schema_definition"] as string) as DataSource["schema_definition"],
    ingestion_methods: JSON.parse(row["ingestion_methods"] as string) as IngestionMethod[],
    webhook_token: (row["webhook_token"] as string | null) ?? null,
    active: (row["active"] as number) === 1,
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
  };
}

function rowToDataRecord(row: Record<string, unknown>): DataRecord {
  return {
    id: row["id"] as string,
    data_source_id: row["data_source_id"] as string,
    payload: JSON.parse(row["payload"] as string) as Record<string, unknown>,
    recorded_at: row["recorded_at"] as string,
    source_ref: (row["source_ref"] as string | null) ?? null,
    ingested_via: row["ingested_via"] as IngestionMethod,
    created_at: row["created_at"] as string,
  };
}

function rowToPanel(row: Record<string, unknown>): Panel {
  return {
    id: row["id"] as string,
    dashboard_id: row["dashboard_id"] as string,
    data_source_id: (row["data_source_id"] as string | null) ?? null,
    title: row["title"] as string,
    widget_type: row["widget_type"] as string,
    x: row["x"] as number,
    y: row["y"] as number,
    width: row["width"] as number,
    height: row["height"] as number,
    config: JSON.parse(row["config"] as string) as Panel["config"],
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
  };
}

// ─── store ────────────────────────────────────────────────────────────────────

export interface BetterSqliteStoreOptions {
  path: string;
}

export class BetterSqliteStore implements TilerStore {
  private readonly db: Database.Database;

  constructor(opts: BetterSqliteStoreOptions) {
    this.db = new Database(opts.path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  // ─── lifecycle ─────────────────────────────────────────────────────────────

  async migrate(): Promise<void> {
    migrate(this.db);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // ─── dashboards ────────────────────────────────────────────────────────────

  async listDashboards(): Promise<Dashboard[]> {
    const rows = this.db.prepare("SELECT * FROM tiler_dashboards").all() as Record<string, unknown>[];
    return rows.map(rowToDashboard);
  }

  async getDashboard(slug: string): Promise<Dashboard | null> {
    const row = this.db
      .prepare("SELECT * FROM tiler_dashboards WHERE slug = ?")
      .get(slug) as Record<string, unknown> | undefined;
    return row ? rowToDashboard(row) : null;
  }

  async upsertDashboard(input: DashboardInput): Promise<Dashboard> {
    const now = new Date().toISOString();
    const id = input.id ?? newId();
    const existing = this.db
      .prepare("SELECT created_at FROM tiler_dashboards WHERE id = ?")
      .get(id) as { created_at: string } | undefined;
    const created_at = existing?.created_at ?? now;
    this.db
      .prepare(
        `
        INSERT INTO tiler_dashboards (id, name, slug, description, refresh_seconds, settings, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          slug = excluded.slug,
          description = excluded.description,
          refresh_seconds = excluded.refresh_seconds,
          settings = excluded.settings,
          updated_at = excluded.updated_at
        `,
      )
      .run(
        id,
        input.name,
        input.slug,
        input.description ?? null,
        input.refresh_seconds ?? 0,
        JSON.stringify(input.settings ?? { tv_mode: false }),
        created_at,
        now,
      );
    const row = this.db
      .prepare("SELECT * FROM tiler_dashboards WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToDashboard(row);
  }

  async deleteDashboard(id: string): Promise<void> {
    this.db.prepare("DELETE FROM tiler_dashboards WHERE id = ?").run(id);
  }

  // ─── panels ────────────────────────────────────────────────────────────────

  async listPanels(dashboardId: string): Promise<Panel[]> {
    const rows = this.db
      .prepare("SELECT * FROM tiler_panels WHERE dashboard_id = ?")
      .all(dashboardId) as Record<string, unknown>[];
    return rows.map(rowToPanel);
  }

  async upsertPanel(input: PanelInput): Promise<Panel> {
    const now = new Date().toISOString();
    const id = input.id ?? newId();
    const existing = this.db
      .prepare("SELECT created_at FROM tiler_panels WHERE id = ?")
      .get(id) as { created_at: string } | undefined;
    const created_at = existing?.created_at ?? now;
    this.db
      .prepare(
        `
        INSERT INTO tiler_panels (id, dashboard_id, data_source_id, title, widget_type, x, y, width, height, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          dashboard_id = excluded.dashboard_id,
          data_source_id = excluded.data_source_id,
          title = excluded.title,
          widget_type = excluded.widget_type,
          x = excluded.x,
          y = excluded.y,
          width = excluded.width,
          height = excluded.height,
          config = excluded.config,
          updated_at = excluded.updated_at
        `,
      )
      .run(
        id,
        input.dashboard_id,
        input.data_source_id ?? null,
        input.title,
        input.widget_type,
        input.x,
        input.y,
        input.width,
        input.height,
        JSON.stringify(input.config ?? {}),
        created_at,
        now,
      );
    const row = this.db
      .prepare("SELECT * FROM tiler_panels WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToPanel(row);
  }

  async deletePanel(id: string): Promise<void> {
    this.db.prepare("DELETE FROM tiler_panels WHERE id = ?").run(id);
  }

  // ─── data sources ──────────────────────────────────────────────────────────

  async listDataSources(): Promise<DataSource[]> {
    const rows = this.db.prepare("SELECT * FROM tiler_data_sources").all() as Record<string, unknown>[];
    return rows.map(rowToDataSource);
  }

  async getDataSource(slug: string): Promise<DataSource | null> {
    const row = this.db
      .prepare("SELECT * FROM tiler_data_sources WHERE slug = ?")
      .get(slug) as Record<string, unknown> | undefined;
    return row ? rowToDataSource(row) : null;
  }

  async getDataSourceByToken(token: string): Promise<DataSource | null> {
    const row = this.db
      .prepare("SELECT * FROM tiler_data_sources WHERE webhook_token = ?")
      .get(token) as Record<string, unknown> | undefined;
    return row ? rowToDataSource(row) : null;
  }

  async upsertDataSource(input: DataSourceInput): Promise<DataSource> {
    const now = new Date().toISOString();
    const id = input.id ?? newId();
    const existing = this.db
      .prepare("SELECT created_at FROM tiler_data_sources WHERE id = ?")
      .get(id) as { created_at: string } | undefined;
    const created_at = existing?.created_at ?? now;
    this.db
      .prepare(
        `
        INSERT INTO tiler_data_sources (id, name, slug, description, schema_definition, ingestion_methods, webhook_token, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          slug = excluded.slug,
          description = excluded.description,
          schema_definition = excluded.schema_definition,
          ingestion_methods = excluded.ingestion_methods,
          webhook_token = excluded.webhook_token,
          active = excluded.active,
          updated_at = excluded.updated_at
        `,
      )
      .run(
        id,
        input.name,
        input.slug,
        input.description ?? null,
        JSON.stringify(input.schema_definition ?? []),
        JSON.stringify(input.ingestion_methods),
        input.webhook_token ?? null,
        (input.active ?? true) ? 1 : 0,
        created_at,
        now,
      );
    const row = this.db
      .prepare("SELECT * FROM tiler_data_sources WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToDataSource(row);
  }

  async deleteDataSource(id: string): Promise<void> {
    this.db.prepare("DELETE FROM tiler_data_sources WHERE id = ?").run(id);
  }

  // ─── records ───────────────────────────────────────────────────────────────

  async insertRecord(input: DataRecordInput): Promise<DataRecord> {
    const now = new Date().toISOString();
    const id = input.id ?? newId();
    this.db
      .prepare(
        `
        INSERT INTO tiler_data_records (id, data_source_id, payload, recorded_at, source_ref, ingested_via, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        id,
        input.data_source_id,
        JSON.stringify(input.payload),
        input.recorded_at,
        input.source_ref ?? null,
        input.ingested_via,
        now,
      );
    const row = this.db
      .prepare("SELECT * FROM tiler_data_records WHERE id = ?")
      .get(id) as Record<string, unknown>;
    return rowToDataRecord(row);
  }

  async insertRecordsBatch(inputs: DataRecordInput[]): Promise<number> {
    const insert = this.db.prepare(
      `
      INSERT INTO tiler_data_records (id, data_source_id, payload, recorded_at, source_ref, ingested_via, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    );
    const insertAll = this.db.transaction((rows: DataRecordInput[]) => {
      const now = new Date().toISOString();
      for (const input of rows) {
        const id = input.id ?? newId();
        insert.run(
          id,
          input.data_source_id,
          JSON.stringify(input.payload),
          input.recorded_at,
          input.source_ref ?? null,
          input.ingested_via,
          now,
        );
      }
      return rows.length;
    });
    return insertAll(inputs) as number;
  }

  async queryRecords(opts: RecordQuery): Promise<DataRecord[]> {
    let sql = "SELECT * FROM tiler_data_records WHERE data_source_id = ?";
    const params: unknown[] = [opts.dataSourceId];

    if (opts.since !== undefined) {
      sql += " AND recorded_at >= ?";
      params.push(opts.since);
    }
    if (opts.until !== undefined) {
      sql += " AND recorded_at <= ?";
      params.push(opts.until);
    }

    sql +=
      opts.orderBy === "recorded_at_asc"
        ? " ORDER BY recorded_at ASC"
        : " ORDER BY recorded_at DESC";

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    let result = rows.map(rowToDataRecord);

    if (opts.filter !== undefined) {
      const filter = opts.filter;
      result = result.filter((r) =>
        Object.entries(filter).every(([k, v]) => r.payload[k] === v),
      );
    }

    if (opts.limit !== undefined) {
      result = result.slice(0, opts.limit);
    }

    return result;
  }

  async pruneRecords(opts: { olderThan: string }): Promise<number> {
    const info = this.db
      .prepare("DELETE FROM tiler_data_records WHERE recorded_at < ?")
      .run(opts.olderThan);
    return info.changes;
  }
}
