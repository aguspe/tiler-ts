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
