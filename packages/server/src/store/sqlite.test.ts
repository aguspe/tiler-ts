import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BetterSqliteStore } from "./sqlite";

let tmp: string;
let store: BetterSqliteStore;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), "tiler-sqlite-"));
  store = new BetterSqliteStore({ path: join(tmp, "tiler.db") });
  await store.migrate();
});

afterEach(async () => {
  await store.close();
  rmSync(tmp, { recursive: true, force: true });
});

// ─── dashboards ───────────────────────────────────────────────────────────────

describe("BetterSqliteStore — dashboards", () => {
  it("upserts a dashboard and returns it in listDashboards", async () => {
    const d = await store.upsertDashboard({
      name: "Main",
      slug: "main",
      description: null,
      refresh_seconds: 30,
      settings: { tv_mode: false },
    });
    expect(d.id).toBeTruthy();
    expect(d.name).toBe("Main");
    expect(d.slug).toBe("main");
    expect(d.refresh_seconds).toBe(30);
    expect(d.settings.tv_mode).toBe(false);

    const list = await store.listDashboards();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(d.id);
  });

  it("preserves created_at on subsequent upserts", async () => {
    const d1 = await store.upsertDashboard({ name: "A", slug: "a", description: null });
    const d2 = await store.upsertDashboard({
      id: d1.id,
      name: "A updated",
      slug: "a",
      description: null,
    });
    expect(d2.created_at).toBe(d1.created_at);
    expect(d2.name).toBe("A updated");
    expect(d2.updated_at >= d1.updated_at).toBe(true);
  });

  it("getDashboard returns null on unknown slug", async () => {
    const result = await store.getDashboard("does-not-exist");
    expect(result).toBeNull();
  });

  it("getDashboard returns the correct row by slug", async () => {
    await store.upsertDashboard({ name: "Ops", slug: "ops", description: "Ops board" });
    const found = await store.getDashboard("ops");
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Ops");
    expect(found?.description).toBe("Ops board");
  });

  it("deleteDashboard removes the row and cascades to panels", async () => {
    const d = await store.upsertDashboard({ name: "ToBeDel", slug: "tbd", description: null });
    await store.upsertPanel({
      dashboard_id: d.id,
      data_source_id: null,
      title: "Panel 1",
      widget_type: "stat",
      x: 0,
      y: 0,
      width: 4,
      height: 3,
    });
    const panelsBefore = await store.listPanels(d.id);
    expect(panelsBefore).toHaveLength(1);

    await store.deleteDashboard(d.id);

    const list = await store.listDashboards();
    expect(list.find((x) => x.id === d.id)).toBeUndefined();

    const panelsAfter = await store.listPanels(d.id);
    expect(panelsAfter).toHaveLength(0);
  });
});

// ─── data sources ─────────────────────────────────────────────────────────────

describe("BetterSqliteStore — data sources", () => {
  it("upserts a data source and returns it via getDataSource", async () => {
    const ds = await store.upsertDataSource({
      name: "Metrics",
      slug: "metrics",
      description: null,
      schema_definition: [{ key: "value", type: "float" }],
      ingestion_methods: ["webhook"],
      webhook_token: "tok_abc",
      active: true,
    });
    expect(ds.id).toBeTruthy();
    expect(ds.active).toBe(true);
    expect(ds.ingestion_methods).toEqual(["webhook"]);
    expect(ds.schema_definition).toHaveLength(1);

    const found = await store.getDataSource("metrics");
    expect(found?.id).toBe(ds.id);
  });

  it("getDataSource returns null on unknown slug", async () => {
    expect(await store.getDataSource("ghost")).toBeNull();
  });

  it("getDataSourceByToken finds by webhook_token", async () => {
    const ds = await store.upsertDataSource({
      name: "Events",
      slug: "events",
      description: null,
      ingestion_methods: ["webhook"],
      webhook_token: "secret-tok",
      active: true,
    });
    const found = await store.getDataSourceByToken("secret-tok");
    expect(found?.id).toBe(ds.id);
  });

  it("getDataSourceByToken returns null on unknown token", async () => {
    expect(await store.getDataSourceByToken("nope")).toBeNull();
  });

  it("preserves created_at on data source upsert", async () => {
    const ds1 = await store.upsertDataSource({
      name: "DS",
      slug: "ds",
      description: null,
      ingestion_methods: ["manual"],
      webhook_token: null,
      active: true,
    });
    const ds2 = await store.upsertDataSource({
      id: ds1.id,
      name: "DS renamed",
      slug: "ds",
      description: null,
      ingestion_methods: ["manual"],
      webhook_token: null,
      active: false,
    });
    expect(ds2.created_at).toBe(ds1.created_at);
    expect(ds2.active).toBe(false);
  });

  it("deleteDataSource removes the source", async () => {
    const ds = await store.upsertDataSource({
      name: "Bye",
      slug: "bye",
      description: null,
      ingestion_methods: ["manual"],
      webhook_token: null,
      active: true,
    });
    await store.deleteDataSource(ds.id);
    expect(await store.getDataSource("bye")).toBeNull();
    const list = await store.listDataSources();
    expect(list.find((x) => x.id === ds.id)).toBeUndefined();
  });
});

// ─── records ──────────────────────────────────────────────────────────────────

describe("BetterSqliteStore — records", () => {
  async function makeDs(slug: string) {
    return store.upsertDataSource({
      name: slug,
      slug,
      description: null,
      ingestion_methods: ["webhook"],
      webhook_token: null,
      active: true,
    });
  }

  it("insertRecord returns the persisted row", async () => {
    const ds = await makeDs("src-a");
    const rec = await store.insertRecord({
      data_source_id: ds.id,
      payload: { x: 1 },
      recorded_at: "2024-01-01T00:00:00.000Z",
      source_ref: null,
      ingested_via: "webhook",
    });
    expect(rec.id).toBeTruthy();
    expect(rec.payload).toEqual({ x: 1 });
    expect(rec.data_source_id).toBe(ds.id);
  });

  it("queryRecords filters by dataSourceId", async () => {
    const ds1 = await makeDs("src-q1");
    const ds2 = await makeDs("src-q2");
    await store.insertRecord({
      data_source_id: ds1.id,
      payload: { v: 1 },
      recorded_at: "2024-01-01T00:00:00.000Z",
      source_ref: null,
      ingested_via: "manual",
    });
    await store.insertRecord({
      data_source_id: ds2.id,
      payload: { v: 2 },
      recorded_at: "2024-01-01T00:00:00.000Z",
      source_ref: null,
      ingested_via: "manual",
    });
    const results = await store.queryRecords({ dataSourceId: ds1.id });
    expect(results).toHaveLength(1);
    expect(results[0]?.payload).toEqual({ v: 1 });
  });

  it("queryRecords filters by since/until time window", async () => {
    const ds = await makeDs("src-tw");
    for (const ts of [
      "2024-01-01T00:00:00.000Z",
      "2024-06-01T00:00:00.000Z",
      "2024-12-31T00:00:00.000Z",
    ]) {
      await store.insertRecord({
        data_source_id: ds.id,
        payload: { ts },
        recorded_at: ts,
        source_ref: null,
        ingested_via: "webhook",
      });
    }
    const results = await store.queryRecords({
      dataSourceId: ds.id,
      since: "2024-03-01T00:00:00.000Z",
      until: "2024-09-01T00:00:00.000Z",
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.recorded_at).toBe("2024-06-01T00:00:00.000Z");
  });

  it("queryRecords respects limit and orderBy", async () => {
    const ds = await makeDs("src-ord");
    for (const ts of [
      "2024-01-01T00:00:00.000Z",
      "2024-02-01T00:00:00.000Z",
      "2024-03-01T00:00:00.000Z",
    ]) {
      await store.insertRecord({
        data_source_id: ds.id,
        payload: { ts },
        recorded_at: ts,
        source_ref: null,
        ingested_via: "manual",
      });
    }

    const desc = await store.queryRecords({
      dataSourceId: ds.id,
      orderBy: "recorded_at_desc",
      limit: 2,
    });
    expect(desc).toHaveLength(2);
    expect(desc[0]?.recorded_at).toBe("2024-03-01T00:00:00.000Z");

    const asc = await store.queryRecords({
      dataSourceId: ds.id,
      orderBy: "recorded_at_asc",
      limit: 2,
    });
    expect(asc).toHaveLength(2);
    expect(asc[0]?.recorded_at).toBe("2024-01-01T00:00:00.000Z");
  });

  it("queryRecords filters by payload key via filter option", async () => {
    const ds = await makeDs("src-flt");
    await store.insertRecord({
      data_source_id: ds.id,
      payload: { env: "prod" },
      recorded_at: "2024-01-01T00:00:00.000Z",
      source_ref: null,
      ingested_via: "manual",
    });
    await store.insertRecord({
      data_source_id: ds.id,
      payload: { env: "staging" },
      recorded_at: "2024-01-02T00:00:00.000Z",
      source_ref: null,
      ingested_via: "manual",
    });

    const results = await store.queryRecords({ dataSourceId: ds.id, filter: { env: "prod" } });
    expect(results).toHaveLength(1);
    expect(results[0]?.payload.env).toBe("prod");
  });

  it("insertRecordsBatch returns count and persists all rows", async () => {
    const ds = await makeDs("src-batch");
    const count = await store.insertRecordsBatch([
      {
        data_source_id: ds.id,
        payload: { i: 0 },
        recorded_at: "2024-01-01T00:00:00.000Z",
        source_ref: null,
        ingested_via: "csv",
      },
      {
        data_source_id: ds.id,
        payload: { i: 1 },
        recorded_at: "2024-01-02T00:00:00.000Z",
        source_ref: null,
        ingested_via: "csv",
      },
      {
        data_source_id: ds.id,
        payload: { i: 2 },
        recorded_at: "2024-01-03T00:00:00.000Z",
        source_ref: null,
        ingested_via: "csv",
      },
    ]);
    expect(count).toBe(3);
    const rows = await store.queryRecords({ dataSourceId: ds.id });
    expect(rows).toHaveLength(3);
  });

  it("pruneRecords removes old records and returns count", async () => {
    const ds = await makeDs("src-prune");
    await store.insertRecordsBatch([
      {
        data_source_id: ds.id,
        payload: { i: 0 },
        recorded_at: "2023-01-01T00:00:00.000Z",
        source_ref: null,
        ingested_via: "manual",
      },
      {
        data_source_id: ds.id,
        payload: { i: 1 },
        recorded_at: "2023-06-01T00:00:00.000Z",
        source_ref: null,
        ingested_via: "manual",
      },
      {
        data_source_id: ds.id,
        payload: { i: 2 },
        recorded_at: "2025-01-01T00:00:00.000Z",
        source_ref: null,
        ingested_via: "manual",
      },
    ]);
    const pruned = await store.pruneRecords({ olderThan: "2024-01-01T00:00:00.000Z" });
    expect(pruned).toBe(2);
    const remaining = await store.queryRecords({ dataSourceId: ds.id });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.recorded_at).toBe("2025-01-01T00:00:00.000Z");
  });
});

// ─── panels ───────────────────────────────────────────────────────────────────

describe("BetterSqliteStore — panels", () => {
  it("upserts a panel and returns it in listPanels", async () => {
    const d = await store.upsertDashboard({ name: "Dash", slug: "dash", description: null });
    const p = await store.upsertPanel({
      dashboard_id: d.id,
      data_source_id: null,
      title: "My Panel",
      widget_type: "stat",
      x: 0,
      y: 0,
      width: 4,
      height: 3,
      config: { color: "red" },
    });
    expect(p.id).toBeTruthy();
    expect(p.title).toBe("My Panel");
    expect(p.config).toEqual({ color: "red" });

    const list = await store.listPanels(d.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(p.id);
  });

  it("preserves created_at on panel upsert", async () => {
    const d = await store.upsertDashboard({ name: "D2", slug: "d2", description: null });
    const p1 = await store.upsertPanel({
      dashboard_id: d.id,
      data_source_id: null,
      title: "P",
      widget_type: "chart",
      x: 0,
      y: 0,
      width: 6,
      height: 4,
    });
    const p2 = await store.upsertPanel({
      id: p1.id,
      dashboard_id: d.id,
      data_source_id: null,
      title: "P updated",
      widget_type: "chart",
      x: 1,
      y: 1,
      width: 6,
      height: 4,
    });
    expect(p2.created_at).toBe(p1.created_at);
    expect(p2.title).toBe("P updated");
  });

  it("deletePanel removes the panel row only", async () => {
    const d = await store.upsertDashboard({ name: "D3", slug: "d3", description: null });
    const p1 = await store.upsertPanel({
      dashboard_id: d.id,
      data_source_id: null,
      title: "Keep",
      widget_type: "stat",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
    });
    const p2 = await store.upsertPanel({
      dashboard_id: d.id,
      data_source_id: null,
      title: "Delete",
      widget_type: "stat",
      x: 2,
      y: 0,
      width: 2,
      height: 2,
    });
    await store.deletePanel(p2.id);
    const list = await store.listPanels(d.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(p1.id);
  });
});
