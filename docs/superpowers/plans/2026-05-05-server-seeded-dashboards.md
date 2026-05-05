# Server-Seeded Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@aguspe/tiler-server` seed dashboards into its store on boot from `presets[]` (built-in by name) and `dashboards[]` (user-supplied `definePlaywrightConfig`-shaped configs in the server's `tiler.config.ts`). Idempotent by `dashboard.slug` so editor edits are never overwritten.

**Architecture:** A new `presets/registry.ts` in `@aguspe/tiler-core` maps preset names to factory functions; a new `presets/playwright-config.ts` declares a standalone `DashboardConfig` interface (structurally identical to playwright's `PlaywrightTilerConfig`) and a `playwrightConfigToPresetOutput()` bridge that materializes it into a `PresetOutput`. The server gains `seedDashboards(cfg, store)` invoked once after `store.migrate()` during boot.

**Tech Stack:** TypeScript, Vitest, pnpm workspaces, tsup, Fastify, better-sqlite3.

**Spec:** `docs/superpowers/specs/2026-05-05-server-seeded-dashboards-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `packages/core/src/presets/registry.ts` | create | `getPreset(name)` / `listPresets()` — name → factory map. |
| `packages/core/src/presets/registry.test.ts` | create | Unit tests for the registry. |
| `packages/core/src/presets/playwright-config.ts` | create | `DashboardConfig`, `UserPanelInput` types + `playwrightConfigToPresetOutput({config, now})` bridge. |
| `packages/core/src/presets/playwright-config.test.ts` | create | Unit tests for the bridge: dashboard defaults, source materialization, panel id-fill, auto-place, slug binding, throw-on-missing-slug. |
| `packages/core/src/config.ts` | modify | Add `dashboards?: DashboardConfig[]` to `TilerConfig` and `ResolvedTilerConfig`; `defineConfig` defaults it to `[]`. |
| `packages/core/src/index.ts` | modify | Re-export `getPreset`, `listPresets`, `playwrightConfigToPresetOutput`, `DashboardConfig`, `UserPanelInput`. |
| `packages/server/src/seed.ts` | create | `seedDashboards(cfg, store)` orchestration. |
| `packages/server/src/seed.test.ts` | create | Idempotency, duplicate-slug, unknown-preset, custom-dashboard, ignored-collect. |
| `packages/server/src/server.ts` | modify | Call `seedDashboards` after `migrate()`. |
| `packages/playwright/src/define-config.test.ts` | modify | Add structural-assignability check between `PlaywrightTilerConfig` and core's `DashboardConfig`. |
| `packages/core/package.json` | modify | Bump to 1.3.0. |
| `packages/server/package.json` | modify | Bump to 1.1.0; pin core 1.3.0. |
| `docs/site/docs/server/seeding.md` | create | Docusaurus page covering the two seed paths and the seed-once policy. |
| `packages/server/README.md` | modify | Short "Seeded dashboards" section linking the Docusaurus page. |

---

## Task 1: Preset registry

**Files:**
- Create: `packages/core/src/presets/registry.ts`
- Create: `packages/core/src/presets/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/presets/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPreset, listPresets } from "./registry";

describe("preset registry", () => {
  it("returns the test_automation factory by name", () => {
    const fn = getPreset("test_automation");
    expect(typeof fn).toBe("function");
  });

  it("calling the returned factory produces a PresetOutput", () => {
    const fn = getPreset("test_automation")!;
    const out = fn({ now: new Date("2026-05-05T00:00:00.000Z") });
    expect(out.dashboard.slug).toBe("test_automation");
    expect(out.panels.length).toBeGreaterThan(0);
    expect(out.dataSources.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown name", () => {
    expect(getPreset("not_a_preset")).toBeUndefined();
  });

  it("listPresets returns every registered name", () => {
    expect(listPresets()).toEqual(["test_automation"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-core test -- registry`
Expected: FAIL — module `./registry` not found.

- [ ] **Step 3: Create the registry**

Create `packages/core/src/presets/registry.ts`:

```ts
import { testAutomationPreset } from "./test_automation";
import type { PresetOptions, PresetOutput } from "./types";

export type PresetFactory = (opts?: PresetOptions) => PresetOutput;

const REGISTRY = new Map<string, PresetFactory>([
  ["test_automation", testAutomationPreset],
]);

export function getPreset(name: string): PresetFactory | undefined {
  return REGISTRY.get(name);
}

export function listPresets(): string[] {
  return Array.from(REGISTRY.keys());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-core test -- registry`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/presets/registry.ts packages/core/src/presets/registry.test.ts
git commit -m "feat(core/presets): add registry with getPreset/listPresets"
```

---

## Task 2: `playwrightConfigToPresetOutput` bridge

**Files:**
- Create: `packages/core/src/presets/playwright-config.ts`
- Create: `packages/core/src/presets/playwright-config.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/presets/playwright-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { playwrightConfigToPresetOutput } from "./playwright-config";

const NOW = new Date("2026-05-05T00:00:00.000Z");

describe("playwrightConfigToPresetOutput", () => {
  it("materializes a minimal dashboard with defaults", () => {
    const out = playwrightConfigToPresetOutput({
      config: { dashboard: { slug: "my_dash", name: "My Dash" } },
      now: NOW,
    });
    expect(out.dashboard.slug).toBe("my_dash");
    expect(out.dashboard.name).toBe("My Dash");
    expect(out.dashboard.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(out.dashboard.created_at).toBe(NOW.toISOString());
    expect(out.dashboard.refresh_seconds).toBe(0);
    expect(out.panels).toEqual([]);
    expect(out.dataSources).toEqual([]);
  });

  it("synthesizes a slug when the user did not supply one", () => {
    const out = playwrightConfigToPresetOutput({
      config: { dashboard: { name: "no slug" } },
      now: NOW,
    });
    expect(out.dashboard.slug).toMatch(/^dash-[0-9A-Z]{26}$/);
  });

  it("materializes user data sources with fresh ids and timestamps", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d1" },
        dataSources: [
          {
            source: {
              name: "Coverage",
              slug: "coverage",
              description: "",
              schema_definition: [{ key: "pct", type: "float" }],
              ingestion_methods: ["manual"],
              webhook_token: null,
              active: true,
            },
            collect: async () => [],
          },
        ],
      },
      now: NOW,
    });
    expect(out.dataSources).toHaveLength(1);
    expect(out.dataSources[0]!.slug).toBe("coverage");
    expect(out.dataSources[0]!.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(out.dataSources[0]!.created_at).toBe(NOW.toISOString());
  });

  it("preserves a user-supplied data source id", () => {
    const id = "01HCUSTOMSOURCEIDXXXXXXXXX";
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d2" },
        dataSources: [
          {
            source: {
              id,
              name: "X",
              slug: "x",
              description: "",
              schema_definition: [{ key: "v", type: "integer" }],
              ingestion_methods: ["manual"],
              webhook_token: null,
              active: true,
            },
            collect: async () => [],
          },
        ],
      },
      now: NOW,
    });
    expect(out.dataSources[0]!.id).toBe(id);
  });

  it("fills panel id, dashboard_id, timestamps, and config defaults", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d3" },
        panels: [
          {
            widget_type: "metric",
            title: "T",
            x: 0,
            y: 0,
            width: 3,
            height: 2,
            config: {},
            data_source_id: "01HEXISTINGSOURCEXXXXXXXXX",
          },
        ],
      },
      now: NOW,
    });
    const p = out.panels[0]!;
    expect(p.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(p.dashboard_id).toBe(out.dashboard.id);
    expect(p.created_at).toBe(NOW.toISOString());
    expect(p.config).toEqual({});
  });

  it("auto-places panels with omitted y starting at cursor 0", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d4" },
        panels: [
          {
            widget_type: "metric",
            title: "A",
            x: 0,
            width: 3,
            height: 2,
            config: {},
            data_source_id: "01HSRCAXXXXXXXXXXXXXXXXXXX",
          },
          {
            widget_type: "metric",
            title: "B",
            x: 0,
            y: 100,
            width: 3,
            height: 2,
            config: {},
            data_source_id: "01HSRCBXXXXXXXXXXXXXXXXXXX",
          },
          {
            widget_type: "metric",
            title: "C",
            x: 0,
            width: 3,
            height: 4,
            config: {},
            data_source_id: "01HSRCCXXXXXXXXXXXXXXXXXXX",
          },
        ],
      },
      now: NOW,
    });
    const a = out.panels.find((p) => p.title === "A")!;
    const b = out.panels.find((p) => p.title === "B")!;
    const c = out.panels.find((p) => p.title === "C")!;
    expect(a.y).toBe(0);
    expect(b.y).toBe(100);
    expect(c.y).toBe(2); // cursor advanced by A's height (2), B was explicit so didn't move it
  });

  it("resolves data_source_slug to a user source's id", () => {
    const out = playwrightConfigToPresetOutput({
      config: {
        dashboard: { slug: "d5" },
        dataSources: [
          {
            source: {
              name: "Coverage",
              slug: "coverage",
              description: "",
              schema_definition: [{ key: "pct", type: "float" }],
              ingestion_methods: ["manual"],
              webhook_token: null,
              active: true,
            },
            collect: async () => [],
          },
        ],
        panels: [
          {
            widget_type: "metric",
            title: "Linked",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_slug: "coverage",
          },
        ],
      },
      now: NOW,
    });
    const cov = out.dataSources.find((d) => d.slug === "coverage")!;
    const linked = out.panels.find((p) => p.title === "Linked")!;
    expect(linked.data_source_id).toBe(cov.id);
  });

  it("throws when data_source_slug does not match any source", () => {
    expect(() =>
      playwrightConfigToPresetOutput({
        config: {
          dashboard: { slug: "d6" },
          panels: [
            {
              widget_type: "metric",
              title: "Bad",
              x: 0,
              y: 10,
              width: 3,
              height: 2,
              config: {},
              data_source_slug: "missing",
            },
          ],
        },
        now: NOW,
      }),
    ).toThrow(/data_source_slug "missing"/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-core test -- playwright-config`
Expected: FAIL — module `./playwright-config` not found.

- [ ] **Step 3: Implement the bridge**

Create `packages/core/src/presets/playwright-config.ts`:

```ts
import type { DataRecord } from "../schema/data_record";
import type { DataSource, DataSourceInput } from "../schema/data_source";
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-core test -- playwright-config`
Expected: PASS, 8 tests.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @aguspe/tiler-core typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/presets/playwright-config.ts packages/core/src/presets/playwright-config.test.ts
git commit -m "feat(core/presets): add playwrightConfigToPresetOutput bridge

DashboardConfig is declared standalone in core (structurally identical
to PlaywrightTilerConfig) so server-side seeding does not pull
tiler-playwright at runtime. Bridge fills ids, timestamps, dashboard
defaults; resolves data_source_slug; auto-places panels with omitted y."
```

---

## Task 3: Add `dashboards` field to `TilerConfig`

**Files:**
- Modify: `packages/core/src/config.ts`
- Modify: `packages/core/src/config.test.ts`

- [ ] **Step 1: Add the failing tests**

Append these two `it(...)` blocks INSIDE the existing `describe("defineConfig", () => { ... })` block in `packages/core/src/config.test.ts` (right before the closing `});`). The file already imports `MemoryStore` and `defineConfig`:

```ts
  it("defaults dashboards to []", () => {
    const cfg = defineConfig({ store: new MemoryStore() });
    expect(cfg.dashboards).toEqual([]);
  });

  it("preserves a passed dashboards array", () => {
    const dash = { dashboard: { slug: "x" } };
    const cfg = defineConfig({ store: new MemoryStore(), dashboards: [dash] });
    expect(cfg.dashboards).toEqual([dash]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-core test -- config`
Expected: 2 new tests FAIL — `dashboards` is not a known field.

- [ ] **Step 3: Update `config.ts`**

Replace `packages/core/src/config.ts` with:

```ts
import type { DashboardConfig } from "./presets/playwright-config";
import type { TilerStore } from "./store";

export interface AuthConfig {
  /** HTTP Basic credentials for the read-write UI. Both required if either is present. */
  basic?: { user: string; pass: string };
  /** Default HMAC secret for `/ingest/*` routes. Per-source tokens override. */
  webhookSecret?: string;
  /** Pluggable callback overriding built-in auth. Called per request. */
  authorize?: (req: unknown) => Promise<{ canView: boolean; canManage: boolean }>;
  /** Maximum allowed clock skew on webhook `recorded_at` fields, in milliseconds. */
  recordedAtSkewMs?: number;
}

export interface TilerConfig {
  /** TilerStore implementation. Required. */
  store: TilerStore;
  /** Port to bind. Default 4567. */
  port?: number;
  /** Bind address. Default "127.0.0.1" (localhost-only). */
  host?: string;
  /** Auth configuration. */
  auth?: AuthConfig;
  /** Widget packages to register at boot, in order. */
  widgets?: string[];
  /** Built-in presets to seed on first boot if their slug doesn't exist yet. */
  presets?: string[];
  /** User-defined dashboards (definePlaywrightConfig shape) to seed alongside presets. */
  dashboards?: DashboardConfig[];
  /** Path to @aguspe/tiler-viewer's dist/client. Auto-resolved from node_modules if omitted. */
  viewerClientDir?: string;
}

export interface ResolvedTilerConfig {
  store: TilerStore;
  port: number;
  host: string;
  auth: AuthConfig;
  widgets: string[];
  presets: string[];
  dashboards: DashboardConfig[];
  viewerClientDir?: string;
}

export function defineConfig(input: TilerConfig): ResolvedTilerConfig {
  const resolved: ResolvedTilerConfig = {
    store: input.store,
    port: input.port ?? 4567,
    host: input.host ?? "127.0.0.1",
    auth: input.auth ?? {},
    widgets: input.widgets ?? [],
    presets: input.presets ?? [],
    dashboards: input.dashboards ?? [],
  };
  if (input.viewerClientDir !== undefined) {
    resolved.viewerClientDir = input.viewerClientDir;
  }
  return resolved;
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `pnpm --filter @aguspe/tiler-core test -- config`
Expected: PASS — every existing test plus the 2 new ones.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @aguspe/tiler-core typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/config.ts packages/core/src/config.test.ts
git commit -m "feat(core): add dashboards field to TilerConfig"
```

---

## Task 4: Re-export the new helpers from core's entry

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add re-exports**

Read `packages/core/src/index.ts` and append at the end (after the existing `export * from "./config";` line):

```ts
export { getPreset, listPresets } from "./presets/registry";
export type { PresetFactory } from "./presets/registry";
export { playwrightConfigToPresetOutput } from "./presets/playwright-config";
export type {
  DashboardConfig,
  UserPanelInput,
  PlaywrightConfigToPresetArgs,
} from "./presets/playwright-config";
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aguspe/tiler-core typecheck`
Expected: PASS.

- [ ] **Step 3: Build to verify the dist re-exports**

Run: `pnpm --filter @aguspe/tiler-core build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): re-export preset registry and playwright-config bridge"
```

---

## Task 5: `seedDashboards` orchestration

**Files:**
- Create: `packages/server/src/seed.ts`
- Create: `packages/server/src/seed.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/server/src/seed.test.ts`:

```ts
import {
  type DashboardConfig,
  type ResolvedTilerConfig,
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
    // id is preserved (no replace); updated_at is unchanged.
    expect(dashAfterSecond.id).toBe(dashAfterFirst.id);
    expect(dashAfterSecond.updated_at).toBe(dashAfterFirst.updated_at);
  });

  it("seeds a user dashboard from cfg.dashboards", async () => {
    const store = new MemoryStore();
    const dash: DashboardConfig = {
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
    const dup: DashboardConfig = { dashboard: { slug: "test_automation" } };
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
    const dash: DashboardConfig = {
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-server test -- seed`
Expected: FAIL — module `./seed` not found.

- [ ] **Step 3: Create `seed.ts`**

Create `packages/server/src/seed.ts`:

```ts
import {
  type PresetOutput,
  type ResolvedTilerConfig,
  type TilerStore,
  getPreset,
  playwrightConfigToPresetOutput,
} from "@aguspe/tiler-core";

/**
 * Seed dashboards into the store from the resolved Tiler config.
 *
 * Idempotent by `dashboard.slug`. If a dashboard with that slug already
 * exists in the store, the entire seed is skipped (no partial seeding,
 * no overwrite of editor edits). Errors during seeding throw, aborting
 * the server boot — a misconfigured seed is a deploy-time failure.
 */
export async function seedDashboards(
  cfg: ResolvedTilerConfig,
  store: TilerStore,
): Promise<void> {
  const seeds: PresetOutput[] = [];
  const now = new Date();

  for (const name of cfg.presets) {
    const factory = getPreset(name);
    if (!factory) {
      throw new Error(`[tiler-server] unknown preset "${name}" — seeding aborted`);
    }
    seeds.push(factory({ now }));
  }

  for (const dash of cfg.dashboards) {
    seeds.push(playwrightConfigToPresetOutput({ config: dash, now }));
  }

  // Pre-flight: error on duplicate slugs in the seed list itself.
  const slugs = new Set<string>();
  for (const s of seeds) {
    if (slugs.has(s.dashboard.slug)) {
      throw new Error(
        `[tiler-server] duplicate dashboard slug "${s.dashboard.slug}" in seed config`,
      );
    }
    slugs.add(s.dashboard.slug);
  }

  for (const seed of seeds) {
    const existing = await store.getDashboard(seed.dashboard.slug);
    if (existing) {
      console.info(
        `[tiler-server] dashboard "${seed.dashboard.slug}" already exists, skipping seed`,
      );
      continue;
    }
    await store.upsertDashboard(seed.dashboard);
    for (const ds of seed.dataSources) {
      await store.upsertDataSource(ds);
    }
    for (const p of seed.panels) {
      await store.upsertPanel(p);
    }
    console.info(
      `[tiler-server] seeded "${seed.dashboard.slug}" — ${seed.panels.length} panels, ${seed.dataSources.length} sources`,
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-server test -- seed`
Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @aguspe/tiler-server typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/seed.ts packages/server/src/seed.test.ts
git commit -m "feat(server): add seedDashboards orchestration

Idempotent by dashboard.slug. Seeds built-in presets by name and
user-defined dashboards (DashboardConfig). Throws on unknown preset,
duplicate slug, or store error. collect() hooks on user dataSources
are ignored — records arrive via /ingest/:slug at runtime."
```

---

## Task 6: Wire `seedDashboards` into server boot

**Files:**
- Modify: `packages/server/src/server.ts`
- Modify: `packages/server/src/server.test.ts`

- [ ] **Step 1: Add a failing integration test**

Append to `packages/server/src/server.test.ts` (inside the existing `describe`):

```ts
  it("seeds dashboards from config on createServer", async () => {
    const store = new MemoryStore();
    const app = await createServer({
      store,
      presets: ["test_automation"],
      logger: false,
    });
    const dash = await store.getDashboard("test_automation");
    expect(dash).not.toBeNull();
    await app.close();
  });
```

If `MemoryStore` is not yet imported at the top of the test file, add it:

```ts
import { MemoryStore } from "@aguspe/tiler-core";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aguspe/tiler-server test -- server.test`
Expected: FAIL — the new test sees `dash === null` because seeding never runs.

- [ ] **Step 3: Wire `seedDashboards` into `createServer`**

In `packages/server/src/server.ts`, add the import at the top:

```ts
import { seedDashboards } from "./seed";
```

Find the `await cfg.store.migrate();` line and add the seed call directly after it:

```ts
  // Ensure store schema is migrated. Idempotent for both MemoryStore and BetterSqliteStore.
  await cfg.store.migrate();

  // Seed dashboards from cfg.presets / cfg.dashboards. Idempotent by slug;
  // throws on unknown preset, duplicate slug, or store error.
  await seedDashboards(cfg, cfg.store);
```

- [ ] **Step 4: Run server tests**

Run: `pnpm --filter @aguspe/tiler-server test`
Expected: ALL PASS (existing + the new integration test).

- [ ] **Step 5: Run the full package suite to catch regressions**

Run: `pnpm --filter @aguspe/tiler-server test && pnpm --filter @aguspe/tiler-server typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/server.ts packages/server/src/server.test.ts
git commit -m "feat(server): seed dashboards during createServer boot"
```

---

## Task 7: Drift-guard test in playwright package

**Files:**
- Modify: `packages/playwright/src/define-config.test.ts`

- [ ] **Step 1: Add the structural-assignability check**

Append to `packages/playwright/src/define-config.test.ts`:

```ts
import type { DashboardConfig } from "@aguspe/tiler-core";
import type { PlaywrightTilerConfig } from "./define-config";

describe("PlaywrightTilerConfig structural drift guard", () => {
  it("a PlaywrightTilerConfig value is assignable to core's DashboardConfig", () => {
    // This is a type-level check: if PlaywrightTilerConfig drifts away
    // from DashboardConfig, the assignment below stops compiling.
    const sample: PlaywrightTilerConfig = {
      excludePanels: ["Pass Rate"],
      panels: [
        { widget_type: "metric", title: "T", x: 0, width: 3, height: 2, config: {} },
      ],
      dataSources: [],
      dashboard: { name: "X" },
    };
    const asCore: DashboardConfig = sample;
    expect(asCore).toBe(sample);
  });
});
```

- [ ] **Step 2: Typecheck and run**

Run: `pnpm --filter @aguspe/tiler-playwright typecheck`
Expected: PASS — the structural assignability holds.

Run: `pnpm --filter @aguspe/tiler-playwright test -- define-config`
Expected: PASS, runtime check passes.

- [ ] **Step 3: Commit**

```bash
git add packages/playwright/src/define-config.test.ts
git commit -m "test(playwright): structural drift guard against core's DashboardConfig"
```

---

## Task 8: Documentation

**Files:**
- Create: `docs/site/docs/server/seeding.md`
- Modify: `packages/server/README.md`

- [ ] **Step 1: Verify the docs directory layout**

Run: `ls docs/site/docs/`
Expected output includes either an existing `server/` directory or sibling category dirs (e.g., `playwright/`). If `server/` doesn't exist yet, you'll need to create it; sibling files reveal the sidebar conventions.

- [ ] **Step 2: Create `seeding.md`**

Create `docs/site/docs/server/seeding.md`:

```md
---
sidebar_position: 2
title: Seeded dashboards
---

# Seeded dashboards

Tiler server can pre-populate its store with dashboards on boot, so a
fresh deploy on Render (or any host) immediately serves the dashboards
your team expects. Two paths, both via your `tiler.config.ts`:

## Built-in by name

Drop preset slugs into `presets`. The server resolves each name against
its built-in registry on boot and seeds the dashboard if a row with
that slug doesn't already exist.

```ts
// server's tiler.config.ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: process.env.TILER_DB_PATH ?? "./tiler.db" }),
  presets: ["test_automation"],
});
```

Today the registry contains `test_automation`. New presets ship in
`@aguspe/tiler-core` as the team adds them.

## User-defined dashboards

For dashboards your team designed, write a
`definePlaywrightConfig({...})` file and import it in your server
config. The same file works for the `@aguspe/tiler-playwright` reporter
locally — one source of truth for layout.

```ts
// server's tiler.config.ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";
import nightlyDash from "./dashboards/nightly.tiler.config.ts";
import unitDash from "./dashboards/unit.tiler.config.ts";

export default defineConfig({
  store: new BetterSqliteStore({ path: process.env.TILER_DB_PATH ?? "./tiler.db" }),
  dashboards: [nightlyDash, unitDash],
});
```

```ts
// dashboards/nightly.tiler.config.ts
import { definePlaywrightConfig } from "@aguspe/tiler-playwright";

export default definePlaywrightConfig({
  dashboard: { slug: "nightly", name: "Nightly e2e" },
  panels: [...],
  dataSources: [...],
});
```

## Seeding policy

**Seed once, never touch again.** First boot creates the dashboard
from config. Every subsequent boot: if a dashboard with that slug
already exists, the server logs and skips the entire seed. Editor
edits survive forever. To re-seed, delete the dashboard manually
(via `DELETE /api/dashboards/:id` or by removing the SQLite row).

**Errors abort the boot.** Unknown preset name, duplicate slug across
two seeds, or store-layer failure — all throw and the server doesn't
start. A misconfigured seed is a deploy-time failure, not a runtime
one.

**`collect()` is ignored on the server.** Records flow into the
server via `/ingest/:slug` (HMAC-signed) — not from the seed config.
A `dataSources[].collect` callback in your `tiler.config.ts` is
useful for the playwright reporter (which calls it at end-of-test-run)
but the server skips it during seeding.
```

- [ ] **Step 3: Verify Docusaurus build**

Run: `pnpm --filter tiler-ts-docs-site build`
Expected: PASS.

- [ ] **Step 4: Append to `packages/server/README.md`**

Find a sensible location (after the existing "Configuration" section, or just before "License" if no Configuration section exists) and append:

```md
## Seeded dashboards

The server can seed dashboards into its store on first boot from
`presets: ["..."]` (built-in by name) or `dashboards: [...]`
(user-defined `definePlaywrightConfig({...})` exports). Idempotent by
slug — editor edits are never overwritten. See the [Seeded dashboards
guide](https://aguspe.github.io/tiler-ts/server/seeding) for the full
workflow.
```

- [ ] **Step 5: Commit**

```bash
git add docs/site/docs/server/seeding.md packages/server/README.md
git commit -m "docs(server): add Seeded dashboards page + README pointer"
```

---

## Task 9: Release

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/server/package.json`

- [ ] **Step 1: Bump versions**

In `packages/core/package.json`, change `"version": "1.2.2"` → `"version": "1.3.0"`.

In `packages/server/package.json`, change the version from `"1.0.x"` (whatever it currently is) → `"1.1.0"`.

- [ ] **Step 2: Update lockfile**

Run: `pnpm install --lockfile-only`
Expected: lockfile rewrites with new versions, no other changes.

- [ ] **Step 3: Build all packages**

Run: `pnpm build`
Expected: every package builds cleanly.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: ALL PASS.

- [ ] **Step 5: Commit + push**

```bash
git add packages/core/package.json packages/server/package.json pnpm-lock.yaml
git commit -m "chore: bump core 1.3.0, server 1.1.0 (server-seeded dashboards)"
git push origin main
```

- [ ] **Step 6: Trigger publish workflow**

Run: `gh workflow run publish.yml --repo aguspe/tiler-ts`

Wait for completion:

```bash
sleep 5
id=$(gh run list --workflow=publish.yml --repo aguspe/tiler-ts --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $id --repo aguspe/tiler-ts --exit-status
```

Expected: changeset publishes `@aguspe/tiler-core@1.3.0` and `@aguspe/tiler-server@1.1.0`.

- [ ] **Step 7: Verify on the registry**

Run:

```bash
curl -s https://registry.npmjs.org/@aguspe%2Ftiler-core/latest | python3 -c "import sys,json;print('core:', json.load(sys.stdin)['version'])"
curl -s https://registry.npmjs.org/@aguspe%2Ftiler-server/latest | python3 -c "import sys,json;print('server:', json.load(sys.stdin)['version'])"
```

Expected: `core: 1.3.0`, `server: 1.1.0`.

---

## Acceptance checklist

When all tasks are done, run this end-to-end smoke test:

1. `pnpm install && pnpm build && pnpm test` — all green.
2. From a clean shell with `BetterSqliteStore`:

   ```ts
   // a fresh server config
   import { defineConfig } from "@aguspe/tiler-core";
   import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";
   import { createServer } from "@aguspe/tiler-server";

   const cfg = defineConfig({
     store: new BetterSqliteStore({ path: "/tmp/tiler-seed-test.db" }),
     presets: ["test_automation"],
   });
   const app = await createServer(cfg);
   await app.listen({ port: 4567 });
   ```

   Hit `GET /api/dashboards`. Expect a single entry with slug `test_automation`.
3. Edit one panel via `PATCH /api/panels/:id`. Restart the server. Re-fetch the panel — your edit survives. Boot log says "already exists, skipping seed".
4. `npm view @aguspe/tiler-core version` = `1.3.0`. `npm view @aguspe/tiler-server version` = `1.1.0`.
