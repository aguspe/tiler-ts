# Server-Seeded Dashboards — Design

Status: approved
Owner: @aguspe
Date: 2026-05-05

## Problem

Tiler ships two products that share a snapshot schema but no live
bridge between them:

- **`@aguspe/tiler-playwright`** — generates a self-contained static
  report from a `tiler.config.ts` per test run. Layout authored in
  code, rendered into a single HTML file.
- **`@aguspe/tiler-server`** — Fastify + SQLite host with REST CRUD,
  HMAC ingestion, WebSocket live updates, and the drag-resize editor.
  Layout lives in the database.

Today there is no way to take a `tiler.config.ts` (or a built-in preset
like `test_automation`) and have a deployed `tiler-server` instance
materialize that dashboard. The server's config schema already exposes
`presets: string[]` — but the field is a stub: the value is parsed,
stored, and never consumed. Users who set `presets: ["test_automation"]`
get an empty server.

This design closes that gap. After this change, deploying a
`tiler-server` instance with a `tiler.config.ts` containing built-in
preset names and/or imported `definePlaywrightConfig({...})` exports
seeds those dashboards into the store on first boot. After seeding,
the editor is the canonical mutator — config changes never overwrite
edits.

## Goals

In scope:

- The server's existing `presets: string[]` config option becomes
  load-bearing: each name is resolved against a built-in preset
  registry and seeded into the store on first boot.
- A new `dashboards: PlaywrightTilerConfig[]` config option lets users
  pass any number of `definePlaywrightConfig`-shaped dashboards as
  in-process imports. The server seeds each.
- Seeding is idempotent by `dashboard.slug`: a dashboard that already
  exists is left alone. Editor edits are never overwritten by config.
- Errors during seeding abort the boot. A misconfigured seed is a
  deploy-time failure, not a runtime one.
- Built-in presets and the playwright-config-to-preset-output bridge
  live in `@aguspe/tiler-core` so both the server and the reporter can
  share the same materialization logic.

Out of scope:

- Re-seeding / live config reload. Changing the config and restarting
  the server is a no-op for already-seeded dashboards (by design).
- Editor → config export. There is no "pull" command writing
  `tiler.config.ts` back from server state.
- Pushing test-run records to a remote server from the playwright
  reporter. Records still arrive via `/ingest/:slug` (HMAC) — the
  reporter does not gain a network fan-out.
- Custom preset registration via plugin (e.g., a `defineTilerPreset`
  helper). The registry is built-in-only for this iteration.
- Multi-dashboard support in `definePlaywrightConfig`. Each dashboard
  is one config artifact; the server takes an array of them.

## User-facing API

The server's `tiler.config.ts` gains two load-bearing keys.

```ts
// packages/server consumer's tiler.config.ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";
import nightlyDash from "./dashboards/nightly.tiler.config.ts";
import unitDash from "./dashboards/unit.tiler.config.ts";

export default defineConfig({
  store: new BetterSqliteStore({ path: process.env.TILER_DB_PATH ?? "./tiler.db" }),
  port: Number(process.env.PORT ?? 4567),
  auth: { webhookSecret: process.env.TILER_WEBHOOK_SECRET ?? "..." },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],          // built-in by name; now actually seeds
  dashboards: [nightlyDash, unitDash],   // user-defined dashboards
});
```

Each entry in `dashboards` is a `PlaywrightTilerConfig` — the same
shape produced by `definePlaywrightConfig({...})` from
`@aguspe/tiler-playwright`. Users `import` their existing
`tiler.config.ts` files directly; no new file format, no new helper.

`collect()` hooks on `dataSources[]` are ignored on the server side.
Records flow into the server via `/ingest/:slug`, not at boot. This
is documented in the new `docs/site/docs/server/seeding.md` page so
users do not expect the reporter's `collect()` semantics on the server.

## Types

To avoid inverting the dep direction (today `tiler-playwright`
depends on `tiler-core`, not the other way around), core declares its
own structurally-equivalent `DashboardConfig` interface — the same
shape `definePlaywrightConfig({...})` produces, but defined in core
so consumers using just `tiler-core` see no missing types.

```ts
// @aguspe/tiler-core/presets/playwright-config.ts — new
import type {
  DataRecord,
  DataSourceInput,
  Panel,
} from "../schema";

/** Same shape as `PlaywrightTilerConfig` from `@aguspe/tiler-playwright`,
 *  declared standalone in core to avoid an inverted dep direction. The
 *  two interfaces are kept structurally identical by code review. */
export interface DashboardConfig {
  excludePanels?: string[];
  panels?: UserPanelInput[];
  dataSources?: Array<{
    source: DataSourceInput;
    collect?: (ctx: unknown) => Promise<DataRecord[]>; // ignored on server
  }>;
  dashboard?: { name?: string; slug?: string; description?: string };
}

export interface UserPanelInput
  extends Omit<Panel, "id" | "dashboard_id" | "data_source_id" | "created_at" | "updated_at" | "y"> {
  y?: number;
  data_source_id?: string;
  data_source_slug?: string;
}
```

```ts
// @aguspe/tiler-core/config.ts — additions
import type { DashboardConfig } from "./presets/playwright-config";

export interface TilerConfig {
  // ...existing fields unchanged...
  presets?: string[];                  // already existed; now load-bearing
  dashboards?: DashboardConfig[];      // new
}

export interface ResolvedTilerConfig {
  // ...existing fields unchanged...
  presets: string[];
  dashboards: DashboardConfig[];
}
```

`@aguspe/tiler-playwright`'s exported `PlaywrightTilerConfig` is
structurally assignable to core's `DashboardConfig`, so users `import
nightlyDash from "./nightly.tiler.config.ts"` and pass it to
`dashboards: [nightlyDash]` without casts. A `playwright-config.test.ts`
asserts the structural assignability to catch silent drift.

## Architecture

The new code is small and split between two existing packages.

```
packages/core/
├── src/
│   ├── presets/
│   │   ├── registry.ts           [new] name → factory map; getPreset()
│   │   └── playwright-config.ts  [new] playwrightConfigToPresetOutput() bridge
│   └── index.ts                  [edit] re-export the new helpers
packages/server/
├── src/
│   ├── seed.ts                   [new] seedDashboards() — runs on boot
│   ├── server.ts                 [edit] await seedDashboards() before listen()
│   └── seed.test.ts              [new] idempotency, dup-slug, unknown-name
packages/core/src/config.ts       [edit] add `dashboards?` to TilerConfig
docs/site/docs/server/seeding.md  [new] documentation
```

### Why the bridge lives in core

`playwrightConfigToPresetOutput` materializes a `PlaywrightTilerConfig`
into a full `PresetOutput` (`{ dashboard: Dashboard, dataSources:
DataSource[], panels: Panel[] }`). The reporter's `config-resolver.ts`
already does this work inline — id-fill, auto-place, slug binding,
timestamp fill. Extracting it to core means both products share the
same logic. The reporter can later refactor its resolver to call the
core helper, eliminating duplication. For this spec, only the new
extracted helper exists; the reporter resolver stays untouched.

### Why the preset registry lives in core

Both the server (now) and the reporter (already, hardcoded to
`testAutomationPreset()` in `reporter.ts`) need to look up presets.
Centralizing the lookup in `@aguspe/tiler-core/presets/registry.ts`
enables the reporter to also accept `preset: <name>` from a registry
in a future iteration without growing core's surface further.

### Why seeding lives in the server, not core

Seeding writes to `TilerStore`, which is a server-time concept. The
core helpers are pure functions; the server orchestrates them.

## Seeding semantics

`packages/server/src/seed.ts`:

```ts
import {
  type PresetOutput,
  type ResolvedTilerConfig,
  type TilerStore,
  getPreset,
  playwrightConfigToPresetOutput,
} from "@aguspe/tiler-core";

export async function seedDashboards(
  cfg: ResolvedTilerConfig,
  store: TilerStore,
): Promise<void> {
  const seeds: PresetOutput[] = [];

  for (const name of cfg.presets) {
    const factory = getPreset(name);
    if (!factory) {
      throw new Error(
        `[tiler-server] unknown preset "${name}" — seeding aborted`,
      );
    }
    seeds.push(factory());
  }

  for (const dash of cfg.dashboards) {
    seeds.push(playwrightConfigToPresetOutput(dash));
  }

  // Pre-flight: error on duplicate slugs in the seed list itself.
  const slugs = new Set<string>();
  for (const s of seeds) {
    if (slugs.has(s.dashboard.slug)) {
      throw new Error(
        `[tiler-server] duplicate dashboard slug "${s.dashboard.slug}" in seed config`,
      );
    }
    slugs.add(s.dashboard.slug);
  }

  for (const seed of seeds) {
    const existing = await store.getDashboardBySlug(seed.dashboard.slug);
    if (existing) {
      console.info(
        `[tiler-server] dashboard "${seed.dashboard.slug}" already exists, skipping seed`,
      );
      continue;
    }
    await store.upsertDashboard(seed.dashboard);
    for (const ds of seed.dataSources) {
      await store.upsertDataSource(ds);
    }
    for (const p of seed.panels) {
      await store.upsertPanel(p);
    }
    console.info(
      `[tiler-server] seeded "${seed.dashboard.slug}" — ${seed.panels.length} panels, ${seed.dataSources.length} sources`,
    );
  }
}
```

Order of operations:

1. **Resolve preset names.** Each name in `cfg.presets` is looked up in
   the built-in registry. Unknown name → fatal error before any DB
   write.
2. **Convert user dashboards.** Each entry in `cfg.dashboards` is run
   through the core bridge to produce a `PresetOutput`.
3. **Pre-flight slug check.** If two seeds in the same config share a
   slug, throw before any DB write. (Prevents "first one wins"
   silently.)
4. **Idempotent upsert per seed.** For each `PresetOutput`, look up
   `dashboard.slug`. If a dashboard already exists, log and skip the
   entire seed (no partial seeding). Otherwise upsert dashboard, then
   data sources, then panels.
5. **Log result.** One info-level line per seed action (seeded or
   skipped) so the boot log is useful for ops.

The function is `async` because store methods are async; it does not
introduce concurrency. Seeds run sequentially.

## Server boot integration

`packages/server/src/server.ts` calls `seedDashboards(cfg, store)`
once, after the store is initialized and routes are registered, but
before `server.listen()`. A seed error throws synchronously and the
server never starts.

## Errors

Fatal — abort boot:

- Unknown preset name in `cfg.presets`.
- Duplicate `dashboard.slug` between two entries of the same seed
  config.
- Any error thrown by `store.upsertDashboard`, `upsertDataSource`, or
  `upsertPanel` (e.g., schema-validation failure on a malformed
  dashboard).
- `playwrightConfigToPresetOutput` throwing on a malformed
  `PlaywrightTilerConfig` (e.g., a panel referencing a missing
  `data_source_slug`). Reuses existing reporter-side validation.

Non-fatal — log and continue:

- A seed whose `dashboard.slug` already exists in the store. Log at
  `info`, skip cleanly.

## Backward compatibility

- Existing servers configured with `presets: ["test_automation"]`
  today get a no-op (the value was a stub). After this change, they
  get an actual seeded dashboard on first boot. Existing data is not
  touched — the slug check ensures no overwrite.
- Existing servers configured WITHOUT `presets` or `dashboards` are
  unaffected. The new fields default to `[]`.
- The store interface (`TilerStore`) gains nothing; this design uses
  only existing methods (`getDashboardBySlug`, `upsertDashboard`,
  `upsertDataSource`, `upsertPanel`).
- The reporter is unchanged. Its hardcoded `testAutomationPreset()`
  call still works; refactoring it to use the new registry is a
  follow-up not blocked by this change.

## Validation

`@aguspe/tiler-core/config.ts` already validates `presets: string[]`
and stores `dashboards: []` as a typed array. No new Zod schema is
introduced; `PlaywrightTilerConfig` validation lives in
`@aguspe/tiler-playwright/options.ts` (the
`PlaywrightTilerConfigSchema` exported there). The server can re-run
that schema on each `dashboards` entry as a defensive check, but
since the entries are typed in TS at the call site and the bridge
function will throw on malformed shapes, schema validation is
optional and skipped for v1. (Documented as such; revisit if real
users hit unhelpful runtime errors.)

## Testing strategy

Three new vitest suites; no existing tests change.

1. **`packages/core/src/presets/registry.test.ts`** —
   `getPreset("test_automation")` returns a function;
   `getPreset("missing")` returns `undefined`. Listing all keys
   returns `["test_automation"]` for v1. Pure unit.
2. **`packages/core/src/presets/playwright-config.test.ts`** —
   given a `PlaywrightTilerConfig`, returns a correctly-shaped
   `PresetOutput`:
   - dashboard fields filled (id, created_at, updated_at).
   - panels have ULID ids, dashboard_id wired, timestamps filled.
   - panels with omitted `y` are auto-placed below explicit-y panels.
   - panels with `data_source_slug` resolve to the matching source's
     id.
   - data sources materialize from the `DataSourceInput` shape with
     fresh ids and timestamps.
   - throws on unknown `data_source_slug`.
   Mirrors the existing reporter resolver tests where applicable.
3. **`packages/server/src/seed.test.ts`** — given an in-memory
   `MemoryStore`:
   - First boot with `presets: ["test_automation"]` populates the
     store.
   - Second boot with the same config skips (idempotency).
   - Config with `dashboards: [dash]` populates from the inline
     config.
   - Config with one preset and one dashboard sharing a slug throws.
   - Unknown preset name throws.
   - Custom dashboard's `dataSources[].collect` is ignored at seed
     time (collected records do NOT appear in the store).

## Versioning

- `@aguspe/tiler-core` → 1.3.0 (minor — new `dashboards` field on
  `TilerConfig`; new exports `getPreset`,
  `playwrightConfigToPresetOutput`).
- `@aguspe/tiler-server` → 1.1.0 (minor — new feature: seeds
  dashboards on boot).
- `@aguspe/tiler-playwright` and `@aguspe/tiler-widgets` and
  `@aguspe/tiler-viewer` — unchanged. The playwright package's
  `PlaywrightTilerConfig` type is imported by core as type-only, so
  no runtime dep cycle.

## Documentation

- New page `docs/site/docs/server/seeding.md` covering the two seed
  paths (built-in by name, user-defined by import), the seed-once
  policy, what to do when you want to re-seed (manual delete + boot),
  and an explicit note that `collect()` hooks are ignored on the
  server.
- README in `@aguspe/tiler-server` gains a short "Seeded dashboards"
  section linking the new page.

## Risks

- **`DashboardConfig` and `PlaywrightTilerConfig` can drift.** Core's
  `DashboardConfig` is declared standalone to avoid inverting the dep
  direction. The two are structurally identical today; nothing
  enforces they stay so. Mitigation: a vitest assertion in
  `playwright-config.test.ts` that the playwright export is structurally
  assignable to the core type. If the playwright shape evolves, the
  test fails and someone has to update both deliberately.
- **Config-only edits to a seeded dashboard never apply.** A user who
  edits `tiler.config.ts` and restarts the server expects the change
  to land. Today: it does not (seed-once policy). The README and
  Docusaurus page document this prominently. A follow-up
  `tiler reseed <slug>` CLI command is the intended path; out of
  scope here.
- **Slug uniqueness across the deployment.** If a user runs two
  servers against the same database (multi-process), and both attempt
  to seed at the same time, both may pass the `getDashboardBySlug`
  check and one upsert will fail. Acceptable for v1 — Tiler is
  single-process by design (see existing `tiler-server` docs). A
  future migration to a Postgres-backed store can add row-level locks
  if needed.
