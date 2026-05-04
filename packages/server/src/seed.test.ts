import {
  type DashboardSeed,
  type ResolvedTilerConfig,
  type TilerStore,
  MemoryStore,
} from "@aguspe/tiler-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDashboards } from "./seed";

function baseCfg(overrides: Partial<ResolvedTilerConfig> = {}): ResolvedTilerConfig {
  return {
    store: new MemoryStore(),
    port: 4567,
    host: "127.0.0.1",
    auth: {},
    widgets: [],
    presets: [],
    dashboards: [],
    ...overrides,
  };
}

let infoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  infoSpy.mockRestore();
});

describe("seedDashboards", () => {
  it("seeds a built-in preset by name", async () => {
    const store = new MemoryStore();
    const cfg = baseCfg({ store, presets: ["test_automation"] });
    await seedDashboards(cfg, store);
    const dash = await store.getDashboard("test_automation");
    expect(dash).not.toBeNull();
    expect(dash!.slug).toBe("test_automation");
    const panels = await store.listPanels(dash!.id);
    expect(panels.length).toBeGreaterThan(0);
  });

  it("is idempotent — second call with the same config skips", async () => {
    const store = new MemoryStore();
    const cfg = baseCfg({ store, presets: ["test_automation"] });
    await seedDashboards(cfg, store);
    const dashAfterFirst = (await store.getDashboard("test_automation"))!;
    await seedDashboards(cfg, store);
    const dashAfterSecond = (await store.getDashboard("test_automation"))!;
    expect(dashAfterSecond.id).toBe(dashAfterFirst.id);
    expect(dashAfterSecond.updated_at).toBe(dashAfterFirst.updated_at);
  });

  it("seeds a user dashboard from cfg.dashboards", async () => {
    const store = new MemoryStore();
    const dash: DashboardSeed = {
      dashboard: { slug: "custom", name: "My custom" },
      panels: [
        {
          widget_type: "metric",
          title: "Total",
          x: 0,
          y: 0,
          width: 3,
          height: 2,
          config: {},
          data_source_slug: "src1",
        },
      ],
      dataSources: [
        {
          source: {
            name: "Source 1",
            slug: "src1",
            description: "",
            schema_definition: [{ key: "v", type: "integer" }],
            ingestion_methods: ["manual"],
            webhook_token: null,
            active: true,
          },
        },
      ],
    };
    const cfg = baseCfg({ store, dashboards: [dash] });
    await seedDashboards(cfg, store);
    const seeded = await store.getDashboard("custom");
    expect(seeded?.name).toBe("My custom");
    const sources = await store.listDataSources();
    expect(sources.find((s) => s.slug === "src1")).toBeDefined();
  });

  it("throws when two seeds in the same config share a slug", async () => {
    const store = new MemoryStore();
    const dup: DashboardSeed = { dashboard: { slug: "test_automation" } };
    const cfg = baseCfg({ store, presets: ["test_automation"], dashboards: [dup] });
    await expect(seedDashboards(cfg, store)).rejects.toThrow(
      /duplicate dashboard slug "test_automation"/,
    );
  });

  it("throws on an unknown preset name", async () => {
    const store = new MemoryStore();
    const cfg = baseCfg({ store, presets: ["does_not_exist"] });
    await expect(seedDashboards(cfg, store)).rejects.toThrow(
      /unknown preset "does_not_exist"/,
    );
  });

  it("ignores collect() on user dataSources (no records inserted)", async () => {
    const store = new MemoryStore();
    const collect = vi.fn(async () => [
      {
        id: "01HRECORDXXXXXXXXXXXXXXXXX",
        data_source_id: "anything",
        payload: { v: 1 },
        recorded_at: new Date().toISOString(),
        source_ref: null,
        ingested_via: "manual" as const,
        created_at: new Date().toISOString(),
      },
    ]);
    const dash: DashboardSeed = {
      dashboard: { slug: "with-collect" },
      dataSources: [
        {
          source: {
            name: "S",
            slug: "s",
            description: "",
            schema_definition: [{ key: "v", type: "integer" }],
            ingestion_methods: ["manual"],
            webhook_token: null,
            active: true,
          },
          collect,
        },
      ],
    };
    const cfg = baseCfg({ store, dashboards: [dash] });
    await seedDashboards(cfg, store);
    expect(collect).not.toHaveBeenCalled();
    const src = (await store.getDataSource("s"))!;
    const records = await store.queryRecords({ dataSourceId: src.id });
    expect(records).toEqual([]);
  });

  it("propagates store errors and rolls the dashboard row back", async () => {
    const store = new MemoryStore();
    let panelCalls = 0;
    const wrapped: TilerStore = new Proxy(store, {
      get(t, k, r) {
        if (k === "upsertPanel") {
          return async (input: Parameters<TilerStore["upsertPanel"]>[0]) => {
            if (++panelCalls === 2) throw new Error("DB down");
            return store.upsertPanel(input);
          };
        }
        return Reflect.get(t, k, r);
      },
    });
    const cfg = baseCfg({ store: wrapped, presets: ["test_automation"] });
    await expect(seedDashboards(cfg, wrapped)).rejects.toThrow(/DB down/);
    // After failure, the dashboard row must be cleaned up so the next
    // boot retries cleanly.
    expect(await store.getDashboard("test_automation")).toBeNull();
  });
});
