# Contributing to tiler-ts

## Prerequisites

- Node.js 20.18+ (`.nvmrc` is checked in)
- pnpm 9.12+ (set via `packageManager` in root `package.json`; pnpm enforces a match at install time)

## First-time setup

```bash
pnpm install
pnpm build
pnpm test
```

## Day-to-day

```bash
pnpm test           # run all tests across packages
pnpm typecheck      # tsc --noEmit across packages
pnpm lint           # biome check
pnpm format         # biome format --write
pnpm deps           # dependency-cruiser boundary check
pnpm size           # size-limit budget check
pnpm --filter @aguspe/tiler-widgets storybook    # widget gallery on :6006
```

## Adding a changeset

Every PR that touches a publishable package needs a changeset:

```bash
pnpm changeset
# follow the prompts; commit the .changeset/*.md file
```

Changesets is configured to bump all `@aguspe/tiler-*` packages in lockstep
on majors and independently on minors / patches.

## Workspace boundary rules

Enforced by `dependency-cruiser` and verified in CI:

- `@aguspe/tiler-core` is leaf-most. It must not import from any other workspace package.
- `@aguspe/tiler-playwright` must not depend on `@aguspe/tiler-server`.
  (A Playwright user shouldn't have to install Fastify or sqlite to ship a static report.)
- No circular dependencies anywhere.

## Adding a widget

The `@aguspe/tiler-widgets` package follows a strict layout. Each widget lives
under `packages/widgets/src/widgets/<name>/` with these files:

```
schema.ts            # Zod schema for the widget's panel.config
example.ts           # () => { panel, records } fixture
<Name>Widget.tsx     # React component
index.ts             # defineWidget({...}) — side-effect-registers the widget
<name>.test.tsx      # Vitest tests
<name>.stories.tsx   # Storybook stories
```

Then add a side-effect import + re-export in `packages/widgets/src/index.ts`:

```ts
import "./widgets/<name>";
export { <Name>Config, <Name>Widget } from "./widgets/<name>";
```

The widget will self-register on package import, so consumers just
`import "@aguspe/tiler-widgets"` (no further wiring needed).

## Coding style

- Biome handles formatting + lint. Run `pnpm format` before committing if
  you've been writing code without an editor integration.
- Tests are colocated next to the code they cover (`*.test.ts` / `*.test.tsx`).
- TDD is encouraged: write the failing test first, then the implementation.
- TypeScript strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
  are enabled at the base tsconfig. New code must type-check cleanly.
