import type { Database } from "better-sqlite3";

interface Migration {
  version: number;
  description: string;
  up: (db: Database) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "core tables (dashboards, data_sources, data_records, panels)",
    up: (db) => {
      db.exec(`
        CREATE TABLE tiler_dashboards (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          slug            TEXT NOT NULL UNIQUE,
          description     TEXT,
          refresh_seconds INTEGER NOT NULL DEFAULT 0,
          settings        TEXT NOT NULL DEFAULT '{}',
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL
        );

        CREATE TABLE tiler_data_sources (
          id                TEXT PRIMARY KEY,
          name              TEXT NOT NULL,
          slug              TEXT NOT NULL UNIQUE,
          description       TEXT,
          schema_definition TEXT NOT NULL DEFAULT '[]',
          ingestion_methods TEXT NOT NULL DEFAULT '[]',
          webhook_token     TEXT,
          active            INTEGER NOT NULL DEFAULT 1,
          created_at        TEXT NOT NULL,
          updated_at        TEXT NOT NULL
        );

        CREATE TABLE tiler_data_records (
          id              TEXT PRIMARY KEY,
          data_source_id  TEXT NOT NULL REFERENCES tiler_data_sources(id) ON DELETE CASCADE,
          payload         TEXT NOT NULL,
          recorded_at     TEXT NOT NULL,
          source_ref      TEXT,
          ingested_via    TEXT NOT NULL,
          created_at      TEXT NOT NULL
        );

        CREATE INDEX idx_records_source_recorded_at
          ON tiler_data_records (data_source_id, recorded_at DESC);

        CREATE TABLE tiler_panels (
          id              TEXT PRIMARY KEY,
          dashboard_id    TEXT NOT NULL REFERENCES tiler_dashboards(id) ON DELETE CASCADE,
          data_source_id  TEXT REFERENCES tiler_data_sources(id) ON DELETE SET NULL,
          title           TEXT NOT NULL,
          widget_type     TEXT NOT NULL,
          x               INTEGER NOT NULL,
          y               INTEGER NOT NULL,
          width           INTEGER NOT NULL,
          height          INTEGER NOT NULL,
          config          TEXT NOT NULL DEFAULT '{}',
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL
        );

        CREATE INDEX idx_panels_dashboard ON tiler_panels (dashboard_id);
      `);
    },
  },
];

const TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS tiler_schema_versions (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`;

/**
 * Run all pending migrations against the given Database. Idempotent.
 * Tracks applied versions in a `tiler_schema_versions` table.
 */
export function migrate(db: Database): void {
  db.exec(TRACKING_TABLE);
  const applied = new Set(
    (
      db.prepare("SELECT version FROM tiler_schema_versions").all() as Array<{ version: number }>
    ).map((row) => row.version),
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    db.transaction(() => {
      m.up(db);
      db.prepare("INSERT INTO tiler_schema_versions (version, applied_at) VALUES (?, ?)").run(
        m.version,
        new Date().toISOString(),
      );
    })();
  }
}
