# Tiler-Playwright Extensible Config — Design

Status: approved
Owner: @aguspe
Date: 2026-05-03

## Problem

`@aguspe/tiler-playwright` is the on-ramp for Playwright users into Tiler.
Today it is a sealed pipe: the reporter calls `testAutomationPreset()`
unconditionally and writes a fixed dashboard. Two reporter options that
hint at extension (`preset`, `customConfig`) are declared in `options.ts`
but never read in `reporter.ts:74`. Registering a custom widget via
`defineWidget(...)` does not place that widget on the dashboard either,
because panels come from the preset, not the registry.

The product goal is "switch from the Playwright HTML reporter to Tiler
with one command or one configuration change, and get the test-automation
preset *plus* all other Tiler features". Today only the first half works.

## Goals

In scope:

- Append extra panels to the preset's dashboard.
- Add extra data sources beyond `test_runs`, populated by a user-supplied
  async hook.
- Register custom widgets — i.e., user `defineWidget(...)` calls take
  effect on the rendered report.
- Keep zero-config users at zero config: an empty reporter options block
  produces today's report, byte-equivalent.

Nice-to-have, not in this spec:

- Replacing or modifying preset panels in place (use `excludePanels` to
  drop, then append a replacement).
- Switching to a non-`test_automation` preset.

Out of scope:

- Multi-dashboard / tabbed reports.
- A `tiler init` CLI scaffolder.
- Any change to `@aguspe/tiler-core`'s server-shaped `defineConfig`.

## User-facing API

Two surfaces, one schema.

### Inline reporter options

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    ["@aguspe/tiler-playwright", {
      outDir: "tiler-report",
      excludePanels: ["Pass Rate"],
      panels: [
        { widget_type: "flaky_tests", x: 0, width: 6, height: 4,
          config: { window: 30 }, title: "Flaky last 30 runs" },
      ],
      // dataSources/widgets/dashboard accepted here too
    }],
  ],
  use: { screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
});
```

### Separate config file

```ts
// playwright.config.ts
reporter: [["@aguspe/tiler-playwright", { config: "./tiler.config.ts" }]],

// tiler.config.ts
import { definePlaywrightConfig } from "@aguspe/tiler-playwright";
import "./widgets/flaky-tests";   // side-effect: defineWidget(...)
import { coverageSource } from "./coverage/source";

export default definePlaywrightConfig({
  excludePanels: ["Pass Rate"],
  panels: [
    { widget_type: "flaky_tests", x: 0, width: 6, height: 4,
      config: { window: 30 }, title: "Flaky last 30 runs" },
  ],
  dataSources: [{
    source: coverageSource,
    collect: async ({ outDir }) => readCoverageRecordsFrom(outDir),
  }],
});
```

When both `config:` and inline fields are passed, the merge is
shallow-per-key, with inline values appended/overlaid on the file's
config (`excludePanels` concat, `panels` concat, `dataSources` concat,
`dashboard` shallow-merge). No precedence ladder — both work.

## Types

```ts
export interface PlaywrightTilerConfig {
  /** Preset to seed the dashboard. Default "test_automation". */
  preset?: "test_automation";

  /** Drop preset panels by exact title before merging user panels. */
  excludePanels?: string[];

  /** Extra panels appended after preset panels. `y` is optional —
   *  omitted panels are auto-placed below the lowest preset panel. */
  panels?: UserPanel[];

  /** Extra data sources alongside the preset's `test_runs`.
   *  `collect()` runs at the end of the test run and its returned
   *  records are merged into the snapshot. */
  dataSources?: Array<{
    source: DataSourceInput;
    collect: (ctx: CollectContext) => Promise<DataRecord[]>;
  }>;

  /** Override dashboard metadata. */
  dashboard?: { name?: string; slug?: string; description?: string };
}

export interface UserPanel
  extends Omit<Panel,
    "id" | "dashboard_id" | "data_source_id" |
    "created_at" | "updated_at" | "y"> {
  y?: number;                    // optional — auto-placed if absent
  data_source_id?: string;       // explicit binding
  data_source_slug?: string;     // alternate binding by slug
}

export interface CollectContext {
  outDir: string;                // resolved absolute path
  startedAt: Date;
  endedAt: Date;
}

export function definePlaywrightConfig(
  c: PlaywrightTilerConfig,
): PlaywrightTilerConfig;
```

`DataSource`, `DataRecord`, and `Panel` come from `@aguspe/tiler-core` and
are unchanged.

## Architecture

The new code is a single resolver module in the playwright package. Core
is untouched.

```
packages/playwright/
├── src/
│   ├── config-resolver.ts     [new] preset + user config → snapshot input
│   ├── define-config.ts       [new] identity helper, typed surface
│   ├── options.ts             [edit] extend Zod schema with inline fields
│   ├── reporter.ts            [edit] delegate to resolver, run collectors
│   └── *.test.ts              [edit/new] vitest coverage per file
examples/playwright-extended/  [new] working copy-paste template
```

`@aguspe/tiler-playwright` gains one runtime dep: `jiti ^2`. It is
imported lazily — only when `config:` is set — so users who stay inline
pay no install cost beyond the dep listing.

### Why a separate `definePlaywrightConfig` (not an extension of core's `defineConfig`)

`@aguspe/tiler-core`'s `defineConfig` is server-shaped (`store`, `port`,
`auth`, etc.). Static-report extensibility is a different audience and a
different surface; sharing a name across two products would force users
to read the docs to know which keys apply where. Two helpers, one each.

## Resolver semantics

`resolveConfig({ rawOpts, presetFactory, startedAt }) → ResolvedSnapshotInput`

Order of operations:

1. **Build preset.** Call `testAutomationPreset({ now: startedAt })`.
   `preset` is currently fixed to `"test_automation"`; the field exists
   so a future second preset can ship without breaking call sites.
2. **Apply `dashboard` overrides.** Shallow-merge `{ name, slug,
   description }` onto preset dashboard.
3. **Exclude preset panels.** Filter out panels whose `title` is in
   `excludePanels`. Unknown titles → `console.warn`, do not throw.
4. **Resolve user-panel data-source binding.** For each user panel:
   - Explicit `data_source_id` wins.
   - Else `data_source_slug` → look up in
     `[preset.dataSources, ...userSources]`; throw if not found.
   - Else default to preset's `test_runs` source.
5. **Auto-place panels with omitted `y`.** Compute
   `nextY = max(0, ...keptPresetPanels.map(p => p.y + p.height))`.
   Walk user panels in declaration order: if `y` is omitted set
   `y = nextY` and advance `nextY += panel.height`. Panels with explicit
   `y` are placed verbatim and do not move the cursor.
6. **Fill ID + timestamps.** For each user panel, set `id = newId()`,
   `dashboard_id = dashboard.id`,
   `created_at = updated_at = startedAt.toISOString()`.
7. **Concatenate data sources.**
   `[...preset.dataSources, ...userSources.map(u => u.source)]`. Slug
   uniqueness is validated; duplicates throw.
8. **Stash collectors.** Map `{ sourceId → collect }` returned alongside
   the resolved snapshot input.

### Collector execution at `onEnd`

```ts
for (const [sourceId, collect] of collectors) {
  const records = await collect({ outDir, startedAt, endedAt })
    .catch((err) => {
      console.warn(`[tiler-playwright] collect() for ${sourceId} threw:`, err);
      return [];
    });
  this.records.push(
    ...records.map((r) => ({ ...r, data_source_id: sourceId }))
  );
}
```

A throwing `collect()` does not abort the report — it warns and produces
zero records for that source. Records have their `data_source_id`
overwritten so users cannot accidentally bind a coverage record to
`test_runs`.

## Validation

`PlaywrightTilerConfigSchema` (Zod) lives in `options.ts`:

```ts
// DataSource minus resolver-managed fields, with id optional.
const DataSourceInputSchema = DataSource
  .omit({ id: true, created_at: true, updated_at: true })
  .extend({ id: z.string().optional() });

const UserPanelSchema = z.object({
  widget_type: z.string().min(1),
  title: z.string().min(1),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).optional(),
  width: z.number().int().min(1).max(12),
  height: z.number().int().min(1),
  config: z.record(z.unknown()).default({}),
  data_source_id: z.string().optional(),
  data_source_slug: z.string().optional(),
});

const PlaywrightTilerConfigSchema = z.object({
  preset: z.enum(["test_automation"]).default("test_automation"),
  excludePanels: z.array(z.string()).default([]),
  panels: z.array(UserPanelSchema).default([]),
  dataSources: z.array(z.object({
    source: DataSourceInputSchema,
    collect: z.function().args(/* ctx */)
                         .returns(z.promise(z.array(DataRecord))),
  })).default([]),
  dashboard: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

const ReporterOptionsSchema = PlaywrightTilerConfigSchema.extend({
  outDir: z.string().min(1).default("tiler-report"),
  config: z.string().optional(),
  customConfig: z.string().optional(),    // deprecated alias for `config`
  captureLogs: z.boolean().default(false),
  linkTraceFiles: z.boolean().default(true),
  open: z.boolean().default(false),
});
```

`preset` stays a Zod enum (not `z.string()`) so an unknown preset name
fails early. Lift to `z.string()` when a second preset ships.

## Error handling

Fatal — throw, abort the report:

- Unknown `data_source_slug` referenced from a panel.
- Duplicate data-source slug after merge.
- Panel `widget_type` not in registry at snapshot-build time (existing
  behavior).
- `config:` path is set but the file does not exist, does not
  `export default`, or its export fails Zod validation.

Non-fatal — warn to stderr, continue:

- `excludePanels` references a title not present in the preset.
- `collect()` throws.
- Both `config:` and inline fields are set — informational only.

## Backward compatibility

- Existing `outDir`, `preset`, `captureLogs`, `linkTraceFiles`, `open`
  options keep their current behavior.
- `customConfig` is renamed to `config`. `customConfig` is accepted for
  one minor version as a deprecated alias and emits a stderr warning.
- An empty options block produces today's report, byte-equivalent. The
  spec's first acceptance test pins this with a snapshot diff.

## Testing strategy

Six vitest suites. Pure unit where possible; one fs round-trip for
`jiti`.

1. **`config-resolver.test.ts`** — auto-place math (mixed explicit /
   omitted `y`), exclusion (known + unknown titles), slug resolution
   (preset source, user source, missing → throw), dashboard merge,
   duplicate-slug throw. No fs.
2. **`define-config.test.ts`** — type round-trip, helper is identity.
3. **`options.test.ts`** — extends existing; covers Zod errors for
   malformed inline panels, deprecated `customConfig` alias warning.
4. **`reporter.test.ts`** — extends existing; asserts `onEnd` invokes
   collectors, merges records, and a throwing `collect()` does not abort
   the report.
5. **`config-loader.test.ts`** — `jiti` round-trip with a fixture
   `tiler.config.ts` under `__fixtures__/`. Covers the
   `export default`-missing fatal.
6. **`record-builder.test.ts`** — unchanged, kept as smoke.

`examples/playwright-extended/` is a pnpm workspace package that runs
under the existing `tiler-ts-e2e` style: a small spec suite with one
intentional failure, a custom widget, and a fake coverage `collect()`.
Its output report is asserted against a snapshot of `snapshot.json`
(stripped of timestamps and ULIDs).

## Versioning

- `@aguspe/tiler-playwright` → 1.2.0 (additive, minor bump).
- `@aguspe/tiler-widgets`, `@aguspe/tiler-viewer` — unchanged. They do
  not need to know about user config.

## Documentation

- `packages/playwright/README.md` — new "Extending the dashboard"
  section; mirrors the example in this spec.
- `docs/site/docs/playwright/extending.md` — Docusaurus page covering the
  three extension axes (panels, data sources, widgets), the auto-place
  rules, and the `excludePanels` warning behavior.
- `examples/playwright-extended/README.md` — short pointer plus
  `npm test` invocation.

## Risks

- **`jiti` install footprint.** ~50KB and a transitive of `acorn`. Lazy
  import keeps inline-only users free, but the dep is still listed in
  `package.json`. Acceptable — `jiti` is what nuxt/c12/nitro use and
  Playwright users already pay for `acorn` via Playwright's own runtime.
- **Auto-place ergonomics.** Mixing explicit and omitted `y` may surprise
  users (the cursor doesn't advance for explicit `y`). Documented in the
  Docusaurus page with a worked example showing both flows side-by-side.
- **Title-based `excludePanels`.** Renaming a preset panel breaks user
  configs that exclude it. Mitigated by the unknown-title warning and a
  semver promise: panel titles are part of the public preset surface.
