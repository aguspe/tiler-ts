# tiler-ts

> Plug-and-play dashboards for TypeScript / Node.js. Playwright-first.

A TypeScript port of [Tiler](https://github.com/aguspe/tiler) (Rails engine).
Distributed as a set of npm packages under the `@aguspe/tiler-*` scope.

## Status: Phase 5 — Editor (`v0.0.5-phase-5`)

This release ships the gridstack-based dashboard editor. The Rails
project's design system is ported 1:1 — warm-paper light theme by
default, Space Grotesk + Inter + JetBrains Mono via Google Fonts,
zero-radius panels with hairline borders, and a `[data-theme="dark"]`
flip for TV displays.

### What's in v0.0.5

- `@aguspe/tiler-editor` — React 18 + zustand vanilla store, lazy-loaded
  gridstack@11, lucide-style inline SVG icons.
  - **Drag/drop palette** with cursor-image preview and a dashed
    drop-ghost that snaps to the target cell. Newly dropped widgets
    pre-fill from `widget.example()` so they render real data on the
    grid immediately.
  - **Slide-in palette** that pushes the grid (not an overlay). Closes
    on outside-click.
  - **Drawer with live preview** — title + JSON config editor +
    "Use example" button. Below the form, `<widget.component />`
    renders against the example records with the current draft config.
  - **Auto-save** on every store change (600ms debounce). No Save
    button to forget.
  - **Inline title rename** (double-click anywhere a title shows) and
    a **custom delete confirm dialog** (paper-2 modal, danger button,
    ⌘Z/Esc shortcuts) — no `window.confirm`.
  - **Floating undo/redo bar** bottom-left + keyboard shortcuts.
  - **TV mode** hides the chrome so the grid fills the viewport (kiosk
    display). Independent of the dark/light toggle.
  - **Resize from any corner or edge** — invisible handles, just the
    cursor change as affordance.
- `@aguspe/tiler-server` — `/dashboards/:slug` now serves the editor
  SSR shell + hydrates over the prebuilt client bundle. Adds
  `/data-sources` and `/settings` (live diagnostics: store backend,
  auth mode, listening host/port, registered widgets).
- `examples/e2e/` — Playwright suite: 4 visual snapshots + 8
  interaction tests (light/dark/TV, palette open + outside-close,
  drawer preview, delete-confirm, post-delete resize survival).

Phases 6–7 will add the CLI (`tiler` binary) and the v1.0.0 release.

## Quick start (live mode)

```ts
// tiler.config.ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: "./tiler.db" }),
  port: 4567,
  auth: { webhookSecret: process.env.TILER_WEBHOOK_SECRET! },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],
});
```

```ts
// start.ts
import "@aguspe/tiler-widgets";
import { createServer } from "@aguspe/tiler-server";
import config from "./tiler.config";

const app = await createServer({ store: config.store, auth: config.auth });
await app.listen({ host: config.host, port: config.port });
```

## Quick start (Playwright reporter)

In a Playwright project:

```bash
npm install -D @aguspe/tiler-playwright
```

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  reporter: [["@aguspe/tiler-playwright", { outDir: "tiler-report" }]],
});
```

Run your tests, then open `tiler-report/index.html`.

## Examples

- [`examples/playwright-static/`](examples/playwright-static/) — Playwright reporter demo.
- [`examples/server-live/`](examples/server-live/) — Fastify server demo with sqlite + seeded data + curl webhook examples. After `pnpm seed && pnpm start`, open http://127.0.0.1:4567/dashboards/test_automation to drive the editor.
- [`examples/e2e/`](examples/e2e/) — Playwright visual regression + interaction suite for the editor.

## Workspace pipeline

| Command | What it does |
|---|---|
| `pnpm test` | Vitest across packages — 270+ tests covering schemas, resolvers, widgets, SSR, reporter, server routes, sqlite store, refresh manager |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm lint` | Biome lint + format check |
| `pnpm format` | Biome format --write |
| `pnpm build` | tsup + Vite builds for each package |
| `pnpm size` | size-limit budget enforcement |
| `pnpm deps` | dependency-cruiser boundary checks |

CI runs all of the above on every PR (Node 20 + 22, ubuntu + macos).

## Packages

| Package | Status (v0.0.5-phase-5) |
|---|---|
| `@aguspe/tiler-core` | ✅ schemas + registry + MemoryStore + helpers + presets + buildSnapshot + defineConfig |
| `@aguspe/tiler-widgets` | ✅ all 14 widgets + Storybook + Rails-parity token system |
| `@aguspe/tiler-viewer` | ✅ SSR + client hydration bundle |
| `@aguspe/tiler-playwright` | ✅ Reporter + test_automation preset |
| `@aguspe/tiler-server` | ✅ Fastify + sqlite + ingestion + WebSocket + editor SSR + diagnostics page |
| `@aguspe/tiler-editor` | ✅ Drag/drop, drawer with preview, auto-save, undo/redo, TV mode, dark mode |
| `@aguspe/tiler-cli` | ⏳ Phase 6 |

## Design + plans

- Design spec: [`docs/superpowers/specs/2026-04-30-tiler-ts-design.md`](docs/superpowers/specs/2026-04-30-tiler-ts-design.md)
- Phase 1 plan: [`docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md`](docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md)
- Phase 2 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md)
- Phase 3 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md)
- Phase 4 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-4-server.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-4-server.md)
- Phase 5 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-5-editor.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-5-editor.md)

## License

[MIT](LICENSE)
