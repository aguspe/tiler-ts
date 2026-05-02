# tiler-ts

> Plug-and-play dashboards for TypeScript / Node.js. Playwright-first.

A TypeScript port of [Tiler](https://github.com/aguspe/tiler) (Rails engine).
Distributed as a set of npm packages under the `@aguspe/tiler-*` scope.

## Status: `v1.0.0` — stable

Seven packages, one binary, drop-in Rails-parity design system. See
[`CHANGELOG.md`](CHANGELOG.md) for the full v0.x → v1.0 narrative and
[`MIGRATING_FROM_RAILS.md`](MIGRATING_FROM_RAILS.md) for porting from
the Rails gem.

## 30-second tour

```bash
npx @aguspe/tiler-cli init     # scaffolds tiler.config.ts + .env.example
npx @aguspe/tiler-cli serve    # boots Fastify; opens http://localhost:4567/dashboards
```

Drop a widget on the grid with the **+ Add Panel** button. The drawer
shows a live preview that updates as you edit the JSON; **Use example**
fills it with the widget's canonical config. Edits auto-save; ⌘Z
undoes; **TV** flips into kiosk mode for displays; **🌙** toggles dark.

For Playwright runs (no server, just a static report):

```bash
npm i -D @aguspe/tiler-playwright
```

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  reporter: [["@aguspe/tiler-playwright", { outDir: "tiler-report" }]],
});
```

Per-package READMEs cover the deeper API for each entry point — start with [`packages/cli`](packages/cli/README.md) and [`packages/server`](packages/server/README.md) for the live story, [`packages/playwright`](packages/playwright/README.md) for the static-report story.

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

| Package | What it does |
|---|---|
| [`@aguspe/tiler-core`](packages/core/README.md) | Schemas, registry, MemoryStore, helpers, presets, `buildSnapshot`, `defineConfig` |
| [`@aguspe/tiler-widgets`](packages/widgets/README.md) | 14 widgets + Rails-parity design tokens |
| [`@aguspe/tiler-viewer`](packages/viewer/README.md) | Read-only SSR + hydration |
| [`@aguspe/tiler-playwright`](packages/playwright/README.md) | Static-report Playwright reporter |
| [`@aguspe/tiler-server`](packages/server/README.md) | Fastify + sqlite + ingestion + WebSocket |
| [`@aguspe/tiler-editor`](packages/editor/README.md) | Drag/drop editor with auto-save + drawer preview |
| [`@aguspe/tiler-cli`](packages/cli/README.md) | `tiler init`/`serve`/`doctor`/`import-playwright-json` |

## Design + plans

- Design spec: [`docs/superpowers/specs/2026-04-30-tiler-ts-design.md`](docs/superpowers/specs/2026-04-30-tiler-ts-design.md)
- Phase 1 plan: [`docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md`](docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md)
- Phase 2 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md)
- Phase 3 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md)
- Phase 4 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-4-server.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-4-server.md)
- Phase 5 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-5-editor.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-5-editor.md)
- Migration guide: [`MIGRATING_FROM_RAILS.md`](MIGRATING_FROM_RAILS.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)

## License

[MIT](LICENSE)
