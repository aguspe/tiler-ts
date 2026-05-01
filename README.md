# tiler-ts

> Plug-and-play dashboards for TypeScript / Node.js. Playwright-first.

A TypeScript port of [Tiler](https://github.com/aguspe/tiler) (Rails engine).
Distributed as a set of npm packages under the `@aguspe/tiler-*` scope.

## Status: Phase 1 — Foundation (`v0.0.1-phase-1`)

This repository is in early development. Phase 1 ships:

- `@aguspe/tiler-core` — Zod schemas (`Dashboard`, `DataSource`, `DataRecord`,
  `Panel`, `TimeWindow`, `TilerSnapshot`), the `WidgetDefinition` contract,
  the `defineWidget` registry, the `TilerStore` interface, and a working
  `MemoryStore` implementation.
- `@aguspe/tiler-widgets` — 4 of 14 React widget components: **clock, text,
  image, iframe**. Tokens stylesheet, chart-color helper, Storybook gallery.

Phases 2–7 will add the remaining 10 widgets (incl. metric, charts, table),
the static viewer, the Playwright reporter, the Fastify server with sqlite
store, the gridstack-based editor, the CLI, and v1.0.0 release.

## Quick start (development)

Requirements: Node 20.18+ and pnpm 9.12+ (pinned via `packageManager` and
checked at install time).

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @aguspe/tiler-widgets storybook
```

Open [http://localhost:6006](http://localhost:6006) for the widget gallery.

## Workspace pipeline

| Command | What it does |
|---|---|
| `pnpm test` | Vitest across packages — currently 96 tests (71 core, 25 widgets) |
| `pnpm typecheck` | `tsc --noEmit` across packages |
| `pnpm lint` | Biome lint + format check |
| `pnpm format` | Biome format --write |
| `pnpm build` | tsup builds for each package |
| `pnpm size` | size-limit budget enforcement |
| `pnpm deps` | dependency-cruiser boundary checks |

CI runs all of the above on every PR (Node 20 + 22, ubuntu + macos).

## Packages

| Package | Status (v0.0.1-phase-1) |
|---|---|
| `@aguspe/tiler-core` | ✅ schemas + registry + MemoryStore |
| `@aguspe/tiler-widgets` | ✅ 4 of 14 widgets + Storybook |
| `@aguspe/tiler-viewer` | ⏳ Phase 3 |
| `@aguspe/tiler-editor` | ⏳ Phase 5 |
| `@aguspe/tiler-server` | ⏳ Phase 4 |
| `@aguspe/tiler-playwright` | ⏳ Phase 3 |
| `@aguspe/tiler-cli` | ⏳ Phase 6 |

## Design + plans

- Design spec: [`docs/superpowers/specs/2026-04-30-tiler-ts-design.md`](docs/superpowers/specs/2026-04-30-tiler-ts-design.md)
- Phase 1 plan: [`docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md`](docs/superpowers/plans/2026-04-30-tiler-ts-phase-1-foundation.md)

## License

[MIT](LICENSE)
