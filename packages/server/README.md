# `@aguspe/tiler-server`

Fastify 5 server that hosts your tiler dashboards live: SSR'd editor at `/dashboards/:slug`, REST API under `/api/*`, HMAC-signed webhook ingestion at `/ingest/:slug`, and WebSocket live updates at `/ws`. Sqlite-backed via `better-sqlite3` (or any `TilerStore`).

## Install

```bash
npm i @aguspe/tiler-server @aguspe/tiler-core @aguspe/tiler-widgets
```

If you want the friendlier `tiler` binary, add **[`@aguspe/tiler-cli`](../cli/README.md)** too.

## Usage

```ts
// tiler.config.ts
import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: "./tiler.db" }),
  port: 4567,
  auth: {
    webhookSecret: process.env.TILER_WEBHOOK_SECRET,
  },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],
});
```

```ts
// start.ts
import "@aguspe/tiler-widgets";
import { createServer } from "@aguspe/tiler-server";
import config from "./tiler.config";

const app = await createServer({ store: config.store, auth: config.auth });
await app.listen({ host: config.host, port: config.port });
```

Or skip `start.ts` entirely and run `npx tiler serve`.

## Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/dashboards` | Card grid of dashboards |
| `GET` | `/dashboards/:slug` | SSR'd editor |
| `GET` | `/data-sources` | Registered sources |
| `GET` | `/settings` | Live diagnostics |
| `GET / POST / PATCH / DELETE` | `/api/dashboards`, `/api/panels`, `/api/data_sources` | CRUD |
| `POST` | `/ingest/:source_slug` | HMAC webhook ingestion |
| `WS`   | `/ws` | Live WidgetData diffs |
| `GET`  | `/healthz` | Liveness probe |

## License

MIT — see [`LICENSE`](../../LICENSE).
