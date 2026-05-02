# `@aguspe/tiler-playwright`

Playwright reporter that emits a tiler dashboard instead of (or alongside) the default HTML report. Self-contained: no server, no database — the reporter writes a static `index.html` + a JSON snapshot you can open with `file://`.

## Install

```bash
npm i -D @aguspe/tiler-playwright
```

## Use it

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["@aguspe/tiler-playwright", { outDir: "tiler-report" }],
  ],
});
```

Run your tests, then open `tiler-report/index.html`.

## What you get

The reporter feeds Playwright's events into the `test_automation` preset's data source schema (`suite`, `test_name`, `status`, `duration_ms`, `environment`) and ships a dashboard with metric cards, a status pie, a per-suite grid, and a recent-failures table.

## Live mode

If you'd rather stream test runs into a long-running server (so you keep history across runs), point `@aguspe/tiler-cli`'s `tiler import-playwright-json` at your existing JSON output:

```bash
npx tiler import-playwright-json playwright-results.json \
  --server http://localhost:4567 \
  --secret "$TILER_WEBHOOK_SECRET"
```

## License

MIT — see [`LICENSE`](../../LICENSE).
