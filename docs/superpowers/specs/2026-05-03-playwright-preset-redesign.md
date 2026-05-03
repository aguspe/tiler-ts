# Playwright Preset Redesign + Screenshots

**Date:** 2026-05-03
**Status:** Approved for implementation

---

## Goal

Replace the existing `test_automation` preset (and its use inside `TilerReporter`) with an Allure-style "Run Report" layout that surfaces per-test detail, a duration timeline, suite pass-rates, and inline failure screenshots — all from a single Playwright run.

---

## Layout (12-column grid, row height = 80 px)

### Row 0 — Summary strip (y=0, h=2)

Five metric panels across the full width:

| Panel | Widget | cols | Config |
|---|---|---|---|
| Total Tests | `metric` | 3 | `aggregation: "count"`, `time_window: "all"` |
| Passed | `metric` | 2 | `aggregation: "count"`, `time_window: "all"`, `filter: {status:"pass"}`, `color: "#10b981"` |
| Failed | `metric` | 2 | `aggregation: "count"`, `time_window: "all"`, `filter: {status:"fail"}`, `color: "#ef4444"` |
| Skipped | `metric` | 2 | `aggregation: "count"`, `time_window: "all"`, `filter: {status:"skip"}`, `color: "#f59e0b"` |
| Pass Rate | `pass_rate` | 3 | thresholds: green ≥90%, amber ≥70%, red <70% |

### Row 1 — Duration timeline (y=2, h=3, full width)

One horizontal bar per test, sorted by `duration_ms` descending. Bar width is proportional to the slowest test (100%). Color = status (`#10b981` pass, `#ef4444` fail, `#f59e0b` skip). Label = `test_name`, right-aligned duration.

Widget: `test_timeline` (new).

### Row 2 — Test list + Suite pass-rates (y=5)

| Panel | Widget | cols | h |
|---|---|---|---|
| All Tests | `test_list` | 8 | 5 |
| Suite Pass Rate | `suite_progress` | 4 | 5 |

---

## New Widgets (4)

### `metric` (minor extension)

Add `color: z.string().optional()` to `MetricConfig` and apply it as the number's text colour in `MetricWidget.tsx`. Used by the Passed/Failed/Skipped panels to make status colour immediate.

### `pass_rate`

- **Resolver:** `(count where status=pass) / total count * 100`. Returns `{ value: number, total: number, passed: number }`.
- **Component:** Large percentage number, coloured green/amber/red by threshold config (`good_threshold`, `warn_threshold`, defaults 90/70).
- **Config schema:** `{ good_threshold: number, warn_threshold: number }`.
- **No data:** shows `—`.

### `test_timeline`

- **Resolver:** Returns all records sorted by `duration_ms` desc. Each record becomes `{ test_name, status, duration_ms, suite }`.
- **Component:** Vertical list of horizontal bars. Bar width = `duration_ms / max_duration_ms * 100%`. Color by status. Left label = test_name (truncated). Right label = duration in seconds.
- **Config schema:** `{ value_column: "duration_ms", limit: number (default 50) }`.
- **No data:** shows empty state.

### `test_list`

- **Resolver:** Returns all records sorted by status priority (fail first, skip second, pass last), then by `duration_ms` desc within each group. Each record: `{ test_name, suite, status, duration_ms, error_message, screenshot_data, file, line }`.
- **Component:**
  - Each row: status dot + test_name + suite badge + duration.
  - Pass/skip rows: static, no interaction.
  - Fail rows: clickable. On click, row expands to reveal:
    - Screenshot thumbnail (rendered from `screenshot_data` base64 data URI). If no screenshot, omit thumbnail.
    - Error block: `error_message` in a monospace box, `file:line` reference below.
  - "Show all / Show failures only" toggle at top.
  - Limit: first 200 rows rendered; "N more tests" footer if truncated.
- **Config schema:** `{ limit: number (default 200), show_failures_only: boolean (default false) }`.

### `suite_progress`

- **Resolver:** Groups records by `suite`. For each group: `{ suite, total, passed, pass_rate }`. Sorted by `pass_rate` asc (worst first).
- **Component:** One row per suite: suite name + percentage label + horizontal progress bar. Color = same green/amber/red thresholds as `pass_rate` widget.
- **Config schema:** `{ good_threshold: number (default 90), warn_threshold: number (default 70) }`.
- **No data:** shows empty state.

---

## Screenshot capture (reporter changes)

### `record-builder.ts`

Extend `BuildRecordInput.result` to include screenshot attachments. After the existing `trace` extraction:

```ts
const screenshot = result.attachments?.find(a => a.name === "screenshot");
if (screenshot?.path) {
  const data = fs.readFileSync(screenshot.path);
  payload.screenshot_data = `data:image/png;base64,${data.toString("base64")}`;
}
```

Screenshots are embedded as base64 data URIs so the HTML report is fully self-contained. No extra files, no broken paths.

### Schema definition update

Add `screenshot_data` to the `test_runs` data source schema in the preset:

```ts
{ key: "screenshot_data", type: "string" }
```

### Playwright config recommendation

Users need `screenshot: "only-on-failure"` in their `playwright.config.ts` for screenshots to appear:

```ts
use: { screenshot: "only-on-failure" }
```

The reporter handles the case gracefully when no screenshot attachment is present — the expand section simply omits the thumbnail.

---

## Changes to existing `test_automation` preset

The `testAutomationPreset` function in `packages/core/src/presets/test_automation.ts` is **replaced** with the new panel layout described above. The export name, file path, and preset slug (`test_automation`) stay the same so existing callers (the reporter, the CLI `presets` config) require no changes.

The `test_runs` data source schema gains one new field: `screenshot_data: string`.

---

## Files touched

| File | Change |
|---|---|
| `packages/core/src/presets/test_automation.ts` | Replace panel definitions with new layout |
| `packages/core/src/presets/test_automation.test.ts` | Update snapshot/count assertions |
| `packages/widgets/src/widgets/metric/schema.ts` + `MetricWidget.tsx` | Add optional `color` field |
| `packages/widgets/src/widgets/pass_rate/` | New widget (index, schema, resolver, component, example) |
| `packages/widgets/src/widgets/test_timeline/` | New widget |
| `packages/widgets/src/widgets/test_list/` | New widget |
| `packages/widgets/src/widgets/suite_progress/` | New widget |
| `packages/widgets/src/index.ts` | Register 4 new widgets |
| `packages/playwright/src/record-builder.ts` | Capture `screenshot` attachment → base64 |
| `packages/playwright/src/record-builder.test.ts` | Add screenshot capture test |

---

## Out of scope

- Interactive server-side filtering (static HTML only).
- Video attachment support.
- Trace viewer integration (existing `trace_path` field unchanged).
- Changes to the live-server dashboard presets config.
