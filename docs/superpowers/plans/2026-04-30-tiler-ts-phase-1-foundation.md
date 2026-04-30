# tiler-ts Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the tiler-ts monorepo, ship the `@tiler/core` package (Zod schemas, widget contract, registry, `TilerStore` interface, `MemoryStore`), and ship a `@tiler/widgets` scaffold with the four config-only widgets (clock, text, image, iframe) rendering in Storybook with green CI.

**Architecture:** pnpm workspaces + Turborepo monorepo. `@tiler/core` is leaf (zero React, zero DOM); `@tiler/widgets` builds on it with React components. The four widgets in this plan are config-only — they don't need a chart library, a data resolver, or sqlite. That keeps Plan 1 focused on the contract layer; data-backed widgets and chart wiring land in Plan 2.

**Tech Stack:** TypeScript 5.6 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Zod 3, React 18, Vitest 2, Storybook 8 (`@storybook/react-vite`), pnpm 9, Turborepo 2, Biome 1.9, tsup 8, Vite 5, Changesets, dependency-cruiser 16, size-limit 11, ulidx, rehype-sanitize.

**Spec reference:** `docs/superpowers/specs/2026-04-30-tiler-ts-design.md`

**Notational note:** the spec uses `@tiler/<name>` shorthand throughout. The actual published name is `@aguspe/tiler-<name>`. This plan uses the published name in `package.json` `name` fields and `import` paths everywhere — no shorthand.

---

## Task 1: Bootstrap the pnpm + Turborepo monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.nvmrc`
- Create: `.npmrc`
- Modify: `.gitignore` (add Turbo cache)

- [ ] **Step 1: Set the Node version**

Create `.nvmrc`:
```
20.18.0
```

- [ ] **Step 2: Create `.npmrc`**

Pinning the package manager and avoiding accidental prefix installs.

```
engine-strict=true
package-manager-strict=true
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "tiler-ts",
  "private": true,
  "version": "0.0.0",
  "description": "TypeScript port of Tiler — plug-and-play dashboards, Playwright-first.",
  "license": "MIT",
  "homepage": "https://github.com/aguspe/tiler-ts",
  "repository": "git+https://github.com/aguspe/tiler-ts.git",
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20.18.0",
    "pnpm": ">=9.12.0"
  },
  "scripts": {
    "build":     "turbo run build",
    "test":      "turbo run test",
    "lint":      "biome check .",
    "format":    "biome format --write .",
    "typecheck": "turbo run typecheck",
    "size":      "turbo run size",
    "deps":      "depcruise --config .dependency-cruiser.cjs packages",
    "changeset": "changeset",
    "release":   "turbo run build && changeset publish",
    "version":   "changeset version && pnpm install --lockfile-only"
  },
  "devDependencies": {
    "@biomejs/biome":           "^1.9.0",
    "@changesets/cli":          "^2.27.0",
    "dependency-cruiser":       "^16.4.0",
    "size-limit":               "^11.1.0",
    "turbo":                    "^2.1.0",
    "typescript":               "^5.6.0"
  }
}
```

- [ ] **Step 4: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "examples/*"
```

- [ ] **Step 5: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "globalDependencies": ["tsconfig.base.json", "biome.json", ".npmrc"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs":   ["dist/**", ".storybook-static/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs":   ["coverage/**"]
    },
    "size": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 6: Create `tsconfig.base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target":            "ES2022",
    "module":            "ESNext",
    "moduleResolution":  "Bundler",
    "lib":               ["ES2022", "DOM", "DOM.Iterable"],
    "jsx":               "react-jsx",
    "strict":            true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop":   true,
    "skipLibCheck":      true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules":   true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "declaration":       true,
    "declarationMap":    true,
    "sourceMap":         true,
    "incremental":       true
  },
  "exclude": ["**/dist/**", "**/node_modules/**", "**/.turbo/**"]
}
```

- [ ] **Step 7: Extend `.gitignore`**

The existing `.gitignore` already covers `dist/` and `.turbo/`. Append nothing — verify:

Run: `cat .gitignore`
Expected to contain: `node_modules/`, `dist/`, `.turbo/`, `coverage/`.

- [ ] **Step 8: Install + smoke-check**

Run:
```bash
pnpm install
pnpm turbo --version
```
Expected: install succeeds (no packages built yet, no errors); turbo prints `2.x.y`.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .nvmrc .npmrc pnpm-lock.yaml
git commit -m "chore: bootstrap pnpm + turborepo monorepo"
```

---

## Task 2: Configure Biome (lint + format)

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "vcs":   { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true, "ignore": ["dist", ".turbo", "coverage", "pnpm-lock.yaml"] },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended":   true,
      "correctness":   { "noUnusedVariables": "error", "useExhaustiveDependencies": "warn" },
      "style":         { "useImportType": "error", "useNodejsImportProtocol": "error" },
      "suspicious":    { "noExplicitAny": "warn" },
      "complexity":    { "noBannedTypes": "error" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "json": {
    "formatter": { "indentWidth": 2, "trailingCommas": "none" }
  }
}
```

- [ ] **Step 2: Run Biome on the empty repo**

Run: `pnpm biome check .`
Expected: `Checked 0 files in <1ms. No fixes applied.` (No source yet — the run validates that the config parses.)

- [ ] **Step 3: Commit**

```bash
git add biome.json
git commit -m "chore: configure Biome lint + format"
```

---

## Task 3: Wire the GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm size
      - run: pnpm deps
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions verify pipeline"
```

(The CI run will fail until subsequent tasks add a `typecheck` script and source files. That's expected — the workflow file goes in early so PRs from this point forward run against it.)

---

## Task 4: Initialize Changesets

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`

- [ ] **Step 1: Run `changeset init`**

```bash
pnpm dlx @changesets/cli init
```

This creates `.changeset/config.json` and `.changeset/README.md`.

- [ ] **Step 2: Edit `.changeset/config.json` for the lockstep major + independent minor policy**

Replace contents with:
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit":    false,
  "fixed":     [],
  "linked":    [["@aguspe/tiler-*"]],
  "access":    "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore":    []
}
```

The `linked` group ensures all `@aguspe/tiler-*` packages bump majors together (per spec §6 release policy).

- [ ] **Step 3: Commit**

```bash
git add .changeset/config.json .changeset/README.md
git commit -m "chore: initialize Changesets with @aguspe/tiler-* lockstep majors"
```

---

## Task 5: Configure dependency-cruiser

**Files:**
- Create: `.dependency-cruiser.cjs`

- [ ] **Step 1: Create `.dependency-cruiser.cjs`**

```js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies are forbidden anywhere in the workspace.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Orphaned modules usually indicate dead code.",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$", // dotfiles
          "\\.d\\.ts$",
          "(^|/)tsup\\.config\\.ts$",
          "(^|/)vitest\\.config\\.ts$",
          "(^|/)vite\\.config\\.ts$",
        ],
      },
      to: {},
    },
    {
      name: "core-is-leaf",
      severity: "error",
      comment: "@aguspe/tiler-core is leaf-most: it must not depend on any other workspace package.",
      from: { path: "^packages/core/src" },
      to:   { path: "^packages/(?!core)" },
    },
    {
      name: "playwright-not-server",
      severity: "error",
      comment: "@aguspe/tiler-playwright must not depend on @aguspe/tiler-server (CI cost).",
      from: { path: "^packages/playwright/src" },
      to:   { path: "^packages/server" },
    },
    {
      name: "no-test-from-src",
      severity: "error",
      comment: "Source must not import from test files.",
      from: { pathNot: "\\.test\\.[tj]sx?$" },
      to:   { path:    "\\.test\\.[tj]sx?$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.base.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: { dot: { collapsePattern: "node_modules/[^/]+" } },
  },
};
```

- [ ] **Step 2: Smoke run**

Run: `pnpm deps`
Expected: `no dependency violations found (0 modules cruised)` — no `packages/` exist yet; the rules are validated by parsing the config.

- [ ] **Step 3: Commit**

```bash
git add .dependency-cruiser.cjs
git commit -m "chore: add dependency-cruiser boundary rules"
```

---

## Task 6: Scaffold `@aguspe/tiler-core`

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/vitest.config.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@aguspe/tiler-core",
  "version": "0.0.1",
  "description": "Schemas, widget contract, and TilerStore interface for tiler-ts.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url":  "git+https://github.com/aguspe/tiler-ts.git",
    "directory": "packages/core"
  },
  "homepage": "https://github.com/aguspe/tiler-ts/tree/main/packages/core",
  "publishConfig": { "access": "public" },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types":  "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build":     "tsup",
    "test":      "vitest run",
    "test:watch":"vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "ulidx": "^2.4.0",
    "zod":   "^3.23.0"
  },
  "devDependencies": {
    "tsup":       "^8.3.0",
    "typescript": "^5.6.0",
    "vitest":     "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir":  "dist",
    "tsBuildInfoFile": ".turbo/tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/core/tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry:    ["src/index.ts"],
  format:   ["esm", "cjs"],
  dts:      true,
  sourcemap:true,
  clean:    true,
  target:   "es2022",
  splitting:false,
  treeshake:true,
});
```

- [ ] **Step 4: Create `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include:     ["src/**/*.test.ts"],
    environment: "node",
    coverage:    { reporter: ["text", "html"], reportsDirectory: "coverage" },
  },
});
```

- [ ] **Step 5: Create `packages/core/src/index.ts`** (placeholder barrel)

```ts
export const TILER_CORE_VERSION = "0.0.1" as const;
```

- [ ] **Step 6: Install workspace deps**

Run: `pnpm install`
Expected: `@aguspe/tiler-core` linked; `ulidx`, `zod`, `tsup`, `typescript`, `vitest` resolved.

- [ ] **Step 7: Verify build**

Run: `pnpm --filter @aguspe/tiler-core build`
Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` written. `tsup` exits zero.

- [ ] **Step 8: Verify typecheck**

Run: `pnpm --filter @aguspe/tiler-core typecheck`
Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add packages/core/package.json packages/core/tsconfig.json packages/core/tsup.config.ts \
        packages/core/vitest.config.ts packages/core/src/index.ts pnpm-lock.yaml
git commit -m "feat(core): scaffold @aguspe/tiler-core package"
```

---

## Task 7: ULID helper in `@aguspe/tiler-core`

**Files:**
- Create: `packages/core/src/ulid.ts`
- Create: `packages/core/src/ulid.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/ulid.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { newId } from "./ulid";

describe("newId", () => {
  it("returns a 26-character ULID string", () => {
    const id = newId();
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("two consecutive calls produce sortable values", () => {
    const a = newId();
    const b = newId();
    expect(b > a).toBe(true);
  });

  it("returns 100 unique ids in a tight loop", () => {
    const ids = Array.from({ length: 100 }, () => newId());
    expect(new Set(ids).size).toBe(100);
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: `Cannot find module './ulid'` — the function isn't defined yet.

- [ ] **Step 3: Implement `ulid.ts`**

Create `packages/core/src/ulid.ts`:
```ts
import { ulid } from "ulidx";

/**
 * Generate a new ULID. Time-sortable, opaque, 26 chars Crockford base-32.
 * Used for every Id field in the schema (Dashboard, Panel, DataSource, DataRecord).
 */
export function newId(): string {
  return ulid();
}
```

- [ ] **Step 4: Re-export from the barrel**

Modify `packages/core/src/index.ts`:
```ts
export const TILER_CORE_VERSION = "0.0.1" as const;
export { newId } from "./ulid";
```

- [ ] **Step 5: Run the test, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/ulid.ts packages/core/src/ulid.test.ts packages/core/src/index.ts
git commit -m "feat(core): add newId() ULID generator"
```

---

## Task 8: Primitive Zod schemas

**Files:**
- Create: `packages/core/src/schema/primitives.ts`
- Create: `packages/core/src/schema/primitives.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/schema/primitives.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Id, Iso, SafeColumn, Slug } from "./primitives";

describe("Id", () => {
  it("accepts a non-empty string", () => {
    expect(Id.safeParse("01HV3...").success).toBe(true);
  });
  it("rejects an empty string", () => {
    expect(Id.safeParse("").success).toBe(false);
  });
});

describe("Slug", () => {
  it.each(["foo", "foo-bar", "foo_bar", "foo123"])("accepts %s", (value) => {
    expect(Slug.safeParse(value).success).toBe(true);
  });
  it.each(["Foo", "foo bar", "foo!", ""])("rejects %s", (value) => {
    expect(Slug.safeParse(value).success).toBe(false);
  });
});

describe("Iso", () => {
  it("accepts a UTC ISO-8601 timestamp", () => {
    expect(Iso.safeParse("2026-04-30T12:34:56.000Z").success).toBe(true);
  });
  it("rejects a non-ISO string", () => {
    expect(Iso.safeParse("2026-04-30 12:34:56").success).toBe(false);
  });
});

describe("SafeColumn", () => {
  it.each(["status", "duration_ms", "Suite1"])("accepts %s", (value) => {
    expect(SafeColumn.safeParse(value).success).toBe(true);
  });
  it.each(["status; DROP TABLE", "1+1", "col-name", "col name"])("rejects %s", (value) => {
    expect(SafeColumn.safeParse(value).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails for `./primitives`.

- [ ] **Step 3: Implement `primitives.ts`**

Create `packages/core/src/schema/primitives.ts`:
```ts
import { z } from "zod";

/** ULID string (also accepts other non-empty opaque strings for forward compat). */
export const Id = z.string().min(1);

/** kebab/snake/lowercase slug, used in URL paths. */
export const Slug = z.string().regex(/^[a-z0-9_-]+$/);

/** ISO-8601 datetime string in UTC. */
export const Iso = z.string().datetime();

/** Column name safe to interpolate into a SQL identifier or object key path. */
export const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);
```

- [ ] **Step 4: Re-export from the barrel**

Modify `packages/core/src/index.ts`:
```ts
export const TILER_CORE_VERSION = "0.0.1" as const;
export { newId } from "./ulid";
export * from "./schema/primitives";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all primitive tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/schema/primitives.ts packages/core/src/schema/primitives.test.ts packages/core/src/index.ts
git commit -m "feat(core): add primitive Zod schemas (Id, Slug, Iso, SafeColumn)"
```

---

## Task 9: `Dashboard`, `DashboardSettings`, `ThemeTokens`

**Files:**
- Create: `packages/core/src/schema/dashboard.ts`
- Create: `packages/core/src/schema/dashboard.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/schema/dashboard.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Dashboard, DashboardSettings, ThemeTokens } from "./dashboard";

const NOW = "2026-04-30T12:00:00.000Z";

describe("ThemeTokens", () => {
  it("accepts a partial tokens object", () => {
    expect(ThemeTokens.safeParse({ page: "#000" }).success).toBe(true);
  });
  it("rejects unknown keys", () => {
    expect(ThemeTokens.safeParse({ foo: "#000" }).success).toBe(false);
  });
});

describe("DashboardSettings", () => {
  it("defaults tv_mode to false", () => {
    const result = DashboardSettings.parse({});
    expect(result.tv_mode).toBe(false);
  });
});

describe("Dashboard", () => {
  it("accepts a fully-formed dashboard", () => {
    const result = Dashboard.parse({
      id: "01HV3", name: "QA Cockpit", slug: "qa_cockpit",
      description: null, refresh_seconds: 60,
      settings: { tv_mode: false },
      created_at: NOW, updated_at: NOW,
    });
    expect(result.name).toBe("QA Cockpit");
  });
  it("rejects a non-slug slug", () => {
    expect(
      Dashboard.safeParse({
        id: "01HV3", name: "X", slug: "Has Spaces",
        description: null, refresh_seconds: 0,
        settings: { tv_mode: false },
        created_at: NOW, updated_at: NOW,
      }).success,
    ).toBe(false);
  });
  it("rejects a 121-char name", () => {
    expect(
      Dashboard.safeParse({
        id: "01HV3", name: "x".repeat(121), slug: "x",
        description: null, refresh_seconds: 0,
        settings: { tv_mode: false },
        created_at: NOW, updated_at: NOW,
      }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails for `./dashboard`.

- [ ] **Step 3: Implement `dashboard.ts`**

Create `packages/core/src/schema/dashboard.ts`:
```ts
import { z } from "zod";
import { Id, Iso, Slug } from "./primitives";

export const ThemeTokens = z
  .object({
    page:        z.string().optional(),
    tile:        z.string().optional(),
    tile_header: z.string().optional(),
    gutter:      z.string().optional(),
  })
  .strict();
export type ThemeTokens = z.infer<typeof ThemeTokens>;

export const DashboardSettings = z
  .object({
    theme:   ThemeTokens.optional(),
    tv_mode: z.boolean().default(false),
  })
  .strict();
export type DashboardSettings = z.infer<typeof DashboardSettings>;

export const Dashboard = z.object({
  id:              Id,
  name:            z.string().min(1).max(120),
  slug:            Slug,
  description:     z.string().nullable().default(null),
  refresh_seconds: z.number().int().min(0).default(0),
  settings:        DashboardSettings.default({ tv_mode: false }),
  created_at:      Iso,
  updated_at:      Iso,
});
export type Dashboard = z.infer<typeof Dashboard>;
```

- [ ] **Step 4: Re-export from the barrel**

Modify `packages/core/src/index.ts` — append:
```ts
export * from "./schema/dashboard";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all dashboard tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/schema/dashboard.ts packages/core/src/schema/dashboard.test.ts packages/core/src/index.ts
git commit -m "feat(core): add Dashboard / DashboardSettings / ThemeTokens schemas"
```

---

## Task 10: `DataSource`, `IngestionMethod`, `SchemaField`

**Files:**
- Create: `packages/core/src/schema/data_source.ts`
- Create: `packages/core/src/schema/data_source.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/schema/data_source.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DataSource, IngestionMethod, SchemaField } from "./data_source";

const NOW = "2026-04-30T12:00:00.000Z";

describe("SchemaField", () => {
  it("accepts a typed field", () => {
    expect(SchemaField.safeParse({ key: "duration_ms", type: "float" }).success).toBe(true);
  });
  it("rejects an unsafe column name", () => {
    expect(SchemaField.safeParse({ key: "x;y", type: "string" }).success).toBe(false);
  });
});

describe("IngestionMethod", () => {
  it.each(["webhook", "manual", "csv"])("accepts %s", (m) => {
    expect(IngestionMethod.safeParse(m).success).toBe(true);
  });
  it("rejects unknown methods", () => {
    expect(IngestionMethod.safeParse("ftp").success).toBe(false);
  });
});

describe("DataSource", () => {
  it("requires at least one ingestion method", () => {
    expect(
      DataSource.safeParse({
        id: "01HV3", name: "Test Runs", slug: "test_runs",
        description: null, schema_definition: [], ingestion_methods: [],
        webhook_token: null, active: true,
        created_at: NOW, updated_at: NOW,
      }).success,
    ).toBe(false);
  });
  it("accepts a valid source", () => {
    const result = DataSource.parse({
      id: "01HV3", name: "Test Runs", slug: "test_runs",
      description: null,
      schema_definition: [{ key: "status", type: "string" }],
      ingestion_methods: ["webhook"],
      webhook_token: null, active: true,
      created_at: NOW, updated_at: NOW,
    });
    expect(result.slug).toBe("test_runs");
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails for `./data_source`.

- [ ] **Step 3: Implement `data_source.ts`**

Create `packages/core/src/schema/data_source.ts`:
```ts
import { z } from "zod";
import { Id, Iso, SafeColumn, Slug } from "./primitives";

export const SchemaField = z
  .object({
    key:   SafeColumn,
    type:  z.enum(["string", "integer", "float", "boolean", "datetime"]),
    label: z.string().optional(),
  })
  .strict();
export type SchemaField = z.infer<typeof SchemaField>;

export const IngestionMethod = z.enum(["webhook", "manual", "csv"]);
export type IngestionMethod = z.infer<typeof IngestionMethod>;

export const DataSource = z.object({
  id:                Id,
  name:              z.string().min(1).max(120),
  slug:              Slug,
  description:       z.string().nullable().default(null),
  schema_definition: z.array(SchemaField).default([]),
  ingestion_methods: z.array(IngestionMethod).min(1),
  /** bcrypt hash of the per-source token; null when no per-source override. */
  webhook_token:     z.string().nullable(),
  active:            z.boolean().default(true),
  created_at:        Iso,
  updated_at:        Iso,
});
export type DataSource = z.infer<typeof DataSource>;
```

- [ ] **Step 4: Re-export from the barrel**

Modify `packages/core/src/index.ts` — append:
```ts
export * from "./schema/data_source";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all data-source tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/schema/data_source.ts packages/core/src/schema/data_source.test.ts packages/core/src/index.ts
git commit -m "feat(core): add DataSource / IngestionMethod / SchemaField schemas"
```

---

## Task 11: `DataRecord`

**Files:**
- Create: `packages/core/src/schema/data_record.ts`
- Create: `packages/core/src/schema/data_record.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/schema/data_record.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { DataRecord } from "./data_record";

const NOW = "2026-04-30T12:00:00.000Z";

describe("DataRecord", () => {
  it("accepts an arbitrary payload object", () => {
    const result = DataRecord.parse({
      id: "01HV3", data_source_id: "01HV2",
      payload: { suite: "checkout", status: "pass", duration_ms: 142 },
      recorded_at: NOW, source_ref: null,
      ingested_via: "webhook", created_at: NOW,
    });
    expect(result.payload).toEqual({ suite: "checkout", status: "pass", duration_ms: 142 });
  });
  it("rejects an unknown ingested_via value", () => {
    expect(
      DataRecord.safeParse({
        id: "1", data_source_id: "1", payload: {},
        recorded_at: NOW, source_ref: null,
        ingested_via: "scp", created_at: NOW,
      }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails.

- [ ] **Step 3: Implement `data_record.ts`**

Create `packages/core/src/schema/data_record.ts`:
```ts
import { z } from "zod";
import { Id, Iso } from "./primitives";
import { IngestionMethod } from "./data_source";

export const DataRecord = z.object({
  id:             Id,
  data_source_id: Id,
  payload:        z.record(z.unknown()),
  recorded_at:    Iso,
  source_ref:     z.string().nullable().default(null),
  ingested_via:   IngestionMethod,
  created_at:     Iso,
});
export type DataRecord = z.infer<typeof DataRecord>;
```

- [ ] **Step 4: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export * from "./schema/data_record";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all data-record tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/schema/data_record.ts packages/core/src/schema/data_record.test.ts packages/core/src/index.ts
git commit -m "feat(core): add DataRecord schema"
```

---

## Task 12: `Panel`

**Files:**
- Create: `packages/core/src/schema/panel.ts`
- Create: `packages/core/src/schema/panel.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/schema/panel.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Panel } from "./panel";

const NOW = "2026-04-30T12:00:00.000Z";
const base = {
  id: "01HV3", dashboard_id: "01HV2", data_source_id: "01HV1",
  title: "Total runs", widget_type: "metric",
  x: 0, y: 0, width: 3, height: 2,
  config: {}, created_at: NOW, updated_at: NOW,
};

describe("Panel", () => {
  it("accepts a typical metric panel", () => {
    expect(Panel.safeParse(base).success).toBe(true);
  });
  it("allows null data_source_id (config-only widgets)", () => {
    expect(Panel.safeParse({ ...base, data_source_id: null }).success).toBe(true);
  });
  it("rejects x out of [0,11]", () => {
    expect(Panel.safeParse({ ...base, x: 12 }).success).toBe(false);
    expect(Panel.safeParse({ ...base, x: -1 }).success).toBe(false);
  });
  it("rejects width=0", () => {
    expect(Panel.safeParse({ ...base, width: 0 }).success).toBe(false);
  });
  it("rejects width>12", () => {
    expect(Panel.safeParse({ ...base, width: 13 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails.

- [ ] **Step 3: Implement `panel.ts`**

Create `packages/core/src/schema/panel.ts`:
```ts
import { z } from "zod";
import { Id, Iso } from "./primitives";

export const PanelConfig = z.record(z.unknown());
export type PanelConfig = z.infer<typeof PanelConfig>;

export const Panel = z.object({
  id:              Id,
  dashboard_id:    Id,
  data_source_id:  Id.nullable(),
  title:           z.string().min(1).max(200),
  widget_type:     z.string().min(1),
  x:               z.number().int().min(0).max(11),
  y:               z.number().int().min(0),
  width:           z.number().int().min(1).max(12),
  height:          z.number().int().min(1).max(12),
  config:          PanelConfig.default({}),
  created_at:      Iso,
  updated_at:      Iso,
});
export type Panel = z.infer<typeof Panel>;
```

- [ ] **Step 4: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export * from "./schema/panel";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all panel tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/schema/panel.ts packages/core/src/schema/panel.test.ts packages/core/src/index.ts
git commit -m "feat(core): add Panel schema with grid sizing constraints"
```

---

## Task 13: Time-window grammar (`TimeWindow`, `Bucket`, `DataBackedConfig`)

**Files:**
- Create: `packages/core/src/schema/time_window.ts`
- Create: `packages/core/src/schema/time_window.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/schema/time_window.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { Bucket, DataBackedConfig, TimeWindow } from "./time_window";

describe("TimeWindow", () => {
  it.each(["1m","5m","15m","1h","4h","24h","7d","30d","all"])("accepts %s", (v) => {
    expect(TimeWindow.safeParse(v).success).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(TimeWindow.safeParse("2h").success).toBe(false);
  });
});

describe("Bucket", () => {
  it.each(["30s","1m","5m","1h","1d"])("accepts %s", (v) => {
    expect(Bucket.safeParse(v).success).toBe(true);
  });
});

describe("DataBackedConfig", () => {
  it("defaults aggregation to count and time_window to 24h", () => {
    const result = DataBackedConfig.parse({});
    expect(result.aggregation).toBe("count");
    expect(result.time_window).toBe("24h");
  });
  it("rejects an unsafe value_column", () => {
    expect(DataBackedConfig.safeParse({ value_column: "x;y" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails.

- [ ] **Step 3: Implement `time_window.ts`**

Create `packages/core/src/schema/time_window.ts`:
```ts
import { z } from "zod";
import { SafeColumn } from "./primitives";

export const TimeWindow = z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]);
export type TimeWindow = z.infer<typeof TimeWindow>;

export const Bucket = z.enum(["30s","1m","5m","1h","1d"]);
export type Bucket = z.infer<typeof Bucket>;

export const Aggregation = z.enum(["sum","avg","min","max","count","last","first"]);
export type Aggregation = z.infer<typeof Aggregation>;

export const DataBackedConfig = z.object({
  value_column: SafeColumn.optional(),
  group_column: SafeColumn.optional(),
  aggregation: Aggregation.default("count"),
  time_window: TimeWindow.default("24h"),
  bucket:      Bucket.optional(),
  filter:      z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  color:       z.string().optional(),
  palette:     z.array(z.string()).optional(),
});
export type DataBackedConfig = z.infer<typeof DataBackedConfig>;
```

- [ ] **Step 4: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export * from "./schema/time_window";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all time-window tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/schema/time_window.ts packages/core/src/schema/time_window.test.ts packages/core/src/index.ts
git commit -m "feat(core): add TimeWindow / Bucket / Aggregation / DataBackedConfig schemas"
```

---

## Task 14: `TilerSnapshot`

**Files:**
- Create: `packages/core/src/schema/snapshot.ts`
- Create: `packages/core/src/schema/snapshot.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/schema/snapshot.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { TilerSnapshot } from "./snapshot";

const NOW = "2026-04-30T12:00:00.000Z";

describe("TilerSnapshot", () => {
  it("accepts a minimal v1 snapshot", () => {
    const result = TilerSnapshot.parse({
      version: 1, generated_at: NOW,
      dashboard: {
        id: "d1", name: "QA", slug: "qa", description: null,
        refresh_seconds: 0, settings: { tv_mode: false },
        created_at: NOW, updated_at: NOW,
      },
      panels: [], data_sources: [], records: [],
    });
    expect(result.version).toBe(1);
  });
  it("rejects version=2", () => {
    expect(
      TilerSnapshot.safeParse({
        version: 2, generated_at: NOW,
        dashboard: { id:"x", name:"x", slug:"x", description:null, refresh_seconds:0,
                     settings:{tv_mode:false}, created_at:NOW, updated_at:NOW },
        panels:[], data_sources:[], records:[],
      }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails.

- [ ] **Step 3: Implement `snapshot.ts`**

Create `packages/core/src/schema/snapshot.ts`:
```ts
import { z } from "zod";
import { Iso } from "./primitives";
import { Dashboard } from "./dashboard";
import { DataSource } from "./data_source";
import { DataRecord } from "./data_record";
import { Panel } from "./panel";

export const TilerSnapshot = z.object({
  version:      z.literal(1),
  generated_at: Iso,
  dashboard:    Dashboard,
  panels:       z.array(Panel),
  data_sources: z.array(DataSource),
  records:      z.array(DataRecord),
});
export type TilerSnapshot = z.infer<typeof TilerSnapshot>;
```

- [ ] **Step 4: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export * from "./schema/snapshot";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all snapshot tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/schema/snapshot.ts packages/core/src/schema/snapshot.test.ts packages/core/src/index.ts
git commit -m "feat(core): add TilerSnapshot schema (frozen-snapshot v1)"
```

---

## Task 15: Widget contract types (`WidgetDefinition`, `WidgetMeta`, `WidgetData`)

**Files:**
- Create: `packages/core/src/widget.ts`
- Create: `packages/core/src/widget.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/widget.test.ts`:
```ts
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { WidgetDefinition } from "./widget";

describe("WidgetDefinition", () => {
  it("permits a minimal config-only widget definition", () => {
    const def: WidgetDefinition<z.ZodObject<{ city: z.ZodString }>, { temp: number }> = {
      meta: {
        type: "weather", label: "Weather", requires_data_source: false,
        default_size: { w: 3, h: 2 }, min_size: { w: 2, h: 2 }, max_size: { w: 6, h: 4 },
      },
      configSchema: z.object({ city: z.string() }),
      component: () => null,
      example: () => ({
        panel: {
          id: "p", dashboard_id: "d", data_source_id: null,
          title: "X", widget_type: "weather",
          x: 0, y: 0, width: 3, height: 2, config: { city: "NYC" },
          created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
        },
        records: [],
      }),
    };
    expect(def.meta.type).toBe("weather");
    expectTypeOf(def.configSchema._type).toEqualTypeOf<{ city: string }>();
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails.

- [ ] **Step 3: Implement `widget.ts`**

Create `packages/core/src/widget.ts`:
```ts
import type { ComponentType } from "react";
import type { ZodTypeAny } from "zod";
import type { Panel } from "./schema/panel";
import type { DataRecord } from "./schema/data_record";

export interface WidgetSize {
  w: number;
  h: number;
}

export interface WidgetMeta {
  type:                 string;
  label:                string;
  description?:         string;
  icon?:                string | { url: string };
  requires_data_source: boolean;
  default_size:         WidgetSize;
  min_size:             WidgetSize;
  max_size:             WidgetSize;
}

export interface WidgetData<TResolved = unknown> {
  resolved: TResolved;
  empty:    boolean;
}

export interface WidgetResolverArgs {
  panel:   Panel;
  records: DataRecord[];
  now:     Date;
}

export type WidgetResolver<TResolved> = (
  args: WidgetResolverArgs,
) => Promise<WidgetData<TResolved>> | WidgetData<TResolved>;

export interface WidgetDefinition<
  TConfig extends ZodTypeAny = ZodTypeAny,
  TResolved = unknown,
> {
  meta:         WidgetMeta;
  configSchema: TConfig;
  resolve?:     WidgetResolver<TResolved>;
  component:    ComponentType<{ panel: Panel; data: WidgetData<TResolved> }>;
  example:      () => { panel: Panel; records: DataRecord[] };
}
```

- [ ] **Step 4: Add `react` as a peer dep**

Modify `packages/core/package.json` — add to `peerDependencies`:
```json
"peerDependencies": {
  "react": ">=18"
},
"peerDependenciesMeta": {
  "react": { "optional": true }
}
```

(`react` is only referenced via `import type`; runtime never imports it. Marked optional so consumers without React still install cleanly.)

- [ ] **Step 5: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export * from "./widget";
```

- [ ] **Step 6: Install + run the test**

Run:
```bash
pnpm install
pnpm --filter @aguspe/tiler-core test
```
Expected: `react` is now resolvable (transitive from a future widget package; here we add it directly as an optional peer); the type test passes.

If `react` doesn't resolve, install it as a dev-only dep on `@aguspe/tiler-core`:
```bash
pnpm --filter @aguspe/tiler-core add -D react@^18 @types/react@^18
```

Re-run tests; expected PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/widget.ts packages/core/src/widget.test.ts packages/core/src/index.ts \
        packages/core/package.json pnpm-lock.yaml
git commit -m "feat(core): add WidgetDefinition contract"
```

---

## Task 16: Widget registry (`defineWidget`, `getWidget`, `listWidgets`)

**Files:**
- Create: `packages/core/src/registry.ts`
- Create: `packages/core/src/registry.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/registry.test.ts`:
```ts
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { __resetRegistryForTests, defineWidget, getWidget, listWidgets } from "./registry";

const FIXTURE = {
  meta: {
    type: "demo", label: "Demo", requires_data_source: false,
    default_size: { w: 1, h: 1 }, min_size: { w: 1, h: 1 }, max_size: { w: 2, h: 2 },
  },
  configSchema: z.object({}),
  component: () => null,
  example: () => ({ panel: {} as never, records: [] }),
};

afterEach(() => __resetRegistryForTests());

describe("registry", () => {
  it("registers a widget by type", () => {
    defineWidget(FIXTURE);
    expect(getWidget("demo")?.meta.label).toBe("Demo");
  });

  it("listWidgets returns all registered widgets", () => {
    defineWidget(FIXTURE);
    expect(listWidgets()).toHaveLength(1);
  });

  it("throws on duplicate type", () => {
    defineWidget(FIXTURE);
    expect(() => defineWidget(FIXTURE)).toThrow(/already registered/);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails.

- [ ] **Step 3: Implement `registry.ts`**

Create `packages/core/src/registry.ts`:
```ts
import type { ZodTypeAny } from "zod";
import type { WidgetDefinition } from "./widget";

const registry = new Map<string, WidgetDefinition>();

export function defineWidget<C extends ZodTypeAny, R>(
  def: WidgetDefinition<C, R>,
): WidgetDefinition<C, R> {
  if (registry.has(def.meta.type)) {
    throw new Error(`Widget "${def.meta.type}" already registered`);
  }
  registry.set(def.meta.type, def as unknown as WidgetDefinition);
  return def;
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type);
}

export function listWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

/** Test-only: clear the registry between tests. Not part of the public API. */
export function __resetRegistryForTests(): void {
  registry.clear();
}
```

- [ ] **Step 4: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export { defineWidget, getWidget, listWidgets } from "./registry";
```

(Note: `__resetRegistryForTests` is intentionally NOT re-exported from the barrel — only consumed by direct deep imports inside test files.)

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all registry tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/registry.ts packages/core/src/registry.test.ts packages/core/src/index.ts
git commit -m "feat(core): add widget registry (defineWidget, getWidget, listWidgets)"
```

---

## Task 17: `TilerStore` interface + input types

**Files:**
- Create: `packages/core/src/store.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Implement `store.ts`**

Create `packages/core/src/store.ts`:
```ts
import type { Dashboard } from "./schema/dashboard";
import type { DataRecord } from "./schema/data_record";
import type { DataSource } from "./schema/data_source";
import type { Panel } from "./schema/panel";

export type DashboardInput = Omit<Dashboard, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type PanelInput = Omit<Panel, "created_at" | "updated_at"> & { id?: string };
export type DataSourceInput = Omit<DataSource, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type DataRecordInput = Omit<DataRecord, "id" | "created_at"> & { id?: string };

export interface RecordQuery {
  dataSourceId: string;
  since?:       string;
  until?:       string;
  filter?:      Record<string, unknown>;
  limit?:       number;
  orderBy?:     "recorded_at_asc" | "recorded_at_desc";
}

export interface TilerStore {
  // dashboards
  listDashboards(): Promise<Dashboard[]>;
  getDashboard(slug: string): Promise<Dashboard | null>;
  upsertDashboard(input: DashboardInput): Promise<Dashboard>;
  deleteDashboard(id: string): Promise<void>;

  // panels
  listPanels(dashboardId: string): Promise<Panel[]>;
  upsertPanel(input: PanelInput): Promise<Panel>;
  deletePanel(id: string): Promise<void>;

  // data sources
  listDataSources(): Promise<DataSource[]>;
  getDataSource(slug: string): Promise<DataSource | null>;
  getDataSourceByToken(token: string): Promise<DataSource | null>;
  upsertDataSource(input: DataSourceInput): Promise<DataSource>;
  deleteDataSource(id: string): Promise<void>;

  // records
  insertRecord(input: DataRecordInput): Promise<DataRecord>;
  insertRecordsBatch(inputs: DataRecordInput[]): Promise<number>;
  queryRecords(opts: RecordQuery): Promise<DataRecord[]>;
  pruneRecords(opts: { olderThan: string }): Promise<number>;

  // lifecycle
  migrate(): Promise<void>;
  close(): Promise<void>;
}
```

- [ ] **Step 2: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export type * from "./store";
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @aguspe/tiler-core typecheck`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/store.ts packages/core/src/index.ts
git commit -m "feat(core): add TilerStore interface and input types"
```

---

## Task 18: `MemoryStore` implementation

**Files:**
- Create: `packages/core/src/memory_store.ts`
- Create: `packages/core/src/memory_store.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/memory_store.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "./memory_store";

let store: MemoryStore;
beforeEach(() => { store = new MemoryStore(); });

const NOW = "2026-04-30T12:00:00.000Z";

describe("MemoryStore — dashboards", () => {
  it("upserts and lists", async () => {
    await store.upsertDashboard({
      name: "QA", slug: "qa", description: null, refresh_seconds: 0,
      settings: { tv_mode: false },
    });
    const list = await store.listDashboards();
    expect(list).toHaveLength(1);
    expect(list[0]?.slug).toBe("qa");
  });
  it("getDashboard returns null on miss", async () => {
    expect(await store.getDashboard("missing")).toBeNull();
  });
});

describe("MemoryStore — data sources", () => {
  it("inserts and finds by slug", async () => {
    const src = await store.upsertDataSource({
      name: "Test Runs", slug: "test_runs", description: null,
      schema_definition: [], ingestion_methods: ["webhook"],
      webhook_token: null, active: true,
    });
    expect((await store.getDataSource("test_runs"))?.id).toBe(src.id);
  });
});

describe("MemoryStore — records", () => {
  it("filters by dataSourceId and time window", async () => {
    const src = await store.upsertDataSource({
      name: "Runs", slug: "runs", description: null,
      schema_definition: [], ingestion_methods: ["webhook"],
      webhook_token: null, active: true,
    });
    await store.insertRecord({
      data_source_id: src.id, payload: { status: "pass" },
      recorded_at: "2026-04-30T11:00:00.000Z", source_ref: null, ingested_via: "webhook",
    });
    await store.insertRecord({
      data_source_id: src.id, payload: { status: "fail" },
      recorded_at: "2026-04-29T11:00:00.000Z", source_ref: null, ingested_via: "webhook",
    });

    const result = await store.queryRecords({
      dataSourceId: src.id, since: "2026-04-30T00:00:00.000Z",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.payload).toEqual({ status: "pass" });
  });

  it("orders desc by default when orderBy=recorded_at_desc", async () => {
    const src = await store.upsertDataSource({
      name: "x", slug: "x", description: null,
      schema_definition: [], ingestion_methods: ["webhook"],
      webhook_token: null, active: true,
    });
    await store.insertRecord({
      data_source_id: src.id, payload: { n: 1 },
      recorded_at: "2026-04-30T10:00:00.000Z", source_ref: null, ingested_via: "webhook",
    });
    await store.insertRecord({
      data_source_id: src.id, payload: { n: 2 },
      recorded_at: "2026-04-30T11:00:00.000Z", source_ref: null, ingested_via: "webhook",
    });
    const desc = await store.queryRecords({
      dataSourceId: src.id, orderBy: "recorded_at_desc",
    });
    expect(desc.map((r) => r.payload.n)).toEqual([2, 1]);
  });
});
```

- [ ] **Step 2: Run the tests, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: module resolution fails.

- [ ] **Step 3: Implement `memory_store.ts`**

Create `packages/core/src/memory_store.ts`:
```ts
import type { Dashboard } from "./schema/dashboard";
import type { DataRecord } from "./schema/data_record";
import type { DataSource } from "./schema/data_source";
import type { Panel } from "./schema/panel";
import type {
  DashboardInput, DataRecordInput, DataSourceInput, PanelInput,
  RecordQuery, TilerStore,
} from "./store";
import { newId } from "./ulid";

export class MemoryStore implements TilerStore {
  private dashboards   = new Map<string, Dashboard>();
  private panels       = new Map<string, Panel>();
  private dataSources  = new Map<string, DataSource>();
  private records      = new Map<string, DataRecord>();

  // ─── dashboards ───────────────────────────────────────────────────────
  async listDashboards(): Promise<Dashboard[]> {
    return [...this.dashboards.values()];
  }
  async getDashboard(slug: string): Promise<Dashboard | null> {
    for (const d of this.dashboards.values()) if (d.slug === slug) return d;
    return null;
  }
  async upsertDashboard(input: DashboardInput): Promise<Dashboard> {
    const now = new Date().toISOString();
    const id  = input.id ?? newId();
    const existing = this.dashboards.get(id);
    const merged: Dashboard = {
      id,
      name:            input.name,
      slug:            input.slug,
      description:     input.description ?? null,
      refresh_seconds: input.refresh_seconds ?? 0,
      settings:        input.settings ?? { tv_mode: false },
      created_at:      existing?.created_at ?? now,
      updated_at:      now,
    };
    this.dashboards.set(id, merged);
    return merged;
  }
  async deleteDashboard(id: string): Promise<void> {
    this.dashboards.delete(id);
    for (const [pid, p] of this.panels) if (p.dashboard_id === id) this.panels.delete(pid);
  }

  // ─── panels ───────────────────────────────────────────────────────────
  async listPanels(dashboardId: string): Promise<Panel[]> {
    return [...this.panels.values()].filter((p) => p.dashboard_id === dashboardId);
  }
  async upsertPanel(input: PanelInput): Promise<Panel> {
    const now = new Date().toISOString();
    const id  = input.id ?? newId();
    const existing = this.panels.get(id);
    const merged: Panel = {
      id,
      dashboard_id:    input.dashboard_id,
      data_source_id:  input.data_source_id ?? null,
      title:           input.title,
      widget_type:     input.widget_type,
      x:               input.x,
      y:               input.y,
      width:           input.width,
      height:          input.height,
      config:          input.config ?? {},
      created_at:      existing?.created_at ?? now,
      updated_at:      now,
    };
    this.panels.set(id, merged);
    return merged;
  }
  async deletePanel(id: string): Promise<void> {
    this.panels.delete(id);
  }

  // ─── data sources ─────────────────────────────────────────────────────
  async listDataSources(): Promise<DataSource[]> {
    return [...this.dataSources.values()];
  }
  async getDataSource(slug: string): Promise<DataSource | null> {
    for (const s of this.dataSources.values()) if (s.slug === slug) return s;
    return null;
  }
  async getDataSourceByToken(token: string): Promise<DataSource | null> {
    for (const s of this.dataSources.values()) if (s.webhook_token === token) return s;
    return null;
  }
  async upsertDataSource(input: DataSourceInput): Promise<DataSource> {
    const now = new Date().toISOString();
    const id  = input.id ?? newId();
    const existing = this.dataSources.get(id);
    const merged: DataSource = {
      id,
      name:              input.name,
      slug:              input.slug,
      description:       input.description ?? null,
      schema_definition: input.schema_definition ?? [],
      ingestion_methods: input.ingestion_methods,
      webhook_token:     input.webhook_token,
      active:            input.active ?? true,
      created_at:        existing?.created_at ?? now,
      updated_at:        now,
    };
    this.dataSources.set(id, merged);
    return merged;
  }
  async deleteDataSource(id: string): Promise<void> {
    this.dataSources.delete(id);
    for (const [rid, r] of this.records) if (r.data_source_id === id) this.records.delete(rid);
  }

  // ─── records ──────────────────────────────────────────────────────────
  async insertRecord(input: DataRecordInput): Promise<DataRecord> {
    const id = input.id ?? newId();
    const record: DataRecord = {
      id,
      data_source_id: input.data_source_id,
      payload:        input.payload,
      recorded_at:    input.recorded_at,
      source_ref:     input.source_ref ?? null,
      ingested_via:   input.ingested_via,
      created_at:     new Date().toISOString(),
    };
    this.records.set(id, record);
    return record;
  }
  async insertRecordsBatch(inputs: DataRecordInput[]): Promise<number> {
    for (const input of inputs) await this.insertRecord(input);
    return inputs.length;
  }
  async queryRecords(opts: RecordQuery): Promise<DataRecord[]> {
    let result = [...this.records.values()].filter((r) => r.data_source_id === opts.dataSourceId);
    if (opts.since) result = result.filter((r) => r.recorded_at >= opts.since!);
    if (opts.until) result = result.filter((r) => r.recorded_at <= opts.until!);
    if (opts.filter) {
      result = result.filter((r) =>
        Object.entries(opts.filter!).every(([k, v]) => r.payload[k] === v),
      );
    }
    if (opts.orderBy === "recorded_at_desc") {
      result.sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1));
    } else {
      result.sort((a, b) => (a.recorded_at > b.recorded_at ? 1 : -1));
    }
    if (opts.limit !== undefined) result = result.slice(0, opts.limit);
    return result;
  }
  async pruneRecords(opts: { olderThan: string }): Promise<number> {
    let pruned = 0;
    for (const [id, r] of this.records) {
      if (r.recorded_at < opts.olderThan) {
        this.records.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  // ─── lifecycle ────────────────────────────────────────────────────────
  async migrate(): Promise<void> { /* in-memory, nothing to migrate */ }
  async close():   Promise<void> {
    this.dashboards.clear();
    this.panels.clear();
    this.dataSources.clear();
    this.records.clear();
  }
}
```

- [ ] **Step 4: Re-export from the barrel**

Append to `packages/core/src/index.ts`:
```ts
export { MemoryStore } from "./memory_store";
```

- [ ] **Step 5: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-core test`
Expected: all MemoryStore tests pass.

- [ ] **Step 6: Verify build still succeeds**

Run: `pnpm --filter @aguspe/tiler-core build`
Expected: build succeeds; `dist/index.js` exports `MemoryStore`.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/memory_store.ts packages/core/src/memory_store.test.ts packages/core/src/index.ts
git commit -m "feat(core): add MemoryStore (in-memory TilerStore implementation)"
```

---

## Task 19: Scaffold `@aguspe/tiler-widgets`

**Files:**
- Create: `packages/widgets/package.json`
- Create: `packages/widgets/tsconfig.json`
- Create: `packages/widgets/tsup.config.ts`
- Create: `packages/widgets/vitest.config.ts`
- Create: `packages/widgets/src/index.ts`
- Create: `packages/widgets/src/styles/tokens.css`
- Create: `packages/widgets/src/lib/chart-colors.ts`

- [ ] **Step 1: Create `packages/widgets/package.json`**

```json
{
  "name": "@aguspe/tiler-widgets",
  "version": "0.0.1",
  "description": "React widget components for tiler-ts.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url":  "git+https://github.com/aguspe/tiler-ts.git",
    "directory": "packages/widgets"
  },
  "homepage": "https://github.com/aguspe/tiler-ts/tree/main/packages/widgets",
  "publishConfig": { "access": "public" },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types":   "./dist/index.d.ts",
      "import":  "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./styles/tokens.css": "./dist/styles/tokens.css"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build":     "tsup",
    "test":      "vitest run",
    "test:watch":"vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aguspe/tiler-core": "workspace:*",
    "clsx":               "^2.1.0",
    "rehype-sanitize":    "^6.0.0",
    "rehype-stringify":   "^10.0.0",
    "remark-parse":       "^11.0.0",
    "remark-rehype":      "^11.1.0",
    "unified":            "^11.0.0"
  },
  "peerDependencies": {
    "react":     ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "@testing-library/jest-dom":  "^6.5.0",
    "@testing-library/react":     "^16.0.0",
    "@types/react":               "^18.3.0",
    "@types/react-dom":           "^18.3.0",
    "jsdom":                      "^25.0.0",
    "react":                      "^18.3.0",
    "react-dom":                  "^18.3.0",
    "tsup":                       "^8.3.0",
    "typescript":                 "^5.6.0",
    "vitest":                     "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/widgets/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir":  "dist",
    "tsBuildInfoFile": ".turbo/tsbuildinfo",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

- [ ] **Step 3: Create `packages/widgets/tsup.config.ts`**

```ts
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry:    ["src/index.ts"],
  format:   ["esm", "cjs"],
  dts:      true,
  sourcemap:true,
  clean:    true,
  target:   "es2022",
  splitting:false,
  external: ["react", "react-dom"],
  onSuccess: async () => {
    // Copy tokens.css into dist for the consumer-facing subpath export.
    const dest = "dist/styles/tokens.css";
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync("src/styles/tokens.css", dest);
  },
});
```

- [ ] **Step 4: Create `packages/widgets/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include:     ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles:  ["src/test/setup.ts"],
    coverage:    { reporter: ["text", "html"], reportsDirectory: "coverage" },
  },
});
```

- [ ] **Step 5: Create `packages/widgets/src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Create `packages/widgets/src/styles/tokens.css`**

```css
:root {
  --tiler-color-page:        #0b0d12;
  --tiler-color-tile:        #131722;
  --tiler-color-tile-header: #1a1f2c;
  --tiler-color-gutter:      transparent;
  --tiler-color-text:        #e6edf3;
  --tiler-color-muted:       #8b95a7;
  --tiler-color-accent:      #5e8af3;
  --tiler-color-pass:        #10b981;
  --tiler-color-warn:        #f59e0b;
  --tiler-color-fail:        #ef4444;
  --tiler-color-skip:        #6b7280;
  --tiler-radius:            8px;
  --tiler-spacing-unit:      4px;
  --tiler-font-mono:         "JetBrains Mono", ui-monospace, monospace;
  --tiler-font-sans:         "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 7: Create `packages/widgets/src/lib/chart-colors.ts`**

```ts
import type { Panel } from "@aguspe/tiler-core";

const DEFAULT_PALETTE = [
  "var(--tiler-color-accent)",
  "var(--tiler-color-pass)",
  "var(--tiler-color-warn)",
  "var(--tiler-color-fail)",
  "var(--tiler-color-skip)",
];

export function chartColors(panel: Panel, override?: string[]): string[] {
  const cfg = panel.config as { color?: string; palette?: string[] };
  if (cfg.palette?.length) return cfg.palette;
  if (cfg.color)            return [cfg.color];
  return override ?? DEFAULT_PALETTE;
}
```

- [ ] **Step 8: Create `packages/widgets/src/index.ts`**

```ts
import "./styles/tokens.css";

export const TILER_WIDGETS_VERSION = "0.0.1" as const;
export { chartColors } from "./lib/chart-colors";
```

- [ ] **Step 9: Install + build**

Run:
```bash
pnpm install
pnpm --filter @aguspe/tiler-widgets build
```
Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/styles/tokens.css` written.

- [ ] **Step 10: Commit**

```bash
git add packages/widgets/package.json packages/widgets/tsconfig.json packages/widgets/tsup.config.ts \
        packages/widgets/vitest.config.ts packages/widgets/src/index.ts packages/widgets/src/test/setup.ts \
        packages/widgets/src/styles/tokens.css packages/widgets/src/lib/chart-colors.ts \
        pnpm-lock.yaml
git commit -m "feat(widgets): scaffold @aguspe/tiler-widgets package"
```

---

## Task 20: Clock widget

**Files:**
- Create: `packages/widgets/src/widgets/clock/schema.ts`
- Create: `packages/widgets/src/widgets/clock/ClockWidget.tsx`
- Create: `packages/widgets/src/widgets/clock/example.ts`
- Create: `packages/widgets/src/widgets/clock/index.ts`
- Create: `packages/widgets/src/widgets/clock/clock.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/widgets/src/widgets/clock/clock.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClockWidget } from "./ClockWidget";
import { ClockExample } from "./example";

afterEach(() => vi.useRealTimers());

describe("ClockWidget", () => {
  it("renders 24h time when configured", () => {
    vi.setSystemTime(new Date("2026-04-30T13:42:30.000Z"));
    const { panel } = ClockExample();
    render(<ClockWidget panel={{ ...panel, config: { format: "24h", timezone: "UTC", show_seconds: false } }}
                        data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("time")).toHaveTextContent("13:42");
  });

  it("renders 12h time with am/pm", () => {
    vi.setSystemTime(new Date("2026-04-30T13:42:30.000Z"));
    const { panel } = ClockExample();
    render(<ClockWidget panel={{ ...panel, config: { format: "12h", timezone: "UTC", show_seconds: false } }}
                        data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("time").textContent).toMatch(/1:42\s?PM/i);
  });

  it("includes seconds when show_seconds=true", () => {
    vi.setSystemTime(new Date("2026-04-30T13:42:30.000Z"));
    const { panel } = ClockExample();
    render(<ClockWidget panel={{ ...panel, config: { format: "24h", timezone: "UTC", show_seconds: true } }}
                        data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("time")).toHaveTextContent("13:42:30");
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: module resolution fails for `./ClockWidget` and `./example`.

- [ ] **Step 3: Implement the schema**

Create `packages/widgets/src/widgets/clock/schema.ts`:
```ts
import { z } from "zod";

export const ClockConfig = z.object({
  format:       z.enum(["24h", "12h"]).default("24h"),
  timezone:     z.string().default("UTC"),
  show_seconds: z.boolean().default(false),
});
export type ClockConfig = z.infer<typeof ClockConfig>;
```

- [ ] **Step 4: Implement the example fixture**

Create `packages/widgets/src/widgets/clock/example.ts`:
```ts
import type { Panel } from "@aguspe/tiler-core";

export function ClockExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T13:42:30.000Z";
  const panel: Panel = {
    id: "clock-1", dashboard_id: "demo", data_source_id: null,
    title: "Build clock", widget_type: "clock",
    x: 9, y: 0, width: 3, height: 2,
    config: { format: "24h", timezone: "UTC", show_seconds: false },
    created_at: now, updated_at: now,
  };
  return { panel, records: [] };
}
```

- [ ] **Step 5: Implement the React component**

Create `packages/widgets/src/widgets/clock/ClockWidget.tsx`:
```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { useEffect, useState } from "react";
import { ClockConfig } from "./schema";

export function ClockWidget({
  panel,
}: { panel: Panel; data: WidgetData<null> }): JSX.Element {
  const cfg = ClockConfig.parse(panel.config);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const period = cfg.show_seconds ? 1000 : 60_000;
    const id = setInterval(() => setNow(new Date()), period);
    return () => clearInterval(id);
  }, [cfg.show_seconds]);

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
    second: cfg.show_seconds ? "2-digit" : undefined,
    hour12: cfg.format === "12h",
    timeZone: cfg.timezone,
  });

  // The Intl output for 24h includes a leading zero on hour by default.
  // For 12h it appends "AM"/"PM". Both are acceptable to render directly.
  return (
    <time role="time" dateTime={now.toISOString()}>
      {formatter.format(now).replace(/ /g, " ")}
    </time>
  );
}
```

- [ ] **Step 6: Implement the registration glue**

Create `packages/widgets/src/widgets/clock/index.ts`:
```ts
import { defineWidget } from "@aguspe/tiler-core";
import { ClockWidget } from "./ClockWidget";
import { ClockExample } from "./example";
import { ClockConfig } from "./schema";

defineWidget({
  meta: {
    type: "clock",
    label: "Clock",
    description: "Shows the current time. No data source required.",
    requires_data_source: false,
    default_size: { w: 3, h: 2 },
    min_size:     { w: 2, h: 2 },
    max_size:     { w: 6, h: 4 },
  },
  configSchema: ClockConfig,
  component: ClockWidget,
  example: ClockExample,
});

export { ClockConfig, ClockWidget, ClockExample };
```

- [ ] **Step 7: Side-effect import from the package barrel**

Modify `packages/widgets/src/index.ts`:
```ts
import "./styles/tokens.css";
import "./widgets/clock";

export const TILER_WIDGETS_VERSION = "0.0.1" as const;
export { chartColors } from "./lib/chart-colors";
export { ClockConfig, ClockWidget } from "./widgets/clock";
```

- [ ] **Step 8: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: 3 clock tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/clock packages/widgets/src/index.ts
git commit -m "feat(widgets): add clock widget"
```

---

## Task 21: Text widget (markdown + rehype-sanitize)

**Files:**
- Create: `packages/widgets/src/widgets/text/schema.ts`
- Create: `packages/widgets/src/widgets/text/TextWidget.tsx`
- Create: `packages/widgets/src/widgets/text/example.ts`
- Create: `packages/widgets/src/widgets/text/index.ts`
- Create: `packages/widgets/src/widgets/text/text.test.tsx`
- Create: `packages/widgets/src/widgets/text/render-markdown.ts`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/widgets/src/widgets/text/text.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextExample } from "./example";
import { TextWidget } from "./TextWidget";

describe("TextWidget", () => {
  it("renders markdown headers and paragraphs", () => {
    const { panel } = TextExample();
    render(<TextWidget panel={{ ...panel, config: { markdown: "# Hello\n\nBody.", align: "left" } }}
                       data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText("Body.")).toBeInTheDocument();
  });

  it("strips <script> tags", () => {
    const { panel } = TextExample();
    render(<TextWidget panel={{ ...panel, config: { markdown: "<script>alert(1)</script>safe", align: "left" } }}
                       data={{ resolved: null, empty: false }} />);
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/safe/)).toBeInTheDocument();
  });

  it("strips inline event handlers", () => {
    const { panel } = TextExample();
    const md = '[click](javascript:alert(1) "x")';
    render(<TextWidget panel={{ ...panel, config: { markdown: md, align: "left" } }}
                       data={{ resolved: null, empty: false }} />);
    const link = screen.queryByRole("link");
    // either no link rendered (sanitizer strips javascript: URLs) or href rewritten
    if (link) expect(link.getAttribute("href")).not.toMatch(/^javascript:/i);
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: module resolution fails.

- [ ] **Step 3: Implement the schema**

Create `packages/widgets/src/widgets/text/schema.ts`:
```ts
import { z } from "zod";

export const TextConfig = z.object({
  markdown: z.string().default(""),
  align:    z.enum(["left", "center", "right"]).default("left"),
});
export type TextConfig = z.infer<typeof TextConfig>;
```

- [ ] **Step 4: Implement the markdown sanitizer**

Create `packages/widgets/src/widgets/text/render-markdown.ts`:
```ts
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const SAFE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ["rel", "noopener", "noreferrer"]],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize, SAFE_SCHEMA)
  .use(rehypeStringify);

export function renderMarkdown(source: string): string {
  return String(processor.processSync(source));
}
```

- [ ] **Step 5: Implement the example fixture**

Create `packages/widgets/src/widgets/text/example.ts`:
```ts
import type { Panel } from "@aguspe/tiler-core";

export function TextExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "text-1", dashboard_id: "demo", data_source_id: null,
    title: "Notes", widget_type: "text",
    x: 0, y: 0, width: 4, height: 3,
    config: {
      markdown: "## Sprint 12\n\nFollow [docs](https://example.com).",
      align: "left",
    },
    created_at: now, updated_at: now,
  };
  return { panel, records: [] };
}
```

- [ ] **Step 6: Implement the React component**

Create `packages/widgets/src/widgets/text/TextWidget.tsx`:
```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { useMemo } from "react";
import { renderMarkdown } from "./render-markdown";
import { TextConfig } from "./schema";

export function TextWidget({
  panel,
}: { panel: Panel; data: WidgetData<null> }): JSX.Element {
  const cfg = TextConfig.parse(panel.config);
  const html = useMemo(() => renderMarkdown(cfg.markdown), [cfg.markdown]);
  return (
    <div
      className="tiler-text"
      style={{ textAlign: cfg.align }}
      // Output is sanitized by rehype-sanitize via render-markdown.ts.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 7: Implement the registration glue**

Create `packages/widgets/src/widgets/text/index.ts`:
```ts
import { defineWidget } from "@aguspe/tiler-core";
import { TextExample } from "./example";
import { TextConfig } from "./schema";
import { TextWidget } from "./TextWidget";

defineWidget({
  meta: {
    type: "text",
    label: "Text",
    description: "Markdown text. Sanitized HTML output.",
    requires_data_source: false,
    default_size: { w: 3, h: 2 },
    min_size:     { w: 1, h: 1 },
    max_size:     { w: 12, h: 12 },
  },
  configSchema: TextConfig,
  component: TextWidget,
  example: TextExample,
});

export { TextConfig, TextWidget, TextExample };
```

- [ ] **Step 8: Update the package barrel**

Modify `packages/widgets/src/index.ts`:
```ts
import "./styles/tokens.css";
import "./widgets/clock";
import "./widgets/text";

export const TILER_WIDGETS_VERSION = "0.0.1" as const;
export { chartColors } from "./lib/chart-colors";
export { ClockConfig, ClockWidget } from "./widgets/clock";
export { TextConfig, TextWidget } from "./widgets/text";
```

- [ ] **Step 9: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: clock tests still pass; 3 text tests pass.

- [ ] **Step 10: Commit**

```bash
git add packages/widgets/src/widgets/text packages/widgets/src/index.ts
git commit -m "feat(widgets): add text widget with rehype-sanitize markdown"
```

---

## Task 22: Image widget (URL allowlist)

**Files:**
- Create: `packages/widgets/src/widgets/image/schema.ts`
- Create: `packages/widgets/src/widgets/image/ImageWidget.tsx`
- Create: `packages/widgets/src/widgets/image/example.ts`
- Create: `packages/widgets/src/widgets/image/index.ts`
- Create: `packages/widgets/src/widgets/image/image.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/widgets/src/widgets/image/image.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageExample } from "./example";
import { ImageWidget } from "./ImageWidget";
import { ImageConfig } from "./schema";

describe("ImageConfig", () => {
  it("accepts https URLs", () => {
    expect(ImageConfig.safeParse({ url: "https://x.com/y.png", alt: "y" }).success).toBe(true);
  });
  it("accepts relative URLs", () => {
    expect(ImageConfig.safeParse({ url: "/static/y.png", alt: "y" }).success).toBe(true);
  });
  it("rejects javascript: URLs", () => {
    expect(ImageConfig.safeParse({ url: "javascript:alert(1)", alt: "x" }).success).toBe(false);
  });
  it("rejects http: URLs (insecure)", () => {
    expect(ImageConfig.safeParse({ url: "http://x.com/y.png", alt: "y" }).success).toBe(false);
  });
});

describe("ImageWidget", () => {
  it("renders an <img> with the given alt text", () => {
    const { panel } = ImageExample();
    render(<ImageWidget panel={panel} data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("img", { name: panel.config.alt as string })).toBeInTheDocument();
  });

  it("sets referrerPolicy=no-referrer", () => {
    const { panel } = ImageExample();
    render(<ImageWidget panel={panel} data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("img").getAttribute("referrerpolicy")).toBe("no-referrer");
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: module resolution fails.

- [ ] **Step 3: Implement the schema**

Create `packages/widgets/src/widgets/image/schema.ts`:
```ts
import { z } from "zod";

const SAFE_URL = z.string().refine(
  (v) => v.startsWith("https://") || v.startsWith("/") || v.startsWith("./"),
  { message: "URL must be https or a relative path" },
);

export const ImageConfig = z.object({
  url: SAFE_URL,
  alt: z.string().default(""),
  fit: z.enum(["cover", "contain"]).default("cover"),
});
export type ImageConfig = z.infer<typeof ImageConfig>;
```

- [ ] **Step 4: Implement the example fixture**

Create `packages/widgets/src/widgets/image/example.ts`:
```ts
import type { Panel } from "@aguspe/tiler-core";

export function ImageExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "image-1", dashboard_id: "demo", data_source_id: null,
    title: "Logo", widget_type: "image",
    x: 0, y: 0, width: 4, height: 3,
    config: {
      url: "https://aguspe.github.io/tiler-ts/assets/logo.png",
      alt: "tiler-ts logo",
      fit: "contain",
    },
    created_at: now, updated_at: now,
  };
  return { panel, records: [] };
}
```

- [ ] **Step 5: Implement the React component**

Create `packages/widgets/src/widgets/image/ImageWidget.tsx`:
```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { ImageConfig } from "./schema";

export function ImageWidget({
  panel,
}: { panel: Panel; data: WidgetData<null> }): JSX.Element {
  const cfg = ImageConfig.parse(panel.config);
  return (
    <img
      src={cfg.url}
      alt={cfg.alt}
      referrerPolicy="no-referrer"
      style={{ width: "100%", height: "100%", objectFit: cfg.fit }}
    />
  );
}
```

- [ ] **Step 6: Implement the registration glue**

Create `packages/widgets/src/widgets/image/index.ts`:
```ts
import { defineWidget } from "@aguspe/tiler-core";
import { ImageExample } from "./example";
import { ImageWidget } from "./ImageWidget";
import { ImageConfig } from "./schema";

defineWidget({
  meta: {
    type: "image",
    label: "Image",
    description: "Static image. URLs must be https or relative.",
    requires_data_source: false,
    default_size: { w: 4, h: 3 },
    min_size:     { w: 1, h: 1 },
    max_size:     { w: 12, h: 12 },
  },
  configSchema: ImageConfig,
  component: ImageWidget,
  example: ImageExample,
});

export { ImageConfig, ImageWidget, ImageExample };
```

- [ ] **Step 7: Update the package barrel**

Modify `packages/widgets/src/index.ts`:
```ts
import "./styles/tokens.css";
import "./widgets/clock";
import "./widgets/text";
import "./widgets/image";

export const TILER_WIDGETS_VERSION = "0.0.1" as const;
export { chartColors } from "./lib/chart-colors";
export { ClockConfig, ClockWidget } from "./widgets/clock";
export { TextConfig, TextWidget } from "./widgets/text";
export { ImageConfig, ImageWidget } from "./widgets/image";
```

- [ ] **Step 8: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: all clock + text + image tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/image packages/widgets/src/index.ts
git commit -m "feat(widgets): add image widget with URL allowlist"
```

---

## Task 23: Iframe widget (sandbox allowlist)

**Files:**
- Create: `packages/widgets/src/widgets/iframe/schema.ts`
- Create: `packages/widgets/src/widgets/iframe/IframeWidget.tsx`
- Create: `packages/widgets/src/widgets/iframe/example.ts`
- Create: `packages/widgets/src/widgets/iframe/index.ts`
- Create: `packages/widgets/src/widgets/iframe/iframe.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/widgets/src/widgets/iframe/iframe.test.tsx`:
```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IframeExample } from "./example";
import { IframeWidget } from "./IframeWidget";
import { IframeConfig, SANDBOX_ALLOWLIST } from "./schema";

describe("IframeConfig", () => {
  it("accepts an https URL with default sandbox", () => {
    expect(IframeConfig.safeParse({ url: "https://x.com" }).success).toBe(true);
  });
  it("rejects javascript: URLs", () => {
    expect(IframeConfig.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("rejects sandbox tokens outside the allowlist", () => {
    expect(
      IframeConfig.safeParse({ url: "https://x.com", sandbox: ["allow-top-navigation"] }).success,
    ).toBe(false);
  });
  it("accepts allowlisted sandbox tokens", () => {
    expect(
      IframeConfig.safeParse({ url: "https://x.com", sandbox: ["allow-forms", "allow-scripts"] }).success,
    ).toBe(true);
  });
  it("allowlist excludes top-navigation and modals", () => {
    expect(SANDBOX_ALLOWLIST).not.toContain("allow-top-navigation");
    expect(SANDBOX_ALLOWLIST).not.toContain("allow-modals");
  });
});

describe("IframeWidget", () => {
  it("renders an iframe with the sandbox tokens joined", () => {
    const { panel } = IframeExample();
    const { container } = render(<IframeWidget panel={panel} data={{ resolved: null, empty: false }} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("sandbox")?.split(" ").sort()).toEqual(["allow-scripts"]);
  });

  it("includes consumer-added sandbox tokens", () => {
    const { panel } = IframeExample();
    const merged = { ...panel, config: { url: "https://x.com", sandbox: ["allow-forms"] } };
    const { container } = render(<IframeWidget panel={merged} data={{ resolved: null, empty: false }} />);
    expect(container.querySelector("iframe")?.getAttribute("sandbox")?.split(" ").sort())
      .toEqual(["allow-forms", "allow-scripts"]);
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: module resolution fails.

- [ ] **Step 3: Implement the schema**

Create `packages/widgets/src/widgets/iframe/schema.ts`:
```ts
import { z } from "zod";

const SAFE_URL = z.string().refine(
  (v) => v.startsWith("https://") || v.startsWith("/") || v.startsWith("./"),
  { message: "URL must be https or a relative path" },
);

export const SANDBOX_ALLOWLIST = [
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-same-origin",
  "allow-scripts",
] as const;
export type SandboxToken = (typeof SANDBOX_ALLOWLIST)[number];

const SandboxArray = z
  .array(z.enum(SANDBOX_ALLOWLIST))
  .default([])
  .transform((tokens) => Array.from(new Set([...tokens, "allow-scripts"] as SandboxToken[])));

export const IframeConfig = z.object({
  url:     SAFE_URL,
  sandbox: SandboxArray,
  allow:   z.array(z.string()).default([]),
});
export type IframeConfig = z.infer<typeof IframeConfig>;
```

- [ ] **Step 4: Implement the example fixture**

Create `packages/widgets/src/widgets/iframe/example.ts`:
```ts
import type { Panel } from "@aguspe/tiler-core";

export function IframeExample(): { panel: Panel; records: never[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "iframe-1", dashboard_id: "demo", data_source_id: null,
    title: "Embedded view", widget_type: "iframe",
    x: 0, y: 0, width: 6, height: 4,
    config: {
      url: "https://aguspe.github.io/tiler-ts/embedded.html",
      sandbox: ["allow-scripts"],
      allow: [],
    },
    created_at: now, updated_at: now,
  };
  return { panel, records: [] };
}
```

- [ ] **Step 5: Implement the React component**

Create `packages/widgets/src/widgets/iframe/IframeWidget.tsx`:
```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { IframeConfig } from "./schema";

export function IframeWidget({
  panel,
}: { panel: Panel; data: WidgetData<null> }): JSX.Element {
  const cfg = IframeConfig.parse(panel.config);
  return (
    <iframe
      title={panel.title}
      src={cfg.url}
      sandbox={cfg.sandbox.join(" ")}
      allow={cfg.allow.join("; ")}
      referrerPolicy="no-referrer"
      style={{ width: "100%", height: "100%", border: 0 }}
    />
  );
}
```

- [ ] **Step 6: Implement the registration glue**

Create `packages/widgets/src/widgets/iframe/index.ts`:
```ts
import { defineWidget } from "@aguspe/tiler-core";
import { IframeExample } from "./example";
import { IframeWidget } from "./IframeWidget";
import { IframeConfig } from "./schema";

defineWidget({
  meta: {
    type: "iframe",
    label: "Iframe",
    description: "Embed an external URL with a sandbox allowlist.",
    requires_data_source: false,
    default_size: { w: 6, h: 4 },
    min_size:     { w: 2, h: 2 },
    max_size:     { w: 12, h: 12 },
  },
  configSchema: IframeConfig,
  component: IframeWidget,
  example: IframeExample,
});

export { IframeConfig, IframeWidget, IframeExample };
```

- [ ] **Step 7: Update the package barrel**

Modify `packages/widgets/src/index.ts`:
```ts
import "./styles/tokens.css";
import "./widgets/clock";
import "./widgets/text";
import "./widgets/image";
import "./widgets/iframe";

export const TILER_WIDGETS_VERSION = "0.0.1" as const;
export { chartColors } from "./lib/chart-colors";
export { ClockConfig, ClockWidget } from "./widgets/clock";
export { TextConfig, TextWidget } from "./widgets/text";
export { ImageConfig, ImageWidget } from "./widgets/image";
export { IframeConfig, IframeWidget } from "./widgets/iframe";
```

- [ ] **Step 8: Run the tests, expect PASS**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: all clock + text + image + iframe tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/iframe packages/widgets/src/index.ts
git commit -m "feat(widgets): add iframe widget with sandbox allowlist"
```

---

## Task 24: Storybook for `@aguspe/tiler-widgets`

**Files:**
- Create: `packages/widgets/.storybook/main.ts`
- Create: `packages/widgets/.storybook/preview.ts`
- Create: `packages/widgets/src/widgets/clock/clock.stories.tsx`
- Create: `packages/widgets/src/widgets/text/text.stories.tsx`
- Create: `packages/widgets/src/widgets/image/image.stories.tsx`
- Create: `packages/widgets/src/widgets/iframe/iframe.stories.tsx`
- Modify: `packages/widgets/package.json` (add Storybook scripts + dev deps)

- [ ] **Step 1: Add Storybook dev deps + scripts**

Run:
```bash
pnpm --filter @aguspe/tiler-widgets add -D \
  @storybook/react-vite@^8.3.0 \
  @storybook/react@^8.3.0 \
  @storybook/test@^8.3.0 \
  storybook@^8.3.0 \
  @vitejs/plugin-react@^4.3.0 \
  vite@^5.4.0
```

Then add to `packages/widgets/package.json` `scripts`:
```json
"storybook":       "storybook dev -p 6006 --no-open",
"build-storybook": "storybook build -o .storybook-static"
```

- [ ] **Step 2: Create `packages/widgets/.storybook/main.ts`**

```ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories:   ["../src/**/*.stories.@(ts|tsx)"],
  addons:    [],
  docs:      { autodocs: false },
  typescript:{ check: false },
};

export default config;
```

- [ ] **Step 3: Create `packages/widgets/.storybook/preview.ts`**

```ts
import type { Preview } from "@storybook/react";
import "../src/styles/tokens.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "tiler-page",
      values: [{ name: "tiler-page", value: "#0b0d12" }],
    },
    layout: "fullscreen",
  },
};
export default preview;
```

- [ ] **Step 4: Create `packages/widgets/src/widgets/clock/clock.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ClockExample } from "./example";
import { ClockWidget } from "./ClockWidget";

const meta: Meta<typeof ClockWidget> = {
  title: "Widgets/Clock",
  component: ClockWidget,
};
export default meta;

type Story = StoryObj<typeof ClockWidget>;

const ex = ClockExample();

export const Default24h: Story = {
  args: { panel: ex.panel, data: { resolved: null, empty: false } },
};

export const Format12h: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, format: "12h" } },
    data:  { resolved: null, empty: false },
  },
};

export const WithSeconds: Story = {
  args: {
    panel: { ...ex.panel, config: { ...ex.panel.config, show_seconds: true } },
    data:  { resolved: null, empty: false },
  },
};
```

- [ ] **Step 5: Create `packages/widgets/src/widgets/text/text.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { TextExample } from "./example";
import { TextWidget } from "./TextWidget";

const meta: Meta<typeof TextWidget> = {
  title: "Widgets/Text",
  component: TextWidget,
};
export default meta;

type Story = StoryObj<typeof TextWidget>;

const ex = TextExample();

export const Default: Story = {
  args: { panel: ex.panel, data: { resolved: null, empty: false } },
};

export const HeadersAndLists: Story = {
  args: {
    panel: {
      ...ex.panel,
      config: {
        markdown: "# H1\n\n## H2\n\n- one\n- two\n\n**bold** and _italic_.",
        align: "left",
      },
    },
    data: { resolved: null, empty: false },
  },
};
```

- [ ] **Step 6: Create `packages/widgets/src/widgets/image/image.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ImageExample } from "./example";
import { ImageWidget } from "./ImageWidget";

const meta: Meta<typeof ImageWidget> = {
  title: "Widgets/Image",
  component: ImageWidget,
};
export default meta;

type Story = StoryObj<typeof ImageWidget>;

export const Default: Story = {
  args: { panel: ImageExample().panel, data: { resolved: null, empty: false } },
};
```

- [ ] **Step 7: Create `packages/widgets/src/widgets/iframe/iframe.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { IframeExample } from "./example";
import { IframeWidget } from "./IframeWidget";

const meta: Meta<typeof IframeWidget> = {
  title: "Widgets/Iframe",
  component: IframeWidget,
};
export default meta;

type Story = StoryObj<typeof IframeWidget>;

export const Default: Story = {
  args: { panel: IframeExample().panel, data: { resolved: null, empty: false } },
};
```

- [ ] **Step 8: Build Storybook (catches story compile errors)**

Run: `pnpm --filter @aguspe/tiler-widgets build-storybook`
Expected: `.storybook-static/index.html` written; build exits zero.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/.storybook packages/widgets/src/widgets/*/*.stories.tsx \
        packages/widgets/package.json pnpm-lock.yaml
git commit -m "feat(widgets): add Storybook with stories for the 4 config-only widgets"
```

---

## Task 25: Hook `typecheck` and `size` Turbo tasks into the root scripts

**Files:**
- Modify: `packages/core/package.json`
- Modify: `packages/widgets/package.json`
- Create: `packages/widgets/.size-limit.json`
- Create: `packages/core/.size-limit.json`

- [ ] **Step 1: Add a `size` script to `@aguspe/tiler-core`**

Modify `packages/core/package.json` `scripts`:
```json
"size": "size-limit"
```

- [ ] **Step 2: Create `packages/core/.size-limit.json`**

```json
[
  { "name": "@aguspe/tiler-core (esm)", "path": "dist/index.js",  "limit": "30 KB" },
  { "name": "@aguspe/tiler-core (cjs)", "path": "dist/index.cjs", "limit": "30 KB" }
]
```

- [ ] **Step 3: Add a `size` script to `@aguspe/tiler-widgets`**

Modify `packages/widgets/package.json` `scripts`:
```json
"size": "size-limit"
```

- [ ] **Step 4: Create `packages/widgets/.size-limit.json`**

(Conservative early ceiling — Plan 2 will tighten when chart widgets land.)
```json
[
  { "name": "@aguspe/tiler-widgets (esm)", "path": "dist/index.js", "limit": "60 KB" }
]
```

- [ ] **Step 5: Run sizes locally to confirm we're under budget**

Run:
```bash
pnpm --filter @aguspe/tiler-core build
pnpm --filter @aguspe/tiler-widgets build
pnpm --filter @aguspe/tiler-core size
pnpm --filter @aguspe/tiler-widgets size
```
Expected: both report `OK` and well under their respective ceilings.

- [ ] **Step 6: Commit**

```bash
git add packages/core/package.json packages/core/.size-limit.json \
        packages/widgets/package.json packages/widgets/.size-limit.json
git commit -m "chore: add size-limit budgets for core and widgets"
```

---

## Task 26: Cross-package end-to-end smoke test

**Files:**
- Create: `packages/widgets/src/registry.smoke.test.ts`

The four widgets self-register on import. This test verifies the registry is
correctly populated when consumers `import "@aguspe/tiler-widgets"`.

- [ ] **Step 1: Write the smoke test**

Create `packages/widgets/src/registry.smoke.test.ts`:
```ts
import { getWidget, listWidgets } from "@aguspe/tiler-core";
import { describe, expect, it } from "vitest";
import "./index"; // side-effect: registers all four widgets

describe("registry smoke — all four config-only widgets register", () => {
  it.each(["clock", "text", "image", "iframe"])("%s is registered", (type) => {
    expect(getWidget(type)).toBeDefined();
  });

  it("listWidgets returns 4 widgets", () => {
    expect(listWidgets()).toHaveLength(4);
  });

  it("none of the four widgets requires a data source", () => {
    expect(listWidgets().every((w) => w.meta.requires_data_source === false)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, expect PASS**

Run: `pnpm --filter @aguspe/tiler-widgets test`
Expected: smoke test passes alongside the existing widget tests.

- [ ] **Step 3: Commit**

```bash
git add packages/widgets/src/registry.smoke.test.ts
git commit -m "test(widgets): add cross-package registry smoke test"
```

---

## Task 27: Wire `typecheck` into Turbo and the root `pnpm typecheck`

**Files:**
- Verify only — no edits expected.

- [ ] **Step 1: Run repo-wide typecheck via Turbo**

Run: `pnpm typecheck`
Expected: Turbo runs `tsc --noEmit` in both `@aguspe/tiler-core` and `@aguspe/tiler-widgets`. Zero errors.

- [ ] **Step 2: Run repo-wide tests via Turbo**

Run: `pnpm test`
Expected: Vitest runs in both packages. All tests pass.

- [ ] **Step 3: Run repo-wide build**

Run: `pnpm build`
Expected: Both packages build cleanly into their respective `dist/`.

- [ ] **Step 4: Run repo-wide deps + size + lint**

Run:
```bash
pnpm lint
pnpm deps
pnpm size
```
Expected: all three exit zero with no violations.

- [ ] **Step 5: Tag the milestone**

```bash
git tag -a v0.0.1-phase-1 -m "Phase 1 foundation — core schemas, registry, MemoryStore, 4 config-only widgets"
```

(No `git push` here — leave that for the user when they're ready to push to GitHub.)

---

## Task 28: Phase-1 README and CONTRIBUTING

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `LICENSE`

- [ ] **Step 1: Create `LICENSE`**

```text
MIT License

Copyright (c) 2026 Augustin Gottlieb

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create `README.md`**

```markdown
# tiler-ts

> Plug-and-play dashboards for TypeScript / Node.js. Playwright-first.

A TypeScript port of [Tiler](https://github.com/aguspe/tiler) (Rails engine).
Distributed as a set of npm packages under the `@aguspe/tiler-*` scope.

## Status: Phase 1 — Foundation

This repository is currently in early development. Phase 1 ships:

- `@aguspe/tiler-core` — schemas, widget contract, registry, `MemoryStore`
- `@aguspe/tiler-widgets` — React widget components (4 of 14 in Phase 1: clock, text, image, iframe)

Phases 2–7 add the remaining 10 widgets, the static viewer, the Playwright reporter,
the Fastify server with sqlite store, the gridstack-based editor, the CLI, and v1.0.0 release.

## Quick start (development)

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @aguspe/tiler-widgets storybook
```

Open [http://localhost:6006](http://localhost:6006) for the widget gallery.

## Design

See [`docs/superpowers/specs/2026-04-30-tiler-ts-design.md`](docs/superpowers/specs/2026-04-30-tiler-ts-design.md) for the full v1 design spec.

## License

MIT — see [LICENSE](LICENSE).
```

- [ ] **Step 3: Create `CONTRIBUTING.md`**

```markdown
# Contributing to tiler-ts

## Prerequisites

- Node.js 20.18+ (a `.nvmrc` is checked in)
- pnpm 9.12+ (set via `packageManager` in root `package.json`)

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
```

## Adding a changeset

Every PR that touches a publishable package needs a changeset:

```bash
pnpm changeset
# follow the prompts; commit the .changeset/*.md file
```

## Workspace layout

See `pnpm-workspace.yaml` and the design spec for package responsibilities.
The `@aguspe/tiler-core` package is leaf-most — it must not import from any
other workspace package. This is enforced by `dependency-cruiser` in CI.
```

- [ ] **Step 4: Commit**

```bash
git add README.md CONTRIBUTING.md LICENSE
git commit -m "docs: add README, CONTRIBUTING, and MIT LICENSE"
```

---

## Phase 1 verification (final)

- [ ] **Step 1: Re-run the full pipeline**

Run:
```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm deps
pnpm size
```
Expected: every step exits zero.

- [ ] **Step 2: Verify Storybook builds cleanly**

Run: `pnpm --filter @aguspe/tiler-widgets build-storybook`
Expected: `.storybook-static/index.html` exists.

- [ ] **Step 3: Verify the 4 widgets self-register**

Run: `pnpm --filter @aguspe/tiler-widgets test --run registry.smoke`
Expected: smoke test passes; `listWidgets()` returns 4 entries.

- [ ] **Step 4: Confirm the milestone tag exists**

Run: `git tag --list v0.0.1-phase-1`
Expected: prints `v0.0.1-phase-1`.

If all four checks pass, Phase 1 is complete and ready for Phase 2 plan-writing.

---

## Phase 1 → Phase 2 handoff

**What's working at the end of Phase 1:**
- A pnpm + Turbo monorepo with green CI on Node 20 and 22, ubuntu and macos.
- `@aguspe/tiler-core` published-shape package with: ULID generation, Zod schemas (Dashboard, DataSource, DataRecord, Panel, time-window, snapshot, primitives), widget contract types, a registry (`defineWidget`/`getWidget`/`listWidgets`), the `TilerStore` interface, and a working `MemoryStore`.
- `@aguspe/tiler-widgets` package with: tokens.css, `chartColors` helper, and four registered widgets (clock, text, image, iframe) with tests + Storybook stories.
- Boundary rules enforced (`@aguspe/tiler-core` is leaf-most, no circular deps).
- Size budgets enforced (core ≤ 30 KB, widgets ≤ 60 KB at this stage).
- README + CONTRIBUTING + MIT LICENSE.

**What Phase 2 will add:**
- `chartColors` will get exercised properly (charts arrive in Plan 2).
- The 10 remaining widgets: `metric`, `meter`, `number_with_delta`, `status_grid`, `comments`, `list`, `table`, `line_chart`, `bar_chart`, `pie_chart`.
- Each widget gets: a Zod config schema, a pure `resolve()` function (the data-backed ones), a React component, an example fixture, registration glue, and a Storybook story.
- Visual regression tests via Playwright on the built Storybook.
- Tightened size-limit budget for `@aguspe/tiler-widgets` (target ≤ 110 KB gzipped, with charts code-split).

Plan 2 will be drafted as `docs/superpowers/plans/<date>-tiler-ts-phase-2-widgets.md` once Phase 1 is built and tagged.
