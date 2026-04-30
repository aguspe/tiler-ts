# tiler-ts — Implementation Spec

**Status:** Approved (2026-04-30)
**Author:** Augustin Gottlieb
**Source project:** [aguspe/tiler](https://github.com/aguspe/tiler) (Rails engine, MIT)
**Target repo:** [`aguspe/tiler-ts`](https://github.com/aguspe/tiler-ts) (TypeScript, MIT, public from day one)
**npm publish scope:** `@aguspe/tiler-*` (personal scope on the public registry)

> **Scope-mapping note:** package names are written as `@tiler/<name>` throughout
> this document for readability. The actual published name is `@aguspe/tiler-<name>`.
> The mapping is 1:1 and applied at publish time via each `package.json`'s `name`
> field. If the `@tiler` scope is later claimed by the project, packages can be
> dual-published to both scopes without any source change.

---

## Summary

`tiler-ts` is a TypeScript port of the Rails-based [Tiler](https://github.com/aguspe/tiler)
plug-and-play dashboard system, distributed as a set of npm packages and primarily
positioned as a **Playwright-first** test-automation reporting tool.

It ships three end-user deliverables in v1:

1. **`@tiler/playwright`** — a Playwright `Reporter` implementation that replaces
   Playwright's HTML reporter. At the end of a test run it writes a self-contained
   static dashboard (`tiler-report/`) consisting of an SSR'd HTML page plus a hydrated
   React viewer, with all data baked into a frozen JSON snapshot.
2. **`@tiler/cli` + `@tiler/server`** — a `tiler serve` command that boots a Fastify
   server with webhook ingestion, a SQLite-backed store, and the full editor UI
   (gridstack drag/resize, drawer panel editor, palette, theme tokens, TV mode).
3. **`tiler import-playwright-json`** (CLI subcommand) — converts an existing
   `playwright --reporter=json` artifact into either a static Tiler report or a
   server-ingestible payload, without changing the user's reporter config.

All three share one widget package (`@tiler/widgets`) and one schema/contract
package (`@tiler/core`), so consumers see a single coherent system regardless
of which entry point they use.

This spec is the agreed design. The implementation plan is a separate document
under `docs/superpowers/plans/`, produced via the `superpowers:writing-plans`
skill once this spec is ratified.

---

## §0 — Goals and non-goals

### Goals

- Feature parity with Rails Tiler at the widget level: 14 built-in widgets, gridstack
  drag/resize/drop, slide-over drawer editor, per-dashboard theme tokens, TV mode,
  inline rename, hover-delete, mobile responsive collapse.
- Hybrid runtime: a static-export mode (Playwright reporter, `tiler build`) and a
  live server mode (`tiler serve`).
- Replace Playwright's default HTML reporter for teams that adopt this package.
- Convert existing `playwright --reporter=json` output into a Tiler dashboard via a
  standalone CLI subcommand.
- Pluggable storage adapter (`TilerStore` interface) with `better-sqlite3` as the
  default; an in-memory adapter for the Playwright reporter; a JSON-file adapter for
  users who prefer a single committable file.
- Pluggable third-party widgets via `defineWidget()` and side-effect-imported npm
  packages.
- Modern toolchain: pnpm workspaces + Turborepo, tsup for libs, Vite for apps,
  Vitest for unit/integration tests, Playwright for E2E and reporter self-test,
  Biome for lint/format, Changesets for releases, Node 20 LTS minimum, ESM-first
  with dual CJS output.

### Non-goals (explicitly out of scope for v1)

- Multi-tenant deployments. One server hosts one tenant's dashboards.
- Clustering / HA. Single-process Fastify; WebSocket subscribers and the refresh
  timer assume a single node.
- Automated migration from Rails Tiler. A manual `MIGRATING_FROM_RAILS.md` is
  shipped; an automated CLI is a v1.1+ candidate.
- **Liquid no-code widgets.** The Rails Tiler "Settings → user-defined widget
  via Liquid template" path is deferred to v1.1.
- SSO / OAuth. The pluggable `authorize` callback covers anyone who needs more
  than HTTP basic auth.
- Drag-from-external-sources (CSV-on-page drop, file URL drag-in). Palette → grid
  drag only.
- Widget marketplace. Third-party widgets are npm packages, listed in
  `tiler.config.ts`. No central registry.
- Native mobile app. Web only; the editor is responsive but desktop-optimized.

### Open questions to resolve at plan-writing time

- Brand assets: reuse the Rails Tiler `app/assets/images/tiler/logo.svg`, or
  commission a new mark for the TS project? (Either works; only affects
  `packages/*/README.md` headers and a future docs site.)

(Resolved during brainstorming: scope = `@aguspe/tiler-*`; repo public from
day one; license MIT.)

---

## §1 — Project skeleton and package map

### Repository layout

```
tiler-ts/
├── package.json              # workspaces: ["packages/*"]
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
├── tsconfig.base.json
├── .changeset/
├── .github/workflows/        # ci.yml, release.yml (Changesets publish)
├── packages/
│   ├── core/                 # @tiler/core
│   ├── widgets/              # @tiler/widgets
│   ├── viewer/               # @tiler/viewer
│   ├── editor/               # @tiler/editor
│   ├── server/               # @tiler/server
│   ├── playwright/           # @tiler/playwright
│   └── cli/                  # @tiler/cli
└── examples/
    ├── playwright-static/    # consumer demo: Playwright project using @tiler/playwright
    ├── server-live/          # consumer demo: tiler serve with seeded test_automation preset
    └── json-import/          # consumer demo: tiler import-playwright-json output.json
```

### Package responsibilities and dependency table

| Package | Responsibility | Workspace deps | External deps (key) | Publishable |
|---|---|---|---|---|
| `@tiler/core` | TypeScript types + Zod schemas for dashboard / panel / data-source / data-record JSON; `TilerStore` interface; widget-contract types; `defineWidget()` registry helper. **Zero React, zero DOM.** | — | `zod` | yes |
| `@tiler/widgets` | The 14 React widget components. Each exports a component + an `example.fixture.ts` + a Zod config schema + a pure `resolve()` function. | `@tiler/core` | `react`, `recharts`, `clsx` | yes; peerDeps `react`/`react-dom` |
| `@tiler/viewer` | Read-only React app: `<TilerDashboardViewer config={…} data={…} />`. Renders a dashboard from baked snapshot JSON. SSR-able via `renderToString`. No editing surface. | `@tiler/core`, `@tiler/widgets` | `react`, `react-dom` | yes |
| `@tiler/editor` | Full editor: gridstack wrapper, palette, drawer, inline rename, theme tokens, TV mode, undo/redo. Exports `<TilerDashboardEditor store={…} />`. | `@tiler/core`, `@tiler/widgets` | `gridstack`, `zustand`, `clsx` | yes |
| `@tiler/server` | Fastify server + `better-sqlite3` default `TilerStore` impl + ingestion endpoints (webhook/manual/CSV) + HMAC verification + basic-auth middleware + WebSocket push. Mounts the editor UI. | `@tiler/core`, `@tiler/editor`, `@tiler/widgets` | `fastify`, `better-sqlite3`, `@fastify/websocket`, `@fastify/static` | yes |
| `@tiler/playwright` | Playwright `Reporter` impl. Maps Playwright events → Tiler data records → emits a static `tiler-report/` folder using `@tiler/viewer`'s SSR. | `@tiler/core`, `@tiler/widgets`, `@tiler/viewer` | `@playwright/test` (peer) | yes |
| `@tiler/cli` | The `tiler` binary. Commands: `tiler serve`, `tiler build`, `tiler import-playwright-json`, `tiler init`, `tiler doctor`. | `@tiler/core`, `@tiler/server`, `@tiler/viewer` | `commander`, `chalk` | yes |

### Dependency-boundary guarantees (CI-enforced via `dependency-cruiser`)

- `@tiler/core` is leaf-most. Imports nothing from the workspace; everything else imports it.
- `@tiler/widgets` depends only on `@tiler/core`. Both viewer and editor build on top
  of it identically.
- `@tiler/playwright` does **not** depend on `@tiler/server`. Playwright users must never
  install Fastify or `better-sqlite3` just to ship a static report. Lint-checked.
- No circular dependencies anywhere.

### Workspace tooling

- `pnpm-workspace.yaml` lists `packages/*` and `examples/*`.
- `turbo.json` defines `build`, `test`, `lint`, `typecheck`, `size` pipelines with
  cross-package dependency-aware ordering.
- `tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- Each package has its own `package.json`, `tsconfig.build.json`, and `CHANGELOG.md`.
- Examples are non-publishable but live in the workspace so every package has a
  real consumer to dogfood against during dev.

---

## §2 — Data model and JSON schemas

All schemas live in `@tiler/core`, defined with Zod (runtime validation +
inferred TS types). The shape mirrors the Rails Tiler entities so a future
"import from Rails Tiler" migration is straightforward.

### Primitive types

```ts
// packages/core/src/schema.ts
import { z } from "zod";

const Id          = z.string().min(1);          // ULID (e.g. "01HV3...")
const Slug        = z.string().regex(/^[a-z0-9_-]+$/);
const Iso         = z.string().datetime();      // ISO-8601, UTC
const SafeColumn  = z.string().regex(/^[A-Za-z0-9_]+$/);  // mirrors Rails safe_col?

const PanelConfig = z.record(z.unknown());
```

### `Dashboard`

```ts
export const ThemeTokens = z.object({
  page:        z.string().optional(),  // CSS color
  tile:        z.string().optional(),
  tile_header: z.string().optional(),
  gutter:      z.string().optional(),
}).strict();

export const DashboardSettings = z.object({
  theme:    ThemeTokens.optional(),
  tv_mode:  z.boolean().default(false),
}).strict();

export const Dashboard = z.object({
  id:               Id,
  name:             z.string().min(1).max(120),
  slug:             Slug,
  description:      z.string().nullable().default(null),
  refresh_seconds:  z.number().int().min(0).default(0),
  settings:         DashboardSettings.default({ tv_mode: false }),
  created_at:       Iso,
  updated_at:       Iso,
});
export type Dashboard = z.infer<typeof Dashboard>;
```

### `DataSource`

```ts
export const SchemaField = z.object({
  key:    SafeColumn,
  type:   z.enum(["string", "integer", "float", "boolean", "datetime"]),
  label:  z.string().optional(),
}).strict();

export const IngestionMethod = z.enum(["webhook", "manual", "csv"]);

export const DataSource = z.object({
  id:                 Id,
  name:               z.string().min(1).max(120),
  slug:               Slug,
  description:        z.string().nullable().default(null),
  schema_definition:  z.array(SchemaField).default([]),
  ingestion_methods:  z.array(IngestionMethod).min(1),
  webhook_token:      z.string().nullable(),  // bcrypt hash of the per-source token; null when "webhook" not in methods or when only the global secret is used
  active:             z.boolean().default(true),
  created_at:         Iso,
  updated_at:         Iso,
});
export type DataSource = z.infer<typeof DataSource>;
```

### `DataRecord`

```ts
export const DataRecord = z.object({
  id:              Id,
  data_source_id:  Id,
  payload:         z.record(z.unknown()),
  recorded_at:     Iso,
  source_ref:      z.string().nullable().default(null),  // e.g. CI run-id
  ingested_via:    IngestionMethod,
  created_at:      Iso,
});
export type DataRecord = z.infer<typeof DataRecord>;
```

### `Panel`

```ts
export const Panel = z.object({
  id:              Id,
  dashboard_id:    Id,
  data_source_id:  Id.nullable(),    // null for config-only widgets (clock/iframe/image/text)
  title:           z.string().min(1).max(200),
  widget_type:     z.string().min(1),
  x:               z.number().int().min(0).max(11),
  y:               z.number().int().min(0),
  width:           z.number().int().min(1).max(12),
  height:          z.number().int().min(1).max(12),
  config:          PanelConfig.default({}),
  created_at:      Iso,
  updated_at:      Iso,
});
export type Panel = z.infer<typeof Panel>;
```

### Time-window grammar (used by every data-backed widget config)

```ts
export const TimeWindow = z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]);
export const Bucket     = z.enum(["30s","1m","5m","1h","1d"]);

export const DataBackedConfig = z.object({
  value_column:  SafeColumn.optional(),
  group_column:  SafeColumn.optional(),
  aggregation:   z.enum(["sum","avg","min","max","count","last","first"]).default("count"),
  time_window:   TimeWindow.default("24h"),
  bucket:        Bucket.optional(),
  filter:        z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  color:         z.string().optional(),
  palette:       z.array(z.string()).optional(),
});
```

### `TilerStore` — pluggable storage interface

```ts
// packages/core/src/store.ts
export interface TilerStore {
  // dashboards
  listDashboards(): Promise<Dashboard[]>;
  getDashboard(slug: string): Promise<Dashboard | null>;
  upsertDashboard(input: DashboardInput): Promise<Dashboard>;
  deleteDashboard(id: string): Promise<void>;

  // panels
  listPanels(dashboardId: string): Promise<Panel[]>;
  upsertPanel(input: PanelInput): Promise<Panel>;
  deletePanel(id: string): Promise<void>;

  // data sources
  listDataSources(): Promise<DataSource[]>;
  getDataSource(slug: string): Promise<DataSource | null>;
  getDataSourceByToken(token: string): Promise<DataSource | null>;
  upsertDataSource(input: DataSourceInput): Promise<DataSource>;
  deleteDataSource(id: string): Promise<void>;

  // records — the hot path
  insertRecord(input: DataRecordInput): Promise<DataRecord>;
  insertRecordsBatch(inputs: DataRecordInput[]): Promise<number>;
  queryRecords(opts: RecordQuery): Promise<DataRecord[]>;
  pruneRecords(opts: { olderThan: string }): Promise<number>;

  // lifecycle
  migrate(): Promise<void>;
  close(): Promise<void>;
}

export interface RecordQuery {
  dataSourceId: string;
  since?:       string;
  until?:       string;
  filter?:      Record<string, unknown>;
  limit?:       number;
  orderBy?:     "recorded_at_asc" | "recorded_at_desc";
}
```

### Reference adapter implementations shipped in v1

| Adapter | Where | Default in |
|---|---|---|
| `BetterSqliteStore` | `@tiler/server` | `tiler serve` |
| `MemoryStore`       | `@tiler/core` (test util, also exported) | `@tiler/playwright` |
| `JsonFileStore`     | `@tiler/server` | optional flag for users who prefer a single committable JSON file |

Adapters provide a `migrate()` step that creates the equivalent of the Rails
Tiler tables (`tiler_dashboards`, `tiler_data_sources`, `tiler_data_records`,
`tiler_panels`) plus the composite index `(data_source_id, recorded_at DESC)`
that the time-window query path depends on.

### Static-export "frozen snapshot" format

The Playwright reporter does not ship a store — it ships a **frozen snapshot**:
the dashboard, all its panels, all data sources, and all aggregated records
inlined into one JSON payload, embedded into the HTML as
`<script id="tiler-snapshot" type="application/json">…</script>`. The viewer reads
this on hydration.

```ts
export const TilerSnapshot = z.object({
  version:      z.literal(1),
  generated_at: Iso,
  dashboard:    Dashboard,
  panels:       z.array(Panel),
  data_sources: z.array(DataSource),
  records:      z.array(DataRecord),  // already filtered/aggregated server-side at build time
});
```

Identifier policy: ULIDs everywhere. Generated client-side in the editor
(instant UI feedback before save round-trip). Time-sortable, opaque, no leaked
count. Avoids DB-specific sequence behavior across adapters.

---

## §3 — Widget contract and extension API

The widget contract lives in `@tiler/core`; the 14 implementations live in
`@tiler/widgets`. A widget is a single object with five parts: identity, sizing,
config schema, optional pure data resolver, React component.

### `WidgetDefinition`

```ts
// packages/core/src/widget.ts
import type { ComponentType } from "react";
import { z, type ZodTypeAny } from "zod";
import type { Panel, DataRecord } from "./schema";

export interface WidgetSize { w: number; h: number }

export interface WidgetMeta {
  type:                 string;
  label:                string;
  description?:         string;
  icon?:                string | { url: string };
  requires_data_source: boolean;
  default_size:         WidgetSize;
  min_size:             WidgetSize;
  max_size:             WidgetSize;
}

export interface WidgetData<TResolved = unknown> {
  resolved: TResolved;
  empty:    boolean;
}

export interface WidgetResolverArgs {
  panel:   Panel;
  records: DataRecord[];
  now:     Date;
}

export interface WidgetDefinition<
  TConfig  extends ZodTypeAny = ZodTypeAny,
  TResolved = unknown,
> {
  meta:         WidgetMeta;
  configSchema: TConfig;
  resolve?:     (args: WidgetResolverArgs) =>
                  Promise<WidgetData<TResolved>> | WidgetData<TResolved>;
  component:    ComponentType<{ panel: Panel; data: WidgetData<TResolved> }>;
  example:      () => { panel: Panel; records: DataRecord[] };
}
```

### Registry

```ts
// packages/core/src/registry.ts
const registry = new Map<string, WidgetDefinition>();

export function defineWidget<C extends ZodTypeAny, R>(
  def: WidgetDefinition<C, R>,
): WidgetDefinition<C, R> {
  if (registry.has(def.meta.type)) {
    throw new Error(`Widget "${def.meta.type}" already registered`);
  }
  registry.set(def.meta.type, def as WidgetDefinition);
  return def;
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type);
}
export function listWidgets(): WidgetDefinition[] {
  return [...registry.values()];
}
```

`@tiler/widgets/src/index.ts` calls `defineWidget(...)` for each of the 14
built-ins **at module load**, so importing the package self-registers them.
Third-party widgets follow the same pattern in their own packages — consumers
`import "@org/tiler-weather-widget"` and the side effect registers the widget.

### The 14 built-in widgets

| # | `type` | requires data | default size | Notable config keys |
|---|---|---|---|---|
| 1 | `metric` | yes | 3×2 | `value_column`, `aggregation`, `time_window`, `prefix`, `suffix`, `decimals` |
| 2 | `number_with_delta` | yes | 3×2 | `value_column`, `aggregation`, `time_window`, `delta_window`, `sparkline_bucket`, `color` |
| 3 | `meter` | yes | 3×2 | `value_column`, `aggregation`, `time_window`, `min`, `max`, `target` |
| 4 | `clock` | no | 3×2 | `format` (`"24h"` \| `"12h"`), `timezone`, `show_seconds` |
| 5 | `text` | no | 3×2 | `markdown` (string), `align` |
| 6 | `status_grid` | yes | 6×3 | `group_column`, `time_window`, `status_column`, `palette` |
| 7 | `comments` | yes | 4×4 | `time_window`, `body_column`, `author_column` |
| 8 | `list` | yes | 4×4 | `columns: SafeColumn[]`, `time_window`, `limit`, `order_by` |
| 9 | `table` | yes | 6×4 | `columns: { key, label, format }[]`, `time_window`, `limit`, `pagination` |
| 10 | `line_chart` | yes | 6×3 | `value_column`, `group_column`, `aggregation`, `time_window`, `bucket`, `palette` |
| 11 | `bar_chart` | yes | 6×3 | `group_column`, `value_column`, `aggregation`, `time_window`, `palette`, `orientation` |
| 12 | `pie_chart` | yes | 6×3 | `group_column`, `aggregation`, `time_window`, `palette`, `donut: boolean` |
| 13 | `image` | no | 4×3 | `url`, `alt`, `fit` (`"cover"` \| `"contain"`) |
| 14 | `iframe` | no | 6×4 | `url`, `sandbox: string[]`, `allow: string[]` |

Sizing constraints (`min_size`, `max_size`) are widget-specific and follow the
same defaults Rails Tiler uses today.

### Per-widget file layout

Each widget is a directory under `packages/widgets/src/widgets/<name>/`:

```
packages/widgets/src/widgets/line_chart/
├── schema.ts              # Zod schema for line_chart config
├── resolve.ts             # WidgetData resolver (pure, server-only)
├── LineChartWidget.tsx    # React component
├── example.ts             # Panel + sample records fixture
└── index.ts               # `defineWidget({...})` — exports, glues, side-effect-registers
```

### Resolution model

```
                ┌──────────────────────────┐
   records  ──▶ │  widget.resolve(...)     │ ──▶  WidgetData
   panel        │  (pure, server-only)     │
                └──────────────────────────┘
                            │
                ┌───────────┴───────────────┐
                ▼                           ▼
   static export bakes WidgetData          live server pushes
   into snapshot at build time             WidgetData over WebSocket
   (no resolver code in browser bundle)    each refresh tick
```

The resolver is pure and never imported by the browser bundle. Static export
runs resolvers in Node during the Playwright reporter's `onEnd`. Server mode
runs resolvers per panel on each refresh tick.

### Per-panel color overrides

All chart widgets honor `panel.config.color` (single) and `panel.config.palette`
(array) — the same convention as Rails Tiler. Implemented once in
`@tiler/widgets/src/lib/chart-colors.ts` and reused by all chart widgets:

```ts
export function chartColors(panel: Panel, defaultPalette: string[]): string[] {
  const cfg = panel.config as { color?: string; palette?: string[] };
  if (cfg.palette?.length) return cfg.palette;
  if (cfg.color)            return [cfg.color];
  return defaultPalette;
}
```

### Third-party widget packages

A third-party widget package is an npm package that side-effect-imports
`@tiler/core` and calls `defineWidget`:

```ts
// @org/tiler-weather/src/index.ts
import { defineWidget } from "@tiler/core";
import { z } from "zod";

defineWidget({
  meta: {
    type: "weather",
    label: "Weather",
    requires_data_source: false,
    default_size: { w: 3, h: 2 },
    min_size:     { w: 2, h: 2 },
    max_size:     { w: 6, h: 4 },
  },
  configSchema: z.object({
    city:  z.string(),
    units: z.enum(["c","f"]).default("c"),
  }),
  component: WeatherComponent,
  example:   () => /* ... */,
});
```

The host `tiler.config.ts` lists installed widget packages; both `tiler serve`
and `tiler build` import them at boot, in the order listed.

```ts
// tiler.config.ts (consumer)
import { defineConfig } from "@tiler/cli";
export default defineConfig({
  widgets: ["@tiler/widgets", "@org/tiler-weather"],
  // ... store config, port, auth, etc.
});
```

---

## §4 — The three deliverables, end-to-end

### 4A — `@tiler/playwright` (the reporter)

**Install:**
```bash
npm i -D @tiler/playwright
```

**Wire-up in `playwright.config.ts`:**
```ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  reporter: [
    ["@tiler/playwright", { outDir: "tiler-report", preset: "test_automation" }],
  ],
});
```

**Reporter hook → behavior:**

| Playwright hook | Behavior |
|---|---|
| `onBegin(config, suite)` | Build a `DataSource` `{ slug: "playwright_runs" }` in a `MemoryStore`. Build the dashboard from the requested preset (`test_automation` by default). Snapshot start time. |
| `onTestEnd(test, result)` | Emit one `DataRecord` per test with payload `{ suite, test_name, status, duration_ms, retry, attempt, project, file, line, error_message?, trace_path? }`. Status maps `passed→pass`, `failed→fail`, `timedOut→fail`, `interrupted→fail`, `skipped→skip`. |
| `onStdOut` / `onStdErr` | Optional: appended into a `console_logs` data source if `options.captureLogs: true`. |
| `onEnd(result)` | (1) Run each panel's resolver against the in-memory records. (2) Build a `TilerSnapshot`. (3) SSR the viewer via `renderToString` from `@tiler/viewer`. (4) Write `outDir/index.html`, `outDir/assets/*` (Vite-built bundle copied from the `@tiler/viewer` package), `outDir/snapshot.json`. |

**Reporter options (Zod-validated):**
```ts
export const ReporterOptions = z.object({
  outDir:         z.string().default("tiler-report"),
  preset:         z.string().default("test_automation"),
  customConfig:   z.string().optional(),     // path to a tiler.config.ts overriding the preset
  captureLogs:    z.boolean().default(false),
  linkTraceFiles: z.boolean().default(true), // table/list rows become <a href="trace.zip">
  open:           z.boolean().default(false),// `open` the HTML at end of run
});
```

**Static-export output layout:**
```
tiler-report/
├── index.html           # SSR'd by @tiler/viewer; embeds <script id="tiler-snapshot">
├── snapshot.json        # raw snapshot, also linkable
├── assets/
│   ├── viewer-[hash].js     # @tiler/viewer client bundle (hydrates the SSR'd HTML)
│   ├── viewer-[hash].css
│   └── recharts-[hash].js   # lazy-loaded chart chunk
└── traces/                  # Playwright's trace.zip files, copied alongside (if linkTraceFiles)
```

**`test_automation` preset** (ported from Rails `lib/tiler/presets/test_automation.rb`):
- Top row (4 panels): total runs (24h), failures w/ delta+sparkline (24h), avg duration (24h), build clock.
- Status pie (24h), avg duration trend line (7d, 1d bucket).
- Per-suite status_grid (24h).
- Failures-by-suite bar chart (24h).
- Recent failures list (24h, top 10 by recorded_at desc).

Preset definitions live in `@tiler/core/src/presets/`. Both `@tiler/playwright`
and `@tiler/cli`'s `tiler init --preset` consume them.

---

### 4B — `@tiler/cli` + `@tiler/server` (live mode)

**Install:**
```bash
npm i -D @tiler/cli
npx tiler init                    # writes tiler.config.ts + .env template
npx tiler serve                   # boots Fastify on localhost:4567
```

**`tiler.config.ts`:**
```ts
import { defineConfig } from "@tiler/cli";
import { sqliteStore } from "@tiler/server/sqlite";

export default defineConfig({
  store: sqliteStore({ path: "./tiler.db" }),
  port:  4567,
  auth: {
    basic: { user: "admin", pass: process.env.TILER_PASS },
    webhookSecret: process.env.TILER_WEBHOOK_SECRET,  // HMAC-SHA256 over body
    // Optional pluggable callback overrides built-in auth:
    // authorize: async (req) => ({ canView: true, canManage: req.user?.role === "admin" }),
  },
  widgets: ["@tiler/widgets"],
  presets: ["test_automation", "default"],            // optional: seed these on first boot
});
```

**HTTP route map (Fastify):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/` | view | Redirect to `/dashboards` |
| `GET` | `/dashboards` | view | List dashboards (HTML, SSR'd from `@tiler/editor`) |
| `GET` | `/dashboards/:slug` | view | Editor view (SSR + hydrate). Read-only if no `manage` perm. |
| `GET` | `/api/dashboards` | view | JSON list |
| `GET` | `/api/dashboards/:slug` | view | JSON dashboard + panels + cached resolved data |
| `POST` | `/api/dashboards` | manage | Create dashboard |
| `PATCH` | `/api/dashboards/:id` | manage | Update (name, settings, panels-batch) |
| `DELETE` | `/api/dashboards/:id` | manage | Delete |
| `POST` | `/api/panels` | manage | Create panel |
| `PATCH` | `/api/panels/:id` | manage | Update (position, size, config, title) |
| `DELETE` | `/api/panels/:id` | manage | Delete |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/data_sources(/...)` | manage | DataSource CRUD |
| `POST` | `/ingest/:source_slug` | HMAC | Webhook ingestion. Body validated against `data_source.schema_definition`. |
| `POST` | `/api/data_sources/:slug/records` | manage | Manual entry from the editor UI |
| `POST` | `/api/data_sources/:slug/import_csv` | manage | CSV upload + bulk insert |
| `WS`   | `/ws` | view | Server pushes `{ panelId, data: WidgetData }` on each refresh tick. Client subscribes per dashboard. |
| `GET` | `/healthz` | none | Liveness probe |

**Refresh loop:** the server runs a single timer per loaded dashboard (max one
timer per `refresh_seconds` value). On tick: for each panel, resolve via the
widget's `resolve()`, diff against last-pushed `WidgetData`, push only changes
via WebSocket. When zero clients are subscribed to a dashboard, the timer is
paused.

**Editor mounting:** the server statically serves the prebuilt `@tiler/editor`
bundle. The HTML response is SSR'd with `renderToString(<TilerEditorShell …/>)`
and the client hydrates. Editor state (current dashboard, dirty flag, undo
stack, WebSocket connection) lives in a Zustand store. Saves are optimistic
with revert-on-error.

**HMAC verification:**
```ts
// header: X-Tiler-Signature: sha256=<hex>
// body:   raw POST body
const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
const ok = timingSafeEqual(
  Buffer.from(headerSig),
  Buffer.from(`sha256=${expected}`),
);
```

The shared `webhookSecret` (from `tiler.config.ts`) is the default verification
key. An optional per-source override is enabled by setting a `webhook_token`
on a `DataSource`: the plaintext token is shown to the user **once** on
creation/rotation, the bcrypt hash is what's stored in `data_source.webhook_token`,
and the verification path tries the per-source token before falling back to the
global secret. This lets a single source rotate independently.

---

### 4C — `tiler import-playwright-json` (subsystem C)

Use case: a team already runs Playwright with `--reporter=json,results.json`
(Allure-driven, CI-driven, etc.) and wants a Tiler dashboard from that artifact
without changing reporter config.

**Command:**
```bash
npx tiler import-playwright-json results.json \
    [--out tiler-report]                  # write a static export (default)
    [--server http://localhost:4567]      # OR ingest into a live tiler server
    [--source-slug playwright_runs]       # data source slug
    [--preset test_automation]            # which dashboard to materialize
    [--source-ref ${GITHUB_RUN_ID}]       # tag every record with this CI run id
```

**Pipeline:**

```
results.json  ──▶  parsePlaywrightJson()  ──▶  DataRecord[]  ──┐
                                                                ├──▶  --out  : same flow as 4A's reporter (write static)
                                                                └──▶  --server: HMAC-sign each record, POST to /ingest/:slug
```

`parsePlaywrightJson` lives in `@tiler/cli/src/playwright-json.ts`. It walks
Playwright's nested `suites[].suites[].specs[].tests[].results[]` shape and
emits one record per `result`. The payload shape matches what the live reporter
emits, so downstream code is identical.

The `--server` path is sequenced: each record is HMAC-signed and POSTed; on
non-2xx the CLI exits non-zero with a fail-count summary. The `--out` path
reuses the `@tiler/viewer` SSR + snapshot writer from 4A.

---

### Cross-deliverable error handling

| Surface | Failure mode | Behavior |
|---|---|---|
| Reporter `onEnd` SSR throws | Schema validation fails or widget resolver throws | Reporter catches, writes a fallback `tiler-report/error.html` with the error + recommended fix, exits with non-zero (Playwright marks reporter as failed but does not retroactively fail tests) |
| Webhook body fails Zod validation | `400` with field-level errors as JSON | |
| Webhook HMAC mismatch | `401` with no body | Constant-time compare; logs `data_source_id` only |
| Unknown `widget_type` in stored panel | Render `<UnknownWidget>` placeholder with type name | Editor shows "Install missing widget" prompt |
| Resolver throws at runtime (live) | Push `{ data: { error: msg }, empty: true }` to that one panel | Widget renders an error tile; other panels unaffected |
| Resolver throws at build time (static) | Same — fail one panel, not the whole report | |
| `better-sqlite3` native module missing | CLI's `tiler doctor` detects + prints rebuild instructions | |
| Editor save conflict (panel updated after read) | Server returns `409` with current row; editor merges + retries | Optimistic-concurrency via `updated_at` |

---

## §5 — Cross-cutting concerns

### Security

| Surface | Mitigation |
|---|---|
| Webhook ingestion | HMAC-SHA256 over raw body, header `X-Tiler-Signature`. Constant-time compare. Optional per-source `webhook_token` (stored as bcrypt hash). |
| `/api/*` write routes | Basic auth gate + CSRF token (double-submit cookie). Token issued on `GET /dashboards`, required on every state-changing request. |
| `iframe` widget | The `sandbox` attribute is always emitted. Default sandbox tokens (`allow-scripts`) are minimal; consumers may add additional tokens (`allow-forms`, `allow-popups`, `allow-same-origin`, etc.) via `panel.config.sandbox: string[]`, validated against a hard-coded allowlist that excludes `allow-top-navigation` and `allow-modals`. URL must be `https:` or relative; `javascript:` / `data:` rejected at config-validate time. |
| `image` widget | Same URL allowlist as `iframe`. `referrerpolicy="no-referrer"` default. |
| Markdown in `text` widget | Sanitize via `rehype-sanitize` with a strict allowlist (no `<script>`, no inline event handlers, no raw HTML). `rel="noopener noreferrer"` injected on all `<a>`. |
| Static-export HTML | CSP meta tag: `default-src 'self'; script-src 'self' 'unsafe-inline'; img-src https: data:`. `unsafe-inline` is required for the SSR'd snapshot script tag — mitigated by SRI on the viewer JS bundle. |
| Server HTML | Same CSP via response header. SRI on `<script src="…">` for the editor bundle. |
| `recorded_at` from webhook | Ignored if outside `[now − 30d, now + 5m]`. Configurable via `auth.recordedAtSkewMs`. |
| User-supplied `SafeColumn` names | Already regex-validated at config save time; resolvers re-validate before passing into any aggregation key path (defense in depth). |
| Editor save XSS | Widget React components never render `panel.config` strings as HTML. The `text` widget is the one exception, and it goes through the markdown sanitizer. |
| `tiler doctor` | Reports: webhook secret length, basic-auth password strength heuristic, HTTPS / non-HTTPS bind, sqlite file permissions. |

### Accessibility

| Concern | Treatment |
|---|---|
| Color contrast | All default palettes meet WCAG AA on the default page background. Validated via `pa11y-ci` against a fixture page rendering every widget. |
| Keyboard navigation in editor | Gridstack ships keyboard handlers; we extend with: `Tab` to move panel focus, `Enter` to open drawer, `Esc` to close, `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` for undo/redo, arrow keys move panel by 1 cell, `Shift+arrow` resize by 1. |
| Drawer focus trap | `react-focus-lock` keeps focus inside the drawer. Closing returns focus to the panel that opened it. |
| Charts | Each chart widget renders a `<details><summary>` data-table fallback with `aria-label="Tabular view of {title}"` for screen readers. Hidden visually unless toggled. |
| TV mode | Aria-live `polite` region announces metric changes (`"Total runs: 1,247, up 30 from last hour"`) on a 30-second min interval to avoid spam. |
| Editor palette | Listbox role, `aria-activedescendant`. Drag start initiated via `Space` then arrow-keys-to-position then `Enter` to drop, in addition to mouse drag. |

### Theming and design tokens

A single `@tiler/widgets/styles/tokens.css` defines the design system:

```css
:root {
  --tiler-color-page:        #0b0d12;
  --tiler-color-tile:        #131722;
  --tiler-color-tile-header: #1a1f2c;
  --tiler-color-gutter:      transparent;
  --tiler-color-text:        #e6edf3;
  --tiler-color-muted:       #8b95a7;
  --tiler-color-accent:      #5e8af3;
  --tiler-color-pass:        #10b981;
  --tiler-color-warn:        #f59e0b;
  --tiler-color-fail:        #ef4444;
  --tiler-color-skip:        #6b7280;
  --tiler-radius:            8px;
  --tiler-spacing-unit:      4px;
  --tiler-font-mono:         "JetBrains Mono", ui-monospace, monospace;
  --tiler-font-sans:         "Inter", ui-sans-serif, system-ui, sans-serif;
}
@media (prefers-color-scheme: light) {
  :root { /* light token overrides */ }
}
```

Per-dashboard overrides (the four tokens Rails Tiler exposes) become inline CSS
on the dashboard root element:

```html
<div class="tiler-dashboard"
     style="--tiler-color-page:#000; --tiler-color-tile:#111;">
```

The editor's "Theme" tab uses native color inputs bound to these four tokens;
preview is live (CSS-variable cascade, no re-render).

### Performance budgets

| Target | Budget | Enforced by |
|---|---|---|
| `@tiler/viewer` initial JS | ≤ 110 KB gzipped (React + viewer code; charts code-split) | `size-limit` in CI |
| `@tiler/editor` initial JS | ≤ 240 KB gzipped (adds gridstack + Zustand + editor UI) | `size-limit` in CI |
| Static export TTFB → first paint | SSR'd HTML < 100 ms locally | Lighthouse run on `examples/playwright-static` build |
| Snapshot file size | Warn at 5 MB, error at 25 MB | Reporter `onEnd` |
| Single resolver execution | Warn if > 500 ms | Reporter logs + server `/healthz` reflects |
| WebSocket diff push | ≤ 1 KB per panel per tick (typical metric/chart) | Diff'd against last-sent value |
| Sqlite query: `queryRecords({ since, dataSourceId })` | < 5 ms p95 with 100k records and the composite index | Bench in `packages/server/test/bench.ts` |

Charts code-split: each chart widget's React component lazy-loads Recharts via
dynamic import. Dashboards without charts pay zero Recharts cost.

### Logging and observability

- Server uses `pino` (Fastify default). One JSON line per request. Webhook events
  log `{ source_slug, ingested_via, status }`, never the raw body.
- Reporter logs to stdout via Playwright's reporter logging contract (so
  `--reporter=list,@tiler/playwright` interleaves cleanly).
- `tiler doctor` doubles as an observability cheat sheet: dashboard count,
  record counts per source, last-ingested-at per source, sqlite file size,
  store backend identity.
- No third-party telemetry. No phone-home. Stated explicitly in README.

### Browser support

Modern evergreen only. Chrome / Edge / Firefox / Safari last 2 versions. No IE,
no legacy Edge. CI runs the editor's Playwright E2E suite against all four. No
polyfills in the bundle (assumes ES2022 baseline).

### Internationalization

v1 ships English only. All user-visible strings live in
`@tiler/widgets/src/i18n/en.ts` and `@tiler/editor/src/i18n/en.ts` (one
default-export object). A locale-loader stub exists; no other locales are
bundled. `Intl.NumberFormat` and `Intl.DateTimeFormat` with the user's browser
locale handle number/date formatting in widgets — strings stay English but
`1,234.56` becomes `1.234,56` in `de-DE` automatically.

---

## §6 — Testing, release, non-goals

### Testing strategy

| Layer | Tool | Lives in | Coverage target |
|---|---|---|---|
| Unit | Vitest | every package, `*.test.ts` colocated | `core` schemas (Zod parse/fail cases), `widgets` resolvers, server route handlers (with `MemoryStore`), CLI argument parsing, `parsePlaywrightJson` |
| Type tests | `vitest` + `expectTypeOf` | `core` and `widgets` | Confirm `defineWidget` generic propagation, `WidgetData<T>` inference, schema-to-type inference |
| Integration | Vitest + real `better-sqlite3` | `@tiler/server/test/integration/` | Full request → response → store roundtrip. Tear-down deletes a tmp `.db` per test. |
| Component | Storybook + `@storybook/react-vite` | `@tiler/widgets/.storybook/` | One story per widget × example fixture. CI builds Storybook static and uploads as artifact. |
| Visual regression | Playwright + `toHaveScreenshot()` | `@tiler/widgets/test/visual/` | Render every widget × every example fixture in the viewer; snapshot. Three viewport sizes (mobile, tablet, desktop). |
| E2E (editor) | Playwright | `@tiler/editor/test/e2e/` | Drag-and-drop a panel, resize, edit config in drawer, save, reload, assert persistence. Runs against `tiler serve --port 0`. |
| Reporter self-test | Playwright meta-test | `@tiler/playwright/test/self.spec.ts` | A 3-test fixture suite: 1 pass, 1 fail, 1 skip. Reporter writes `tiler-report/`. Outer test asserts on snapshot.json contents. |
| Bundle size | `size-limit` | `@tiler/viewer/.size-limit.json`, `@tiler/editor/.size-limit.json` | Budgets from §5 enforced in CI |
| Lint/format | Biome | repo root `biome.json` | All `.ts` / `.tsx` / `.json` |
| Accessibility | `pa11y-ci` | `tooling/a11y/` | Run against built Storybook URL; WCAG AA |
| Dependency boundaries | `dependency-cruiser` | repo root `.dependency-cruiser.cjs` | Enforce `@tiler/playwright` ↛ `@tiler/server`, leaf rule on `@tiler/core`, no circular deps |

**CI matrix** (GitHub Actions, `ci.yml`):
- Node 20, 22 × OS ubuntu-latest, macos-latest. Windows skipped for sqlite/native-module pain in v1; documented as supported "best-effort" via prebuild.
- One job: install + typecheck + lint + unit + integration + bundle-size.
- One job: Storybook build + visual snapshots + a11y.
- One job: E2E (editor + reporter self-test). Spins up a real sqlite store.
- Pull-request gate = all three pass.

### Release and versioning

**Tooling:** Changesets in `.changeset/`. Each PR that ships a user-visible
change adds a `.md` declaring per-package bump levels.

**Versioning policy:** all `@tiler/*` packages share major versions. Releasing
`2.0.0` means a breaking change in any package; everything bumps to `2.0.0`
even if it is a no-op for some. Independent minors and patches.

Versions are emitted by Changesets' "version" GitHub Action; releases by the
"release" action via `NPM_TOKEN`.

Pre-release channel via `npm dist-tag` `next`: maintainers run
`pnpm changeset pre enter next` → publishes `2.0.0-next.0`, `2.0.0-next.1`,
etc., before promoting to `latest`.

Each package's `CHANGELOG.md` is auto-generated by Changesets.

**Semver contract — what counts as breaking:**
- Any change to `@tiler/core` Zod schemas that fails on previously-valid JSON.
- Any change to `WidgetDefinition` interface shape.
- Any change to HTTP route paths or request/response bodies under `/api/*` and
  `/ingest/*`.
- Any change to reporter options.
- Any change to `tiler.config.ts` shape.
- Any change to CLI command names or required flags.

**Not breaking** (minor or patch):
- New widget types added.
- New optional fields on existing schemas (with defaults).
- Internal refactors visible only to consumers reaching past public exports.

**License:** MIT (matches Rails Tiler). One `LICENSE` file at repo root,
mirrored into each package on publish.

---

## Appendix A — Migration from Rails Tiler (manual, v1)

Documented in `MIGRATING_FROM_RAILS.md`:
1. Dump Rails Tiler's sqlite via `bundle exec rails db:schema:dump` then export rows.
2. Transform: Rails uses `serialize: JSON` for `payload` / `config` /
   `schema_definition`; tiler-ts uses raw JSON columns. Integer IDs → ULIDs
   requires a re-key step.
3. Replay through `tiler import-records --source-slug … records.jsonl`.

A future `tiler import-rails-tiler-db` command is a v1.1 candidate but not part
of v1.

## Appendix B — Effort ranking of the 14 widgets (smallest → largest)

For plan task ordering only — not a hard sequencing requirement:

`clock` < `text` < `image` < `iframe` < `metric` < `meter` < `number_with_delta` <
`status_grid` < `comments` < `list` < `pie_chart` < `bar_chart` < `line_chart` <
`table`.

The chart widgets sit at the heavy end because of the lazy-load wiring + the
shared `chartColors` / palette plumbing; `table` is heaviest because of column
formatting, pagination, and per-column sort.
