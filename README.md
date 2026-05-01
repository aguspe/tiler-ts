# tiler-ts

> Plug-and-play dashboards for TypeScript / Node.js. Playwright-first.

A TypeScript port of [Tiler](https://github.com/aguspe/tiler) (Rails engine).
Distributed as a set of npm packages under the `@aguspe/tiler-*` scope.

## Status: Phase 2 — All 14 Widgets (`v0.0.2-phase-2`)

This repository is in early development. Phase 2 ships:

- `@aguspe/tiler-core` — Zod schemas, the `WidgetDefinition` contract, the
  `defineWidget` registry, the `TilerStore` interface, the `MemoryStore`
  implementation, **plus four shared resolver helpers**: `aggregate`,
  `applyTimeWindow`, `applyFilter`, `groupByColumn` / `bucketByTime`.
- `@aguspe/tiler-widgets` — **all 14 React widget components** in three
  groups:
  - Config-only (4): clock, text, image, iframe.
  - Single-value (3): metric, number_with_delta (with hand-rolled SVG
    sparkline), meter (with hand-rolled SVG arc).
  - Tabular (4): list, status_grid, comments, table.
  - Charts (3, recharts): line_chart, bar_chart, pie_chart.
  - Tokens stylesheet, `chartColors` palette helper, shared `ChartFrame`
    empty-state component, Storybook gallery covering every widget.

Phases 3–7 will add the static viewer, the Playwright reporter, the Fastify
server with sqlite store, the gridstack-based editor, the CLI, and v1.0.0
release.

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
| `pnpm test` | Vitest across packages — 163 tests (96 core, 67 widgets) |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm lint` | Biome lint + format check |
| `pnpm format` | Biome format --write |
| `pnpm build` | tsup builds for each package |
| `pnpm size` | size-limit budget enforcement |
| `pnpm deps` | dependency-cruiser boundary checks |

CI runs all of the above on every PR (Node 20 + 22, ubuntu + macos).

## Packages

| Package | Status (v0.0.2-phase-2) |
|---|---|
| `@aguspe/tiler-core` | ✅ schemas + registry + MemoryStore + 4 resolver helpers |
| `@aguspe/tiler-widgets` | ✅ all 14 widgets + Storybook |
| `@aguspe/tiler-viewer` | ⏳ Phase 3 |
| `@aguspe/tiler-editor` | ⏳ Phase 5 |
| `@aguspe/tiler-server` | ⏳ Phase 4 |
| `@aguspe/tiler-playwright` | ⏳ Phase 3 |
| `@aguspe/tiler-cli` | ⏳ Phase 6 |

## Design + plans

- Design spec: [`docs/superpowers/specs/2026-04-30-tiler-ts-design.md`](docs/superpowers/specs/2026-04-30-tiler-ts-design.md)
- Phase 1 plan: [`docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md`](docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md)
- Phase 2 plan: [`docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md`](docs/superpowers/plans/2026-05-01-tiler-ts-phase-2-widgets.md)

## License

[MIT](LICENSE)
