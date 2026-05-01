# tiler-ts

> Plug-and-play dashboards for TypeScript / Node.js. Playwright-first.

A TypeScript port of [Tiler](https://github.com/aguspe/tiler) (Rails engine).
Distributed as a set of npm packages under the `@aguspe/tiler-*` scope.

## Status: Phase 3 — Static Reporter (`v0.0.3-phase-3`)

This release ships the first end-user-shipping feature: **a Playwright reporter
that emits a self-contained static dashboard at the end of every test run.**
The reporter replaces Playwright's HTML reporter — a `tiler-report/` folder
appears next to your tests with a fully-rendered dashboard you can open with
`file://` or upload as a CI artifact.

### What's in v0.0.3

- `@aguspe/tiler-core` — adds the `testAutomationPreset` (the QA cockpit
  dashboard config: 9 panels = total runs + failures w/ delta + avg duration +
  build clock + status pie + duration trend line + per-suite status grid +
  failures-by-suite bar + recent failures list) and `buildSnapshot()` (runs
  every panel's resolver server-side and bakes the result into the snapshot).
- `@aguspe/tiler-widgets` — unchanged from Phase 2: all 14 widgets.
- `@aguspe/tiler-viewer` — read-only React app. SSR via `renderToHtml` (Node);
  client-side hydration via a Vite-built bundle that ships pre-built in the
  npm package.
- `@aguspe/tiler-playwright` — implements Playwright's `Reporter` interface.
  Drop into `playwright.config.ts` reporters, get `tiler-report/index.html`
  on every test run.

Phases 4–7 will add the Fastify server with sqlite store, the gridstack-based
editor, the CLI, and v1.0.0 release.

## Quick start

In a Playwright project:

```bash
npm install -D @aguspe/tiler-playwright
```

Edit `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["@aguspe/tiler-playwright", { outDir: "tiler-report" }]],
});
```

Run your tests, then open `tiler-report/index.html`.

## Examples

- [`examples/playwright-static/`](examples/playwright-static/) — a runnable
  Playwright project demonstrating the reporter end-to-end.

## Quick start (development)

Requirements: Node 20.18+ and pnpm 9.12+ (pinned via `packageManager` and
checked at install time).

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @aguspe/tiler-widgets storybook
```

Open [http://localhost:6006](http://localhost:6006) for the widget gallery
(all 14 widgets, multiple stories each).

## Workspace pipeline

| Command | What it does |
|---|---|
| `pnpm test` | Vitest across packages — 200+ tests covering schemas, resolvers, widgets, SSR, reporter |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm lint` | Biome lint + format check |
| `pnpm format` | Biome format --write |
| `pnpm build` | tsup + Vite builds for each package |
| `pnpm size` | size-limit budget enforcement |
| `pnpm -w deps` | dependency-cruiser boundary checks |

CI runs all of the above on every PR (Node 20 + 22, ubuntu + macos).

## Packages

| Package | Status (v0.0.3-phase-3) |
|---|---|
| `@aguspe/tiler-core` | ✅ schemas + registry + MemoryStore + helpers + presets + buildSnapshot |
| `@aguspe/tiler-widgets` | ✅ all 14 widgets + Storybook |
| `@aguspe/tiler-viewer` | ✅ SSR + client hydration bundle |
| `@aguspe/tiler-playwright` | ✅ Reporter + test_automation preset |
| `@aguspe/tiler-server` | ⏳ Phase 4 |
| `@aguspe/tiler-editor` | ⏳ Phase 5 |
| `@aguspe/tiler-cli` | ⏳ Phase 6 |

## Design + plans

- Design spec: [`docs/superpowers/specs/2026-04-30-tiler-ts-design.md`](docs/superpowers/specs/2026-04-30-tiler-ts-design.md)
- Phase 1 plan: [`docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md`](docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md)
- Phase 2 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md)
- Phase 3 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-3-viewer-and-reporter.md)

## License

[MIT](LICENSE)
