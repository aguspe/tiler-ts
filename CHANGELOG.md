# Changelog

All notable changes to tiler-ts. The project follows
[semver](https://semver.org/) — `1.0.0` is the first stable release.

## 1.0.0 — 2026-05-02

First stable release. The full v0.x phase ramp condensed for a clean
v1.0 cut:

### Packages

- **`@aguspe/tiler-core`** — Zod schemas (`Dashboard`, `Panel`,
  `DataSource`, `DataRecord`, `WidgetData`, `TilerSnapshot`); the
  `defineWidget` registry; `MemoryStore` and the `TilerStore`
  interface; helpers (`time_window`, `aggregate`, `applyFilter`,
  `groupBucket`); `buildSnapshot()`; `defineConfig()`; the
  `testAutomationPreset` factory.
- **`@aguspe/tiler-widgets`** — 14 first-party widgets (clock, text,
  image, iframe, metric, number_with_delta, meter, list, status_grid,
  comments, table, line_chart, bar_chart, pie_chart) and the
  Rails-parity design-token CSS (warm-paper light theme +
  `[data-theme="dark"]` flip; Space Grotesk + Inter + JetBrains Mono).
- **`@aguspe/tiler-viewer`** — read-only React renderer with SSR
  (`renderTilerDashboardHtml`) and a hydration bundle.
- **`@aguspe/tiler-playwright`** — reporter that turns a Playwright
  run into a static dashboard. Self-contained, opens with `file://`.
- **`@aguspe/tiler-server`** — Fastify 5 + better-sqlite3 host:
  full CRUD at `/api/*`, HMAC-signed webhook ingestion at
  `/ingest/:slug`, manual entry + CSV import, WebSocket live updates
  at `/ws`, refresh-loop with auto-pause, optional HTTP basic auth +
  CSRF, plus `/dashboards`, `/data-sources`, `/settings` (live
  diagnostics).
- **`@aguspe/tiler-editor`** — drag/drop palette with cursor-image
  preview and a snapping drop ghost; slide-in palette that pushes
  the grid; drawer with live preview + `Use example`; auto-save on
  every store change; inline title rename; custom delete confirm
  modal; floating undo/redo bar; TV mode (kiosk) independent of the
  dark/light toggle; resize from any edge or corner; `widget.example()`
  used to seed dropped panels.
- **`@aguspe/tiler-cli`** — `tiler init` (scaffold), `tiler serve`
  (boot Fastify), `tiler doctor` (diagnostics),
  `tiler import-playwright-json` (flatten + HMAC-POST a Playwright
  JSON report).

### Examples

- `examples/playwright-static/` — reporter demo.
- `examples/server-live/` — Fastify server demo with sqlite + seeded
  data + curl webhook examples.
- `examples/e2e/` — Playwright visual regression + interaction suite.

### Tooling

- pnpm workspaces + Turborepo, tsup for libs, Vite for app bundles,
  Vitest for unit/integration, Playwright for E2E, Biome for
  lint/format, dependency-cruiser for boundary checks, size-limit for
  budgets, Changesets for releases.

### Pre-release history

| Version | Phase | Headline |
|---|---|---|
| `0.0.1-phase-1` | Foundation | Workspace, schemas, core types |
| `0.0.2-phase-2` | Widgets | All 14 widgets + Storybook |
| `0.0.3-phase-3` | Viewer + reporter | SSR viewer + Playwright reporter |
| `0.0.4-phase-4` | Server | Fastify + sqlite + ingestion + WS |
| `0.0.5-phase-5` | Editor | Drag/drop editor + Rails design parity |
| `0.0.6-phase-6` | CLI | `tiler` binary |
| `1.0.0` | GA | Releaseable npm packages |
