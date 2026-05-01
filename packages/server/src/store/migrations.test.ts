import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, migrate } from "./migrations";

describe("migrate", () => {
  it("creates all tables on a fresh DB", () => {
    const db = new Database(":memory:");
    migrate(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name).sort();
    expect(names).toContain("tiler_dashboards");
    expect(names).toContain("tiler_data_sources");
    expect(names).toContain("tiler_data_records");
    expect(names).toContain("tiler_panels");
    expect(names).toContain("tiler_schema_versions");
  });

  it("is idempotent", () => {
    const db = new Database(":memory:");
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
    const versions = db
      .prepare("SELECT version FROM tiler_schema_versions ORDER BY version")
      .all() as Array<{ version: number }>;
    expect(versions.map((v) => v.version)).toEqual(
      Array.from({ length: MIGRATIONS.length }, (_, i) => i + 1),
    );
  });

  it("creates the composite index on data_records (data_source_id, recorded_at DESC)", () => {
    const db = new Database(":memory:");
    migrate(db);
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tiler_data_records'",
      )
      .all() as Array<{ name: string }>;
    expect(indexes.some((i) => i.name === "idx_records_source_recorded_at")).toBe(true);
  });
});
