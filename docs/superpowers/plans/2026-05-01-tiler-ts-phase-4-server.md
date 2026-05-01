# tiler-ts Phase 4 — Server + SQLite + Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `@aguspe/tiler-server` — a Fastify server that hosts Tiler dashboards live, persists them in sqlite (via a new `BetterSqliteStore`), accepts HMAC-signed webhook ingestion + manual entry + CSV import, and pushes live updates over WebSocket. Mount the read-only viewer at `/dashboards/:slug` (the editor lands in Phase 5). Add a `defineConfig` helper to `@aguspe/tiler-core` so users can write a typed `tiler.config.ts`. Ship `examples/server-live/` — a runnable demo seeded with the `test_automation` preset and a webhook ingestion smoke test.

**Architecture:** Fastify 5 + better-sqlite3 + @fastify/websocket. The server is a single Node process binding by default to `localhost:4567`. The `TilerStore` interface (defined in core) is implemented as `BetterSqliteStore`, with the in-memory `MemoryStore` available as a fallback for tests. Webhook ingestion verifies HMAC-SHA256 signatures over the raw POST body. WebSocket push uses one server-side timer per loaded dashboard's `refresh_seconds` value, paused when no clients are subscribed. The viewer is mounted server-side via the existing `renderToHtml` and the pre-built client bundle is served from the viewer package's `dist/client/`.

**Tech Stack:** Fastify 5, @fastify/websocket, @fastify/static, @fastify/cookie, better-sqlite3, bcryptjs (for hashing per-source webhook tokens), pino (default fastify logger). Tsup for build. Vitest + supertest-style HTTP assertions via Fastify's built-in `inject()` API. Node 20+ (better-sqlite3 prebuilds available for darwin-arm64, darwin-x64, linux-x64, linux-arm64).

**Spec reference:** `docs/superpowers/specs/2026-04-30-tiler-ts-design.md` — §2 `TilerStore`, §4B server routes, §5 security/HMAC, §6 testing.

**Phase 3 prerequisite:** tag `v0.0.3-phase-3`. Reporter ships, viewer's `renderToHtml` exists, MemoryStore + buildSnapshot landed in core, all 14 widgets work.

---

## Per-package conventions

`@aguspe/tiler-server`:
- All sources under `src/`, single tsup entry.
- `src/store/` — sqlite store + migrations.
- `src/routes/` — one file per route group (dashboards, panels, sources, ingest, ws).
- `src/server.ts` — `createServer(opts)` factory; `start()` for stand-alone use.
- `src/auth/` — basic auth, HMAC verification, CSRF.
- `src/refresh.ts` — refresh-loop timer.
- The package never imports `@aguspe/tiler-editor` (Phase 5).
- `better-sqlite3` is a runtime dep (prebuilds ship for major platforms; rebuilds via `node-gyp` if no prebuild).

The `defineConfig` helper added in Task 1 lives in `@aguspe/tiler-core` so `tiler.config.ts` files can be typed without depending on the server package directly. The server reads `tiler.config.ts` at boot if `--config <path>` is passed.

---

## Task 1: `defineConfig` helper in `@aguspe/tiler-core`

**Files:**
- Create: `packages/core/src/config.ts`
- Create: `packages/core/src/config.test.ts`
- Modify: `packages/core/src/index.ts`

A typed config helper for `tiler.config.ts`. Used by the server (Task 6+) and the future `tiler serve` CLI (Phase 6). Exposes a typed `store` slot whose value can be any `TilerStore` instance — but the schema only validates the shape of `auth`, `port`, `widgets`, `presets`. The store itself is a runtime opaque value.

- [ ] **Step 1: Test**

`packages/core/src/config.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { defineConfig } from "./config";
import { MemoryStore } from "./memory_store";

describe("defineConfig", () => {
  it("accepts a minimal config", () => {
    const cfg = defineConfig({
      store: new MemoryStore(),
    });
    expect(cfg.port).toBe(4567);
    expect(cfg.widgets).toEqual([]);
  });

  it("preserves all provided fields", () => {
    const cfg = defineConfig({
      store: new MemoryStore(),
      port: 8080,
      auth: { basic: { user: "x", pass: "y" }, webhookSecret: "secret" },
      widgets: ["@aguspe/tiler-widgets"],
      presets: ["test_automation"],
    });
    expect(cfg.port).toBe(8080);
    expect(cfg.auth?.basic?.user).toBe("x");
    expect(cfg.widgets).toEqual(["@aguspe/tiler-widgets"]);
  });
});
```

- [ ] **Step 2: Implement**

`packages/core/src/config.ts`:
```ts
import type { TilerStore } from "./store";

export interface AuthConfig {
  /** HTTP Basic credentials for the read-write UI. Both required if either present. */
  basic?: { user: string; pass: string };
  /** Default HMAC secret for /ingest/* routes. Per-source tokens override. */
  webhookSecret?: string;
  /** Pluggable callback overriding built-in auth. Called per request. */
  authorize?: (req: unknown) => Promise<{ canView: boolean; canManage: boolean }>;
  /** Maximum allowed clock skew on webhook `recorded_at` fields. Default 30 days back, 5 min forward. */
  recordedAtSkewMs?: number;
}

export interface TilerConfig {
  /** TilerStore implementation. Required. */
  store: TilerStore;
  /** Port to bind. Default 4567. */
  port?: number;
  /** Bind address. Default "127.0.0.1" (localhost-only). */
  host?: string;
  /** Auth configuration. */
  auth?: AuthConfig;
  /** Widget packages to register at boot, in order. */
  widgets?: string[];
  /** Presets to seed on first boot if their slug doesn't exist yet. */
  presets?: string[];
  /** Path to @aguspe/tiler-viewer's dist/client. Auto-resolved from node_modules if omitted. */
  viewerClientDir?: string;
}

export interface ResolvedTilerConfig extends Required<Omit<TilerConfig, "auth" | "viewerClientDir">> {
  auth: AuthConfig;
  viewerClientDir?: string;
}

export function defineConfig(input: TilerConfig): ResolvedTilerConfig {
  return {
    store: input.store,
    port: input.port ?? 4567,
    host: input.host ?? "127.0.0.1",
    auth: input.auth ?? {},
    widgets: input.widgets ?? [],
    presets: input.presets ?? [],
    ...(input.viewerClientDir !== undefined && { viewerClientDir: input.viewerClientDir }),
  };
}
```

- [ ] **Step 3: Re-export from barrel**

Append:
```ts
export * from "./config";
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @aguspe/tiler-core test
git add packages/core/src/config.ts packages/core/src/config.test.ts packages/core/src/index.ts
git commit -m "feat(core): add defineConfig() helper for typed tiler.config.ts"
```

---

## Task 2: Scaffold `@aguspe/tiler-server` package

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/tsup.config.ts`
- Create: `packages/server/vitest.config.ts`
- Create: `packages/server/src/index.ts` (placeholder)

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@aguspe/tiler-server",
  "version": "0.0.1",
  "description": "Fastify server for tiler-ts. SQLite-backed, HMAC ingestion, WebSocket live updates.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/aguspe/tiler-ts.git",
    "directory": "packages/server"
  },
  "homepage": "https://github.com/aguspe/tiler-ts/tree/main/packages/server",
  "publishConfig": { "access": "public" },
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./sqlite": {
      "types": "./dist/store/sqlite.d.ts",
      "import": "./dist/store/sqlite.js",
      "require": "./dist/store/sqlite.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@aguspe/tiler-core": "workspace:*",
    "@aguspe/tiler-viewer": "workspace:*",
    "@aguspe/tiler-widgets": "workspace:*",
    "@fastify/cookie": "^11.0.0",
    "@fastify/static": "^8.0.0",
    "@fastify/websocket": "^11.0.0",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^11.5.0",
    "fastify": "^5.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.7.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`**

`tsconfig.json`: same shape as other packages.

`tsup.config.ts`:
```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/store/sqlite.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  external: ["better-sqlite3", "fastify", "@fastify/*", "react", "react-dom", "react-dom/server"],
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Placeholder src**

`src/index.ts`:
```ts
export const TILER_SERVER_VERSION = "0.0.1" as const;
```

- [ ] **Step 4: Install + build**

```bash
pnpm install
pnpm --filter @aguspe/tiler-server build
```

If `better-sqlite3` install fails (rebuild error), the prebuild may not be available for the host's Node version. The plan-execution should note this and try `pnpm --filter @aguspe/tiler-server install --force` or a different Node version.

- [ ] **Step 5: Commit**

```bash
git add packages/server/ pnpm-lock.yaml
git commit -m "feat(server): scaffold @aguspe/tiler-server package"
```

---

## Task 3: SQLite schema + migrations

**Files:**
- Create: `packages/server/src/store/migrations.ts`
- Create: `packages/server/src/store/migrations.test.ts`

Pure SQL migrations runnable against any `better-sqlite3` Database handle. One migration array, applied in order, idempotent via a `tiler_schema_versions` tracking table.

- [ ] **Step 1: Test (uses an in-memory sqlite)**

```ts
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { migrate, MIGRATIONS } from "./migrations";

describe("migrate", () => {
  it("creates all tables on a fresh DB", () => {
    const db = new Database(":memory:");
    migrate(db);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name).sort();
    expect(names).toContain("tiler_dashboards");
    expect(names).toContain("tiler_data_sources");
    expect(names).toContain("tiler_data_records");
    expect(names).toContain("tiler_panels");
    expect(names).toContain("tiler_schema_versions");
  });

  it("is idempotent", () => {
    const db = new Database(":memory:");
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
    const versions = db.prepare("SELECT version FROM tiler_schema_versions ORDER BY version").all() as Array<{ version: number }>;
    expect(versions.map((v) => v.version)).toEqual(Array.from({ length: MIGRATIONS.length }, (_, i) => i + 1));
  });

  it("creates the composite index on data_records (data_source_id, recorded_at DESC)", () => {
    const db = new Database(":memory:");
    migrate(db);
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tiler_data_records'").all() as Array<{ name: string }>;
    expect(indexes.some((i) => i.name === "idx_records_source_recorded_at")).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { Database } from "better-sqlite3";

interface Migration {
  version: number;
  description: string;
  up: (db: Database) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "core tables (dashboards, data_sources, data_records, panels)",
    up: (db) => {
      db.exec(`
        CREATE TABLE tiler_dashboards (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          slug            TEXT NOT NULL UNIQUE,
          description     TEXT,
          refresh_seconds INTEGER NOT NULL DEFAULT 0,
          settings        TEXT NOT NULL DEFAULT '{}',
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL
        );

        CREATE TABLE tiler_data_sources (
          id                TEXT PRIMARY KEY,
          name              TEXT NOT NULL,
          slug              TEXT NOT NULL UNIQUE,
          description       TEXT,
          schema_definition TEXT NOT NULL DEFAULT '[]',
          ingestion_methods TEXT NOT NULL DEFAULT '[]',
          webhook_token     TEXT,
          active            INTEGER NOT NULL DEFAULT 1,
          created_at        TEXT NOT NULL,
          updated_at        TEXT NOT NULL
        );

        CREATE TABLE tiler_data_records (
          id              TEXT PRIMARY KEY,
          data_source_id  TEXT NOT NULL REFERENCES tiler_data_sources(id) ON DELETE CASCADE,
          payload         TEXT NOT NULL,
          recorded_at     TEXT NOT NULL,
          source_ref      TEXT,
          ingested_via    TEXT NOT NULL,
          created_at      TEXT NOT NULL
        );

        CREATE INDEX idx_records_source_recorded_at
          ON tiler_data_records (data_source_id, recorded_at DESC);

        CREATE TABLE tiler_panels (
          id              TEXT PRIMARY KEY,
          dashboard_id    TEXT NOT NULL REFERENCES tiler_dashboards(id) ON DELETE CASCADE,
          data_source_id  TEXT REFERENCES tiler_data_sources(id) ON DELETE SET NULL,
          title           TEXT NOT NULL,
          widget_type     TEXT NOT NULL,
          x               INTEGER NOT NULL,
          y               INTEGER NOT NULL,
          width           INTEGER NOT NULL,
          height          INTEGER NOT NULL,
          config          TEXT NOT NULL DEFAULT '{}',
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL
        );

        CREATE INDEX idx_panels_dashboard ON tiler_panels (dashboard_id);
      `);
    },
  },
];

const TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS tiler_schema_versions (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )
`;

export function migrate(db: Database): void {
  db.exec(TRACKING_TABLE);
  const applied = new Set(
    (db.prepare("SELECT version FROM tiler_schema_versions").all() as Array<{ version: number }>)
      .map((row) => row.version),
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    db.transaction(() => {
      m.up(db);
      db.prepare("INSERT INTO tiler_schema_versions (version, applied_at) VALUES (?, ?)")
        .run(m.version, new Date().toISOString());
    })();
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @aguspe/tiler-server test
git add packages/server/src/store/
git commit -m "feat(server): add sqlite migrations (idempotent, version-tracked)"
```

---

## Task 4: `BetterSqliteStore`

**Files:**
- Create: `packages/server/src/store/sqlite.ts`
- Create: `packages/server/src/store/sqlite.test.ts`

Implements the `TilerStore` interface from core. Synchronous better-sqlite3 calls wrapped in `async` for interface compliance.

- [ ] **Step 1: Test**

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BetterSqliteStore } from "./sqlite";

let tmp: string;
let store: BetterSqliteStore;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), "tiler-sqlite-"));
  store = new BetterSqliteStore({ path: join(tmp, "tiler.db") });
  await store.migrate();
});
afterEach(async () => {
  await store.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe("BetterSqliteStore — dashboards", () => {
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

  it("deleteDashboard cascades to panels", async () => {
    const d = await store.upsertDashboard({
      name: "QA", slug: "qa", description: null, refresh_seconds: 0,
      settings: { tv_mode: false },
    });
    await store.upsertPanel({
      dashboard_id: d.id, data_source_id: null,
      title: "x", widget_type: "clock",
      x: 0, y: 0, width: 3, height: 2, config: {},
    });
    expect(await store.listPanels(d.id)).toHaveLength(1);
    await store.deleteDashboard(d.id);
    expect(await store.listPanels(d.id)).toHaveLength(0);
  });
});

describe("BetterSqliteStore — records", () => {
  it("filters by dataSourceId + time window using the index", async () => {
    const src = await store.upsertDataSource({
      name: "Runs", slug: "runs", description: null,
      schema_definition: [], ingestion_methods: ["webhook"],
      webhook_token: null, active: true,
    });
    await store.insertRecordsBatch([
      { data_source_id: src.id, payload: { status: "pass" },
        recorded_at: "2026-04-30T11:00:00.000Z", source_ref: null, ingested_via: "webhook" },
      { data_source_id: src.id, payload: { status: "fail" },
        recorded_at: "2026-04-29T11:00:00.000Z", source_ref: null, ingested_via: "webhook" },
    ]);
    const result = await store.queryRecords({
      dataSourceId: src.id, since: "2026-04-30T00:00:00.000Z",
      orderBy: "recorded_at_desc",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.payload).toEqual({ status: "pass" });
  });
});
```

- [ ] **Step 2: Implement**

The full implementation is mechanical — for each method on `TilerStore`, prepare a sqlite statement and execute. JSON columns (`settings`, `schema_definition`, `ingestion_methods`, `payload`, `config`) are stringified on write, parsed on read. Use `transaction(...)` for `insertRecordsBatch`. Boolean `active` is mapped to `INTEGER`.

Skeleton:
```ts
import Database from "better-sqlite3";
import {
  newId,
  type Dashboard, type DashboardInput,
  type DataRecord, type DataRecordInput,
  type DataSource, type DataSourceInput,
  type Panel, type PanelInput,
  type RecordQuery, type TilerStore,
} from "@aguspe/tiler-core";
import { migrate } from "./migrations";

export interface BetterSqliteStoreOptions {
  path: string;
}

export class BetterSqliteStore implements TilerStore {
  private readonly db: Database.Database;

  constructor(opts: BetterSqliteStoreOptions) {
    this.db = new Database(opts.path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  async migrate(): Promise<void> { migrate(this.db); }
  async close(): Promise<void> { this.db.close(); }

  // ... CRUD methods, see plan body ...
}
```

For the full implementation, follow the patterns in `MemoryStore` (in core), translating each method body to sqlite prepared statements. Two important conventions:
- Every row→entity conversion goes through a `rowToDashboard()` / `rowToDataSource()` / etc. helper that handles JSON parsing.
- Every entity→row conversion stringifies JSON fields and converts booleans to `0`/`1`.

Cover all 18 methods: `listDashboards`, `getDashboard`, `upsertDashboard`, `deleteDashboard`, `listPanels`, `upsertPanel`, `deletePanel`, `listDataSources`, `getDataSource`, `getDataSourceByToken`, `upsertDataSource`, `deleteDataSource`, `insertRecord`, `insertRecordsBatch`, `queryRecords`, `pruneRecords`, `migrate`, `close`.

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @aguspe/tiler-server test
git add packages/server/src/store/
git commit -m "feat(server): add BetterSqliteStore (TilerStore implementation backed by sqlite)"
```

---

## Task 5: HMAC verification

**Files:**
- Create: `packages/server/src/auth/hmac.ts`
- Create: `packages/server/src/auth/hmac.test.ts`

Verifies `X-Tiler-Signature: sha256=<hex>` against the raw POST body. Constant-time comparison to prevent timing attacks.

- [ ] **Step 1: Test**

```ts
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signBody, verifyHmac } from "./hmac";

const SECRET = "super-secret";
const BODY = '{"hello":"world"}';

describe("verifyHmac", () => {
  it("accepts a correctly-signed request", () => {
    const sig = signBody(SECRET, BODY);
    expect(verifyHmac(SECRET, BODY, sig)).toBe(true);
  });
  it("rejects a tampered body", () => {
    const sig = signBody(SECRET, BODY);
    expect(verifyHmac(SECRET, BODY + "X", sig)).toBe(false);
  });
  it("rejects a signature with the wrong secret", () => {
    const sig = signBody("other", BODY);
    expect(verifyHmac(SECRET, BODY, sig)).toBe(false);
  });
  it("rejects a malformed signature header", () => {
    expect(verifyHmac(SECRET, BODY, "not-a-signature")).toBe(false);
    expect(verifyHmac(SECRET, BODY, "sha256=zzz")).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function signBody(secret: string, body: string): string {
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

export function verifyHmac(secret: string, body: string, signature: string): boolean {
  const expected = signBody(secret, body);
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/auth/
git commit -m "feat(server): add HMAC-SHA256 verification for webhook ingestion"
```

---

## Task 6: Fastify `createServer(opts)` factory + boot

**Files:**
- Create: `packages/server/src/server.ts`
- Create: `packages/server/src/server.test.ts`
- Modify: `packages/server/src/index.ts`

A factory that builds a Fastify instance with the configured store + auth + viewer paths, but does NOT start listening. Tests use `app.inject()` for in-process HTTP assertions; production code calls `app.listen()`.

- [ ] **Step 1: Test (boot + healthz)**

```ts
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { MemoryStore } from "@aguspe/tiler-core";
import { createServer } from "./server";

describe("createServer", () => {
  it("returns a Fastify app that responds 200 on /healthz", async () => {
    const store = new MemoryStore();
    await store.migrate();
    const app = await createServer({ store });
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });

  it("redirects GET / to /dashboards", async () => {
    const store = new MemoryStore();
    await store.migrate();
    const app = await createServer({ store });
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/dashboards");
    await app.close();
  });
});
```

- [ ] **Step 2: Implement**

```ts
import fastify, { type FastifyInstance } from "fastify";
import { defineConfig, type TilerConfig } from "@aguspe/tiler-core";

export interface CreateServerOptions extends TilerConfig {
  /** Skip auto-loading widget packages. Useful for tests. */
  skipWidgetLoad?: boolean;
}

export async function createServer(opts: CreateServerOptions): Promise<FastifyInstance> {
  const cfg = defineConfig(opts);
  const app = fastify({ logger: { level: "warn" } });
  app.decorate("tilerConfig", cfg);

  // Ensure store is migrated. Idempotent.
  await cfg.store.migrate();

  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/", async (_req, reply) => reply.redirect("/dashboards", 302));

  // Routes loaded in subsequent tasks. Each is a Fastify plugin:
  // await app.register(dashboardsRoutes, { prefix: "/api/dashboards" });
  // await app.register(panelsRoutes,     { prefix: "/api/panels" });
  // await app.register(sourcesRoutes,    { prefix: "/api/data_sources" });
  // await app.register(ingestRoutes,     { prefix: "/ingest" });
  // await app.register(viewerRoutes,     { prefix: "/dashboards" });

  return app;
}
```

- [ ] **Step 3: Update barrel + run + commit**

`packages/server/src/index.ts`:
```ts
export const TILER_SERVER_VERSION = "0.0.1" as const;
export { createServer, type CreateServerOptions } from "./server";
```

```bash
pnpm --filter @aguspe/tiler-server test
git add packages/server/src/
git commit -m "feat(server): add createServer() Fastify factory with /healthz + redirect"
```

---

## Task 7: Auth middleware (basic + CSRF)

**Files:**
- Create: `packages/server/src/auth/basic.ts`
- Create: `packages/server/src/auth/csrf.ts`
- Create: `packages/server/src/auth/index.ts`
- Create: `packages/server/src/auth/index.test.ts`

Two Fastify hooks:
1. `requireBasicAuth` — checks `Authorization: Basic <base64>`. If `cfg.auth.basic` is unset, allow (server runs unauthenticated by default — caller binds to localhost).
2. `requireCsrf` — double-submit cookie check on state-changing requests. Issued via a `set-tiler-csrf` cookie on initial GET; checked via `X-Tiler-Csrf` header on POST/PATCH/DELETE.

- [ ] **Step 1-3: Standard pattern**

Implement, test with `app.inject()` and CSRF header juggling, commit.

```bash
git commit -m "feat(server): add basic-auth + CSRF middleware"
```

---

## Task 8: Read routes — `GET /api/dashboards`, `GET /api/dashboards/:slug`

**Files:**
- Create: `packages/server/src/routes/dashboards-read.ts`
- Create: `packages/server/src/routes/dashboards-read.test.ts`

Returns JSON. List response is `Dashboard[]`. Detail response includes `panels` and a freshly-built `resolved` map (built from current store contents).

- [ ] **Step 1: Test**

```ts
// inject GET /api/dashboards on an empty store → []
// upsert one dashboard + 2 panels, then GET /api/dashboards → length 1
// GET /api/dashboards/:slug → returns dashboard + panels + resolved
```

- [ ] **Step 2: Implement using `buildSnapshot` from core**

The detail handler:
1. `getDashboard(slug)` → 404 if null
2. `listPanels(dashboard.id)`
3. `listDataSources()` → filter to sources referenced
4. For each source, `queryRecords({ dataSourceId, since: 30d_ago, orderBy: desc })`
5. `buildSnapshot({ dashboard, dataSources, panels, records, now: new Date() })`
6. Reply with the snapshot.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(server): add GET /api/dashboards + /api/dashboards/:slug routes"
```

---

## Task 9: Write routes — dashboards, panels, data_sources

**Files:**
- Create: `packages/server/src/routes/dashboards-write.ts`
- Create: `packages/server/src/routes/panels.ts`
- Create: `packages/server/src/routes/sources.ts`
- Create: tests for each

POST/PATCH/DELETE for each entity. Body validated via Zod schemas from core (the same `Dashboard`, `Panel`, `DataSource` schemas, but using their `*Input` variants to allow id-less creates).

- [ ] **Step 1: Implement each route group**

Pattern per route:
1. Zod-validate body
2. Call corresponding store method
3. Return result with appropriate status (201 for create, 200 for update, 204 for delete)

CSRF + basic auth applied via the middleware from Task 7.

- [ ] **Step 2: Tests cover happy paths + 400 (bad body) + 404 (not found) + 401 (no auth) + 403 (no CSRF)**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(server): add CRUD routes for dashboards/panels/data_sources"
```

---

## Task 10: Webhook ingestion route

**Files:**
- Create: `packages/server/src/routes/ingest.ts`
- Create: `packages/server/src/routes/ingest.test.ts`

`POST /ingest/:source_slug` — verifies HMAC, validates body against the source's `schema_definition`, inserts a record. Bcrypt-hashed per-source token verified before falling back to global secret.

- [ ] **Step 1: Test**

```ts
// POST /ingest/test_runs with valid HMAC → 201, record inserted
// POST without signature → 401
// POST with wrong signature → 401
// POST with body that fails schema_definition → 400
// POST with recorded_at outside skew window → 400
```

- [ ] **Step 2: Implement**

The handler reads the raw body via Fastify's `fastify-raw-body` plugin (or a custom `preParsing` hook), verifies the signature, parses JSON, validates against the source's schema_definition, then:
1. If body has `recorded_at`, verify it's within `[now-30d, now+5min]`. Otherwise default to `now`.
2. Build a `DataRecordInput` and call `store.insertRecord(...)`.
3. Return `{ status: "ok", id: record.id }` with status 201.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(server): add POST /ingest/:source_slug with HMAC verification"
```

---

## Task 11: Manual entry + CSV import routes

**Files:**
- Create: `packages/server/src/routes/manual.ts`
- Create: `packages/server/src/routes/csv.ts`
- Create: tests

`POST /api/data_sources/:slug/records` — same as ingest but auth via basic/CSRF instead of HMAC. Used by the future editor's "manual entry" UI.

`POST /api/data_sources/:slug/import_csv` — accepts a CSV body, parses it (column 1 = recorded_at, remaining = payload keys per source schema), inserts via `insertRecordsBatch`. Use `papaparse` for parsing.

- [ ] **Step 1-3: Standard implementation**

```bash
pnpm --filter @aguspe/tiler-server add papaparse
pnpm --filter @aguspe/tiler-server add -D @types/papaparse
git commit -m "feat(server): add manual entry + CSV import routes"
```

---

## Task 12: Viewer route — `GET /dashboards/:slug` (SSR)

**Files:**
- Create: `packages/server/src/routes/viewer-pages.ts`
- Create: `packages/server/src/routes/viewer-pages.test.ts`

SSRs the dashboard via `renderToHtml` from `@aguspe/tiler-viewer`. Static assets served from `node_modules/@aguspe/tiler-viewer/dist/client/` via `@fastify/static`.

`GET /dashboards` → list page (a minimal `<ul>` of dashboard names linking to `/dashboards/:slug`). SSR via a small inline component (no full editor — that's Phase 5).

- [ ] **Step 1-3: Implement**

The route loads the snapshot the same way `GET /api/dashboards/:slug` does, then calls `renderToHtml`. CSS/JS asset paths are absolute (`/assets/viewer-*.{js,css}`), served by `@fastify/static` mounted at `/assets/`.

```bash
git commit -m "feat(server): SSR /dashboards/:slug + serve viewer client assets"
```

---

## Task 13: WebSocket + refresh loop

**Files:**
- Create: `packages/server/src/refresh.ts`
- Create: `packages/server/src/routes/ws.ts`
- Create: tests

Per-dashboard refresh timer. On tick:
1. Build the current snapshot.
2. Diff `resolved[panel.id]` against last-pushed value (deep equality).
3. Push only changed entries to subscribed clients.

WebSocket protocol (JSON messages):
- Client → `{ type: "subscribe", slug: "test_automation" }`
- Server → `{ type: "panel", panelId, data: WidgetData }` per change
- Server → `{ type: "snapshot", snapshot }` on initial subscribe (full state)

When zero clients are subscribed to a dashboard, the timer is paused. Re-armed on next subscribe.

- [ ] **Step 1-3: Implement**

```bash
pnpm --filter @aguspe/tiler-server add @fastify/websocket
git commit -m "feat(server): add WebSocket + per-dashboard refresh-loop timer"
```

---

## Task 14: `examples/server-live` runnable demo

**Files:**
- Create: `examples/server-live/package.json`
- Create: `examples/server-live/tiler.config.ts`
- Create: `examples/server-live/seed.ts`
- Create: `examples/server-live/.gitignore`
- Create: `examples/server-live/README.md`

A standalone Node project that imports `createServer` from `@aguspe/tiler-server`, configures sqlite in `./tiler.db`, calls `seed()` to insert the `test_automation` preset + 200 fake records, and starts the server on `:4567`.

`tiler.config.ts`:
```ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: "./tiler.db" }),
  port: 4567,
  auth: {
    webhookSecret: process.env.TILER_WEBHOOK_SECRET ?? "dev-secret-please-change",
  },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],
});
```

`seed.ts`: imports `testAutomationPreset` and inserts the dashboard + source + panels + 200 fake records (3 statuses, 5 suites, varying durations) into the store.

`package.json` scripts:
- `seed`: runs `seed.ts` once
- `start`: runs the server (after seed)

`README.md`: explains how to run, what's available, how to push test webhooks (curl example with HMAC).

```bash
git commit -m "docs(examples): add server-live demo with seeded test_automation dashboard"
```

---

## Task 15: End-to-end smoke run

- [ ] **Step 1: Build everything**

```bash
pnpm --filter @aguspe/tiler-core build
pnpm --filter @aguspe/tiler-widgets build
pnpm --filter @aguspe/tiler-viewer build
pnpm --filter @aguspe/tiler-server build
```

- [ ] **Step 2: Run seed + start**

```bash
cd examples/server-live
pnpm seed
pnpm start &   # background
sleep 2
curl -sS http://localhost:4567/healthz   # expect {"status":"ok"}
curl -sS http://localhost:4567/api/dashboards   # expect dashboard list
curl -sS http://localhost:4567/dashboards/test_automation -o /tmp/dash.html
grep -q "Test Automation" /tmp/dash.html
echo "snapshot SSR ok"

# Send a webhook
BODY='{"suite":"checkout","test_name":"manual","status":"pass","duration_ms":42}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "dev-secret-please-change" -hex | sed 's/^.*= //')
curl -sS -X POST http://localhost:4567/ingest/test_runs \
  -H "X-Tiler-Signature: sha256=$SIG" \
  -H "Content-Type: application/json" \
  -d "$BODY"
echo "webhook ingested"

# Verify the new record
curl -sS http://localhost:4567/api/dashboards/test_automation | jq '.records | length'

# Cleanup
kill %1
```

- [ ] **Step 3: Open the dashboard in a browser**

```bash
open http://localhost:4567/dashboards/test_automation
```

The dashboard loads with the seeded 200 records + the manually-pushed one. Check that the live WebSocket updates work: send another curl and watch the Failures count tick up.

---

## Task 16: README + tag `v0.0.4-phase-4`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Status section**

```markdown
## Status: Phase 4 — Live Server (`v0.0.4-phase-4`)

This release ships the live-mode counterpart to the static reporter. Run
`tiler serve` (or use the `createServer()` API directly), get a Fastify
server with sqlite persistence, HMAC-signed webhook ingestion, manual
entry, CSV import, and live updates pushed over WebSocket.
```

Update the package status table:
- `@aguspe/tiler-server` → "✅ Fastify + sqlite + ingestion + WebSocket"
- Add `@aguspe/tiler-cli` → "⏳ Phase 6"

- [ ] **Step 2: Run full pipeline**

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
pnpm deps
```

All seven must exit zero.

- [ ] **Step 3: Commit + tag**

```bash
git add README.md
git commit -m "docs: update README for Phase 4 (live server)"
git tag -a v0.0.4-phase-4 -m "Phase 4 — Fastify server + sqlite + ingestion + WebSocket"
```

---

## Phase 4 → Phase 5 handoff

**What's working at end of Phase 4:**
- `BetterSqliteStore` persists every entity in a single sqlite file with proper indexes.
- HTTP API: full CRUD on dashboards / panels / data sources; HMAC webhook ingestion; manual entry; CSV import.
- SSR'd dashboard at `/dashboards/:slug`. Read-only — clicking a panel does nothing.
- WebSocket live push at `/ws` — clients see resolved data updates within `refresh_seconds`.
- `examples/server-live/` runnable demo with seeded data.

**What Phase 5 adds:**
- `@aguspe/tiler-editor` package — gridstack drag/resize, slide-over drawer for panel config, palette of available widgets, inline title rename, hover-delete, theme-token editor, TV mode, undo stack via Zustand.
- The server's `/dashboards/:slug` switches from "SSR-only viewer" to "SSR'd shell + hydrate the editor."
- Editor saves panels through the existing PATCH routes with optimistic concurrency via `updated_at`.
- Visual regression tests via Playwright on the built editor (deferred from Phase 2).

Plan 5 will be drafted once Phase 4 is built and tagged.
