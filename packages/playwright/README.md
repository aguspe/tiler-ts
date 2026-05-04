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

## Setting the report title

The dashboard title shown at the top of the report comes from the preset by
default (`"Test Automation"`). Override it three ways, in increasing
precedence:

1. `dashboard: { name }` in `definePlaywrightConfig({...})` — full control,
   also lets you set `slug`/`description`.
2. `title` reporter option — a shortcut for the dashboard name:
   ```ts
   reporter: [["@aguspe/tiler-playwright", { title: "My run", outDir: "tiler-report" }]]
   ```
3. `TILER_REPORT_NAME` env var — wins over both, ideal for CI:
   ```bash
   TILER_REPORT_NAME="Nightly e2e #${BUILD_NUMBER}" npx playwright test
   ```

## What you get

The reporter feeds Playwright's events into the `test_automation` preset's data source schema (`suite`, `test_name`, `status`, `duration_ms`, `environment`) and ships a dashboard with metric cards, a status pie, a per-suite grid, and a recent-failures table.

## Live mode

If you'd rather stream test runs into a long-running server (so you keep history across runs), point `@aguspe/tiler-cli`'s `tiler import-playwright-json` at your existing JSON output:

```bash
npx tiler import-playwright-json playwright-results.json \
  --server http://localhost:4567 \
  --secret "$TILER_WEBHOOK_SECRET"
```

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

Reporter-runtime options (`outDir`, `open`, `captureLogs`,
`linkTraceFiles`) only live in `playwright.config.ts`. Dashboard
structure (`panels`, `dataSources`, `excludePanels`, `dashboard`)
can live inline or in `tiler.config.ts`.

When both are set, `panels`/`dataSources`/`excludePanels` concatenate
(file values first, inline values appended) and `dashboard` is
shallow-merged with inline winning.

A working example lives at `examples/playwright-extended/`.

## License

MIT — see [`LICENSE`](../../LICENSE).
