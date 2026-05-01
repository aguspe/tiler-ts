# tiler-ts

> Plug-and-play dashboards for TypeScript / Node.js. Playwright-first.

A TypeScript port of [Tiler](https://github.com/aguspe/tiler) (Rails engine).
Distributed as a set of npm packages under the `@aguspe/tiler-*` scope.

## Status: Phase 4 — Live Server (`v0.0.4-phase-4`)

This release ships the live counterpart to the static reporter. Run the
`@aguspe/tiler-server` Fastify app, get sqlite persistence, HMAC-signed
webhook ingestion, manual entry, CSV import, and live updates pushed over
WebSocket — all in a single Node process.

### What's in v0.0.4

- `@aguspe/tiler-server` — Fastify 5 + better-sqlite3 + @fastify/websocket.
  - HTTP API: full CRUD on dashboards / panels / data sources at `/api/*`.
  - HMAC-signed webhook ingestion at `POST /ingest/:source_slug`.
  - Manual entry + CSV import at `POST /api/data_sources/:slug/{records,import_csv}`.
  - SSR'd dashboard pages at `/dashboards/:slug` (read-only — editor lands in Phase 5).
  - Pre-built viewer bundle served from `/assets/*`.
  - WebSocket live updates at `/ws` — clients subscribe by slug, see resolver-diff pushes per refresh tick.
  - Optional HTTP basic auth + CSRF (off by default; enable in `tiler.config.ts`).
- `@aguspe/tiler-core` — adds `defineConfig()` for typed `tiler.config.ts`.
- `examples/server-live/` — runnable demo: `pnpm seed && pnpm start`.

Phases 5–7 will add the gridstack-based editor, the CLI (`tiler` binary), and v1.0.0 release.

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
- [`examples/server-live/`](examples/server-live/) — Fastify server demo with sqlite + seeded data + curl webhook examples.

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

| Package | Status (v0.0.4-phase-4) |
|---|---|
| `@aguspe/tiler-core` | ✅ schemas + registry + MemoryStore + helpers + presets + buildSnapshot + defineConfig |
| `@aguspe/tiler-widgets` | ✅ all 14 widgets + Storybook |
| `@aguspe/tiler-viewer` | ✅ SSR + client hydration bundle |
| `@aguspe/tiler-playwright` | ✅ Reporter + test_automation preset |
| `@aguspe/tiler-server` | ✅ Fastify + sqlite + ingestion + WebSocket |
| `@aguspe/tiler-editor` | ⏳ Phase 5 |
| `@aguspe/tiler-cli` | ⏳ Phase 6 |

## Design + plans

- Design spec: [`docs/superpowers/specs/2026-04-30-tiler-ts-design.md`](docs/superpowers/specs/2026-04-30-tiler-ts-design.md)
- Phase 1 plan: [`docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md`](docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md)
- Phase 2 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md)
- Phase 3 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md)
- Phase 4 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-4-server.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-4-server.md)

## License

[MIT](LICENSE)
