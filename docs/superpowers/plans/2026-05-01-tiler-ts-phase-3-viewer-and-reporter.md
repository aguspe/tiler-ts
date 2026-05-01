# tiler-ts Phase 3 — Viewer + Playwright Reporter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first end-user-facing feature: a Playwright reporter that emits a self-contained static dashboard at the end of every test run. Lands `@aguspe/tiler-viewer` (read-only React app, SSR + hydrate), `@aguspe/tiler-playwright` (Playwright `Reporter` implementation), the `test_automation` preset (the QA cockpit dashboard config), an `examples/playwright-static` runnable demo, and a reporter self-test that asserts on real `tiler-report/` output.

**Architecture:** Two new packages. `@aguspe/tiler-viewer` builds twice — `tsup` for the SSR API consumed by the reporter (exports `renderToHtml`, `<TilerDashboardViewer>`), and `vite` for a browser client bundle (`dist/client/viewer-[hash].js` + `.css`) that hydrates the SSR'd HTML. The client bundle ships pre-built inside the published npm package. `@aguspe/tiler-playwright` implements Playwright's `Reporter` interface; in `onEnd` it runs every panel's resolver, builds a `TilerSnapshot`, calls `renderToHtml(snapshot)`, copies the viewer's client bundle into `outDir/assets/`, and writes `outDir/index.html` + `outDir/snapshot.json`. The static export contains zero server code — it works from `file://` and uploads cleanly as a CI artifact.

**Tech Stack:** Same as prior phases plus `react-dom/server` (SSR), `vite` + `@vitejs/plugin-react` (client build), `@playwright/test` as a peer dep on `@aguspe/tiler-playwright`. The Playwright reporter self-test uses `@playwright/test`'s programmatic API — no real browser is launched.

**Spec reference:** `docs/superpowers/specs/2026-04-30-tiler-ts-design.md` — §4A reporter, §1 viewer, the `test_automation` preset.

**Phase 2 prerequisite:** tag `v0.0.2-phase-2`. All 14 widgets registered, four resolver helpers in core.

**Notational note:** the spec uses `@tiler/<name>`. Real npm names are `@aguspe/tiler-<name>` — used throughout this plan.

---

## Per-package conventions (reference)

`@aguspe/tiler-viewer`:
- `src/server/` — SSR-only. Imported by Node consumers. No `window`, no `document`, no browser-only deps. Built by tsup.
- `src/client/` — Browser-only entry. Imports `react-dom/client`. Built by Vite into `dist/client/`.
- `src/components/` — Pure React components used by both. No environment branching.

`@aguspe/tiler-playwright`:
- All source under `src/`. Single tsup entry.
- `@playwright/test` is a peer dep (consumer's Playwright version drives behavior).
- The reporter never imports `@aguspe/tiler-server` (enforced by dependency-cruiser from Phase 1).

---

## Task 1: `test_automation` preset in `@aguspe/tiler-core`

**Files:**
- Create: `packages/core/src/presets/test_automation.ts`
- Create: `packages/core/src/presets/test_automation.test.ts`
- Create: `packages/core/src/presets/types.ts`
- Modify: `packages/core/src/index.ts`

A pure function returning the dashboard config — no I/O. Consumers (the reporter, the future `tiler init`, the future server) call this and feed the output into their own store.

- [ ] **Step 1: Define the preset return shape**

`packages/core/src/presets/types.ts`:
```ts
import type { Dashboard } from "../schema/dashboard";
import type { DataSource } from "../schema/data_source";
import type { Panel } from "../schema/panel";

export interface PresetOutput {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
}

export interface PresetOptions {
  /** When the preset's record IDs are deterministic for testing, set this. Otherwise uses Date.now(). */
  now?: Date;
  /** Override the default dashboard slug. */
  slug?: string;
}
```

- [ ] **Step 2: Write the failing tests**

`packages/core/src/presets/test_automation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { testAutomationPreset } from "./test_automation";

const NOW = new Date("2026-04-30T12:00:00.000Z");

describe("testAutomationPreset", () => {
  it("returns a dashboard, one data source, and 9 panels", () => {
    const result = testAutomationPreset({ now: NOW });
    expect(result.dashboard.slug).toBe("test_automation");
    expect(result.dataSources).toHaveLength(1);
    expect(result.dataSources[0]?.slug).toBe("test_runs");
    expect(result.panels).toHaveLength(9);
  });

  it("all panels reference the test_runs data source (or are config-only)", () => {
    const { panels, dataSources } = testAutomationPreset({ now: NOW });
    const sourceId = dataSources[0]?.id ?? "";
    const dataBackedTypes = panels.filter((p) => p.data_source_id !== null);
    const configOnlyTypes = panels.filter((p) => p.data_source_id === null);
    expect(dataBackedTypes.every((p) => p.data_source_id === sourceId)).toBe(true);
    expect(configOnlyTypes.every((p) => p.widget_type === "clock")).toBe(true);
  });

  it("respects the slug option", () => {
    const result = testAutomationPreset({ now: NOW, slug: "qa_cockpit" });
    expect(result.dashboard.slug).toBe("qa_cockpit");
  });

  it("panels lay out without overlap on a 12-column grid", () => {
    const { panels } = testAutomationPreset({ now: NOW });
    // Every cell on the grid should be covered by at most one panel.
    const cells = new Set<string>();
    for (const p of panels) {
      for (let dx = 0; dx < p.width; dx++) {
        for (let dy = 0; dy < p.height; dy++) {
          const key = `${p.x + dx},${p.y + dy}`;
          expect(cells.has(key)).toBe(false);
          cells.add(key);
        }
      }
    }
  });
});
```

- [ ] **Step 3: Run test, expect FAIL**

`pnpm --filter @aguspe/tiler-core test`

- [ ] **Step 4: Implement `test_automation.ts`**

```ts
import { newId } from "../ulid";
import type { Dashboard } from "../schema/dashboard";
import type { DataSource } from "../schema/data_source";
import type { Panel } from "../schema/panel";
import type { PresetOptions, PresetOutput } from "./types";

export function testAutomationPreset(opts: PresetOptions = {}): PresetOutput {
  const now = opts.now ?? new Date();
  const iso = now.toISOString();
  const slug = opts.slug ?? "test_automation";

  const dashboard: Dashboard = {
    id: newId(),
    name: "Test Automation",
    slug,
    description: "QA cockpit — pass rate, suite breakdown, recent runs.",
    refresh_seconds: 0,
    settings: { tv_mode: false },
    created_at: iso,
    updated_at: iso,
  };

  const sourceId = newId();
  const source: DataSource = {
    id: sourceId,
    name: "Test Runs",
    slug: "test_runs",
    description: "One record per test execution.",
    schema_definition: [
      { key: "suite", type: "string" },
      { key: "test_name", type: "string" },
      { key: "status", type: "string" },
      { key: "duration_ms", type: "float" },
      { key: "environment", type: "string" },
    ],
    ingestion_methods: ["webhook", "manual"],
    webhook_token: null,
    active: true,
    created_at: iso,
    updated_at: iso,
  };

  const panel = (
    title: string,
    widget_type: string,
    x: number, y: number, width: number, height: number,
    config: Record<string, unknown>,
    data_source_id: string | null = sourceId,
  ): Panel => ({
    id: newId(),
    dashboard_id: dashboard.id,
    data_source_id,
    title,
    widget_type,
    x, y, width, height,
    config,
    created_at: iso,
    updated_at: iso,
  });

  const panels: Panel[] = [
    // Row 0: top stats
    panel("Total runs (24h)", "metric", 0, 0, 3, 2, {
      aggregation: "count", time_window: "24h",
    }),
    panel("Failures (24h)", "number_with_delta", 3, 0, 3, 2, {
      aggregation: "count", time_window: "24h", delta_window: "24h",
      sparkline_bucket: "1h", filter: { status: "fail" }, color: "#ef4444",
    }),
    panel("Avg duration (ms)", "metric", 6, 0, 3, 2, {
      value_column: "duration_ms", aggregation: "avg", time_window: "24h", suffix: " ms",
    }),
    panel("Build clock", "clock", 9, 0, 3, 2, {
      format: "24h", timezone: "UTC", show_seconds: false,
    }, null),

    // Row 1: pie + line trend
    panel("Status breakdown (24h)", "pie_chart", 0, 2, 6, 3, {
      group_column: "status", aggregation: "count", time_window: "24h",
      palette: ["#10b981", "#f59e0b", "#ef4444", "#6b7280"],
    }),
    panel("Avg duration trend (7d)", "line_chart", 6, 2, 6, 3, {
      value_column: "duration_ms", aggregation: "avg",
      time_window: "7d", bucket: "1d",
    }),

    // Row 2: status grid
    panel("Per-suite status (24h)", "status_grid", 0, 5, 12, 3, {
      group_column: "suite", status_column: "status", time_window: "24h",
    }),

    // Row 3: bar + list
    panel("Failures by suite (24h)", "bar_chart", 0, 8, 6, 3, {
      group_column: "suite", aggregation: "count", time_window: "24h",
      filter: { status: "fail" },
    }),
    panel("Recent failures (24h)", "list", 6, 8, 6, 3, {
      columns: ["test_name", "suite", "duration_ms"],
      time_window: "24h", filter: { status: "fail" },
      limit: 10, order_by: "recorded_at_desc",
    }),
  ];

  return { dashboard, dataSources: [source], panels };
}
```

- [ ] **Step 5: Re-export from barrel**

Append to `packages/core/src/index.ts`:
```ts
export * from "./presets/types";
export * from "./presets/test_automation";
```

- [ ] **Step 6: Run test, expect PASS**

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/presets/ packages/core/src/index.ts
git commit -m "feat(core): add test_automation preset (QA cockpit dashboard config)"
```

---

## Task 2: `buildSnapshot()` helper in core

**Files:**
- Create: `packages/core/src/lib/snapshot-builder.ts`
- Create: `packages/core/src/lib/snapshot-builder.test.ts`
- Modify: `packages/core/src/index.ts`

Given a dashboard, panels, data sources, and a flat record array, build a `TilerSnapshot` with each panel's resolver pre-run and the resolved data baked alongside. The reporter calls this from `onEnd`. The viewer reads it on hydration.

The snapshot already has fields for dashboard, panels, data_sources, and records — but resolvers run server-side so the viewer has nothing to compute. To avoid re-running resolvers in the browser, the snapshot embeds resolved data as a separate map keyed by `panel.id`. We extend `TilerSnapshot` with this field.

- [ ] **Step 1: Extend the snapshot schema with `resolved`**

Modify `packages/core/src/schema/snapshot.ts`:
```ts
import { z } from "zod";
import { Dashboard } from "./dashboard";
import { DataRecord } from "./data_record";
import { DataSource } from "./data_source";
import { Panel } from "./panel";
import { Iso } from "./primitives";

export const TilerSnapshot = z.object({
  version: z.literal(1),
  generated_at: Iso,
  dashboard: Dashboard,
  panels: z.array(Panel),
  data_sources: z.array(DataSource),
  records: z.array(DataRecord),
  /** Resolved widget data, keyed by panel.id. Browsers consume this directly. */
  resolved: z.record(z.object({
    resolved: z.unknown(),
    empty: z.boolean(),
  })),
});
export type TilerSnapshot = z.infer<typeof TilerSnapshot>;
```

Update existing `snapshot.test.ts` to include the new `resolved` field on the minimal v1 fixture (set to `{}`). Run tests to confirm.

- [ ] **Step 2: Write the failing test for `buildSnapshot`**

`packages/core/src/lib/snapshot-builder.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { defineWidget, getWidget, listWidgets, __resetRegistryForTests }
  from "../registry";
import { z } from "zod";
import { buildSnapshot } from "./snapshot-builder";
import { testAutomationPreset } from "../presets/test_automation";

const NOW = new Date("2026-04-30T12:00:00.000Z");

describe("buildSnapshot", () => {
  it("runs resolvers for each panel and includes resolved data keyed by panel.id", async () => {
    __resetRegistryForTests();
    // Register a tiny test widget to avoid pulling in @aguspe/tiler-widgets here.
    defineWidget({
      meta: { type: "metric", label: "Metric", requires_data_source: true,
              default_size: { w:3,h:2 }, min_size:{w:1,h:1}, max_size:{w:12,h:4} },
      configSchema: z.object({}).passthrough(),
      resolve: ({ records }) => ({ resolved: records.length, empty: records.length === 0 }),
      component: () => null,
      example: () => ({ panel: {} as never, records: [] }),
    });
    // ... define stubs for every widget_type in the preset, similar pattern

    const preset = testAutomationPreset({ now: NOW });
    const snapshot = await buildSnapshot({
      dashboard: preset.dashboard,
      dataSources: preset.dataSources,
      panels: preset.panels,
      records: [],
      now: NOW,
    });
    expect(snapshot.version).toBe(1);
    expect(Object.keys(snapshot.resolved)).toHaveLength(9);
    for (const panel of preset.panels) {
      expect(snapshot.resolved[panel.id]).toBeDefined();
    }
  });

  it("handles a missing widget (registry key not found) gracefully", async () => {
    __resetRegistryForTests();
    const preset = testAutomationPreset({ now: NOW });
    // None of the widgets are registered.
    const snapshot = await buildSnapshot({
      dashboard: preset.dashboard,
      dataSources: preset.dataSources,
      panels: preset.panels,
      records: [],
      now: NOW,
    });
    // Each panel resolves to a synthetic empty entry.
    for (const panel of preset.panels) {
      expect(snapshot.resolved[panel.id]).toEqual({ resolved: null, empty: true });
    }
  });
});
```

For brevity in the test, the first `it` block needs stubs for all 9 widget types in the preset. Use a loop registering trivial resolvers (`() => ({ resolved: 0, empty: true })`) for each widget_type referenced. Keep them as simple stubs.

- [ ] **Step 3: Run test, expect FAIL**

- [ ] **Step 4: Implement `snapshot-builder.ts`**

```ts
import { applyTimeWindow } from "./time-window";
import type { Dashboard } from "../schema/dashboard";
import type { DataRecord } from "../schema/data_record";
import type { DataSource } from "../schema/data_source";
import type { Panel } from "../schema/panel";
import type { TilerSnapshot } from "../schema/snapshot";
import type { WidgetData } from "../widget";
import { getWidget } from "../registry";

export interface BuildSnapshotInput {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
  records: DataRecord[];
  now: Date;
}

export async function buildSnapshot(input: BuildSnapshotInput): Promise<TilerSnapshot> {
  const resolved: Record<string, WidgetData> = {};

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
    // Filter records to this panel's data source. Time-window filtering happens
    // inside the widget's own resolver — most widgets parse `time_window` from
    // their config and call applyTimeWindow themselves.
    const sourceRecords = panel.data_source_id
      ? input.records.filter((r) => r.data_source_id === panel.data_source_id)
      : [];
    try {
      const data = await widget.resolve({
        panel, records: sourceRecords, now: input.now,
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
```

- [ ] **Step 5: Re-export from barrel**

Append:
```ts
export * from "./lib/snapshot-builder";
```

- [ ] **Step 6: Run tests, expect PASS**

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/schema/snapshot.ts packages/core/src/schema/snapshot.test.ts \
        packages/core/src/lib/snapshot-builder.ts packages/core/src/lib/snapshot-builder.test.ts \
        packages/core/src/index.ts
git commit -m "feat(core): extend TilerSnapshot with resolved map + add buildSnapshot()"
```

---

## Task 3: Scaffold `@aguspe/tiler-viewer`

**Files:**
- Create: `packages/viewer/package.json`
- Create: `packages/viewer/tsconfig.json`
- Create: `packages/viewer/tsup.config.ts`
- Create: `packages/viewer/vite.config.ts`
- Create: `packages/viewer/vitest.config.ts`
- Create: `packages/viewer/src/server/index.ts` (placeholder)
- Create: `packages/viewer/src/client/main.tsx` (placeholder)
- Create: `packages/viewer/src/test/setup.ts`

The viewer package builds twice: `tsup` for the SSR API consumed by Node, `vite` for a browser hydration bundle.

- [ ] **Step 1: Create `packages/viewer/package.json`**

```json
{
  "name": "@aguspe/tiler-viewer",
  "version": "0.0.1",
  "description": "Read-only React app for rendering Tiler dashboards. SSR + hydrate.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/aguspe/tiler-ts.git",
    "directory": "packages/viewer"
  },
  "homepage": "https://github.com/aguspe/tiler-ts/tree/main/packages/viewer",
  "publishConfig": { "access": "public" },
  "type": "module",
  "main": "./dist/server/index.cjs",
  "module": "./dist/server/index.js",
  "types": "./dist/server/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/server/index.d.ts",
      "import": "./dist/server/index.js",
      "require": "./dist/server/index.cjs"
    },
    "./client/*": "./dist/client/*"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup && vite build",
    "build:server": "tsup",
    "build:client": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "size": "size-limit"
  },
  "dependencies": {
    "@aguspe/tiler-core": "workspace:*",
    "@aguspe/tiler-widgets": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "@size-limit/preset-small-lib": "^11.1.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "size-limit": "^11.1.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/viewer/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsbuildinfo",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

- [ ] **Step 3: Create `packages/viewer/tsup.config.ts`** (SSR build)

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "server/index": "src/server/index.ts" },
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,        // vite owns dist/client/; tsup only owns dist/server/
  target: "es2022",
  splitting: false,
  external: ["react", "react-dom", "react-dom/server"],
});
```

- [ ] **Step 4: Create `packages/viewer/vite.config.ts`** (client build)

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: { viewer: "src/client/main.tsx" },
      output: {
        entryFileNames: "viewer-[hash].js",
        assetFileNames: "viewer-[hash].[ext]",
        chunkFileNames: "viewer-[hash].js",
      },
    },
    sourcemap: true,
    target: "es2022",
  },
});
```

- [ ] **Step 5: Create `packages/viewer/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    coverage: { reporter: ["text", "html"], reportsDirectory: "coverage" },
  },
});
```

- [ ] **Step 6: Create `packages/viewer/src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 7: Create placeholder server entry**

`packages/viewer/src/server/index.ts`:
```ts
export const TILER_VIEWER_VERSION = "0.0.1" as const;
```

- [ ] **Step 8: Create placeholder client entry**

`packages/viewer/src/client/main.tsx`:
```tsx
console.log("@aguspe/tiler-viewer client placeholder");
export {};
```

- [ ] **Step 9: Install + verify both builds run**

```bash
pnpm install
pnpm --filter @aguspe/tiler-viewer build:server
pnpm --filter @aguspe/tiler-viewer build:client
```
Expected: `dist/server/index.{js,cjs,d.ts}` and `dist/client/viewer-*.js` both exist.

- [ ] **Step 10: Commit**

```bash
git add packages/viewer/ pnpm-lock.yaml
git commit -m "feat(viewer): scaffold @aguspe/tiler-viewer (tsup + vite dual build)"
```

---

## Task 4: `<TilerWidgetTile>` — single-panel renderer

**Files:**
- Create: `packages/viewer/src/components/TilerWidgetTile.tsx`
- Create: `packages/viewer/src/components/TilerWidgetTile.test.tsx`

Renders one panel: header (title) + body (the widget component looked up from the registry, fed `panel` and the resolved data). Handles the unknown-widget case gracefully.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import "@aguspe/tiler-widgets";  // side-effect: register all 14 widgets
import { describe, expect, it } from "vitest";
import { TilerWidgetTile } from "./TilerWidgetTile";

const PANEL = {
  id: "p1", dashboard_id: "d1", data_source_id: null,
  title: "Build clock", widget_type: "clock",
  x: 0, y: 0, width: 3, height: 2,
  config: { format: "24h", timezone: "UTC", show_seconds: false },
  created_at: "2026-04-30T12:00:00.000Z",
  updated_at: "2026-04-30T12:00:00.000Z",
};

describe("TilerWidgetTile", () => {
  it("renders the panel title and the widget component", () => {
    render(<TilerWidgetTile panel={PANEL} data={{ resolved: null, empty: false }} />);
    expect(screen.getByText("Build clock")).toBeInTheDocument();
  });

  it("renders an unknown-widget placeholder when widget_type is not registered", () => {
    render(
      <TilerWidgetTile
        panel={{ ...PANEL, widget_type: "weather" }}
        data={{ resolved: null, empty: false }}
      />
    );
    expect(screen.getByText(/Unknown widget: weather/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `TilerWidgetTile.tsx`**

```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { getWidget } from "@aguspe/tiler-core";

export function TilerWidgetTile({
  panel, data,
}: {
  panel: Panel;
  data: WidgetData;
}): JSX.Element {
  const widget = getWidget(panel.widget_type);
  return (
    <section
      className="tiler-tile"
      style={{
        background: "var(--tiler-color-tile)",
        borderRadius: "var(--tiler-radius)",
        display: "flex", flexDirection: "column", height: "100%",
      }}
    >
      <header
        className="tiler-tile__header"
        style={{
          background: "var(--tiler-color-tile-header)",
          padding: "8px 12px", fontSize: "0.85rem", fontWeight: 600,
          borderTopLeftRadius: "var(--tiler-radius)",
          borderTopRightRadius: "var(--tiler-radius)",
        }}
      >
        {panel.title}
      </header>
      <div className="tiler-tile__body" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {widget
          ? <widget.component panel={panel} data={data} />
          : <div style={{ padding: 12, opacity: 0.6, fontSize: "0.85rem" }}>
              Unknown widget: {panel.widget_type}
            </div>}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/viewer/src/components/
git commit -m "feat(viewer): add TilerWidgetTile (single-panel renderer)"
```

---

## Task 5: `<TilerDashboardViewer>` — full dashboard renderer

**Files:**
- Create: `packages/viewer/src/components/TilerDashboardViewer.tsx`
- Create: `packages/viewer/src/components/TilerDashboardViewer.test.tsx`

Renders all panels in a CSS grid laid out by their `(x, y, width, height)`. Reads the per-panel resolved data from the snapshot.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import "@aguspe/tiler-widgets";
import { describe, expect, it } from "vitest";
import { TilerDashboardViewer } from "./TilerDashboardViewer";

const NOW = "2026-04-30T12:00:00.000Z";

const SNAPSHOT = {
  version: 1 as const,
  generated_at: NOW,
  dashboard: {
    id: "d1", name: "QA", slug: "qa", description: null,
    refresh_seconds: 0, settings: { tv_mode: false },
    created_at: NOW, updated_at: NOW,
  },
  panels: [{
    id: "p1", dashboard_id: "d1", data_source_id: null,
    title: "Build clock", widget_type: "clock",
    x: 0, y: 0, width: 3, height: 2,
    config: { format: "24h", timezone: "UTC", show_seconds: false },
    created_at: NOW, updated_at: NOW,
  }],
  data_sources: [],
  records: [],
  resolved: { p1: { resolved: null, empty: false } },
};

describe("TilerDashboardViewer", () => {
  it("renders the dashboard name and each panel as a tile", () => {
    render(<TilerDashboardViewer snapshot={SNAPSHOT} />);
    expect(screen.getByRole("heading", { name: "QA" })).toBeInTheDocument();
    expect(screen.getByText("Build clock")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `TilerDashboardViewer.tsx`**

```tsx
import type { TilerSnapshot } from "@aguspe/tiler-core";
import { TilerWidgetTile } from "./TilerWidgetTile";

const ROW_HEIGHT_PX = 80;
const COLUMNS = 12;

export function TilerDashboardViewer({
  snapshot,
}: {
  snapshot: TilerSnapshot;
}): JSX.Element {
  const themeStyle: React.CSSProperties = {
    ...(snapshot.dashboard.settings.theme?.page && { "--tiler-color-page": snapshot.dashboard.settings.theme.page } as React.CSSProperties),
    ...(snapshot.dashboard.settings.theme?.tile && { "--tiler-color-tile": snapshot.dashboard.settings.theme.tile } as React.CSSProperties),
    ...(snapshot.dashboard.settings.theme?.tile_header && { "--tiler-color-tile-header": snapshot.dashboard.settings.theme.tile_header } as React.CSSProperties),
    background: "var(--tiler-color-page)",
    color: "var(--tiler-color-text)",
    fontFamily: "var(--tiler-font-sans)",
    minHeight: "100vh",
    padding: 16,
  };

  return (
    <div className="tiler-dashboard" style={themeStyle}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{snapshot.dashboard.name}</h1>
        {snapshot.dashboard.description && (
          <p style={{ margin: "4px 0 0 0", opacity: 0.7, fontSize: "0.9rem" }}>
            {snapshot.dashboard.description}
          </p>
        )}
      </header>
      <div
        className="tiler-grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
          gridAutoRows: `${ROW_HEIGHT_PX}px`,
          gap: 12,
        }}
      >
        {snapshot.panels.map((panel) => (
          <div
            key={panel.id}
            style={{
              gridColumn: `${panel.x + 1} / span ${panel.width}`,
              gridRow: `${panel.y + 1} / span ${panel.height}`,
            }}
          >
            <TilerWidgetTile
              panel={panel}
              data={snapshot.resolved[panel.id] ?? { resolved: null, empty: true }}
            />
          </div>
        ))}
      </div>
      <footer
        style={{
          marginTop: 16, fontSize: "0.7rem", opacity: 0.5,
          textAlign: "right", fontFamily: "var(--tiler-font-mono)",
        }}
      >
        Generated at {new Date(snapshot.generated_at).toLocaleString()}
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/viewer/src/components/
git commit -m "feat(viewer): add TilerDashboardViewer (grid layout, theme tokens)"
```

---

## Task 6: `renderToHtml()` — SSR helper

**Files:**
- Create: `packages/viewer/src/server/render-to-html.ts`
- Create: `packages/viewer/src/server/render-to-html.test.ts`
- Modify: `packages/viewer/src/server/index.ts`

Takes a snapshot, returns a complete HTML document string. Embeds the snapshot as a JSON `<script>` tag and links the client bundle for hydration.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import "@aguspe/tiler-widgets";
import { renderToHtml } from "./render-to-html";

const NOW = "2026-04-30T12:00:00.000Z";
const SNAPSHOT = {
  version: 1 as const,
  generated_at: NOW,
  dashboard: { id:"d", name:"QA", slug:"qa", description:null,
               refresh_seconds:0, settings:{tv_mode:false},
               created_at:NOW, updated_at:NOW },
  panels: [], data_sources: [], records: [], resolved: {},
};

describe("renderToHtml", () => {
  it("returns a full HTML document with the dashboard name in the title", () => {
    const html = renderToHtml(SNAPSHOT, { clientAssetPath: "./assets/viewer-abc.js" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>QA — tiler-ts</title>");
  });

  it("embeds the snapshot as a JSON script tag", () => {
    const html = renderToHtml(SNAPSHOT, { clientAssetPath: "./assets/viewer-abc.js" });
    expect(html).toContain('<script id="tiler-snapshot" type="application/json">');
    // The script tag content must be valid JSON.
    const match = html.match(/<script id="tiler-snapshot"[^>]*>([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    expect(() => JSON.parse(match?.[1] ?? "")).not.toThrow();
  });

  it("links the client bundle and CSS via the asset paths", () => {
    const html = renderToHtml(SNAPSHOT, {
      clientAssetPath: "./assets/viewer-abc.js",
      cssAssetPath: "./assets/viewer-abc.css",
    });
    expect(html).toContain('src="./assets/viewer-abc.js"');
    expect(html).toContain('href="./assets/viewer-abc.css"');
  });

  it("escapes </script> in the embedded snapshot", () => {
    const malicious = {
      ...SNAPSHOT,
      dashboard: { ...SNAPSHOT.dashboard, name: "</script><script>alert(1)</script>" },
    };
    const html = renderToHtml(malicious, { clientAssetPath: "./viewer.js" });
    // The snapshot script tag content must not contain a closing </script> sequence.
    const match = html.match(/<script id="tiler-snapshot"[^>]*>([\s\S]*?)<\/script>/);
    expect(match?.[1]).not.toMatch(/<\/script>/i);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `render-to-html.ts`**

```tsx
import type { TilerSnapshot } from "@aguspe/tiler-core";
import { renderToString } from "react-dom/server";
import { TilerDashboardViewer } from "../components/TilerDashboardViewer";

export interface RenderToHtmlOptions {
  /** Path (relative to the output HTML) to the client JS bundle. */
  clientAssetPath: string;
  /** Optional path to the client CSS. If omitted, no <link> is emitted. */
  cssAssetPath?: string;
}

const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src https: data:; style-src 'self' 'unsafe-inline'";

export function renderToHtml(snapshot: TilerSnapshot, opts: RenderToHtmlOptions): string {
  const body = renderToString(<TilerDashboardViewer snapshot={snapshot} />);
  // Escape </script> so the embedded JSON cannot break out of the script tag.
  const safeJson = JSON.stringify(snapshot).replace(/<\/script/gi, "<\\/script");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(snapshot.dashboard.name)} — tiler-ts</title>
${opts.cssAssetPath ? `<link rel="stylesheet" href="${opts.cssAssetPath}">` : ""}
</head>
<body>
<div id="tiler-root">${body}</div>
<script id="tiler-snapshot" type="application/json">${safeJson}</script>
<script type="module" src="${opts.clientAssetPath}"></script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

- [ ] **Step 4: Re-export from server barrel**

`packages/viewer/src/server/index.ts`:
```ts
export const TILER_VIEWER_VERSION = "0.0.1" as const;
export { renderToHtml } from "./render-to-html";
export type { RenderToHtmlOptions } from "./render-to-html";
export { TilerDashboardViewer } from "../components/TilerDashboardViewer";
export { TilerWidgetTile } from "../components/TilerWidgetTile";
```

- [ ] **Step 5: Run tests, expect PASS**

- [ ] **Step 6: Build server entry**

```bash
pnpm --filter @aguspe/tiler-viewer build:server
```
Expected: `dist/server/index.{js,cjs,d.ts}` includes `renderToHtml`.

- [ ] **Step 7: Commit**

```bash
git add packages/viewer/src/server/ packages/viewer/src/components/
git commit -m "feat(viewer): add renderToHtml() SSR helper with embedded snapshot + CSP"
```

---

## Task 7: Client hydration entry

**Files:**
- Modify: `packages/viewer/src/client/main.tsx`

Reads the embedded snapshot, hydrates `<TilerDashboardViewer>` into `#tiler-root`, ensures widgets are registered.

- [ ] **Step 1: Implement hydration**

```tsx
import "@aguspe/tiler-widgets";  // side-effect: register all 14 widgets
import "@aguspe/tiler-widgets/styles/tokens.css";
import { hydrateRoot } from "react-dom/client";
import type { TilerSnapshot } from "@aguspe/tiler-core";
import { TilerDashboardViewer } from "../components/TilerDashboardViewer";

function bootstrap(): void {
  const scriptEl = document.getElementById("tiler-snapshot");
  const rootEl = document.getElementById("tiler-root");
  if (!scriptEl || !rootEl) {
    console.error("[@aguspe/tiler-viewer] Missing #tiler-snapshot or #tiler-root");
    return;
  }
  let snapshot: TilerSnapshot;
  try {
    snapshot = JSON.parse(scriptEl.textContent ?? "");
  } catch (err) {
    console.error("[@aguspe/tiler-viewer] Snapshot JSON parse error:", err);
    return;
  }
  hydrateRoot(rootEl, <TilerDashboardViewer snapshot={snapshot} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
```

- [ ] **Step 2: Build client**

```bash
pnpm --filter @aguspe/tiler-viewer build:client
```
Expected: `dist/client/viewer-[hash].js` and `dist/client/viewer-[hash].css` exist. Bundle size ~150-200 KB minified (recharts is the bulk).

- [ ] **Step 3: Commit**

```bash
git add packages/viewer/src/client/
git commit -m "feat(viewer): add client hydration entry"
```

---

## Task 8: Viewer size budget + smoke test

**Files:**
- Create: `packages/viewer/.size-limit.json`

- [ ] **Step 1: Add `.size-limit.json`**

```json
[
  {
    "name": "@aguspe/tiler-viewer (server, esm)",
    "path": "dist/server/index.js",
    "limit": "10 KB"
  }
]
```

(The client bundle isn't budgeted yet — Phase 4 will do per-route bundle splitting.)

- [ ] **Step 2: Run size**

```bash
pnpm --filter @aguspe/tiler-viewer size
```
Expected: pass under 10 KB.

- [ ] **Step 3: Commit**

```bash
git add packages/viewer/.size-limit.json
git commit -m "chore(viewer): add size budget for SSR server entry"
```

---

## Task 9: Scaffold `@aguspe/tiler-playwright`

**Files:**
- Create: `packages/playwright/package.json`
- Create: `packages/playwright/tsconfig.json`
- Create: `packages/playwright/tsup.config.ts`
- Create: `packages/playwright/vitest.config.ts`
- Create: `packages/playwright/src/index.ts` (placeholder)

- [ ] **Step 1: Create `packages/playwright/package.json`**

```json
{
  "name": "@aguspe/tiler-playwright",
  "version": "0.0.1",
  "description": "Playwright reporter for tiler-ts. Replaces the HTML reporter with a Tiler dashboard.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/aguspe/tiler-ts.git",
    "directory": "packages/playwright"
  },
  "homepage": "https://github.com/aguspe/tiler-ts/tree/main/packages/playwright",
  "publishConfig": { "access": "public" },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aguspe/tiler-core": "workspace:*",
    "@aguspe/tiler-widgets": "workspace:*",
    "@aguspe/tiler-viewer": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zod": "^3.23.0"
  },
  "peerDependencies": {
    "@playwright/test": ">=1.40"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

Note: react/react-dom are runtime deps (not peer) because the reporter calls `renderToString` directly. The viewer's components stay React-peer-dep for downstream consumers.

- [ ] **Step 2: Create tsconfig + tsup config**

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src", "outDir": "dist",
    "tsBuildInfoFile": ".turbo/tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "**/*.test.ts"]
}
```

`tsup.config.ts`:
```ts
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  external: ["@playwright/test", "react", "react-dom", "react-dom/server"],
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Placeholder entry**

`packages/playwright/src/index.ts`:
```ts
export const TILER_PLAYWRIGHT_VERSION = "0.0.1" as const;
```

- [ ] **Step 4: Install + build**

```bash
pnpm install
pnpm --filter @aguspe/tiler-playwright build
```

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/ pnpm-lock.yaml
git commit -m "feat(playwright): scaffold @aguspe/tiler-playwright reporter package"
```

---

## Task 10: Reporter options schema

**Files:**
- Create: `packages/playwright/src/options.ts`
- Create: `packages/playwright/src/options.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from "vitest";
import { ReporterOptions } from "./options";

describe("ReporterOptions", () => {
  it("applies all defaults when nothing provided", () => {
    const opts = ReporterOptions.parse({});
    expect(opts.outDir).toBe("tiler-report");
    expect(opts.preset).toBe("test_automation");
    expect(opts.captureLogs).toBe(false);
    expect(opts.linkTraceFiles).toBe(true);
  });
  it("rejects an outDir with absolute path", () => {
    expect(ReporterOptions.safeParse({ outDir: "/etc/foo" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { z } from "zod";

export const ReporterOptions = z.object({
  /** Output directory, relative to the project root. */
  outDir: z.string().refine((s) => !s.startsWith("/"), "outDir must be a relative path")
    .default("tiler-report"),
  /** Preset name to load by default. */
  preset: z.string().default("test_automation"),
  /** Optional path to a tiler.config.ts (overrides preset). */
  customConfig: z.string().optional(),
  /** Capture stdout/stderr per test as a separate data source. */
  captureLogs: z.boolean().default(false),
  /** Link to Playwright's trace.zip files in the report. */
  linkTraceFiles: z.boolean().default(true),
  /** Open the HTML report in the user's browser at end of run. */
  open: z.boolean().default(false),
});
export type ReporterOptions = z.infer<typeof ReporterOptions>;
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @aguspe/tiler-playwright test
git add packages/playwright/src/
git commit -m "feat(playwright): add ReporterOptions schema (Zod-validated)"
```

---

## Task 11: Status mapping + record builder

**Files:**
- Create: `packages/playwright/src/record-builder.ts`
- Create: `packages/playwright/src/record-builder.test.ts`

Pure: takes a Playwright `TestCase` + `TestResult` shape and returns a `DataRecord` for the `test_runs` data source. Mocks the Playwright types with structural shape so the test doesn't need a real Playwright runtime.

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from "vitest";
import { buildRecord, statusFromPlaywright } from "./record-builder";

describe("statusFromPlaywright", () => {
  it.each([
    ["passed", "pass"], ["failed", "fail"], ["timedOut", "fail"],
    ["interrupted", "fail"], ["skipped", "skip"],
  ])("maps %s → %s", (pw, tiler) => {
    expect(statusFromPlaywright(pw as never)).toBe(tiler);
  });
});

describe("buildRecord", () => {
  it("builds a DataRecord from the playwright test + result", () => {
    const record = buildRecord({
      dataSourceId: "ds1",
      now: new Date("2026-04-30T12:00:00.000Z"),
      test: {
        title: "places order",
        parent: { title: "checkout suite" },
        location: { file: "tests/checkout.spec.ts", line: 14 },
      },
      result: {
        status: "passed",
        duration: 142,
        retry: 0,
        attachments: [],
      },
      project: "chromium",
    });
    expect(record.payload.suite).toBe("checkout suite");
    expect(record.payload.test_name).toBe("places order");
    expect(record.payload.status).toBe("pass");
    expect(record.payload.duration_ms).toBe(142);
    expect(record.ingested_via).toBe("manual");
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { newId, type DataRecord, type DataRecordInput } from "@aguspe/tiler-core";

type PwStatus = "passed" | "failed" | "timedOut" | "interrupted" | "skipped";
const STATUS_MAP: Record<PwStatus, string> = {
  passed: "pass", failed: "fail", timedOut: "fail",
  interrupted: "fail", skipped: "skip",
};

export function statusFromPlaywright(s: PwStatus): string {
  return STATUS_MAP[s] ?? "skip";
}

export interface BuildRecordInput {
  dataSourceId: string;
  now: Date;
  test: {
    title: string;
    parent?: { title?: string };
    location?: { file?: string; line?: number };
  };
  result: {
    status: PwStatus;
    duration: number;
    retry: number;
    attachments?: Array<{ name?: string; path?: string }>;
    error?: { message?: string };
  };
  project: string;
}

export function buildRecord(input: BuildRecordInput): DataRecord {
  const trace = input.result.attachments?.find((a) => a.name === "trace");
  const payload: Record<string, unknown> = {
    suite: input.test.parent?.title ?? "",
    test_name: input.test.title,
    status: statusFromPlaywright(input.result.status),
    duration_ms: input.result.duration,
    project: input.project,
    retry: input.result.retry,
  };
  if (input.test.location?.file) payload.file = input.test.location.file;
  if (input.test.location?.line) payload.line = input.test.location.line;
  if (input.result.error?.message) payload.error_message = input.result.error.message;
  if (trace?.path) payload.trace_path = trace.path;

  const record: DataRecord = {
    id: newId(),
    data_source_id: input.dataSourceId,
    payload,
    recorded_at: input.now.toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: input.now.toISOString(),
  };
  return record;
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @aguspe/tiler-playwright test
git add packages/playwright/src/
git commit -m "feat(playwright): map Playwright result to Tiler DataRecord"
```

---

## Task 12: Asset copying

**Files:**
- Create: `packages/playwright/src/copy-assets.ts`
- Create: `packages/playwright/src/copy-assets.test.ts`

Reads the viewer's pre-built `dist/client/` directory (from `node_modules/@aguspe/tiler-viewer/dist/client/`) and copies all files to `outDir/assets/`. Returns the relative paths of the JS and CSS entries (used by `renderToHtml`).

- [ ] **Step 1: Test (using a temp dir)**

```ts
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyClientAssets } from "./copy-assets";

let tmp: string;
let viewerDist: string;
let outDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "tiler-pw-"));
  viewerDist = join(tmp, "viewer-dist");
  outDir = join(tmp, "out");
  mkdirSync(viewerDist, { recursive: true });
  writeFileSync(join(viewerDist, "viewer-abc.js"), "console.log(1)");
  writeFileSync(join(viewerDist, "viewer-abc.css"), "body{}");
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("copyClientAssets", () => {
  it("copies all files to outDir/assets and returns the entry paths", () => {
    const result = copyClientAssets({ viewerClientDir: viewerDist, outDir });
    const files = readdirSync(join(outDir, "assets"));
    expect(files.sort()).toEqual(["viewer-abc.css", "viewer-abc.js"]);
    expect(result.jsEntry).toMatch(/^assets\/viewer-[a-z0-9]+\.js$/);
    expect(result.cssEntry).toMatch(/^assets\/viewer-[a-z0-9]+\.css$/);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface CopyClientAssetsInput {
  viewerClientDir: string;  // absolute path to @aguspe/tiler-viewer/dist/client
  outDir: string;           // absolute path to the report root
}

export interface CopyClientAssetsOutput {
  /** Path relative to outDir, e.g. "assets/viewer-abc.js". */
  jsEntry: string;
  /** Path relative to outDir, e.g. "assets/viewer-abc.css". */
  cssEntry?: string;
}

export function copyClientAssets(input: CopyClientAssetsInput): CopyClientAssetsOutput {
  const assetsDir = join(input.outDir, "assets");
  mkdirSync(assetsDir, { recursive: true });

  let jsEntry: string | undefined;
  let cssEntry: string | undefined;

  for (const entry of readdirSync(input.viewerClientDir)) {
    const src = join(input.viewerClientDir, entry);
    if (!statSync(src).isFile()) continue;
    const dest = join(assetsDir, entry);
    copyFileSync(src, dest);
    const rel = `assets/${entry}`;
    if (entry.endsWith(".js") && !jsEntry) jsEntry = rel;
    if (entry.endsWith(".css") && !cssEntry) cssEntry = rel;
  }

  if (!jsEntry) {
    throw new Error(
      `[@aguspe/tiler-playwright] No JS bundle found in ${input.viewerClientDir}. ` +
      `Did you run \`pnpm --filter @aguspe/tiler-viewer build:client\`?`,
    );
  }
  return { jsEntry, ...(cssEntry && { cssEntry }) };
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @aguspe/tiler-playwright test
git add packages/playwright/src/
git commit -m "feat(playwright): copy viewer client bundle into reporter outDir"
```

---

## Task 13: Reporter implementation

**Files:**
- Create: `packages/playwright/src/reporter.ts`
- Create: `packages/playwright/src/reporter.test.ts`
- Modify: `packages/playwright/src/index.ts`

Implements Playwright's `Reporter` interface. Holds a `MemoryStore`, accumulates records during the run, builds a snapshot at end, writes the HTML.

- [ ] **Step 1: Test**

```ts
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "@aguspe/tiler-widgets";
import TilerReporter from "./reporter";

let tmp: string;
let outDir: string;
let viewerClientDir: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "tiler-rep-"));
  outDir = join(tmp, "report");
  // Synthesize a fake viewer dist/client to satisfy copyClientAssets.
  viewerClientDir = join(tmp, "node_modules/@aguspe/tiler-viewer/dist/client");
  mkdirSync(viewerClientDir, { recursive: true });
  writeFileSync(join(viewerClientDir, "viewer-test.js"), "/* fake */");
  writeFileSync(join(viewerClientDir, "viewer-test.css"), "body{}");
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("TilerReporter", () => {
  it("writes index.html and snapshot.json to outDir at end of run", async () => {
    const reporter = new TilerReporter({
      outDir, viewerClientDir,  // viewerClientDir is a non-public override for tests
    });

    reporter.onBegin({} as never, {} as never);
    reporter.onTestEnd(
      { title: "test1", parent: { title: "suite a" }, location: { file: "a.spec.ts", line: 1 } } as never,
      { status: "passed", duration: 100, retry: 0, attachments: [] } as never,
    );
    reporter.onTestEnd(
      { title: "test2", parent: { title: "suite a" }, location: { file: "a.spec.ts", line: 2 } } as never,
      { status: "failed", duration: 200, retry: 0, attachments: [], error: { message: "boom" } } as never,
    );
    await reporter.onEnd({ status: "failed" } as never);

    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test Automation");

    const snapshot = JSON.parse(readFileSync(join(outDir, "snapshot.json"), "utf8"));
    expect(snapshot.records).toHaveLength(2);
    expect(snapshot.dashboard.slug).toBe("test_automation");
    expect(Object.keys(snapshot.resolved)).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSnapshot,
  MemoryStore,
  testAutomationPreset,
  type DataRecord,
  type Dashboard,
  type DataSource,
  type Panel,
} from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets";
import { renderToHtml } from "@aguspe/tiler-viewer";
import { copyClientAssets } from "./copy-assets";
import { ReporterOptions } from "./options";
import { buildRecord } from "./record-builder";

// Playwright Reporter interface — lazy-typed to avoid pulling @playwright/test
// at type-check time in environments that don't have it.
interface PlaywrightReporter {
  onBegin(config: unknown, suite: unknown): void;
  onTestEnd(test: unknown, result: unknown): void;
  onEnd(result: unknown): Promise<void> | void;
  printsToStdio?(): boolean;
}

export interface TilerReporterOptions {
  outDir?: string;
  preset?: string;
  captureLogs?: boolean;
  linkTraceFiles?: boolean;
  open?: boolean;
  /** Test override — points at a fake viewer dist for unit tests. */
  viewerClientDir?: string;
}

export default class TilerReporter implements PlaywrightReporter {
  private opts: ReporterOptions;
  private viewerClientDirOverride?: string;
  private store = new MemoryStore();
  private dashboard!: Dashboard;
  private dataSource!: DataSource;
  private panels: Panel[] = [];
  private records: DataRecord[] = [];
  private startedAt = new Date();

  constructor(rawOpts: TilerReporterOptions = {}) {
    this.opts = ReporterOptions.parse(rawOpts);
    this.viewerClientDirOverride = rawOpts.viewerClientDir;
  }

  printsToStdio(): boolean { return false; }

  onBegin(_config: unknown, _suite: unknown): void {
    this.startedAt = new Date();
    const preset = testAutomationPreset({ now: this.startedAt });
    this.dashboard = preset.dashboard;
    this.dataSource = preset.dataSources[0]!;
    this.panels = preset.panels;
  }

  onTestEnd(test: unknown, result: unknown): void {
    if (!this.dataSource) return;
    const record = buildRecord({
      dataSourceId: this.dataSource.id,
      now: new Date(),
      test: test as never,
      result: result as never,
      project: "default",
    });
    this.records.push(record);
  }

  async onEnd(_result: unknown): Promise<void> {
    const outDir = resolve(this.opts.outDir);
    mkdirSync(outDir, { recursive: true });

    const viewerClientDir =
      this.viewerClientDirOverride ?? resolveViewerClientDir();
    const { jsEntry, cssEntry } = copyClientAssets({ viewerClientDir, outDir });

    const snapshot = await buildSnapshot({
      dashboard: this.dashboard,
      dataSources: [this.dataSource],
      panels: this.panels,
      records: this.records,
      now: new Date(),
    });

    const html = renderToHtml(snapshot, {
      clientAssetPath: `./${jsEntry}`,
      ...(cssEntry && { cssAssetPath: `./${cssEntry}` }),
    });
    writeFileSync(join(outDir, "index.html"), html, "utf8");
    writeFileSync(join(outDir, "snapshot.json"), JSON.stringify(snapshot, null, 2), "utf8");
  }
}

function resolveViewerClientDir(): string {
  // @aguspe/tiler-viewer is a runtime dep; require.resolve gets us to its package root.
  const require_ =
    typeof require === "function"
      ? require
      : (await import("node:module")).createRequire(import.meta.url);
  const serverEntry = require_.resolve("@aguspe/tiler-viewer");
  // serverEntry is .../tiler-viewer/dist/server/index.cjs (or .js)
  return resolve(dirname(serverEntry), "../client");
}
```

Note: the `require_` block has a bug (top-level `await` in a non-async function). Replace with this synchronous version that uses dynamic import only when ESM is detected:

```ts
function resolveViewerClientDir(): string {
  // @aguspe/tiler-viewer is a runtime dep; locate its package's dist/client dir.
  // We're running in a node context (the reporter is invoked by Playwright's CLI).
  // tsup outputs both ESM and CJS; require.resolve works in both with shimming.
  const isCjs = typeof require === "function";
  if (isCjs) {
    const serverEntry = require.resolve("@aguspe/tiler-viewer");
    return resolve(dirname(serverEntry), "../client");
  }
  // ESM path: use createRequire from the current module URL.
  // Since this is a top-level call, do the import synchronously via Node's builtin.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createRequire } = eval("require")("node:module") as typeof import("node:module");
  const r = createRequire(import.meta.url);
  const serverEntry = r.resolve("@aguspe/tiler-viewer");
  return resolve(dirname(serverEntry), "../client");
}
```

The `eval("require")` trick is intentional — tsup's ESM output rewrites top-level `require` calls but not eval'd ones. This is the standard escape hatch for "I need require in dual ESM/CJS code."

- [ ] **Step 3: Update barrel**

`packages/playwright/src/index.ts`:
```ts
export { default } from "./reporter";
export { default as TilerReporter } from "./reporter";
export type { TilerReporterOptions } from "./reporter";
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @aguspe/tiler-playwright test
pnpm --filter @aguspe/tiler-playwright build
git add packages/playwright/src/
git commit -m "feat(playwright): implement TilerReporter — writes static dashboard at onEnd"
```

---

## Task 14: `examples/playwright-static` runnable demo

**Files:**
- Create: `examples/playwright-static/package.json`
- Create: `examples/playwright-static/playwright.config.ts`
- Create: `examples/playwright-static/tests/example.spec.ts`
- Create: `examples/playwright-static/.gitignore`
- Create: `examples/playwright-static/README.md`

A real Playwright project that uses `@aguspe/tiler-playwright` as its reporter. Three tests: 1 pass, 1 fail, 1 skip — chosen so the resulting dashboard exercises every widget non-trivially.

- [ ] **Step 1: Create `examples/playwright-static/package.json`**

```json
{
  "name": "tiler-ts-example-playwright-static",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test"
  },
  "dependencies": {
    "@aguspe/tiler-playwright": "workspace:*",
    "@playwright/test": "^1.50.0"
  }
}
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: [["@aguspe/tiler-playwright", { outDir: "tiler-report" }]],
  use: {
    baseURL: "https://example.com",
  },
});
```

- [ ] **Step 3: Create `tests/example.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.describe("checkout", () => {
  test("places order", async () => {
    expect(1 + 1).toBe(2);
  });

  test("validates payment", async () => {
    expect(1 + 1).toBe(3); // intentional fail
  });
});

test.describe("auth", () => {
  test.skip("logs in", async () => {
    /* skipped */
  });

  test("renders signup form", async () => {
    expect("hello".toUpperCase()).toBe("HELLO");
  });
});
```

- [ ] **Step 4: `.gitignore`**

```
node_modules/
tiler-report/
test-results/
playwright-report/
```

- [ ] **Step 5: README**

```markdown
# tiler-ts example: playwright-static

A minimal Playwright project demonstrating the `@aguspe/tiler-playwright` reporter.

## Run

```bash
pnpm install   # from monorepo root
pnpm --filter tiler-ts-example-playwright-static exec playwright install chromium
pnpm --filter tiler-ts-example-playwright-static test
open tiler-report/index.html
```

Three of the four tests pass; one intentionally fails so the dashboard has
data to show in failure-related panels.
```

- [ ] **Step 6: Install + commit**

```bash
pnpm install
git add examples/playwright-static/ pnpm-lock.yaml
git commit -m "docs(examples): add playwright-static demo project"
```

(Don't run the example yet — Task 15 verifies it end-to-end.)

---

## Task 15: End-to-end smoke run

- [ ] **Step 1: Build everything in dependency order**

```bash
pnpm --filter @aguspe/tiler-core build
pnpm --filter @aguspe/tiler-widgets build
pnpm --filter @aguspe/tiler-viewer build
pnpm --filter @aguspe/tiler-playwright build
```

- [ ] **Step 2: Install playwright browsers in the example**

```bash
pnpm --filter tiler-ts-example-playwright-static exec playwright install chromium
```

- [ ] **Step 3: Run the example**

```bash
cd examples/playwright-static
pnpm test || true   # the suite has 1 failing test by design
```

Verify:
- `examples/playwright-static/tiler-report/index.html` exists.
- `examples/playwright-static/tiler-report/snapshot.json` exists.
- `examples/playwright-static/tiler-report/assets/viewer-*.js` and `viewer-*.css` exist.
- Open `tiler-report/index.html` in a browser. The dashboard should show:
  - Total runs: 4 (or 3 if skipped tests aren't counted — the resolver decides; both are acceptable)
  - Failures: 1 (the intentional fail)
  - Per-suite status grid: `checkout` (failing), `auth` (passing), and possibly more
  - Recent failures list: shows the validates-payment test

If anything is missing, debug before committing the snapshot. No code change should be needed if Tasks 1-13 are correct.

- [ ] **Step 4: Commit any snapshot artifacts intentionally** (none — `tiler-report/` is gitignored). Just record the verification:

```bash
git -C / commit --allow-empty -m "verify: playwright-static example produces working tiler-report"
```

(Skip this empty commit if not useful for project history.)

---

## Task 16: Reporter self-test

**Files:**
- Create: `packages/playwright/test/self-test.spec.ts`

Programmatically run a tiny Playwright suite, assert the resulting `tiler-report/snapshot.json` has the expected structure. Keeps Phase 3 from regressing as we add features in later phases.

- [ ] **Step 1: Implement**

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let workDir: string;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "tiler-pw-self-"));
  mkdirSync(join(workDir, "tests"));
  writeFileSync(
    join(workDir, "package.json"),
    JSON.stringify({ name: "self-test", type: "module" }, null, 2),
  );
  writeFileSync(
    join(workDir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";
     export default defineConfig({
       testDir: "./tests",
       reporter: [["${require.resolve("@aguspe/tiler-playwright")}", { outDir: "tiler-report" }]],
     });`,
  );
  writeFileSync(
    join(workDir, "tests/example.spec.ts"),
    `import { test, expect } from "@playwright/test";
     test("p", async () => { expect(1).toBe(1); });
     test("f", async () => { expect(1).toBe(2); });
     test.skip("s", async () => {});`,
  );
}, 30_000);

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

describe("reporter self-test", () => {
  it("produces snapshot.json with the expected shape", () => {
    const result = spawnSync("npx", ["playwright", "test", "--reporter=line"], {
      cwd: workDir, encoding: "utf8",
      env: { ...process.env, CI: "1" },
    });
    // We don't check exit code — one test fails by design.
    const snapshot = JSON.parse(
      readFileSync(join(workDir, "tiler-report/snapshot.json"), "utf8"),
    );
    expect(snapshot.version).toBe(1);
    expect(snapshot.records).toHaveLength(2);  // skipped tests don't emit
    expect(snapshot.dashboard.slug).toBe("test_automation");
    expect(snapshot.panels.length).toBeGreaterThan(0);
  }, 60_000);
});
```

(Note: this test depends on Playwright browsers being installed. We mark it `it.skipIf(!process.env.CI)` if it's flaky on local machines without browsers.)

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter @aguspe/tiler-playwright test
git add packages/playwright/test/
git commit -m "test(playwright): self-test runs a real Playwright suite and asserts on snapshot"
```

---

## Task 17: Bump size budgets + tighten dep-cruiser

**Files:**
- Modify: `packages/widgets/.size-limit.json` (no change needed — already 175 KB)
- Verify: `.dependency-cruiser.cjs` rule `playwright-not-server` still holds

- [ ] **Step 1: Run deps**

```bash
pnpm deps
```
Expected: zero violations. The `playwright-not-server` rule was added in Phase 1 — it now actually has a `packages/playwright/src/` directory to enforce against.

- [ ] **Step 2: Add a viewer client-bundle budget**

Append to `packages/viewer/.size-limit.json`:
```json
[
  { "name": "@aguspe/tiler-viewer (server, esm)", "path": "dist/server/index.js", "limit": "10 KB" },
  { "name": "@aguspe/tiler-viewer (client, all assets)", "path": "dist/client/*.js", "limit": "200 KB" }
]
```

Run `pnpm --filter @aguspe/tiler-viewer size`. Expected: pass under both limits. (The client bundle is dominated by recharts at ~95 KB plus react-dom at ~45 KB — under 200 KB brotli'd.)

- [ ] **Step 3: Commit**

```bash
git add packages/viewer/.size-limit.json
git commit -m "chore(viewer): add client bundle size budget"
```

---

## Task 18: README + tag `v0.0.3-phase-3`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Status section**

Replace:
```markdown
## Status: Phase 2 — All 14 Widgets (`v0.0.2-phase-2`)
```

With:
```markdown
## Status: Phase 3 — Static Reporter (`v0.0.3-phase-3`)

This release ships the first end-user-shipping feature: the **Playwright reporter**.
After running `npx playwright test`, a self-contained `tiler-report/` folder
appears with a fully-rendered dashboard you can open or upload as a CI artifact.
```

Add to the package status table:
- `@aguspe/tiler-viewer` → "✅ SSR + hydrate, all 14 widgets"
- `@aguspe/tiler-playwright` → "✅ Reporter + test_automation preset"

Add an "Examples" section pointing at `examples/playwright-static/`.

- [ ] **Step 2: Run full pipeline**

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
pnpm deps
```
All seven must exit zero.

- [ ] **Step 3: Commit + tag**

```bash
git add README.md
git commit -m "docs: update README for Phase 3 (static Playwright reporter)"
git tag -a v0.0.3-phase-3 -m "Phase 3 — viewer + Playwright reporter + test_automation preset"
git log --oneline | head -25
git tag --list
```

---

## Phase 3 → Phase 4 handoff

**What's working at end of Phase 3:**
- `@aguspe/tiler-core` exports `testAutomationPreset` and `buildSnapshot` for any consumer that needs to materialize a dashboard or pre-resolve panels.
- `@aguspe/tiler-viewer` exposes an SSR API (`renderToHtml`, `<TilerDashboardViewer>`) and ships a pre-built client bundle.
- `@aguspe/tiler-playwright` is a working Playwright reporter that consumers can drop into `playwright.config.ts`.
- `examples/playwright-static` runs end-to-end and produces a dashboard.
- Reporter self-test gates regressions in CI.
- `v0.0.3-phase-3` tag.

**What Phase 4 adds:**
- `@aguspe/tiler-server` — Fastify server that hosts dashboards live, accepts webhook ingestion, and pushes WebSocket updates.
- `BetterSqliteStore` — the default persistence layer, alongside the existing `MemoryStore`.
- HMAC-signed webhook ingestion endpoints.
- Basic-auth UI gate + pluggable authorize callback.
- Refresh-loop timer (one per loaded dashboard, per `refresh_seconds`).
- `examples/server-live/` — a runnable demo with the `test_automation` preset seeded into a sqlite file.
- Visual regression tests via Playwright on the built Storybook (deferred from Phase 2).

Plan 4 will be drafted as `docs/superpowers/plans/<date>-tiler-ts-phase-4-server.md` once Phase 3 is built and tagged.
