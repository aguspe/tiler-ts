---
title: Static reporter
sidebar_position: 2
---

The simplest way to use tiler-ts with Playwright: drop in `@aguspe/tiler-playwright` as a reporter and get a self-contained HTML dashboard at the end of every run. No server, no database — the reporter writes a folder you can open in any browser, attach to a CI artifact, or commit alongside snapshots.

## Install

```bash
npm i -D @aguspe/tiler-playwright
```

## Wire it up

```ts title="playwright.config.ts"
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["@aguspe/tiler-playwright", { outDir: "tiler-report" }],
  ],
});
```

The reporter sits **alongside** Playwright's defaults; you can keep `["html", { open: "never" }]` next to it if you want both.

```ts
reporter: [
  ["html", { open: "never" }],
  ["@aguspe/tiler-playwright", { outDir: "tiler-report" }],
],
```

## Run

```bash
npx playwright test
open tiler-report/index.html
```

You'll see the `test_automation` preset rendered with your run's data — total runs, failures, duration trend, per-suite status, recent failures.

## What's inside `tiler-report/`

```
tiler-report/
├── index.html          ← entry point
├── assets/             ← prebuilt React + Recharts bundle
│   ├── viewer-entry-…js
│   └── viewer-…css
└── snapshot.json       ← serialized TilerSnapshot (records + resolved data)
```

You can deploy the directory to GitHub Pages, a static-site host, or just attach `tiler-report/` as a CI artifact and let reviewers download it.

## Reporter options

```ts
{
  outDir: "tiler-report",       // default: "tiler-report"
  presetSlug: "test_automation",// default: "test_automation"
  // Custom dashboard JSON — overrides the preset entirely
  dashboard: { /* TilerDashboardInput */ },
}
```

A custom `dashboard` field is the escape hatch for teams that already have a dashboard layout they want to keep stable across runs. The JSON shape is the same one tiler-ts uses everywhere — see [`@aguspe/tiler-core`'s schemas](https://github.com/aguspe/tiler-ts/tree/main/packages/core/src/schema).

## Limits

- **Single run, single report.** The reporter overwrites `outDir` each invocation. If you want history across runs, use the [live server](./live-server.md) or [`tiler import-playwright-json`](./cli-import.md) bridge.
- **No live updates.** The HTML is static once written. Refresh manually for a re-render.
- **No editing.** The reporter ships the read-only viewer; the drag-and-drop editor is a server-side feature.

If you outgrow this surface, see the next page.
