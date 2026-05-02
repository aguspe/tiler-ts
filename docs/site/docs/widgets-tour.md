---
title: Widgets tour
sidebar_position: 5
---

The 14 first-party widgets, ranked by usefulness for a Playwright dashboard. Drop any of them via the editor's `+ Add Panel` button — each one lands with its example config so you see real numbers immediately.

## Top picks for test runs

### Metric

A single big number. Pair it with `aggregation: "count"` for "Total runs (24h)" or `"avg"` over `duration_ms` for "Avg duration".

```json
{
  "value_column": "duration_ms",
  "aggregation": "avg",
  "time_window": "24h",
  "decimals": 0,
  "suffix": " ms"
}
```

### Number with delta

Same idea but with a sparkline and a week-over-week delta arrow. Best for "Failures (24h)" — a trending number is more useful than a static count.

```json
{
  "value_column": "id",
  "aggregation": "count",
  "filter": { "status": "fail" },
  "time_window": "24h",
  "compare_window": "24h"
}
```

### Status grid

One cell per group key, color-coded by majority status. Made for "per-suite" overviews:

```json
{
  "group_column": "suite",
  "status_column": "status",
  "time_window": "24h"
}
```

The cell shows the suite name and a `pass · 9` / `fail · 12` count.

### Table

Tabular records, projected by column. Perfect for "Recent failures":

```json
{
  "columns": ["test_name", "suite", "duration_ms"],
  "filter": { "status": "fail" },
  "time_window": "24h",
  "limit": 20
}
```

### Pie chart

Status breakdown — what percentage of runs passed vs failed vs warned.

```json
{
  "group_column": "status",
  "aggregation": "count",
  "time_window": "24h"
}
```

### Line chart

Duration trend or failure count over time.

```json
{
  "y_column": "duration_ms",
  "aggregation": "avg",
  "time_window": "7d",
  "bucket": "1d"
}
```

### Bar chart

Failures by suite, longest tests, slowest environments.

```json
{
  "group_column": "suite",
  "y_column": "id",
  "aggregation": "count",
  "filter": { "status": "fail" },
  "time_window": "24h",
  "horizontal": true
}
```

## Useful but situational

- **List** — flat top-N list. Tighter than table when you only need 1-2 columns.
- **Meter** — a gauge, e.g. "pass rate against 95% target".
- **Comments** — most recent N records as a feed; useful if your test failures carry a `notes` payload.

## Decorative / static

- **Clock** — wall clock for the TV.
- **Text** — markdown blurb (sprint goals, runbook link).
- **Image** — logo or static screenshot.
- **Iframe** — embed a Grafana panel, a Slack archive page, etc.

## Custom widgets

If the built-in set doesn't cover your use case, drop a `defineWidget()` call in your project. See the [`@aguspe/tiler-core` README](https://github.com/aguspe/tiler-ts/tree/main/packages/core#defining-a-custom-widget) for a worked example. The widget's `resolve()` function gets the records, runs your aggregation, and returns a `WidgetData`.
