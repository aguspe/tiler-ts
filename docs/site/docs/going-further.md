---
title: Going further
sidebar_position: 6
---

You've got a Playwright dashboard up. A few directions to go from here.

## More than test runs

The `test_runs` data source is just one preset. Define more sources for anything else you want on the same dashboard:

- **Deploys** — `deployed_at`, `git_sha`, `environment`, `actor`. Status grid by environment.
- **Errors** — Sentry / Bugsnag webhooks. Number-with-delta for "errors today".
- **Latency** — APM timeseries via webhook. Line chart with bucketed avg.

The flow is identical: define a `DataSource` with a `schema_definition`, give it a `slug`, point a webhook (or `tiler import-*`) at `/ingest/<slug>`, and add panels that reference it.

## Multiple environments

Run one tiler server per environment (`tiler-staging`, `tiler-prod`) or filter on a `environment` column you carry through every record. The status grid widget doubles as an "environment overview" if you set `group_column: "environment"`.

## TV mode polish

Press the **monitor** icon in the editor (or set `settings.tv_mode: true` via the API). The chrome disappears and the grid fills the viewport. Combine with `[data-theme="dark"]` for OLED-friendly displays.

The WebSocket subscription means the TV updates as records land — no manual refresh.

## Auth

The editor is read-write by default. For shared environments:

```ts title="tiler.config.ts"
auth: {
  basic: {
    user: "admin",
    pass: process.env.TILER_PASS,
  },
  webhookSecret: process.env.TILER_WEBHOOK_SECRET,
},
```

Or replace the basic-auth check entirely with a custom `authorize` callback (SSO, JWT, whatever). See [`packages/server/README.md`](https://github.com/aguspe/tiler-ts/tree/main/packages/server) for the contract.

## Where things live

- **Editor source** — [`packages/editor`](https://github.com/aguspe/tiler-ts/tree/main/packages/editor)
- **Widgets** — [`packages/widgets`](https://github.com/aguspe/tiler-ts/tree/main/packages/widgets)
- **Schema + types** — [`packages/core/src/schema`](https://github.com/aguspe/tiler-ts/tree/main/packages/core/src/schema)
- **CLI commands** — [`packages/cli/src/commands`](https://github.com/aguspe/tiler-ts/tree/main/packages/cli/src/commands)
- **Migrating from Rails Tiler** — [`MIGRATING_FROM_RAILS.md`](https://github.com/aguspe/tiler-ts/blob/main/MIGRATING_FROM_RAILS.md)
- **Changelog** — [`CHANGELOG.md`](https://github.com/aguspe/tiler-ts/blob/main/CHANGELOG.md)

## Get help

- File issues at [github.com/aguspe/tiler-ts/issues](https://github.com/aguspe/tiler-ts/issues).
- The Rails Tiler community (Slack, Discord) also covers the TS port.
