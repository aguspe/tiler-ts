---
sidebar_position: 2
title: Seeded dashboards
---

# Seeded dashboards

Tiler server can pre-populate its store with dashboards on boot, so a
fresh deploy on Render (or any host) immediately serves the dashboards
your team expects. Two paths, both via your `tiler.config.ts`:

## Built-in by name

Drop preset slugs into `presets`. The server resolves each name against
its built-in registry on boot and seeds the dashboard if a row with
that slug doesn't already exist.

```ts
// server's tiler.config.ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: process.env.TILER_DB_PATH ?? "./tiler.db" }),
  presets: ["test_automation"],
});
```

Today the registry contains `test_automation`. New presets ship in
`@aguspe/tiler-core` as the team adds them.

## User-defined dashboards

For dashboards your team designed, write a
`definePlaywrightConfig({...})` file and import it in your server
config. The same file works for the `@aguspe/tiler-playwright` reporter
locally — one source of truth for layout.

```ts
// server's tiler.config.ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";
import nightlyDash from "./dashboards/nightly.tiler.config.ts";
import unitDash from "./dashboards/unit.tiler.config.ts";

export default defineConfig({
  store: new BetterSqliteStore({ path: process.env.TILER_DB_PATH ?? "./tiler.db" }),
  dashboards: [nightlyDash, unitDash],
});
```

```ts
// dashboards/nightly.tiler.config.ts
import { definePlaywrightConfig } from "@aguspe/tiler-playwright";

export default definePlaywrightConfig({
  dashboard: { slug: "nightly", name: "Nightly e2e" },
  panels: [...],
  dataSources: [...],
});
```

## Seeding policy

**Seed once, never touch again.** First boot creates the dashboard
from config. Every subsequent boot: if a dashboard with that slug
already exists, the server logs and skips the entire seed. Editor
edits survive forever. To re-seed, delete the dashboard manually
(via `DELETE /api/dashboards/:id` or by removing the SQLite row).

**Errors abort the boot.** Unknown preset name, duplicate slug across
two seeds, or store-layer failure — all throw and the server doesn't
start. A misconfigured seed is a deploy-time failure, not a runtime
one.

**`collect()` is ignored on the server.** Records flow into the
server via `/ingest/:slug` (HMAC-signed) — not from the seed config.
A `dataSources[].collect` callback in your `tiler.config.ts` is
useful for the playwright reporter (which calls it at end-of-test-run)
but the server skips it during seeding.
