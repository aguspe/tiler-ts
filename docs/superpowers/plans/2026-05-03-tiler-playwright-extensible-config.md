# Tiler-Playwright Extensible Config — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@aguspe/tiler-playwright` extensible so Playwright users can append panels, add data sources with async `collect()` hooks, register custom widgets, and override dashboard metadata, while keeping the existing `test_automation` preset as the zero-config default.

**Architecture:** A new resolver module in the playwright package merges the `test_automation` preset with user config (passed inline as reporter options or via `tiler.config.ts` loaded with `jiti`). The resolver hands the merged `{dashboard, dataSources, panels}` plus a collector map to the reporter, which invokes collectors during `onEnd` and feeds everything to the existing `buildSnapshot`. No changes to `@aguspe/tiler-core`.

**Tech Stack:** TypeScript, Zod, Vitest, pnpm workspaces, tsup, jiti (new runtime dep).

**Spec:** `docs/superpowers/specs/2026-05-03-tiler-playwright-extensible-config-design.md`

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `packages/playwright/package.json` | modify | Add `jiti` dep; bump version to 1.2.0 in the release task. |
| `packages/playwright/src/define-config.ts` | create | `definePlaywrightConfig()` identity helper + types (`PlaywrightTilerConfig`, `PanelInput`, `CollectContext`). |
| `packages/playwright/src/define-config.test.ts` | create | Type round-trip + identity behavior. |
| `packages/playwright/src/options.ts` | modify | Extend Zod schema with inline `panels`, `dataSources`, `excludePanels`, `dashboard`, `config`, `widgets`; deprecated `customConfig` alias. |
| `packages/playwright/src/options.test.ts` | modify | Add coverage for new fields and the `customConfig` alias. |
| `packages/playwright/src/config-resolver.ts` | create | Pure merge logic: preset + user config → `{dashboard, dataSources, panels, collectors}`. |
| `packages/playwright/src/config-resolver.test.ts` | create | Resolver behavior — exclusion, append, auto-place, slug resolution, dashboard merge, dup-source throw, collision merge. |
| `packages/playwright/src/config-loader.ts` | create | `jiti`-backed loader for a `tiler.config.ts` file path; throws on missing default export. |
| `packages/playwright/src/config-loader.test.ts` | create | Round-trip with a fixture file under `__fixtures__/`. |
| `packages/playwright/src/__fixtures__/valid-config.ts` | create | Minimal config used by the loader test. |
| `packages/playwright/src/__fixtures__/no-default-export.ts` | create | Fixture for the missing-default-export error path. |
| `packages/playwright/src/reporter.ts` | modify | Delegate to resolver; invoke collectors at `onEnd`; rebind their records' `data_source_id`; keep deprecated-alias warn. |
| `packages/playwright/src/reporter.test.ts` | modify | Add: extra panel renders, collector records merged, throwing collector warns + report still writes, `customConfig` alias still works. |
| `packages/playwright/src/index.ts` | modify | Re-export `definePlaywrightConfig` and the public types. |
| `examples/playwright-extended/package.json` | create | New workspace package. |
| `examples/playwright-extended/playwright.config.ts` | create | Reporter with `config: "./tiler.config.ts"`. |
| `examples/playwright-extended/tiler.config.ts` | create | Defines a `flaky_tests` widget, an extra panel, a coverage data source with a `collect()` hook reading from `coverage.json`. |
| `examples/playwright-extended/widgets/flaky-tests.tsx` | create | A custom widget registered via `defineWidget`. |
| `examples/playwright-extended/tests/example.spec.ts` | create | Two passing tests + one intentional failure. |
| `examples/playwright-extended/coverage.json` | create | Static coverage payload the `collect()` hook reads. |
| `examples/playwright-extended/README.md` | create | One-page pointer + run instructions. |
| `examples/playwright-extended/tsconfig.json` | create | Inherit from root tsconfig. |
| `packages/playwright/README.md` | modify | New "Extending the dashboard" section with the same example as the spec. |
| `docs/site/docs/playwright/extending.md` | create | Docusaurus page covering panels, data sources, widgets, auto-place rules, `excludePanels` warning. |

---

## Task 1: Add `jiti` dependency

**Files:**
- Modify: `packages/playwright/package.json`

- [ ] **Step 1: Add `jiti` to dependencies**

Edit `packages/playwright/package.json`. In the `"dependencies"` block, add `"jiti": "^2.4.0"` between `"@aguspe/tiler-widgets"` and `"react"` (alphabetical order):

```json
"dependencies": {
  "@aguspe/tiler-core": "workspace:*",
  "@aguspe/tiler-viewer": "workspace:*",
  "@aguspe/tiler-widgets": "workspace:*",
  "jiti": "^2.4.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "zod": "^3.23.0"
},
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: lockfile updates, `jiti` added; existing scripts still work.

- [ ] **Step 3: Commit**

```bash
git add packages/playwright/package.json pnpm-lock.yaml
git commit -m "chore(playwright): add jiti runtime dep for config-file loader"
```

---

## Task 2: Public types + `definePlaywrightConfig` helper

**Files:**
- Create: `packages/playwright/src/define-config.ts`
- Create: `packages/playwright/src/define-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/playwright/src/define-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { definePlaywrightConfig } from "./define-config";

describe("definePlaywrightConfig", () => {
  it("is an identity function (returns its input)", () => {
    const cfg = { excludePanels: ["Pass Rate"] };
    expect(definePlaywrightConfig(cfg)).toBe(cfg);
  });

  it("accepts a fully empty object", () => {
    expect(definePlaywrightConfig({})).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aguspe/tiler-playwright test -- define-config`
Expected: FAIL — module `./define-config` cannot be found.

- [ ] **Step 3: Write the implementation**

Create `packages/playwright/src/define-config.ts`:

```ts
import type { DataRecord, DataSource, Panel } from "@aguspe/tiler-core";

export interface PlaywrightTilerConfig {
  /** Preset to seed the dashboard. Default "test_automation". */
  preset?: "test_automation";

  /** Drop preset panels by exact title before merging user panels. */
  excludePanels?: string[];

  /** Extra panels appended after preset panels. `y` is optional —
   *  omitted panels are auto-placed below the lowest preset panel. */
  panels?: PanelInput[];

  /** Extra data sources alongside the preset's `test_runs`.
   *  `collect()` runs at the end of the test run; its returned records
   *  are merged into the snapshot, with `data_source_id` rebound to the
   *  source you provided here. */
  dataSources?: Array<{
    source: DataSource;
    collect: (ctx: CollectContext) => Promise<DataRecord[]>;
  }>;

  /** Override dashboard metadata. */
  dashboard?: { name?: string; slug?: string; description?: string };
}

export interface PanelInput
  extends Omit<
    Panel,
    "id" | "dashboard_id" | "data_source_id" | "created_at" | "updated_at" | "y"
  > {
  /** Optional — auto-placed below the preset panels if absent. */
  y?: number;
  /** Explicit binding to a data source. Wins over `data_source_slug`. */
  data_source_id?: string;
  /** Alternate binding by slug — looked up in preset + user sources. */
  data_source_slug?: string;
}

export interface CollectContext {
  outDir: string;
  startedAt: Date;
  endedAt: Date;
}

export function definePlaywrightConfig(
  c: PlaywrightTilerConfig,
): PlaywrightTilerConfig {
  return c;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aguspe/tiler-playwright test -- define-config`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/define-config.ts packages/playwright/src/define-config.test.ts
git commit -m "feat(playwright): add definePlaywrightConfig helper and public types"
```

---

## Task 3: Re-export new public surface from package entrypoint

**Files:**
- Modify: `packages/playwright/src/index.ts`

- [ ] **Step 1: Edit `index.ts`**

Replace the file contents with:

```ts
export const TILER_PLAYWRIGHT_VERSION = "0.0.1" as const;
export { default } from "./reporter";
export { default as TilerReporter } from "./reporter";
export type { TilerReporterOptions } from "./reporter";
export { definePlaywrightConfig } from "./define-config";
export type {
  PlaywrightTilerConfig,
  PanelInput,
  CollectContext,
} from "./define-config";
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @aguspe/tiler-playwright typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/playwright/src/index.ts
git commit -m "feat(playwright): export definePlaywrightConfig from package entry"
```

---

## Task 4: Extend `options.ts` with the inline schema

**Files:**
- Modify: `packages/playwright/src/options.ts`
- Modify: `packages/playwright/src/options.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace `packages/playwright/src/options.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { ReporterOptions } from "./options";

describe("ReporterOptions", () => {
  it("applies all defaults when nothing provided", () => {
    const opts = ReporterOptions.parse({});
    expect(opts.outDir).toBe("tiler-report");
    expect(opts.preset).toBe("test_automation");
    expect(opts.captureLogs).toBe(false);
    expect(opts.linkTraceFiles).toBe(true);
    expect(opts.excludePanels).toEqual([]);
    expect(opts.panels).toEqual([]);
    expect(opts.dataSources).toEqual([]);
    expect(opts.config).toBeUndefined();
    expect(opts.customConfig).toBeUndefined();
  });

  it("accepts both relative and absolute outDir", () => {
    expect(ReporterOptions.safeParse({ outDir: "report" }).success).toBe(true);
    expect(ReporterOptions.safeParse({ outDir: "/tmp/report" }).success).toBe(true);
  });

  it("rejects an empty outDir", () => {
    expect(ReporterOptions.safeParse({ outDir: "" }).success).toBe(false);
  });

  it("accepts inline panels with optional y", () => {
    const r = ReporterOptions.safeParse({
      panels: [
        { widget_type: "metric", title: "Custom", x: 0, width: 3, height: 2, config: {} },
        { widget_type: "metric", title: "Other",  x: 0, y: 8, width: 3, height: 2, config: {} },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects panels missing required fields", () => {
    const r = ReporterOptions.safeParse({
      panels: [{ widget_type: "metric", title: "Bad", x: 0, height: 2 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown preset name", () => {
    expect(ReporterOptions.safeParse({ preset: "made_up" }).success).toBe(false);
  });

  it("accepts a config file path string", () => {
    const r = ReporterOptions.safeParse({ config: "./tiler.config.ts" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.config).toBe("./tiler.config.ts");
  });

  it("accepts the deprecated customConfig alias", () => {
    const r = ReporterOptions.safeParse({ customConfig: "./old.config.ts" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.customConfig).toBe("./old.config.ts");
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- options`
Expected: 5 of the 8 tests FAIL (the 3 originals still pass).

- [ ] **Step 3: Replace `options.ts`**

Replace the contents of `packages/playwright/src/options.ts` with:

```ts
import { DataRecord, DataSource } from "@aguspe/tiler-core";
import { z } from "zod";

const PanelInputSchema = z.object({
  widget_type: z.string().min(1),
  title: z.string().min(1).max(200),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).optional(),
  width: z.number().int().min(1).max(12),
  height: z.number().int().min(1).max(12),
  config: z.record(z.unknown()).default({}),
  data_source_id: z.string().optional(),
  data_source_slug: z.string().optional(),
});

export type PanelInputParsed = z.infer<typeof PanelInputSchema>;

const DataSourceWithCollectSchema = z.object({
  source: DataSource,
  collect: z
    .function()
    .args(z.any())
    .returns(z.promise(z.array(DataRecord))),
});

export const ReporterOptions = z.object({
  /** Output directory. Relative paths resolve against `process.cwd()`. */
  outDir: z.string().min(1).default("tiler-report"),
  /** Preset to seed the dashboard. Currently only "test_automation". */
  preset: z.enum(["test_automation"]).default("test_automation"),
  /** Drop preset panels by exact title before merging user panels. */
  excludePanels: z.array(z.string()).default([]),
  /** Extra panels appended to the dashboard. */
  panels: z.array(PanelInputSchema).default([]),
  /** Extra data sources, each with an async `collect()` hook. */
  dataSources: z.array(DataSourceWithCollectSchema).default([]),
  /** Override dashboard metadata (name/slug/description). */
  dashboard: z
    .object({
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  /** Path to a tiler.config.ts. Loaded with jiti. */
  config: z.string().optional(),
  /** @deprecated — use `config` instead. Kept for one minor version. */
  customConfig: z.string().optional(),
  /** Capture stdout/stderr per test. */
  captureLogs: z.boolean().default(false),
  /** Link to Playwright's trace.zip files in the report. */
  linkTraceFiles: z.boolean().default(true),
  /** Open the HTML report when the run ends. */
  open: z.boolean().default(false),
});

export type ReporterOptions = z.infer<typeof ReporterOptions>;
```

- [ ] **Step 4: Run tests to verify they all pass**

Run: `pnpm --filter @aguspe/tiler-playwright test -- options`
Expected: 8 PASS.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @aguspe/tiler-playwright typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/playwright/src/options.ts packages/playwright/src/options.test.ts
git commit -m "feat(playwright): extend ReporterOptions with inline panels, dataSources, config path"
```

---

## Task 5: Resolver skeleton + zero-config preset passthrough

**Files:**
- Create: `packages/playwright/src/config-resolver.ts`
- Create: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/playwright/src/config-resolver.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { testAutomationPreset } from "@aguspe/tiler-core";
import { resolveConfig } from "./config-resolver";

const NOW = new Date("2026-05-03T00:00:00.000Z");

function baseOpts() {
  return {
    outDir: "tiler-report",
    preset: "test_automation" as const,
    excludePanels: [],
    panels: [],
    dataSources: [],
    captureLogs: false,
    linkTraceFiles: true,
    open: false,
  };
}

describe("resolveConfig — zero config", () => {
  it("returns the preset's panels and data sources unchanged", () => {
    const preset = testAutomationPreset({ now: NOW });
    const r = resolveConfig({ rawOpts: baseOpts(), startedAt: NOW });

    expect(r.dashboard.slug).toBe(preset.dashboard.slug);
    expect(r.panels).toHaveLength(preset.panels.length);
    expect(r.dataSources.map((d) => d.slug)).toEqual(
      preset.dataSources.map((d) => d.slug),
    );
    expect(r.collectors.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: FAIL — `./config-resolver` not found.

- [ ] **Step 3: Implement minimum resolver**

Create `packages/playwright/src/config-resolver.ts`:

```ts
import {
  type DataRecord,
  type DataSource,
  type Dashboard,
  type Panel,
  testAutomationPreset,
} from "@aguspe/tiler-core";
import type { CollectContext } from "./define-config";
import type { ReporterOptions } from "./options";

export interface ResolvedConfig {
  dashboard: Dashboard;
  dataSources: DataSource[];
  panels: Panel[];
  /** sourceId → collect hook. Reporter invokes these in onEnd. */
  collectors: Map<string, (ctx: CollectContext) => Promise<DataRecord[]>>;
}

export interface ResolveConfigArgs {
  rawOpts: ReporterOptions;
  startedAt: Date;
}

export function resolveConfig({
  rawOpts,
  startedAt,
}: ResolveConfigArgs): ResolvedConfig {
  const preset = testAutomationPreset({ now: startedAt });
  return {
    dashboard: preset.dashboard,
    dataSources: preset.dataSources,
    panels: preset.panels,
    collectors: new Map(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright): add config-resolver with zero-config preset passthrough"
```

---

## Task 6: Resolver — exclude preset panels by title

**Files:**
- Modify: `packages/playwright/src/config-resolver.ts`
- Modify: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `packages/playwright/src/config-resolver.test.ts`:

```ts
describe("resolveConfig — excludePanels", () => {
  const NOW = new Date("2026-05-03T00:00:00.000Z");
  function opts(extra: Partial<ReturnType<typeof baseOpts>> = {}) {
    return { ...baseOpts(), ...extra };
  }

  it("drops preset panels whose title matches", () => {
    const r = resolveConfig({
      rawOpts: opts({ excludePanels: ["Pass Rate", "Skipped"] }),
      startedAt: NOW,
    });
    const titles = r.panels.map((p) => p.title);
    expect(titles).not.toContain("Pass Rate");
    expect(titles).not.toContain("Skipped");
    expect(r.panels.length).toBe(testAutomationPreset({ now: NOW }).panels.length - 2);
  });

  it("warns but does not throw when an exclude title is unknown", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = resolveConfig({
      rawOpts: opts({ excludePanels: ["Pass Rate", "Does Not Exist"] }),
      startedAt: NOW,
    });
    expect(r.panels.map((p) => p.title)).not.toContain("Pass Rate");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Does Not Exist"),
    );
    warn.mockRestore();
  });
});
```

Add to the imports at the top: `import { vi } from "vitest";` (replace the existing vitest import line).

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: 2 new tests FAIL.

- [ ] **Step 3: Implement exclusion in the resolver**

Replace the body of `resolveConfig` in `packages/playwright/src/config-resolver.ts` with:

```ts
export function resolveConfig({
  rawOpts,
  startedAt,
}: ResolveConfigArgs): ResolvedConfig {
  const preset = testAutomationPreset({ now: startedAt });

  const excludeSet = new Set(rawOpts.excludePanels);
  const presetTitles = new Set(preset.panels.map((p) => p.title));
  for (const t of excludeSet) {
    if (!presetTitles.has(t)) {
      console.warn(
        `[tiler-playwright] excludePanels: "${t}" did not match any preset panel`,
      );
    }
  }
  const keptPanels = preset.panels.filter((p) => !excludeSet.has(p.title));

  return {
    dashboard: preset.dashboard,
    dataSources: preset.dataSources,
    panels: keptPanels,
    collectors: new Map(),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS (3 total).

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright/resolver): exclude preset panels by title with warn-on-miss"
```

---

## Task 7: Resolver — append user panels with explicit `y`

**Files:**
- Modify: `packages/playwright/src/config-resolver.ts`
- Modify: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
describe("resolveConfig — append panels (explicit y)", () => {
  const NOW = new Date("2026-05-03T00:00:00.000Z");

  it("appends user panels with id/dashboard_id/timestamps filled", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Custom",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
          },
        ],
      },
      startedAt: NOW,
    });
    const last = r.panels[r.panels.length - 1]!;
    expect(last.title).toBe("Custom");
    expect(last.dashboard_id).toBe(r.dashboard.id);
    expect(last.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(last.created_at).toBe(NOW.toISOString());
    expect(last.updated_at).toBe(NOW.toISOString());
  });

  it("defaults a panel's data_source_id to the preset's test_runs source", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Custom",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
          },
        ],
      },
      startedAt: NOW,
    });
    const last = r.panels[r.panels.length - 1]!;
    const testRuns = r.dataSources.find((d) => d.slug === "test_runs");
    expect(testRuns).toBeDefined();
    expect(last.data_source_id).toBe(testRuns!.id);
  });

  it("uses an explicit data_source_id when provided", () => {
    const explicitId = "01HEXPLICITDATASOURCEIDXX";
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Custom",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_id: explicitId,
          },
        ],
      },
      startedAt: NOW,
    });
    expect(r.panels[r.panels.length - 1]!.data_source_id).toBe(explicitId);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Add panel append to the resolver**

Add at the top of `packages/playwright/src/config-resolver.ts` (alongside other imports):

```ts
import { newId } from "@aguspe/tiler-core";
```

Below the `keptPanels` line in `resolveConfig`, before the `return`, add:

```ts
  const iso = startedAt.toISOString();
  const testRuns = preset.dataSources.find((d) => d.slug === "test_runs");

  const userPanels: Panel[] = rawOpts.panels.map((p) => {
    const dataSourceId =
      p.data_source_id ??
      (testRuns ? testRuns.id : null);
    if (!dataSourceId) {
      throw new Error(
        `[tiler-playwright] panel "${p.title}" needs a data_source_id (no preset test_runs source available)`,
      );
    }
    return {
      id: newId(),
      dashboard_id: preset.dashboard.id,
      data_source_id: dataSourceId,
      title: p.title,
      widget_type: p.widget_type,
      x: p.x,
      y: p.y ?? 0, // auto-place comes in the next task
      width: p.width,
      height: p.height,
      config: p.config,
      created_at: iso,
      updated_at: iso,
    };
  });
```

Replace the existing `panels: keptPanels,` line in the return with:

```ts
    panels: [...keptPanels, ...userPanels],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS (6 total).

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright/resolver): append user panels and bind to test_runs by default"
```

---

## Task 8: Resolver — auto-place panels with omitted `y`

**Files:**
- Modify: `packages/playwright/src/config-resolver.ts`
- Modify: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
describe("resolveConfig — auto-place", () => {
  const NOW = new Date("2026-05-03T00:00:00.000Z");

  it("places a panel with omitted y below the lowest preset panel", () => {
    const preset = testAutomationPreset({ now: NOW });
    const presetMaxY = Math.max(...preset.panels.map((p) => p.y + p.height));

    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "Auto Placed",
            x: 0,
            width: 3,
            height: 2,
            config: {},
          },
        ],
      },
      startedAt: NOW,
    });
    const placed = r.panels.find((p) => p.title === "Auto Placed")!;
    expect(placed.y).toBe(presetMaxY);
  });

  it("advances the cursor for each auto-placed panel; explicit y panels do not advance it", () => {
    const preset = testAutomationPreset({ now: NOW });
    const presetMaxY = Math.max(...preset.panels.map((p) => p.y + p.height));

    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          { widget_type: "metric", title: "Auto1", x: 0, width: 3, height: 2, config: {} },
          { widget_type: "metric", title: "Pinned", x: 0, y: 100, width: 3, height: 2, config: {} },
          { widget_type: "metric", title: "Auto2", x: 0, width: 3, height: 4, config: {} },
        ],
      },
      startedAt: NOW,
    });
    const a1 = r.panels.find((p) => p.title === "Auto1")!;
    const pin = r.panels.find((p) => p.title === "Pinned")!;
    const a2 = r.panels.find((p) => p.title === "Auto2")!;
    expect(a1.y).toBe(presetMaxY);
    expect(pin.y).toBe(100);
    expect(a2.y).toBe(presetMaxY + 2); // advanced by Auto1's height only
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: 2 new tests FAIL — they get `y=0` from the placeholder.

- [ ] **Step 3: Replace the user-panel mapping in the resolver**

In `packages/playwright/src/config-resolver.ts`, replace the entire `const userPanels: Panel[] = rawOpts.panels.map(...)` block with:

```ts
  const presetMaxY = keptPanels.length
    ? Math.max(...keptPanels.map((p) => p.y + p.height))
    : 0;
  let cursorY = presetMaxY;

  const userPanels: Panel[] = rawOpts.panels.map((p) => {
    const dataSourceId =
      p.data_source_id ?? (testRuns ? testRuns.id : null);
    if (!dataSourceId) {
      throw new Error(
        `[tiler-playwright] panel "${p.title}" needs a data_source_id (no preset test_runs source available)`,
      );
    }
    let y: number;
    if (p.y !== undefined) {
      y = p.y;
    } else {
      y = cursorY;
      cursorY += p.height;
    }
    return {
      id: newId(),
      dashboard_id: preset.dashboard.id,
      data_source_id: dataSourceId,
      title: p.title,
      widget_type: p.widget_type,
      x: p.x,
      y,
      width: p.width,
      height: p.height,
      config: p.config,
      created_at: iso,
      updated_at: iso,
    };
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS (8 total).

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright/resolver): auto-place panels with omitted y below preset"
```

---

## Task 9: Resolver — `data_source_slug` resolution and missing-slug error

**Files:**
- Modify: `packages/playwright/src/config-resolver.ts`
- Modify: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
describe("resolveConfig — data_source_slug", () => {
  const NOW = new Date("2026-05-03T00:00:00.000Z");

  it("resolves a slug that exists in the preset", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        panels: [
          {
            widget_type: "metric",
            title: "ViaSlug",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_slug: "test_runs",
          },
        ],
      },
      startedAt: NOW,
    });
    const placed = r.panels.find((p) => p.title === "ViaSlug")!;
    const testRuns = r.dataSources.find((d) => d.slug === "test_runs")!;
    expect(placed.data_source_id).toBe(testRuns.id);
  });

  it("throws when the slug does not exist", () => {
    expect(() =>
      resolveConfig({
        rawOpts: {
          ...baseOpts(),
          panels: [
            {
              widget_type: "metric",
              title: "Missing",
              x: 0,
              y: 10,
              width: 3,
              height: 2,
              config: {},
              data_source_slug: "nope",
            },
          ],
        },
        startedAt: NOW,
      }),
    ).toThrow(/data_source_slug "nope"/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: 2 new tests FAIL.

- [ ] **Step 3: Add slug resolution**

In `packages/playwright/src/config-resolver.ts`, update the `dataSourceId` resolution block inside the `userPanels` mapper:

```ts
    let dataSourceId: string | null = p.data_source_id ?? null;
    if (!dataSourceId && p.data_source_slug) {
      const allSources = preset.dataSources; // user sources merged in next task
      const match = allSources.find((s) => s.slug === p.data_source_slug);
      if (!match) {
        throw new Error(
          `[tiler-playwright] panel "${p.title}" data_source_slug "${p.data_source_slug}" not found`,
        );
      }
      dataSourceId = match.id;
    }
    if (!dataSourceId) {
      dataSourceId = testRuns ? testRuns.id : null;
    }
    if (!dataSourceId) {
      throw new Error(
        `[tiler-playwright] panel "${p.title}" needs a data_source_id (no preset test_runs source available)`,
      );
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS (10 total).

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright/resolver): resolve data_source_slug, throw on miss"
```

---

## Task 10: Resolver — merge user data sources + collectors, dup-slug throw

**Files:**
- Modify: `packages/playwright/src/config-resolver.ts`
- Modify: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
describe("resolveConfig — user data sources", () => {
  const NOW = new Date("2026-05-03T00:00:00.000Z");

  function fakeSource(slug: string, id = `01HFAKE${slug.toUpperCase().padEnd(20, "X")}`) {
    return {
      id,
      name: slug,
      slug,
      description: "",
      schema_definition: [{ key: "v", type: "integer" as const }],
      ingestion_methods: ["manual" as const],
      webhook_token: null,
      active: true,
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
  }

  it("appends user sources after preset sources and registers their collectors", async () => {
    const cov = fakeSource("coverage");
    const collect = vi.fn(async () => []);
    const r = resolveConfig({
      rawOpts: { ...baseOpts(), dataSources: [{ source: cov, collect }] },
      startedAt: NOW,
    });
    expect(r.dataSources.map((d) => d.slug)).toContain("coverage");
    expect(r.collectors.size).toBe(1);
    expect(r.collectors.get(cov.id)).toBe(collect);
  });

  it("resolves a panel slug to a user source", () => {
    const cov = fakeSource("coverage");
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        dataSources: [{ source: cov, collect: async () => [] }],
        panels: [
          {
            widget_type: "metric",
            title: "Coverage",
            x: 0,
            y: 10,
            width: 3,
            height: 2,
            config: {},
            data_source_slug: "coverage",
          },
        ],
      },
      startedAt: NOW,
    });
    expect(r.panels.find((p) => p.title === "Coverage")!.data_source_id).toBe(cov.id);
  });

  it("throws when a user source duplicates a preset slug", () => {
    const dup = fakeSource("test_runs");
    expect(() =>
      resolveConfig({
        rawOpts: { ...baseOpts(), dataSources: [{ source: dup, collect: async () => [] }] },
        startedAt: NOW,
      }),
    ).toThrow(/duplicate data source slug "test_runs"/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Wire user sources and collectors**

In `packages/playwright/src/config-resolver.ts`, **before** the `userPanels` block, add:

```ts
  // Merge user data sources, collect their collectors, validate uniqueness.
  const presetSlugs = new Set(preset.dataSources.map((d) => d.slug));
  const userSources: DataSource[] = [];
  const collectors: ResolvedConfig["collectors"] = new Map();
  for (const entry of rawOpts.dataSources) {
    if (presetSlugs.has(entry.source.slug)) {
      throw new Error(
        `[tiler-playwright] duplicate data source slug "${entry.source.slug}" — preset already defines it`,
      );
    }
    if (userSources.some((s) => s.slug === entry.source.slug)) {
      throw new Error(
        `[tiler-playwright] duplicate data source slug "${entry.source.slug}" in user dataSources`,
      );
    }
    userSources.push(entry.source);
    collectors.set(entry.source.id, entry.collect);
  }
  const allSources: DataSource[] = [...preset.dataSources, ...userSources];
```

Replace the inline `const allSources = preset.dataSources;` line inside the slug-resolution block with a reference to the outer `allSources` (delete the inner `const`).

Replace the return at the bottom of `resolveConfig` with:

```ts
  return {
    dashboard: preset.dashboard,
    dataSources: allSources,
    panels: [...keptPanels, ...userPanels],
    collectors,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS (13 total).

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright/resolver): merge user data sources with dup-slug guard and collectors map"
```

---

## Task 11: Resolver — dashboard metadata overrides

**Files:**
- Modify: `packages/playwright/src/config-resolver.ts`
- Modify: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Add failing test**

Append:

```ts
describe("resolveConfig — dashboard overrides", () => {
  const NOW = new Date("2026-05-03T00:00:00.000Z");

  it("shallow-merges name/slug/description on the preset dashboard", () => {
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        dashboard: { name: "My Run", slug: "my_run" },
      },
      startedAt: NOW,
    });
    expect(r.dashboard.name).toBe("My Run");
    expect(r.dashboard.slug).toBe("my_run");
    // description not provided, preset default kept
    expect(r.dashboard.description).toMatch(/Playwright/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: FAIL.

- [ ] **Step 3: Apply override in resolver**

In `packages/playwright/src/config-resolver.ts`, immediately after `const preset = testAutomationPreset({ now: startedAt });` add:

```ts
  const dashboard: Dashboard = rawOpts.dashboard
    ? { ...preset.dashboard, ...rawOpts.dashboard }
    : preset.dashboard;
```

In the `userPanels` mapper, change `dashboard_id: preset.dashboard.id` to `dashboard_id: dashboard.id`.

In the return, change `dashboard: preset.dashboard` to `dashboard`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS (14 total).

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright/resolver): shallow-merge dashboard metadata overrides"
```

---

## Task 12: Config-file loader (`jiti`)

**Files:**
- Create: `packages/playwright/src/config-loader.ts`
- Create: `packages/playwright/src/config-loader.test.ts`
- Create: `packages/playwright/src/__fixtures__/valid-config.ts`
- Create: `packages/playwright/src/__fixtures__/no-default-export.ts`

- [ ] **Step 1: Create fixtures**

Create `packages/playwright/src/__fixtures__/valid-config.ts`:

```ts
import { definePlaywrightConfig } from "../define-config";

export default definePlaywrightConfig({
  excludePanels: ["Pass Rate"],
  panels: [
    {
      widget_type: "metric",
      title: "From File",
      x: 0,
      width: 3,
      height: 2,
      config: {},
    },
  ],
});
```

Create `packages/playwright/src/__fixtures__/no-default-export.ts`:

```ts
export const notADefault = { panels: [] };
```

- [ ] **Step 2: Write the failing tests**

Create `packages/playwright/src/config-loader.test.ts`:

```ts
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfigFile } from "./config-loader";

const fixtures = (name: string) => resolve(__dirname, "__fixtures__", name);

describe("loadConfigFile", () => {
  it("loads a valid config and returns its default export", () => {
    const cfg = loadConfigFile(fixtures("valid-config.ts"));
    expect(cfg.excludePanels).toEqual(["Pass Rate"]);
    expect(cfg.panels?.[0]?.title).toBe("From File");
  });

  it("throws when the file has no default export", () => {
    expect(() => loadConfigFile(fixtures("no-default-export.ts"))).toThrow(
      /default export/,
    );
  });

  it("throws when the file does not exist", () => {
    expect(() => loadConfigFile(fixtures("does-not-exist.ts"))).toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-loader`
Expected: FAIL — `./config-loader` not found.

- [ ] **Step 4: Implement the loader**

Create `packages/playwright/src/config-loader.ts`:

```ts
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { createJiti } from "jiti";
import type { PlaywrightTilerConfig } from "./define-config";

/**
 * Load a tiler.config.ts (or .js/.mjs/.cjs) and return its default export.
 *
 * `path` may be absolute or relative to `process.cwd()`. We use `jiti` so
 * users can author the file in TypeScript without compiling it themselves.
 */
export function loadConfigFile(path: string): PlaywrightTilerConfig {
  const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
  if (!existsSync(abs)) {
    throw new Error(`[tiler-playwright] config file not found: ${abs}`);
  }
  const jiti = createJiti(abs, { interopDefault: false });
  const mod = jiti(abs) as { default?: PlaywrightTilerConfig };
  if (!mod || typeof mod !== "object" || !("default" in mod) || mod.default == null) {
    throw new Error(
      `[tiler-playwright] config file ${abs} has no default export — did you forget \`export default definePlaywrightConfig({...})\`?`,
    );
  }
  return mod.default;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-loader`
Expected: PASS (3).

- [ ] **Step 6: Commit**

```bash
git add packages/playwright/src/config-loader.ts packages/playwright/src/config-loader.test.ts packages/playwright/src/__fixtures__/
git commit -m "feat(playwright): add jiti-backed loader for tiler.config.ts"
```

---

## Task 13: Resolver — merge inline + file-path config

**Files:**
- Modify: `packages/playwright/src/config-resolver.ts`
- Modify: `packages/playwright/src/config-resolver.test.ts`

- [ ] **Step 1: Add failing test**

Append (uses the fixture from Task 12):

```ts
describe("resolveConfig — file path + inline merge", () => {
  const NOW = new Date("2026-05-03T00:00:00.000Z");

  it("concatenates excludePanels and panels from both sources", async () => {
    const { resolve: pathResolve } = await import("node:path");
    const r = resolveConfig({
      rawOpts: {
        ...baseOpts(),
        config: pathResolve(__dirname, "__fixtures__/valid-config.ts"),
        excludePanels: ["Skipped"],
        panels: [
          { widget_type: "metric", title: "From Inline", x: 0, width: 3, height: 2, config: {} },
        ],
      },
      startedAt: NOW,
    });
    const titles = r.panels.map((p) => p.title);
    // exclusions from both: file ("Pass Rate") + inline ("Skipped")
    expect(titles).not.toContain("Pass Rate");
    expect(titles).not.toContain("Skipped");
    // appended panels from both: file ("From File") + inline ("From Inline")
    expect(titles).toContain("From File");
    expect(titles).toContain("From Inline");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: FAIL — `config:` is currently ignored by the resolver.

- [ ] **Step 3: Wire the loader into the resolver**

At the top of `packages/playwright/src/config-resolver.ts` add:

```ts
import { loadConfigFile } from "./config-loader";
```

In `resolveConfig`, **immediately after** the `preset` line and **before** `excludeSet`, add:

```ts
  // If a config-file path is set, load it and merge with inline options.
  // Inline options append/overlay on the file's values.
  const fileCfg = rawOpts.config ? loadConfigFile(rawOpts.config) : undefined;
  const merged = {
    excludePanels: [
      ...(fileCfg?.excludePanels ?? []),
      ...rawOpts.excludePanels,
    ],
    panels: [...(fileCfg?.panels ?? []), ...rawOpts.panels],
    dataSources: [
      ...(fileCfg?.dataSources ?? []),
      ...rawOpts.dataSources,
    ],
    dashboard:
      fileCfg?.dashboard || rawOpts.dashboard
        ? { ...fileCfg?.dashboard, ...rawOpts.dashboard }
        : undefined,
  };
```

Replace every reference inside the resolver from `rawOpts.excludePanels`, `rawOpts.panels`, `rawOpts.dataSources`, `rawOpts.dashboard` to `merged.excludePanels`, `merged.panels`, `merged.dataSources`, `merged.dashboard`.

> Note: the `merged.panels` items come from two type sources — the Zod-parsed inline list (full `PanelInputParsed`) and the file's `PanelInput` type. Both shapes are structurally compatible at the resolver. If TypeScript complains, widen the local type with `as PanelInputParsed[]` after concatenation.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aguspe/tiler-playwright test -- config-resolver`
Expected: PASS (15 total).

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/config-resolver.ts packages/playwright/src/config-resolver.test.ts
git commit -m "feat(playwright/resolver): merge config-file values with inline reporter options"
```

---

## Task 14: Reporter — wire resolver in, run collectors at `onEnd`

**Files:**
- Modify: `packages/playwright/src/reporter.ts`
- Modify: `packages/playwright/src/reporter.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `packages/playwright/src/reporter.test.ts` (inside the existing `describe`):

```ts
  it("renders extra panels declared inline in reporter options", async () => {
    const reporter = new TilerReporter({
      outDir,
      viewerClientDir,
      panels: [
        { widget_type: "metric", title: "Custom Inline", x: 0, width: 3, height: 2, config: {} },
      ],
    } as never);
    reporter.onBegin({} as never, {} as never);
    await reporter.onEnd({ status: "passed" } as never);
    const snapshot = JSON.parse(readFileSync(join(outDir, "snapshot.json"), "utf8")) as {
      panels: Array<{ title: string }>;
    };
    expect(snapshot.panels.map((p) => p.title)).toContain("Custom Inline");
  });

  it("invokes collect() and merges the records under the user data source's id", async () => {
    const startedAt = new Date("2026-05-03T00:00:00.000Z");
    const cov = {
      id: "01HCOVERAGEXXXXXXXXXXXXXXX",
      name: "coverage",
      slug: "coverage",
      description: "",
      schema_definition: [{ key: "pct", type: "float" as const }],
      ingestion_methods: ["manual" as const],
      webhook_token: null,
      active: true,
      created_at: startedAt.toISOString(),
      updated_at: startedAt.toISOString(),
    };
    const reporter = new TilerReporter({
      outDir,
      viewerClientDir,
      dataSources: [
        {
          source: cov,
          collect: async () => [
            {
              id: "01HCOVRECORDXXXXXXXXXXXXXX",
              data_source_id: "WILL_BE_OVERWRITTEN",
              payload: { pct: 87.5 },
              recorded_at: startedAt.toISOString(),
              source_ref: null,
              ingested_via: "manual",
              created_at: startedAt.toISOString(),
            },
          ],
        },
      ],
    } as never);
    reporter.onBegin({} as never, {} as never);
    await reporter.onEnd({ status: "passed" } as never);
    const snapshot = JSON.parse(readFileSync(join(outDir, "snapshot.json"), "utf8")) as {
      records: Array<{ data_source_id: string; payload: Record<string, unknown> }>;
    };
    const covRec = snapshot.records.find((r) => r.payload.pct === 87.5);
    expect(covRec).toBeDefined();
    expect(covRec!.data_source_id).toBe(cov.id);
  });

  it("warns and continues when a collector throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const startedAt = new Date("2026-05-03T00:00:00.000Z");
    const bad = {
      id: "01HBADXXXXXXXXXXXXXXXXXXXX",
      name: "bad",
      slug: "bad",
      description: "",
      schema_definition: [{ key: "v", type: "integer" as const }],
      ingestion_methods: ["manual" as const],
      webhook_token: null,
      active: true,
      created_at: startedAt.toISOString(),
      updated_at: startedAt.toISOString(),
    };
    const reporter = new TilerReporter({
      outDir,
      viewerClientDir,
      dataSources: [
        {
          source: bad,
          collect: async () => {
            throw new Error("boom");
          },
        },
      ],
    } as never);
    reporter.onBegin({} as never, {} as never);
    await expect(reporter.onEnd({ status: "passed" } as never)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("collect()"),
      expect.anything(),
    );
    warn.mockRestore();
  });
```

Make sure `vi` is imported at the top:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aguspe/tiler-playwright test -- reporter`
Expected: 3 new tests FAIL.

- [ ] **Step 3: Refactor `reporter.ts` to delegate to the resolver**

Replace `packages/playwright/src/reporter.ts` with:

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  type Dashboard,
  type DataRecord,
  type DataSource,
  MemoryStore,
  type Panel,
  buildSnapshot,
} from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets"; // register all widgets
import { renderToHtml } from "@aguspe/tiler-viewer";
import { resolveConfig } from "./config-resolver";
import { copyClientAssets } from "./copy-assets";
import type { CollectContext } from "./define-config";
import { ReporterOptions } from "./options";
import { buildRecord } from "./record-builder";

export interface TilerReporterOptions {
  outDir?: string;
  preset?: "test_automation";
  excludePanels?: string[];
  panels?: unknown[];
  dataSources?: unknown[];
  dashboard?: { name?: string; slug?: string; description?: string };
  config?: string;
  /** @deprecated — use `config` instead. */
  customConfig?: string;
  captureLogs?: boolean;
  linkTraceFiles?: boolean;
  open?: boolean;
  /** Test override — points at a fake viewer dist for unit tests. */
  viewerClientDir?: string;
}

interface PlaywrightReporter {
  onBegin(config: unknown, suite: unknown): void;
  onTestEnd(test: unknown, result: unknown): void;
  onEnd(result: unknown): Promise<void> | void;
  printsToStdio?(): boolean;
}

function resolveViewerClientDir(): string {
  const isCjs = typeof require === "function";
  if (isCjs) {
    const serverEntry = require.resolve("@aguspe/tiler-viewer");
    return resolve(dirname(serverEntry), "../client");
  }
  // biome-ignore lint/security/noGlobalEval: standard ESM require shim
  const nodeModule = eval("require")("node:module") as typeof import("node:module");
  const r = nodeModule.createRequire(import.meta.url);
  const serverEntry = r.resolve("@aguspe/tiler-viewer");
  return resolve(dirname(serverEntry), "../client");
}

export default class TilerReporter implements PlaywrightReporter {
  private readonly opts: ReturnType<typeof ReporterOptions.parse>;
  private readonly viewerClientDirOverride: string | undefined;

  private store!: MemoryStore;
  private dashboard!: Dashboard;
  private dataSources!: DataSource[];
  private dataSourceTestRunsId!: string;
  private panels!: Panel[];
  private collectors!: Map<string, (ctx: CollectContext) => Promise<DataRecord[]>>;
  private records: DataRecord[] = [];
  private startedAt!: Date;

  constructor(rawOpts: TilerReporterOptions = {}) {
    const { viewerClientDir, ...rest } = rawOpts;
    this.viewerClientDirOverride = viewerClientDir;
    this.opts = ReporterOptions.parse(rest);
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(_config: unknown, _suite: unknown): void {
    this.startedAt = new Date();
    this.store = new MemoryStore();
    const resolved = resolveConfig({ rawOpts: this.opts, startedAt: this.startedAt });
    this.dashboard = resolved.dashboard;
    this.dataSources = resolved.dataSources;
    const testRuns = resolved.dataSources.find((d) => d.slug === "test_runs");
    if (!testRuns) {
      throw new Error(
        "[tiler-playwright] preset must include a `test_runs` data source",
      );
    }
    this.dataSourceTestRunsId = testRuns.id;
    this.panels = resolved.panels;
    this.collectors = resolved.collectors;
    this.records = [];
  }

  onTestEnd(test: unknown, result: unknown): void {
    const record = buildRecord({
      dataSourceId: this.dataSourceTestRunsId,
      now: new Date(),
      test: test as Parameters<typeof buildRecord>[0]["test"],
      result: result as Parameters<typeof buildRecord>[0]["result"],
      project: "default",
    });
    this.records.push(record);
  }

  async onEnd(_result: unknown): Promise<void> {
    const outDir = resolve(this.opts.outDir);
    mkdirSync(outDir, { recursive: true });

    const endedAt = new Date();
    for (const [sourceId, collect] of this.collectors) {
      let extra: DataRecord[] = [];
      try {
        extra = await collect({ outDir, startedAt: this.startedAt, endedAt });
      } catch (err) {
        console.warn(
          `[tiler-playwright] collect() for data source ${sourceId} threw — skipping its records.`,
          err,
        );
        continue;
      }
      for (const r of extra) {
        this.records.push({ ...r, data_source_id: sourceId });
      }
    }

    const viewerClientDir = this.viewerClientDirOverride ?? resolveViewerClientDir();
    const { jsEntry, cssEntry } = copyClientAssets({ viewerClientDir, outDir });

    const snapshot = await buildSnapshot({
      dashboard: this.dashboard,
      dataSources: this.dataSources,
      panels: this.panels,
      records: this.records,
      now: new Date(),
    });

    const renderOpts: Parameters<typeof renderToHtml>[1] = {
      clientAssetPath: `./${jsEntry}`,
    };
    if (cssEntry !== undefined) {
      renderOpts.cssAssetPath = `./${cssEntry}`;
    }
    const html = renderToHtml(snapshot, renderOpts);

    writeFileSync(`${outDir}/index.html`, html, "utf8");
    writeFileSync(`${outDir}/snapshot.json`, JSON.stringify(snapshot, null, 2), "utf8");
  }
}
```

- [ ] **Step 4: Run all reporter tests**

Run: `pnpm --filter @aguspe/tiler-playwright test -- reporter`
Expected: PASS (4 total — 1 existing + 3 new).

- [ ] **Step 5: Run the full package test suite**

Run: `pnpm --filter @aguspe/tiler-playwright test`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add packages/playwright/src/reporter.ts packages/playwright/src/reporter.test.ts
git commit -m "feat(playwright/reporter): delegate to resolver, run collectors in onEnd"
```

---

## Task 15: Deprecation alias — accept `customConfig` with a stderr warning

**Files:**
- Modify: `packages/playwright/src/reporter.ts`
- Modify: `packages/playwright/src/reporter.test.ts`

- [ ] **Step 1: Add failing test**

Append:

```ts
  it("accepts the deprecated customConfig alias and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolve: pathResolve } = await import("node:path");
    const cfgPath = pathResolve(__dirname, "__fixtures__/valid-config.ts");
    const reporter = new TilerReporter({
      outDir,
      viewerClientDir,
      customConfig: cfgPath,
    } as never);
    reporter.onBegin({} as never, {} as never);
    await reporter.onEnd({ status: "passed" } as never);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("customConfig"),
    );
    const snapshot = JSON.parse(readFileSync(join(outDir, "snapshot.json"), "utf8")) as {
      panels: Array<{ title: string }>;
    };
    // The fixture appends a "From File" panel; assert it is present.
    expect(snapshot.panels.map((p) => p.title)).toContain("From File");
    warn.mockRestore();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aguspe/tiler-playwright test -- reporter`
Expected: FAIL — alias not honored.

- [ ] **Step 3: Honor the alias in the constructor**

In `packages/playwright/src/reporter.ts`, replace the constructor body with:

```ts
  constructor(rawOpts: TilerReporterOptions = {}) {
    const { viewerClientDir, ...rest } = rawOpts;
    this.viewerClientDirOverride = viewerClientDir;
    const parsed = ReporterOptions.parse(rest);
    if (parsed.customConfig && !parsed.config) {
      console.warn(
        "[tiler-playwright] `customConfig` is deprecated — use `config` instead. Forwarding for now.",
      );
      parsed.config = parsed.customConfig;
    }
    this.opts = parsed;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aguspe/tiler-playwright test -- reporter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/reporter.ts packages/playwright/src/reporter.test.ts
git commit -m "feat(playwright): accept customConfig as a deprecated alias for config"
```

---

## Task 16: Example workspace — `examples/playwright-extended/`

**Files:**
- Create: `examples/playwright-extended/package.json`
- Create: `examples/playwright-extended/tsconfig.json`
- Create: `examples/playwright-extended/playwright.config.ts`
- Create: `examples/playwright-extended/tiler.config.ts`
- Create: `examples/playwright-extended/widgets/flaky-tests.tsx`
- Create: `examples/playwright-extended/tests/example.spec.ts`
- Create: `examples/playwright-extended/coverage.json`
- Create: `examples/playwright-extended/README.md`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "tiler-ts-example-playwright-extended",
  "private": true,
  "type": "module",
  "scripts": {
    "demo": "playwright test"
  },
  "dependencies": {
    "@aguspe/tiler-core": "workspace:*",
    "@aguspe/tiler-playwright": "workspace:*",
    "@aguspe/tiler-widgets": "workspace:*",
    "@playwright/test": "^1.50.0",
    "react": "^18.3.0"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 3: `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: [
    ["list"],
    ["@aguspe/tiler-playwright", {
      outDir: "tiler-report",
      config: "./tiler.config.ts",
    }],
  ],
  use: {
    baseURL: "https://playwright.dev",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 4: `widgets/flaky-tests.tsx`**

```tsx
import { defineWidget } from "@aguspe/tiler-core";
import { z } from "zod";

const FlakyTestsConfig = z.object({
  window: z.number().int().positive().default(30),
});

defineWidget({
  meta: {
    type: "flaky_tests",
    label: "Flaky Tests",
    description: "Headline count of flaky tests in the latest window.",
    requires_data_source: true,
    default_size: { w: 6, h: 4 },
    min_size: { w: 3, h: 2 },
    max_size: { w: 12, h: 6 },
  },
  configSchema: FlakyTestsConfig,
  resolve: ({ records }) => {
    const flaky = records.filter((r) => r.payload.status === "fail").length;
    return { resolved: flaky, empty: records.length === 0 };
  },
  component: ({ data }) => (
    <div style={{ padding: 16, fontSize: 32, fontWeight: 600 }}>
      {data.empty ? "—" : `${data.resolved} flaky`}
    </div>
  ),
  example: () => ({
    panel: {
      id: "ex",
      dashboard_id: "ex",
      data_source_id: "ex",
      title: "Flaky",
      widget_type: "flaky_tests",
      x: 0,
      y: 0,
      width: 6,
      height: 4,
      config: { window: 30 },
      created_at: "2026-05-03T00:00:00.000Z",
      updated_at: "2026-05-03T00:00:00.000Z",
    },
    records: [],
  }),
});
```

- [ ] **Step 5: `coverage.json`**

```json
{
  "files": [
    { "path": "src/auth.ts",  "pct": 92.4 },
    { "path": "src/cart.ts",  "pct": 71.0 },
    { "path": "src/payment.ts","pct": 88.7 }
  ]
}
```

- [ ] **Step 6: `tiler.config.ts`**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { newId } from "@aguspe/tiler-core";
import { definePlaywrightConfig } from "@aguspe/tiler-playwright";
import "./widgets/flaky-tests";

const COVERAGE_SOURCE_ID = "01HCOVERAGEEXAMPLEXXXXXXX1";

export default definePlaywrightConfig({
  excludePanels: ["Pass Rate"],
  panels: [
    {
      widget_type: "flaky_tests",
      title: "Flaky last 30 runs",
      x: 0,
      width: 6,
      height: 4,
      config: { window: 30 },
    },
  ],
  dataSources: [
    {
      source: {
        id: COVERAGE_SOURCE_ID,
        name: "Coverage",
        slug: "coverage",
        description: "Per-file coverage from coverage.json.",
        schema_definition: [
          { key: "path", type: "string" },
          { key: "pct", type: "float" },
        ],
        ingestion_methods: ["manual"],
        webhook_token: null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      collect: async ({ startedAt }) => {
        const raw = JSON.parse(
          readFileSync(resolve(process.cwd(), "coverage.json"), "utf8"),
        ) as { files: Array<{ path: string; pct: number }> };
        const iso = startedAt.toISOString();
        return raw.files.map((f) => ({
          id: newId(),
          data_source_id: COVERAGE_SOURCE_ID,
          payload: { path: f.path, pct: f.pct },
          recorded_at: iso,
          source_ref: null,
          ingested_via: "manual" as const,
          created_at: iso,
        }));
      },
    },
  ],
});
```

- [ ] **Step 7: `tests/example.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.describe("extended-example", () => {
  test("homepage renders the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Playwright/i }).first()).toBeVisible();
  });

  test("docs link navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Docs/i }).first().click();
    await expect(page).toHaveURL(/\/docs\//);
  });

  test("intentional fail to populate the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2").first()).toHaveText("This will not match");
  });
});
```

- [ ] **Step 8: `README.md`**

```md
# tiler-playwright extended example

Demonstrates extending the Tiler Playwright reporter with:

- A custom `flaky_tests` widget (registered via `defineWidget`).
- An extra panel placed below the preset's 8 panels.
- A `coverage` data source populated by an async `collect()` hook
  reading `coverage.json` at end-of-run.
- Removing a preset panel (`Pass Rate`) via `excludePanels`.

Run:

```bash
pnpm --filter tiler-ts-example-playwright-extended demo
```

Then open `tiler-report/index.html`.
```

- [ ] **Step 9: Install + run the example**

Run: `pnpm install`
Expected: workspace adds the new package.

Run: `pnpm --filter @aguspe/tiler-playwright build && pnpm --filter tiler-ts-example-playwright-extended demo`
Expected: 2 passes + 1 fail; `tiler-report/` is written; `tiler-report/snapshot.json` includes a `flaky_tests` panel and 3 coverage records.

- [ ] **Step 10: Commit**

```bash
git add examples/playwright-extended/ pnpm-lock.yaml
git commit -m "docs(examples): add playwright-extended showing custom widget + collect() hook"
```

---

## Task 17: Documentation

**Files:**
- Modify: `packages/playwright/README.md`
- Create: `docs/site/docs/playwright/extending.md`

- [ ] **Step 1: Append to `packages/playwright/README.md`**

After the existing "Configuration" section, append:

```md
## Extending the dashboard

The reporter ships the `test_automation` preset (8 panels, 1 data
source). To add panels, data sources, or custom widgets, pass a
`config` file path or set the inline keys directly on the reporter.

### Inline (lightweight)

```ts
reporter: [["@aguspe/tiler-playwright", {
  excludePanels: ["Pass Rate"],
  panels: [
    { widget_type: "flaky_tests", x: 0, width: 6, height: 4,
      config: { window: 30 }, title: "Flaky last 30 runs" },
  ],
}]],
```

`y` is optional — panels with no `y` are auto-placed below the lowest
preset panel; panels with explicit `y` are placed verbatim.

### Separate `tiler.config.ts`

```ts
// playwright.config.ts
reporter: [["@aguspe/tiler-playwright", { config: "./tiler.config.ts" }]],

// tiler.config.ts
import { definePlaywrightConfig } from "@aguspe/tiler-playwright";
import "./widgets/flaky-tests";   // registers the widget via defineWidget()

export default definePlaywrightConfig({
  excludePanels: ["Pass Rate"],
  panels: [...],
  dataSources: [{
    source: coverageSource,
    collect: async ({ outDir, startedAt, endedAt }) => [...],
  }],
});
```

When both `config` and inline keys are set, inline values append to
the file's values.

A working example lives at `examples/playwright-extended/`.
```

- [ ] **Step 2: Create `docs/site/docs/playwright/extending.md`**

```md
---
sidebar_position: 3
title: Extending the dashboard
---

# Extending the dashboard

The Playwright reporter is opinionated by default: install it, run
your tests, get an 8-panel dashboard. The same reporter is also a
seam — you can add panels, data sources, and custom widgets without
forking it.

## What you can extend

| You want to | Use |
|---|---|
| Append a panel | `panels: [...]` |
| Drop a preset panel | `excludePanels: ["Pass Rate"]` |
| Add a custom widget | `import "./widgets/my-widget"` (calls `defineWidget`) plus a panel that uses it |
| Add a new data source | `dataSources: [{ source, collect }]` |
| Override dashboard title | `dashboard: { name: "..." }` |

## Two surfaces

**Inline** in `playwright.config.ts` — the simplest path. No new file.

**File path** — `config: "./tiler.config.ts"` — keeps the Playwright
config tidy and makes the file shareable with `tiler-server` later.

When both are set, inline values append to the file's values.

## Auto-placement

Panels with `y` set are placed verbatim. Panels without `y` are
auto-placed: the cursor starts at the bottom of the preset's lowest
panel, and each auto-placed panel advances it by its own height.
Panels with explicit `y` do not advance the cursor.

## Data sources and `collect()`

The reporter only knows how to populate `test_runs`. Any extra source
needs an async `collect()` hook. It runs once at the end of the test
run, after `onTestEnd` has fired for every test:

```ts
dataSources: [{
  source: coverageSource,
  collect: async ({ outDir, startedAt, endedAt }) => {
    // Read whatever you need; return DataRecord[].
  },
}]
```

Throwing in `collect()` warns to stderr but does not abort the
report write — you still get the dashboard, minus that source's
records.

## See it working

`examples/playwright-extended/` is a runnable workspace package
covering all four extension axes.
```

- [ ] **Step 3: Verify Docusaurus build still passes**

Run: `pnpm --filter tiler-ts-docs-site build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/playwright/README.md docs/site/docs/playwright/extending.md
git commit -m "docs(playwright): document extension surface (panels, dataSources, custom widgets)"
```

---

## Task 18: Release — version bump, full test, push, publish

**Files:**
- Modify: `packages/playwright/package.json`

- [ ] **Step 1: Bump version**

In `packages/playwright/package.json`, change `"version": "1.1.6"` → `"version": "1.2.0"`.

- [ ] **Step 2: Lockfile + full build + full test**

Run: `pnpm install --lockfile-only && pnpm build && pnpm test`
Expected: all green.

- [ ] **Step 3: Commit + push**

```bash
git add packages/playwright/package.json pnpm-lock.yaml
git commit -m "chore(playwright): bump to 1.2.0 (extensible config)"
git push origin main
```

- [ ] **Step 4: Trigger publish workflow**

Run: `gh workflow run publish.yml --repo aguspe/tiler-ts`

Wait for completion: `gh run watch $(gh run list --workflow=publish.yml --repo aguspe/tiler-ts --limit 1 --json databaseId --jq '.[0].databaseId') --repo aguspe/tiler-ts --exit-status`

Expected: changeset publishes `@aguspe/tiler-playwright@1.2.0`. Other packages skipped (their versions are unchanged).

- [ ] **Step 5: Verify on the registry**

Run: `npm view @aguspe/tiler-playwright version`
Expected: `1.2.0`.

---

## Acceptance checklist

When all tasks are done, run this end-to-end smoke from a clean shell:

1. `pnpm install && pnpm build && pnpm test` — all green.
2. `pnpm --filter tiler-ts-example-playwright-static demo` — produces today's report byte-equivalent (zero-config preset path is unchanged).
3. `pnpm --filter tiler-ts-example-playwright-extended demo` — produces a report whose `snapshot.json` includes:
   - 8 preset panels minus `Pass Rate` (= 7) plus 1 `flaky_tests` panel = 8 panels total.
   - 1 preset data source (`test_runs`) + 1 user data source (`coverage`).
   - 3 records on the coverage source plus 3 on test_runs (2 pass + 1 fail).
4. `npm view @aguspe/tiler-playwright version` returns `1.2.0`.
