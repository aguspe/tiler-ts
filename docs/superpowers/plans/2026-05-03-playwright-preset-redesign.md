# Playwright Preset Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `test_automation` preset panels and add 4 new widgets (`pass_rate`, `test_timeline`, `test_list`, `suite_progress`) so the tiler Playwright reporter generates an Allure-style run report with inline failure screenshots.

**Architecture:** Each widget lives in its own directory under `packages/widgets/src/widgets/` following the existing pattern: `schema.ts` (Zod config), `resolve.ts` (data transform), `<Name>Widget.tsx` (React component), `example.ts` (test fixture), `index.ts` (defineWidget call), `*.test.tsx` (vitest tests). The reporter's `record-builder.ts` is extended to embed screenshots as base64. The preset replaces its 9 panels with 8 new ones using the new widget types.

**Tech Stack:** TypeScript, React 18, Zod, Vitest + testing-library/react (jsdom), pnpm workspaces.

---

## File Structure

**New files (widgets package):**
- `packages/widgets/src/widgets/pass_rate/schema.ts`
- `packages/widgets/src/widgets/pass_rate/resolve.ts`
- `packages/widgets/src/widgets/pass_rate/PassRateWidget.tsx`
- `packages/widgets/src/widgets/pass_rate/example.ts`
- `packages/widgets/src/widgets/pass_rate/index.ts`
- `packages/widgets/src/widgets/pass_rate/pass_rate.test.tsx`
- `packages/widgets/src/widgets/test_timeline/schema.ts`
- `packages/widgets/src/widgets/test_timeline/resolve.ts`
- `packages/widgets/src/widgets/test_timeline/TestTimelineWidget.tsx`
- `packages/widgets/src/widgets/test_timeline/example.ts`
- `packages/widgets/src/widgets/test_timeline/index.ts`
- `packages/widgets/src/widgets/test_timeline/test_timeline.test.tsx`
- `packages/widgets/src/widgets/test_list/schema.ts`
- `packages/widgets/src/widgets/test_list/resolve.ts`
- `packages/widgets/src/widgets/test_list/TestListWidget.tsx`
- `packages/widgets/src/widgets/test_list/example.ts`
- `packages/widgets/src/widgets/test_list/index.ts`
- `packages/widgets/src/widgets/test_list/test_list.test.tsx`
- `packages/widgets/src/widgets/suite_progress/schema.ts`
- `packages/widgets/src/widgets/suite_progress/resolve.ts`
- `packages/widgets/src/widgets/suite_progress/SuiteProgressWidget.tsx`
- `packages/widgets/src/widgets/suite_progress/example.ts`
- `packages/widgets/src/widgets/suite_progress/index.ts`
- `packages/widgets/src/widgets/suite_progress/suite_progress.test.tsx`

**Modified files:**
- `packages/widgets/src/widgets/metric/schema.ts` — add `color` field
- `packages/widgets/src/widgets/metric/MetricWidget.tsx` — apply `color`
- `packages/widgets/src/widgets/metric/metric.test.tsx` — add color test
- `packages/widgets/src/index.ts` — register 4 new widgets
- `packages/core/src/presets/test_automation.ts` — new panel layout
- `packages/core/src/presets/test_automation.test.ts` — updated assertions
- `packages/playwright/src/record-builder.ts` — capture screenshot attachment
- `packages/playwright/src/record-builder.test.ts` — screenshot test

---

## Task 1: Extend metric widget with optional color

**Files:**
- Modify: `packages/widgets/src/widgets/metric/schema.ts`
- Modify: `packages/widgets/src/widgets/metric/MetricWidget.tsx`
- Modify: `packages/widgets/src/widgets/metric/metric.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `packages/widgets/src/widgets/metric/metric.test.tsx` inside the `MetricWidget` describe block:

```tsx
it("applies color from config to the value text", () => {
  const { panel } = MetricExample();
  const { container } = render(
    <MetricWidget
      panel={{ ...panel, config: { aggregation: "count", time_window: "all", color: "#ef4444" } }}
      data={{ resolved: 5, empty: false }}
    />,
  );
  const value = container.querySelector(".tiler-metric__value") as HTMLElement;
  expect(value.style.color).toBe("rgb(239, 68, 68)");
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose metric.test
```

Expected: FAIL — `color` is not applied.

- [ ] **Step 3: Add `color` to MetricConfig schema**

In `packages/widgets/src/widgets/metric/schema.ts`, add after `decimals`:

```ts
  color: z.string().optional(),
```

Full updated file:

```ts
import { z } from "zod";

export const MetricConfig = z.object({
  value_column: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/)
    .optional(),
  aggregation: z.enum(["sum", "avg", "min", "max", "count", "first", "last"]).default("count"),
  time_window: z.enum(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(6).default(0),
  color: z.string().optional(),
});
export type MetricConfig = z.infer<typeof MetricConfig>;
```

- [ ] **Step 4: Apply color in MetricWidget**

Replace `packages/widgets/src/widgets/metric/MetricWidget.tsx`:

```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { MetricConfig } from "./schema";

export function MetricWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<number>;
}): JSX.Element {
  const cfg = MetricConfig.parse(panel.config);
  const value = data.resolved;
  const formatted =
    value == null
      ? "—"
      : value.toLocaleString(undefined, {
          minimumFractionDigits: cfg.decimals,
          maximumFractionDigits: cfg.decimals,
        });
  return (
    <div
      className="tiler-metric"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        padding: 8,
      }}
    >
      <div
        className="tiler-metric__value"
        style={{
          fontSize: "clamp(1.5rem, 6vw, 3rem)",
          fontWeight: 600,
          lineHeight: 1.1,
          color: cfg.color,
        }}
      >
        {cfg.prefix}
        {formatted}
        {cfg.suffix}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose metric.test
```

Expected: all metric tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/widgets/src/widgets/metric/schema.ts packages/widgets/src/widgets/metric/MetricWidget.tsx packages/widgets/src/widgets/metric/metric.test.tsx
git commit -m "feat(widgets/metric): add optional color config"
```

---

## Task 2: pass_rate widget

**Files:**
- Create: `packages/widgets/src/widgets/pass_rate/schema.ts`
- Create: `packages/widgets/src/widgets/pass_rate/resolve.ts`
- Create: `packages/widgets/src/widgets/pass_rate/PassRateWidget.tsx`
- Create: `packages/widgets/src/widgets/pass_rate/example.ts`
- Create: `packages/widgets/src/widgets/pass_rate/index.ts`
- Create: `packages/widgets/src/widgets/pass_rate/pass_rate.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/widgets/src/widgets/pass_rate/pass_rate.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PassRateWidget } from "./PassRateWidget";
import { PassRateExample } from "./example";
import { resolvePassRate } from "./resolve";

describe("resolvePassRate", () => {
  it("computes percentage from pass/total", () => {
    const { panel, records } = PassRateExample();
    const result = resolvePassRate({ panel, records, now: new Date() });
    // Example has 7 pass out of 10
    expect(result.resolved.total).toBe(10);
    expect(result.resolved.passed).toBe(7);
    expect(result.resolved.value).toBeCloseTo(70);
    expect(result.empty).toBe(false);
  });

  it("returns empty=true with no records", () => {
    const { panel } = PassRateExample();
    const result = resolvePassRate({ panel, records: [], now: new Date() });
    expect(result.empty).toBe(true);
  });

  it("returns 100 when all records pass", () => {
    const { panel, records } = PassRateExample();
    const allPass = records.map((r) => ({ ...r, payload: { ...r.payload, status: "pass" } }));
    const result = resolvePassRate({ panel, records: allPass, now: new Date() });
    expect(result.resolved.value).toBe(100);
  });
});

describe("PassRateWidget", () => {
  it("renders the percentage with subtitle", () => {
    const { panel } = PassRateExample();
    render(
      <PassRateWidget
        panel={panel}
        data={{ resolved: { value: 95.1, total: 248, passed: 236 }, empty: false }}
      />,
    );
    expect(screen.getByText("95.1%")).toBeInTheDocument();
    expect(screen.getByText("236 / 248 passed")).toBeInTheDocument();
  });

  it("renders em dash when empty", () => {
    const { panel } = PassRateExample();
    render(
      <PassRateWidget
        panel={panel}
        data={{ resolved: { value: 0, total: 0, passed: 0 }, empty: true }}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose pass_rate.test
```

Expected: FAIL — files don't exist yet.

- [ ] **Step 3: Create schema**

Create `packages/widgets/src/widgets/pass_rate/schema.ts`:

```ts
import { z } from "zod";

export const PassRateConfig = z.object({
  status_column: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/)
    .default("status"),
  pass_value: z.string().default("pass"),
  good_threshold: z.number().min(0).max(100).default(90),
  warn_threshold: z.number().min(0).max(100).default(70),
});
export type PassRateConfig = z.infer<typeof PassRateConfig>;
```

- [ ] **Step 4: Create resolver**

Create `packages/widgets/src/widgets/pass_rate/resolve.ts`:

```ts
import type { WidgetData, WidgetResolverArgs } from "@aguspe/tiler-core";
import { PassRateConfig } from "./schema";

export interface PassRateResolved {
  value: number;
  total: number;
  passed: number;
}

export function resolvePassRate({
  panel,
  records,
}: WidgetResolverArgs): WidgetData<PassRateResolved> {
  const cfg = PassRateConfig.parse(panel.config);
  const total = records.length;
  if (total === 0) {
    return { resolved: { value: 0, total: 0, passed: 0 }, empty: true };
  }
  const passed = records.filter((r) => r.payload[cfg.status_column] === cfg.pass_value).length;
  const value = (passed / total) * 100;
  return { resolved: { value, total, passed }, empty: false };
}
```

- [ ] **Step 5: Create component**

Create `packages/widgets/src/widgets/pass_rate/PassRateWidget.tsx`:

```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { PassRateResolved } from "./resolve";
import { PassRateConfig } from "./schema";

function thresholdColor(value: number, good: number, warn: number): string {
  if (value >= good) return "#10b981";
  if (value >= warn) return "#f59e0b";
  return "#ef4444";
}

export function PassRateWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<PassRateResolved>;
}): JSX.Element {
  const cfg = PassRateConfig.parse(panel.config);

  if (data.empty) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontSize: "clamp(1.5rem, 6vw, 3rem)",
          fontWeight: 600,
        }}
      >
        —
      </div>
    );
  }

  const { value, total, passed } = data.resolved;
  const color = thresholdColor(value, cfg.good_threshold, cfg.warn_threshold);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: 8,
      }}
    >
      <div
        style={{
          fontSize: "clamp(1.5rem, 6vw, 3rem)",
          fontWeight: 600,
          color,
          lineHeight: 1.1,
        }}
      >
        {value.toFixed(1)}%
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--ink-3, #64748b)",
          marginTop: 4,
        }}
      >
        {passed} / {total} passed
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create example**

Create `packages/widgets/src/widgets/pass_rate/example.ts`:

```ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function PassRateExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "pr-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Pass Rate",
    widget_type: "pass_rate",
    x: 9,
    y: 0,
    width: 3,
    height: 2,
    config: { good_threshold: 90, warn_threshold: 70 },
    created_at: now,
    updated_at: now,
  };
  const statuses = ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "fail", "fail", "skip"];
  const records: DataRecord[] = statuses.map((status, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: { test_name: `test_${i}`, suite: "auth", status, duration_ms: 200 + i * 10 },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 7: Create index (defineWidget)**

Create `packages/widgets/src/widgets/pass_rate/index.ts`:

```ts
import { defineWidget } from "@aguspe/tiler-core";
import { PassRateWidget } from "./PassRateWidget";
import { PassRateExample } from "./example";
import { resolvePassRate } from "./resolve";
import { PassRateConfig } from "./schema";

defineWidget({
  meta: {
    type: "pass_rate",
    label: "Pass Rate",
    description: "Percentage of records with a passing status, coloured by threshold.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: PassRateConfig,
  resolve: resolvePassRate,
  component: PassRateWidget,
  example: PassRateExample,
});

export { PassRateConfig, PassRateWidget, PassRateExample, resolvePassRate };
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose pass_rate.test
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/pass_rate/
git commit -m "feat(widgets): add pass_rate widget"
```

---

## Task 3: test_timeline widget

**Files:**
- Create: `packages/widgets/src/widgets/test_timeline/schema.ts`
- Create: `packages/widgets/src/widgets/test_timeline/resolve.ts`
- Create: `packages/widgets/src/widgets/test_timeline/TestTimelineWidget.tsx`
- Create: `packages/widgets/src/widgets/test_timeline/example.ts`
- Create: `packages/widgets/src/widgets/test_timeline/index.ts`
- Create: `packages/widgets/src/widgets/test_timeline/test_timeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/widgets/src/widgets/test_timeline/test_timeline.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestTimelineWidget } from "./TestTimelineWidget";
import { TestTimelineExample } from "./example";
import { resolveTestTimeline } from "./resolve";

describe("resolveTestTimeline", () => {
  it("sorts by duration_ms descending and respects limit", () => {
    const { panel, records } = TestTimelineExample();
    const result = resolveTestTimeline({ panel, records, now: new Date() });
    const durations = result.resolved.rows.map((r) => r.duration_ms);
    for (let i = 1; i < durations.length; i++) {
      expect(durations[i - 1]! >= durations[i]!).toBe(true);
    }
    expect(result.resolved.rows.length).toBeLessThanOrEqual(50);
  });

  it("sets max_duration_ms to the slowest test", () => {
    const { panel, records } = TestTimelineExample();
    const result = resolveTestTimeline({ panel, records, now: new Date() });
    expect(result.resolved.max_duration_ms).toBe(result.resolved.rows[0]?.duration_ms ?? 0);
  });

  it("returns empty=true with no records", () => {
    const { panel } = TestTimelineExample();
    const result = resolveTestTimeline({ panel, records: [], now: new Date() });
    expect(result.empty).toBe(true);
  });
});

describe("TestTimelineWidget", () => {
  it("renders empty state with no records", () => {
    const { panel } = TestTimelineExample();
    render(
      <TestTimelineWidget
        panel={panel}
        data={{ resolved: { rows: [], max_duration_ms: 0 }, empty: true }}
      />,
    );
    expect(screen.getByText("No test results.")).toBeInTheDocument();
  });

  it("renders a row per test result", () => {
    const { panel, records } = TestTimelineExample();
    const data = resolveTestTimeline({ panel, records, now: new Date() });
    render(<TestTimelineWidget panel={panel} data={data} />);
    // First row = slowest test name
    expect(screen.getByText(data.resolved.rows[0]!.test_name)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose test_timeline.test
```

Expected: FAIL — files don't exist.

- [ ] **Step 3: Create schema**

Create `packages/widgets/src/widgets/test_timeline/schema.ts`:

```ts
import { z } from "zod";

export const TestTimelineConfig = z.object({
  limit: z.number().int().min(1).max(200).default(50),
});
export type TestTimelineConfig = z.infer<typeof TestTimelineConfig>;
```

- [ ] **Step 4: Create resolver**

Create `packages/widgets/src/widgets/test_timeline/resolve.ts`:

```ts
import type { WidgetData, WidgetResolverArgs } from "@aguspe/tiler-core";
import { TestTimelineConfig } from "./schema";

export interface TestTimelineRow {
  test_name: string;
  status: string;
  duration_ms: number;
  suite: string;
}

export interface TestTimelineResolved {
  rows: TestTimelineRow[];
  max_duration_ms: number;
}

export function resolveTestTimeline({
  panel,
  records,
}: WidgetResolverArgs): WidgetData<TestTimelineResolved> {
  const cfg = TestTimelineConfig.parse(panel.config);
  const rows: TestTimelineRow[] = records
    .map((r) => ({
      test_name: String(r.payload.test_name ?? ""),
      status: String(r.payload.status ?? ""),
      duration_ms: Number(r.payload.duration_ms ?? 0),
      suite: String(r.payload.suite ?? ""),
    }))
    .sort((a, b) => b.duration_ms - a.duration_ms)
    .slice(0, cfg.limit);
  const max_duration_ms = rows[0]?.duration_ms ?? 0;
  return { resolved: { rows, max_duration_ms }, empty: rows.length === 0 };
}
```

- [ ] **Step 5: Create component**

Create `packages/widgets/src/widgets/test_timeline/TestTimelineWidget.tsx`:

```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { TestTimelineResolved } from "./resolve";
import { TestTimelineConfig } from "./schema";

const STATUS_COLOR: Record<string, string> = {
  pass: "#10b981",
  fail: "#ef4444",
  skip: "#f59e0b",
};

export function TestTimelineWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<TestTimelineResolved>;
}): JSX.Element {
  TestTimelineConfig.parse(panel.config);

  if (data.empty) {
    return (
      <div style={{ padding: 16, color: "var(--ink-3, #64748b)" }}>No test results.</div>
    );
  }

  const { rows, max_duration_ms } = data.resolved;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 8,
        overflowY: "auto",
        gap: 3,
      }}
    >
      {rows.map((row, i) => {
        const pct = max_duration_ms > 0 ? (row.duration_ms / max_duration_ms) * 100 : 0;
        const color = STATUS_COLOR[row.status] ?? "#64748b";
        const label =
          row.status === "skip" ? "skip" : `${(row.duration_ms / 1000).toFixed(2)}s`;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--ink-3, #64748b)",
                width: 100,
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "right",
              }}
            >
              {row.test_name}
            </span>
            <div
              style={{
                flex: 1,
                background: "var(--page-bg, #0f172a)",
                borderRadius: 2,
                height: 12,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 2,
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--ink-3, #64748b)",
                width: 36,
                flexShrink: 0,
                textAlign: "right",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create example**

Create `packages/widgets/src/widgets/test_timeline/example.ts`:

```ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function TestTimelineExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "tt-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Test Duration Timeline",
    widget_type: "test_timeline",
    x: 0,
    y: 2,
    width: 12,
    height: 3,
    config: { limit: 50 },
    created_at: now,
    updated_at: now,
  };
  const suites = ["auth", "checkout", "search", "nav"];
  const statuses = ["pass", "pass", "pass", "fail", "skip"];
  const records: DataRecord[] = Array.from({ length: 20 }, (_, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `test_${i + 1}`,
      suite: suites[i % suites.length] ?? "other",
      status: statuses[i % statuses.length] ?? "pass",
      duration_ms: 100 + i * 75,
    },
    recorded_at: new Date(Date.parse(now) - i * 5_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 7: Create index**

Create `packages/widgets/src/widgets/test_timeline/index.ts`:

```ts
import { defineWidget } from "@aguspe/tiler-core";
import { TestTimelineWidget } from "./TestTimelineWidget";
import { TestTimelineExample } from "./example";
import { resolveTestTimeline } from "./resolve";
import { TestTimelineConfig } from "./schema";

defineWidget({
  meta: {
    type: "test_timeline",
    label: "Test Timeline",
    description: "Horizontal bars per test sorted by duration, coloured by status.",
    requires_data_source: true,
    default_size: { w: 12, h: 3 },
    min_size: { w: 4, h: 2 },
    max_size: { w: 12, h: 8 },
  },
  configSchema: TestTimelineConfig,
  resolve: resolveTestTimeline,
  component: TestTimelineWidget,
  example: TestTimelineExample,
});

export { TestTimelineConfig, TestTimelineWidget, TestTimelineExample, resolveTestTimeline };
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose test_timeline.test
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/test_timeline/
git commit -m "feat(widgets): add test_timeline widget"
```

---

## Task 4: test_list widget

**Files:**
- Create: `packages/widgets/src/widgets/test_list/schema.ts`
- Create: `packages/widgets/src/widgets/test_list/resolve.ts`
- Create: `packages/widgets/src/widgets/test_list/TestListWidget.tsx`
- Create: `packages/widgets/src/widgets/test_list/example.ts`
- Create: `packages/widgets/src/widgets/test_list/index.ts`
- Create: `packages/widgets/src/widgets/test_list/test_list.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/widgets/src/widgets/test_list/test_list.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestListWidget } from "./TestListWidget";
import { TestListExample } from "./example";
import { resolveTestList } from "./resolve";

describe("resolveTestList", () => {
  it("puts failures first, then skips, then passes", () => {
    const { panel, records } = TestListExample();
    const result = resolveTestList({ panel, records, now: new Date() });
    const statuses = result.resolved.map((r) => r.status);
    const firstNonFail = statuses.findIndex((s) => s !== "fail");
    const firstPass = statuses.findIndex((s) => s === "pass");
    if (firstNonFail !== -1 && firstPass !== -1) {
      expect(firstNonFail).toBeLessThanOrEqual(firstPass);
    }
  });

  it("within same status, sorts by duration_ms descending", () => {
    const { panel, records } = TestListExample();
    const result = resolveTestList({ panel, records, now: new Date() });
    const failures = result.resolved.filter((r) => r.status === "fail");
    for (let i = 1; i < failures.length; i++) {
      expect(failures[i - 1]!.duration_ms >= failures[i]!.duration_ms).toBe(true);
    }
  });

  it("respects limit", () => {
    const { panel, records } = TestListExample();
    const smallPanel = { ...panel, config: { limit: 3 } };
    const result = resolveTestList({ panel: smallPanel, records, now: new Date() });
    expect(result.resolved.length).toBeLessThanOrEqual(3);
  });

  it("extracts screenshot_data and error_message", () => {
    const { panel } = TestListExample();
    const now = "2026-04-30T12:00:00.000Z";
    const records = [
      {
        id: "x1",
        data_source_id: "ds-1",
        payload: {
          test_name: "boom",
          suite: "auth",
          status: "fail",
          duration_ms: 500,
          error_message: "AssertionError",
          screenshot_data: "data:image/png;base64,abc",
        },
        recorded_at: now,
        source_ref: null,
        ingested_via: "manual" as const,
        created_at: now,
      },
    ];
    const result = resolveTestList({ panel, records, now: new Date() });
    expect(result.resolved[0]?.error_message).toBe("AssertionError");
    expect(result.resolved[0]?.screenshot_data).toBe("data:image/png;base64,abc");
  });
});

describe("TestListWidget", () => {
  it("renders test names", () => {
    const { panel, records } = TestListExample();
    const data = resolveTestList({ panel, records, now: new Date() });
    render(<TestListWidget panel={panel} data={data} />);
    expect(screen.getByText(data.resolved[0]!.test_name)).toBeInTheDocument();
  });

  it("clicking a failed row expands it to show error_message", () => {
    const { panel } = TestListExample();
    const now = "2026-04-30T12:00:00.000Z";
    const records = [
      {
        id: "f1",
        data_source_id: "ds-1",
        payload: {
          test_name: "failing_test",
          suite: "checkout",
          status: "fail",
          duration_ms: 1200,
          error_message: "Element not found",
          screenshot_data: null,
        },
        recorded_at: now,
        source_ref: null,
        ingested_via: "manual" as const,
        created_at: now,
      },
    ];
    const data = resolveTestList({ panel, records, now: new Date() });
    render(<TestListWidget panel={panel} data={data} />);

    expect(screen.queryByText("Element not found")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("failing_test").closest("[data-testid='test-row-header']")!);
    expect(screen.getByText("Element not found")).toBeInTheDocument();
  });

  it("renders empty state when no records", () => {
    const { panel } = TestListExample();
    render(<TestListWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No test results.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose test_list.test
```

Expected: FAIL — files don't exist.

- [ ] **Step 3: Create schema**

Create `packages/widgets/src/widgets/test_list/schema.ts`:

```ts
import { z } from "zod";

export const TestListConfig = z.object({
  limit: z.number().int().min(1).max(500).default(200),
  show_failures_only: z.boolean().default(false),
});
export type TestListConfig = z.infer<typeof TestListConfig>;
```

- [ ] **Step 4: Create resolver**

Create `packages/widgets/src/widgets/test_list/resolve.ts`:

```ts
import type { WidgetData, WidgetResolverArgs } from "@aguspe/tiler-core";
import { TestListConfig } from "./schema";

export interface TestListRow {
  id: string;
  test_name: string;
  suite: string;
  status: string;
  duration_ms: number;
  error_message: string | null;
  screenshot_data: string | null;
  file: string | null;
  line: number | null;
}

export type TestListResolved = TestListRow[];

const STATUS_PRIORITY: Record<string, number> = { fail: 0, skip: 1, pass: 2 };

export function resolveTestList({
  panel,
  records,
}: WidgetResolverArgs): WidgetData<TestListResolved> {
  const cfg = TestListConfig.parse(panel.config);
  const source = cfg.show_failures_only
    ? records.filter((r) => r.payload.status === "fail")
    : records;
  const rows: TestListRow[] = source
    .map((r) => ({
      id: r.id,
      test_name: String(r.payload.test_name ?? ""),
      suite: String(r.payload.suite ?? ""),
      status: String(r.payload.status ?? ""),
      duration_ms: Number(r.payload.duration_ms ?? 0),
      error_message: r.payload.error_message ? String(r.payload.error_message) : null,
      screenshot_data: r.payload.screenshot_data ? String(r.payload.screenshot_data) : null,
      file: r.payload.file ? String(r.payload.file) : null,
      line: r.payload.line != null ? Number(r.payload.line) : null,
    }))
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 3;
      const pb = STATUS_PRIORITY[b.status] ?? 3;
      if (pa !== pb) return pa - pb;
      return b.duration_ms - a.duration_ms;
    })
    .slice(0, cfg.limit);
  return { resolved: rows, empty: rows.length === 0 };
}
```

- [ ] **Step 5: Create component**

Create `packages/widgets/src/widgets/test_list/TestListWidget.tsx`:

```tsx
import { useState } from "react";
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { TestListResolved } from "./resolve";
import { TestListConfig } from "./schema";

const STATUS_COLOR: Record<string, string> = {
  pass: "#10b981",
  fail: "#ef4444",
  skip: "#f59e0b",
};

export function TestListWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<TestListResolved>;
}): JSX.Element {
  const cfg = TestListConfig.parse(panel.config);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [failOnly, setFailOnly] = useState(cfg.show_failures_only);

  if (data.empty) {
    return (
      <div style={{ padding: 16, color: "var(--ink-3, #64748b)" }}>No test results.</div>
    );
  }

  const rows = failOnly ? data.resolved.filter((r) => r.status === "fail") : data.resolved;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "6px 8px", display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          style={{
            fontSize: "0.75rem",
            cursor: "pointer",
            background: failOnly ? "transparent" : "var(--tile-bg, #1e293b)",
            border: "1px solid var(--border, #334155)",
            borderRadius: 4,
            padding: "2px 8px",
            color: failOnly ? "var(--ink-3, #64748b)" : "currentColor",
          }}
          onClick={() => setFailOnly(false)}
          aria-pressed={!failOnly}
        >
          All tests
        </button>
        <button
          style={{
            fontSize: "0.75rem",
            cursor: "pointer",
            background: failOnly ? "var(--tile-bg, #1e293b)" : "transparent",
            border: "1px solid var(--border, #334155)",
            borderRadius: 4,
            padding: "2px 8px",
            color: failOnly ? "currentColor" : "var(--ink-3, #64748b)",
          }}
          onClick={() => setFailOnly(true)}
          aria-pressed={failOnly}
        >
          Failures only
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "0 8px 8px",
        }}
      >
        {rows.map((row) => {
          const isExpanded = expanded.has(row.id);
          const color = STATUS_COLOR[row.status] ?? "currentColor";
          const isFail = row.status === "fail";
          const duration =
            row.status === "skip" ? "skip" : `${(row.duration_ms / 1000).toFixed(2)}s`;
          return (
            <div
              key={row.id}
              style={{
                borderRadius: 4,
                overflow: "hidden",
                border: isExpanded ? `1px solid ${color}40` : "1px solid transparent",
              }}
            >
              <div
                data-testid="test-row-header"
                style={{
                  padding: "4px 8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: isFail ? "pointer" : "default",
                  background: isExpanded
                    ? `${color}10`
                    : "var(--tile-bg, #1e293b)",
                }}
                onClick={() => isFail && toggle(row.id)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={{ color, flexShrink: 0 }}>
                    {row.status === "skip" ? "◌" : "●"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.test_name}
                  </span>
                  {row.suite && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--ink-3, #64748b)",
                        background: "var(--page-bg, #0f172a)",
                        padding: "1px 5px",
                        borderRadius: 3,
                        flexShrink: 0,
                      }}
                    >
                      {row.suite}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--ink-3, #64748b)",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {duration}
                </span>
              </div>
              {isExpanded && (
                <div
                  style={{
                    padding: 8,
                    display: "flex",
                    gap: 10,
                    background: `${color}08`,
                    borderTop: `1px solid ${color}20`,
                  }}
                >
                  {row.screenshot_data && (
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={row.screenshot_data}
                        alt="screenshot"
                        style={{
                          width: 120,
                          height: 75,
                          objectFit: "cover",
                          borderRadius: 4,
                          display: "block",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {row.error_message && (
                      <pre
                        style={{
                          fontSize: "0.75rem",
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "var(--ink-1, #e2e8f0)",
                          background: "var(--page-bg, #0f172a)",
                          padding: 8,
                          borderRadius: 4,
                        }}
                      >
                        {row.error_message}
                      </pre>
                    )}
                    {row.file && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--ink-3, #64748b)",
                          marginTop: 4,
                        }}
                      >
                        {row.file}
                        {row.line != null ? `:${row.line}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create example**

Create `packages/widgets/src/widgets/test_list/example.ts`:

```ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function TestListExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "tl-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "All Tests",
    widget_type: "test_list",
    x: 0,
    y: 5,
    width: 8,
    height: 5,
    config: { limit: 200, show_failures_only: false },
    created_at: now,
    updated_at: now,
  };
  const suites = ["auth", "checkout", "search", "nav"];
  const rows: Array<{ status: string; duration: number; error?: string }> = [
    { status: "fail", duration: 3200, error: "AssertionError: Expected element to be visible" },
    { status: "fail", duration: 1800, error: "TimeoutError: Locator timed out" },
    { status: "skip", duration: 0 },
    { status: "pass", duration: 812 },
    { status: "pass", duration: 540 },
    { status: "pass", duration: 320 },
  ];
  const records: DataRecord[] = rows.map((row, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `test_${i + 1}`,
      suite: suites[i % suites.length] ?? "other",
      status: row.status,
      duration_ms: row.duration,
      ...(row.error ? { error_message: row.error } : {}),
    },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 7: Create index**

Create `packages/widgets/src/widgets/test_list/index.ts`:

```ts
import { defineWidget } from "@aguspe/tiler-core";
import { TestListWidget } from "./TestListWidget";
import { TestListExample } from "./example";
import { resolveTestList } from "./resolve";
import { TestListConfig } from "./schema";

defineWidget({
  meta: {
    type: "test_list",
    label: "Test List",
    description:
      "Sortable test result rows — failed rows expand to show screenshot and error message.",
    requires_data_source: true,
    default_size: { w: 8, h: 5 },
    min_size: { w: 4, h: 3 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: TestListConfig,
  resolve: resolveTestList,
  component: TestListWidget,
  example: TestListExample,
});

export { TestListConfig, TestListWidget, TestListExample, resolveTestList };
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose test_list.test
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/test_list/
git commit -m "feat(widgets): add test_list widget with inline screenshot expand"
```

---

## Task 5: suite_progress widget

**Files:**
- Create: `packages/widgets/src/widgets/suite_progress/schema.ts`
- Create: `packages/widgets/src/widgets/suite_progress/resolve.ts`
- Create: `packages/widgets/src/widgets/suite_progress/SuiteProgressWidget.tsx`
- Create: `packages/widgets/src/widgets/suite_progress/example.ts`
- Create: `packages/widgets/src/widgets/suite_progress/index.ts`
- Create: `packages/widgets/src/widgets/suite_progress/suite_progress.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `packages/widgets/src/widgets/suite_progress/suite_progress.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuiteProgressWidget } from "./SuiteProgressWidget";
import { SuiteProgressExample } from "./example";
import { resolveSuiteProgress } from "./resolve";

describe("resolveSuiteProgress", () => {
  it("groups by suite and computes pass_rate", () => {
    const { panel, records } = SuiteProgressExample();
    const result = resolveSuiteProgress({ panel, records, now: new Date() });
    const auth = result.resolved.find((r) => r.suite === "auth");
    expect(auth).toBeDefined();
    expect(auth!.pass_rate).toBeCloseTo(100);
  });

  it("sorts by pass_rate ascending (worst first)", () => {
    const { panel, records } = SuiteProgressExample();
    const result = resolveSuiteProgress({ panel, records, now: new Date() });
    for (let i = 1; i < result.resolved.length; i++) {
      expect(result.resolved[i - 1]!.pass_rate <= result.resolved[i]!.pass_rate).toBe(true);
    }
  });

  it("returns empty=true with no records", () => {
    const { panel } = SuiteProgressExample();
    const result = resolveSuiteProgress({ panel, records: [], now: new Date() });
    expect(result.empty).toBe(true);
  });
});

describe("SuiteProgressWidget", () => {
  it("renders suite names and percentages", () => {
    const { panel, records } = SuiteProgressExample();
    const data = resolveSuiteProgress({ panel, records, now: new Date() });
    render(<SuiteProgressWidget panel={panel} data={data} />);
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders empty state with no records", () => {
    const { panel } = SuiteProgressExample();
    render(<SuiteProgressWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No suite data.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose suite_progress.test
```

Expected: FAIL — files don't exist.

- [ ] **Step 3: Create schema**

Create `packages/widgets/src/widgets/suite_progress/schema.ts`:

```ts
import { z } from "zod";

export const SuiteProgressConfig = z.object({
  good_threshold: z.number().min(0).max(100).default(90),
  warn_threshold: z.number().min(0).max(100).default(70),
});
export type SuiteProgressConfig = z.infer<typeof SuiteProgressConfig>;
```

- [ ] **Step 4: Create resolver**

Create `packages/widgets/src/widgets/suite_progress/resolve.ts`:

```ts
import { type WidgetData, type WidgetResolverArgs, groupByColumn } from "@aguspe/tiler-core";
import { SuiteProgressConfig } from "./schema";

export interface SuiteProgressRow {
  suite: string;
  total: number;
  passed: number;
  pass_rate: number;
}

export type SuiteProgressResolved = SuiteProgressRow[];

export function resolveSuiteProgress({
  panel,
  records,
}: WidgetResolverArgs): WidgetData<SuiteProgressResolved> {
  SuiteProgressConfig.parse(panel.config);
  const groups = groupByColumn(records, "suite");
  const rows: SuiteProgressRow[] = groups
    .map(({ key, records: recs }) => {
      const total = recs.length;
      const passed = recs.filter((r) => r.payload.status === "pass").length;
      const pass_rate = total > 0 ? (passed / total) * 100 : 0;
      return { suite: key, total, passed, pass_rate };
    })
    .sort((a, b) => a.pass_rate - b.pass_rate);
  return { resolved: rows, empty: rows.length === 0 };
}
```

- [ ] **Step 5: Create component**

Create `packages/widgets/src/widgets/suite_progress/SuiteProgressWidget.tsx`:

```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { SuiteProgressResolved } from "./resolve";
import { SuiteProgressConfig } from "./schema";

function thresholdColor(value: number, good: number, warn: number): string {
  if (value >= good) return "#10b981";
  if (value >= warn) return "#f59e0b";
  return "#ef4444";
}

export function SuiteProgressWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<SuiteProgressResolved>;
}): JSX.Element {
  const cfg = SuiteProgressConfig.parse(panel.config);

  if (data.empty) {
    return (
      <div style={{ padding: 16, color: "var(--ink-3, #64748b)" }}>No suite data.</div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: 8,
        gap: 10,
        overflowY: "auto",
      }}
    >
      {data.resolved.map((row) => {
        const color = thresholdColor(row.pass_rate, cfg.good_threshold, cfg.warn_threshold);
        return (
          <div key={row.suite}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: "0.8rem" }}>{row.suite}</span>
              <span style={{ fontSize: "0.8rem", color }}>{row.pass_rate.toFixed(0)}%</span>
            </div>
            <div
              style={{
                background: "var(--page-bg, #0f172a)",
                borderRadius: 3,
                height: 8,
              }}
            >
              <div
                style={{
                  width: `${row.pass_rate}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create example**

Create `packages/widgets/src/widgets/suite_progress/example.ts`:

```ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function SuiteProgressExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "sp-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Suite Pass Rate",
    widget_type: "suite_progress",
    x: 8,
    y: 5,
    width: 4,
    height: 5,
    config: { good_threshold: 90, warn_threshold: 70 },
    created_at: now,
    updated_at: now,
  };
  const rows: Array<{ suite: string; status: string }> = [
    { suite: "auth", status: "pass" },
    { suite: "auth", status: "pass" },
    { suite: "checkout", status: "pass" },
    { suite: "checkout", status: "fail" },
    { suite: "checkout", status: "fail" },
    { suite: "search", status: "pass" },
    { suite: "search", status: "pass" },
    { suite: "search", status: "pass" },
  ];
  const records: DataRecord[] = rows.map((row, i) => ({
    id: `r${i}`,
    data_source_id: "ds-1",
    payload: {
      test_name: `test_${i + 1}`,
      suite: row.suite,
      status: row.status,
      duration_ms: 200 + i * 50,
    },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 7: Create index**

Create `packages/widgets/src/widgets/suite_progress/index.ts`:

```ts
import { defineWidget } from "@aguspe/tiler-core";
import { SuiteProgressWidget } from "./SuiteProgressWidget";
import { SuiteProgressExample } from "./example";
import { resolveSuiteProgress } from "./resolve";
import { SuiteProgressConfig } from "./schema";

defineWidget({
  meta: {
    type: "suite_progress",
    label: "Suite Progress",
    description: "Pass-rate progress bar per test suite, sorted worst-first.",
    requires_data_source: true,
    default_size: { w: 4, h: 5 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: SuiteProgressConfig,
  resolve: resolveSuiteProgress,
  component: SuiteProgressWidget,
  example: SuiteProgressExample,
});

export { SuiteProgressConfig, SuiteProgressWidget, SuiteProgressExample, resolveSuiteProgress };
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
cd packages/widgets && pnpm test -- --reporter=verbose suite_progress.test
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/suite_progress/
git commit -m "feat(widgets): add suite_progress widget"
```

---

## Task 6: Register new widgets in index

**Files:**
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Add imports and exports**

Replace `packages/widgets/src/index.ts` with:

```ts
import "./styles/tokens.css";
import "./widgets/clock";
import "./widgets/text";
import "./widgets/image";
import "./widgets/iframe";
import "./widgets/metric";
import "./widgets/number_with_delta";
import "./widgets/meter";
import "./widgets/list";
import "./widgets/status_grid";
import "./widgets/comments";
import "./widgets/table";
import "./widgets/line_chart";
import "./widgets/bar_chart";
import "./widgets/pie_chart";
import "./widgets/pass_rate";
import "./widgets/test_timeline";
import "./widgets/test_list";
import "./widgets/suite_progress";

export const TILER_WIDGETS_VERSION = "0.0.1" as const;
export { chartColors } from "./lib/chart-colors";
export { ClockConfig, ClockWidget } from "./widgets/clock";
export { TextConfig, TextWidget } from "./widgets/text";
export { ImageConfig, ImageWidget } from "./widgets/image";
export { IframeConfig, IframeWidget } from "./widgets/iframe";
export { MetricConfig, MetricWidget } from "./widgets/metric";
export { NumberWithDeltaConfig, NumberWithDeltaWidget } from "./widgets/number_with_delta";
export { MeterConfig, MeterWidget } from "./widgets/meter";
export { ListConfig, ListWidget } from "./widgets/list";
export { StatusGridConfig, StatusGridWidget } from "./widgets/status_grid";
export { CommentsConfig, CommentsWidget } from "./widgets/comments";
export { TableConfig, TableWidget } from "./widgets/table";
export { LineChartConfig, LineChartWidget } from "./widgets/line_chart";
export { BarChartConfig, BarChartWidget } from "./widgets/bar_chart";
export { PieChartConfig, PieChartWidget } from "./widgets/pie_chart";
export { PassRateConfig, PassRateWidget } from "./widgets/pass_rate";
export { TestTimelineConfig, TestTimelineWidget } from "./widgets/test_timeline";
export { TestListConfig, TestListWidget } from "./widgets/test_list";
export { SuiteProgressConfig, SuiteProgressWidget } from "./widgets/suite_progress";
```

- [ ] **Step 2: Run all widget tests to confirm nothing is broken**

```bash
cd packages/widgets && pnpm test
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/widgets/src/index.ts
git commit -m "feat(widgets): register pass_rate, test_timeline, test_list, suite_progress"
```

---

## Task 7: Update test_automation preset

**Files:**
- Modify: `packages/core/src/presets/test_automation.ts`
- Modify: `packages/core/src/presets/test_automation.test.ts`

- [ ] **Step 1: Update preset tests first**

Replace `packages/core/src/presets/test_automation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { testAutomationPreset } from "./test_automation";

const NOW = new Date("2026-04-30T12:00:00.000Z");

describe("testAutomationPreset", () => {
  it("returns a dashboard, one data source, and 8 panels", () => {
    const result = testAutomationPreset({ now: NOW });
    expect(result.dashboard.slug).toBe("test_automation");
    expect(result.dataSources).toHaveLength(1);
    expect(result.dataSources[0]?.slug).toBe("test_runs");
    expect(result.panels).toHaveLength(8);
  });

  it("data source schema includes screenshot_data", () => {
    const { dataSources } = testAutomationPreset({ now: NOW });
    const fields = dataSources[0]?.schema_definition.map((f) => f.key) ?? [];
    expect(fields).toContain("screenshot_data");
  });

  it("all panels reference the test_runs data source", () => {
    const { panels, dataSources } = testAutomationPreset({ now: NOW });
    const sourceId = dataSources[0]?.id ?? "";
    expect(panels.every((p) => p.data_source_id === sourceId)).toBe(true);
  });

  it("uses the four new widget types", () => {
    const { panels } = testAutomationPreset({ now: NOW });
    const types = new Set(panels.map((p) => p.widget_type));
    expect(types.has("pass_rate")).toBe(true);
    expect(types.has("test_timeline")).toBe(true);
    expect(types.has("test_list")).toBe(true);
    expect(types.has("suite_progress")).toBe(true);
  });

  it("respects the slug option", () => {
    const result = testAutomationPreset({ now: NOW, slug: "qa_cockpit" });
    expect(result.dashboard.slug).toBe("qa_cockpit");
  });

  it("panels lay out without overlap on a 12-column grid", () => {
    const { panels } = testAutomationPreset({ now: NOW });
    const cells = new Set<string>();
    for (const p of panels) {
      for (let dx = 0; dx < p.width; dx++) {
        for (let dy = 0; dy < p.height; dy++) {
          const key = `${p.x + dx},${p.y + dy}`;
          expect(cells.has(key)).toBe(false);
          cells.add(key);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run preset tests to confirm they fail**

```bash
cd packages/core && pnpm test -- --reporter=verbose test_automation.test
```

Expected: FAIL — panel count is still 9, screenshot_data field missing, etc.

- [ ] **Step 3: Replace the preset implementation**

Replace `packages/core/src/presets/test_automation.ts`:

```ts
import type { Dashboard } from "../schema/dashboard";
import type { DataSource } from "../schema/data_source";
import type { Panel } from "../schema/panel";
import { newId } from "../ulid";
import type { PresetOptions, PresetOutput } from "./types";

export function testAutomationPreset(opts: PresetOptions = {}): PresetOutput {
  const now = opts.now ?? new Date();
  const iso = now.toISOString();
  const slug = opts.slug ?? "test_automation";

  const dashboard: Dashboard = {
    id: newId(),
    name: "Test Automation",
    slug,
    description: "Playwright run report — timeline, per-test results, suite pass-rates.",
    refresh_seconds: 0,
    settings: { tv_mode: false },
    created_at: iso,
    updated_at: iso,
  };

  const sourceId = newId();
  const source: DataSource = {
    id: sourceId,
    name: "Test Runs",
    slug: "test_runs",
    description: "One record per test execution.",
    schema_definition: [
      { key: "suite", type: "string" },
      { key: "test_name", type: "string" },
      { key: "status", type: "string" },
      { key: "duration_ms", type: "float" },
      { key: "environment", type: "string" },
      { key: "error_message", type: "string" },
      { key: "screenshot_data", type: "string" },
      { key: "file", type: "string" },
      { key: "line", type: "integer" },
    ],
    ingestion_methods: ["webhook", "manual"],
    webhook_token: null,
    active: true,
    created_at: iso,
    updated_at: iso,
  };

  const panel = (
    title: string,
    widget_type: string,
    x: number,
    y: number,
    width: number,
    height: number,
    config: Record<string, unknown>,
  ): Panel => ({
    id: newId(),
    dashboard_id: dashboard.id,
    data_source_id: sourceId,
    title,
    widget_type,
    x,
    y,
    width,
    height,
    config,
    created_at: iso,
    updated_at: iso,
  });

  const panels: Panel[] = [
    // Row 0 (y=0, h=2): summary strip
    panel("Total Tests", "metric", 0, 0, 3, 2, {
      aggregation: "count",
      time_window: "all",
    }),
    panel("Passed", "metric", 3, 0, 2, 2, {
      aggregation: "count",
      time_window: "all",
      filter: { status: "pass" },
      color: "#10b981",
    }),
    panel("Failed", "metric", 5, 0, 2, 2, {
      aggregation: "count",
      time_window: "all",
      filter: { status: "fail" },
      color: "#ef4444",
    }),
    panel("Skipped", "metric", 7, 0, 2, 2, {
      aggregation: "count",
      time_window: "all",
      filter: { status: "skip" },
      color: "#f59e0b",
    }),
    panel("Pass Rate", "pass_rate", 9, 0, 3, 2, {
      good_threshold: 90,
      warn_threshold: 70,
    }),
    // Row 1 (y=2, h=3): duration timeline
    panel("Test Duration Timeline", "test_timeline", 0, 2, 12, 3, {
      limit: 50,
    }),
    // Row 2 (y=5, h=5): test list + suite progress
    panel("All Tests", "test_list", 0, 5, 8, 5, {
      limit: 200,
      show_failures_only: false,
    }),
    panel("Suite Pass Rate", "suite_progress", 8, 5, 4, 5, {
      good_threshold: 90,
      warn_threshold: 70,
    }),
  ];

  return { dashboard, dataSources: [source], panels };
}
```

- [ ] **Step 4: Run preset tests to confirm they pass**

```bash
cd packages/core && pnpm test -- --reporter=verbose test_automation.test
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/presets/test_automation.ts packages/core/src/presets/test_automation.test.ts
git commit -m "feat(core): update test_automation preset to Allure-style run report layout"
```

---

## Task 8: Capture screenshots in record-builder

**Files:**
- Modify: `packages/playwright/src/record-builder.ts`
- Modify: `packages/playwright/src/record-builder.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the `buildRecord` describe block in `packages/playwright/src/record-builder.test.ts`:

```ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
```

Add this test case inside the `describe("buildRecord", ...)` block:

```ts
  it("embeds screenshot as base64 data URI when 'screenshot' attachment is present", () => {
    const dir = join(tmpdir(), `tiler-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const screenshotPath = join(dir, "shot.png");
    // Write a minimal 1-pixel PNG (valid base64 content for testing)
    writeFileSync(screenshotPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

    const record = buildRecord({
      dataSourceId: "ds1",
      now: new Date("2026-04-30T12:00:00.000Z"),
      test: { title: "checkout_fail", parent: { title: "checkout" } },
      result: {
        status: "failed",
        duration: 3200,
        retry: 0,
        attachments: [{ name: "screenshot", path: screenshotPath }],
        error: { message: "AssertionError" },
      },
      project: "chromium",
    });

    expect(typeof record.payload.screenshot_data).toBe("string");
    expect((record.payload.screenshot_data as string).startsWith("data:image/png;base64,")).toBe(true);
  });

  it("does not set screenshot_data when no screenshot attachment", () => {
    const record = buildRecord({
      dataSourceId: "ds1",
      now: new Date("2026-04-30T12:00:00.000Z"),
      test: { title: "x" },
      result: { status: "failed", duration: 100, retry: 0, attachments: [] },
      project: "chromium",
    });
    expect(record.payload.screenshot_data).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd packages/playwright && pnpm test -- --reporter=verbose record-builder.test
```

Expected: FAIL — `screenshot_data` is undefined.

- [ ] **Step 3: Add screenshot capture to record-builder**

Replace `packages/playwright/src/record-builder.ts`:

```ts
import { readFileSync } from "node:fs";
import { type DataRecord, newId } from "@aguspe/tiler-core";

type PwStatus = "passed" | "failed" | "timedOut" | "interrupted" | "skipped";

const STATUS_MAP: Record<PwStatus, string> = {
  passed: "pass",
  failed: "fail",
  timedOut: "fail",
  interrupted: "fail",
  skipped: "skip",
};

export function statusFromPlaywright(s: PwStatus): string {
  return STATUS_MAP[s] ?? "skip";
}

export interface BuildRecordInput {
  dataSourceId: string;
  now: Date;
  test: {
    title: string;
    parent?: { title?: string };
    location?: { file?: string; line?: number };
  };
  result: {
    status: PwStatus;
    duration: number;
    retry: number;
    attachments?: Array<{ name?: string; path?: string }>;
    error?: { message?: string };
  };
  project: string;
}

export function buildRecord(input: BuildRecordInput): DataRecord {
  const trace = input.result.attachments?.find((a) => a.name === "trace");
  const screenshot = input.result.attachments?.find((a) => a.name === "screenshot");

  const payload: Record<string, unknown> = {
    suite: input.test.parent?.title ?? "",
    test_name: input.test.title,
    status: statusFromPlaywright(input.result.status),
    duration_ms: input.result.duration,
    project: input.project,
    retry: input.result.retry,
  };

  if (input.test.location?.file) payload.file = input.test.location.file;
  if (input.test.location?.line) payload.line = input.test.location.line;
  if (input.result.error?.message) payload.error_message = input.result.error.message;
  if (trace?.path) payload.trace_path = trace.path;
  if (screenshot?.path) {
    const data = readFileSync(screenshot.path);
    payload.screenshot_data = `data:image/png;base64,${data.toString("base64")}`;
  }

  return {
    id: newId(),
    data_source_id: input.dataSourceId,
    payload,
    recorded_at: input.now.toISOString(),
    source_ref: null,
    ingested_via: "manual",
    created_at: input.now.toISOString(),
  };
}
```

- [ ] **Step 4: Run all record-builder tests to confirm they pass**

```bash
cd packages/playwright && pnpm test -- --reporter=verbose record-builder.test
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/playwright/src/record-builder.ts packages/playwright/src/record-builder.test.ts
git commit -m "feat(playwright): embed screenshot attachment as base64 in record payload"
```

---

## Task 9: Full integration smoke test

- [ ] **Step 1: Run all tests across the monorepo**

```bash
cd /Users/augustingottlieb/tiler-ts && pnpm test
```

Expected: all packages pass. If any fail, fix them before proceeding.

- [ ] **Step 2: Rebuild the tiler-ts packages**

```bash
pnpm build
```

- [ ] **Step 3: Run the tiler-example Playwright tests to generate a report**

In `tiler-example/playwright.config.ts`, ensure `screenshot: "only-on-failure"` is set in the `use` block:

```ts
use: {
  screenshot: "only-on-failure",
},
```

Then run:

```bash
cd /Users/augustingottlieb/tiler-example && npx playwright test --project=chromium
```

- [ ] **Step 4: Open the generated report**

```bash
open /Users/augustingottlieb/tiler-example/tiler-report/index.html
```

Verify visually:
- Row 0: Total Tests / Passed / Failed / Skipped metrics + Pass Rate percentage
- Row 1: Test Duration Timeline with horizontal bars
- Row 2 left: All Tests list with "All tests / Failures only" toggle
- Row 2 right: Suite Pass Rate bars
- Any failed test row: click it → expands to show error message (screenshot if captured)

- [ ] **Step 5: Final commit**

```bash
git add /Users/augustingottlieb/tiler-example/playwright.config.ts
git commit -m "chore(tiler-example): enable screenshot on failure for run reports"
```
