# tiler-ts Phase 2 — Remaining 10 Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the 10 data-backed widgets in `@aguspe/tiler-widgets` — bringing the registry to all 14 from the spec — plus the four shared resolver helpers each one depends on. End state: every widget renders in Storybook, the cross-package smoke test passes for 14 widget types, and CI stays green within the bumped size budget.

**Architecture:** Resolver helpers (`aggregate`, `applyTimeWindow`, `applyFilter`, `groupBucket`) live in `@aguspe/tiler-core/src/lib/` so they remain framework-agnostic and stay leaf-most. Widgets follow the same per-widget directory pattern Plan 1 established (`schema.ts`, `resolve.ts`, `example.ts`, `<Name>Widget.tsx`, `index.ts`, `<name>.test.tsx`, `<name>.stories.tsx`). Chart widgets pull in `recharts` as a direct dep on `@aguspe/tiler-widgets`; lazy-loading is intentionally deferred to Phase 3 where the viewer/editor packages provide a real bundle boundary.

**Tech Stack:** Same as Phase 1 plus `recharts` for chart widgets. No new infra (Storybook, Vitest, Biome, tsup, dependency-cruiser, Changesets, size-limit) — all already wired.

**Spec reference:** `docs/superpowers/specs/2026-04-30-tiler-ts-design.md` (§3 Widget contract, §5 Performance budgets).

**Phase 1 prerequisite:** tag `v0.0.1-phase-1` (commit `b1f135b` or later). Reset everything from Phase 1: schemas, registry, MemoryStore, 4 config-only widgets in `@aguspe/tiler-widgets`.

---

## Per-widget file pattern (reference)

Every data-backed widget in this plan creates these files under
`packages/widgets/src/widgets/<name>/`:

```
schema.ts            # Zod schema for widget's panel.config
resolve.ts           # Pure resolver: ({ panel, records, now }) => WidgetData
example.ts           # () => { panel, records } fixture used by tests + stories
<Name>Widget.tsx     # React component
index.ts             # defineWidget({...}) call — side-effect-registers
<name>.test.tsx      # Tests for resolver + component
<name>.stories.tsx   # Storybook stories (added in Task 20)
```

Each widget's `index.ts` is side-effect-imported from the package barrel
(`packages/widgets/src/index.ts`) and the named exports re-exported. After
each widget task, the barrel grows by two lines (one import side-effect, one
re-export).

---

## Task 1: `aggregate()` helper

**Files:**
- Create: `packages/core/src/lib/aggregate.ts`
- Create: `packages/core/src/lib/aggregate.test.ts`
- Modify: `packages/core/src/index.ts`

The single hottest helper — every metric/meter/chart resolver calls it. Implements the seven aggregations from `Aggregation` enum (`sum`, `avg`, `min`, `max`, `count`, `first`, `last`).

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/lib/aggregate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { aggregate } from "./aggregate";

const NOW = "2026-04-30T12:00:00.000Z";
const rec = (payload: Record<string, unknown>, recorded_at = NOW): DataRecord => ({
  id: "r", data_source_id: "s", payload, recorded_at,
  source_ref: null, ingested_via: "manual", created_at: NOW,
});

describe("aggregate", () => {
  it("count: returns record count regardless of column", () => {
    expect(aggregate([rec({}), rec({}), rec({})], { aggregation: "count" })).toBe(3);
  });
  it("count on empty array is 0", () => {
    expect(aggregate([], { aggregation: "count" })).toBe(0);
  });
  it("sum: sums numeric column values", () => {
    expect(aggregate(
      [rec({ x: 1 }), rec({ x: 2 }), rec({ x: 3 })],
      { aggregation: "sum", value_column: "x" },
    )).toBe(6);
  });
  it("avg: averages numeric column values", () => {
    expect(aggregate(
      [rec({ x: 2 }), rec({ x: 4 })],
      { aggregation: "avg", value_column: "x" },
    )).toBe(3);
  });
  it("avg on empty values returns 0", () => {
    expect(aggregate([rec({})], { aggregation: "avg", value_column: "x" })).toBe(0);
  });
  it("min/max ignore non-numeric values", () => {
    expect(aggregate(
      [rec({ x: 5 }), rec({ x: "nope" }), rec({ x: 3 })],
      { aggregation: "min", value_column: "x" },
    )).toBe(3);
    expect(aggregate(
      [rec({ x: 5 }), rec({ x: "nope" }), rec({ x: 3 })],
      { aggregation: "max", value_column: "x" },
    )).toBe(5);
  });
  it("first: returns the value of the first record's column", () => {
    expect(aggregate(
      [rec({ x: 10 }), rec({ x: 20 })],
      { aggregation: "first", value_column: "x" },
    )).toBe(10);
  });
  it("last: returns the value of the last record's column", () => {
    expect(aggregate(
      [rec({ x: 10 }), rec({ x: 20 })],
      { aggregation: "last", value_column: "x" },
    )).toBe(20);
  });
  it("returns 0 when value_column is missing for sum/avg/min/max", () => {
    expect(aggregate(
      [rec({}), rec({})],
      { aggregation: "sum" },
    )).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

`pnpm --filter @aguspe/tiler-core test` — module resolution fails for `./aggregate`.

- [ ] **Step 3: Implement `aggregate.ts`**

```ts
import type { DataRecord } from "../schema/data_record";
import type { Aggregation } from "../schema/time_window";

export interface AggregateOpts {
  aggregation: Aggregation;
  value_column?: string;
}

/**
 * Pure aggregation over a record array. Used by every data-backed widget's resolver.
 * - `count` ignores `value_column` and returns record count.
 * - `sum`/`avg`/`min`/`max` coerce values to numbers; non-numeric values are skipped.
 * - `first`/`last` return the raw column value of the first/last record (typed as number;
 *   widgets using non-numeric columns should branch in their resolver before calling this).
 */
export function aggregate(records: DataRecord[], opts: AggregateOpts): number {
  const { aggregation, value_column } = opts;

  if (aggregation === "count") return records.length;
  if (records.length === 0) return 0;

  if (aggregation === "first" || aggregation === "last") {
    const r = aggregation === "first" ? records[0] : records[records.length - 1];
    if (!r || !value_column) return 0;
    const v = Number(r.payload[value_column]);
    return Number.isFinite(v) ? v : 0;
  }

  if (!value_column) return 0;
  const values: number[] = [];
  for (const r of records) {
    const v = Number(r.payload[value_column]);
    if (Number.isFinite(v)) values.push(v);
  }
  if (values.length === 0) return 0;

  switch (aggregation) {
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
  }
}
```

- [ ] **Step 4: Re-export from barrel**

Append to `packages/core/src/index.ts`:
```ts
export * from "./lib/aggregate";
```

- [ ] **Step 5: Run test, expect PASS**

`pnpm --filter @aguspe/tiler-core test`

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/lib/ packages/core/src/index.ts
git commit -m "feat(core): add aggregate() helper for widget resolvers"
```

---

## Task 2: `applyTimeWindow()` helper

**Files:**
- Create: `packages/core/src/lib/time-window.ts`
- Create: `packages/core/src/lib/time-window.test.ts`
- Modify: `packages/core/src/index.ts`

Translates a `TimeWindow` enum value into a `(since, until)` ISO pair given a reference `now`. Filters a record array down to that window.

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/lib/time-window.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { applyTimeWindow, timeWindowBounds } from "./time-window";

const REF = new Date("2026-04-30T12:00:00.000Z");

const rec = (recorded_at: string): DataRecord => ({
  id: "r", data_source_id: "s", payload: {}, recorded_at,
  source_ref: null, ingested_via: "manual", created_at: recorded_at,
});

describe("timeWindowBounds", () => {
  it("'24h' returns (now-24h, now)", () => {
    const { since, until } = timeWindowBounds("24h", REF);
    expect(until).toBe(REF.toISOString());
    expect(since).toBe(new Date(REF.getTime() - 24 * 3600_000).toISOString());
  });
  it("'7d' returns (now-7d, now)", () => {
    const { since } = timeWindowBounds("7d", REF);
    expect(since).toBe(new Date(REF.getTime() - 7 * 24 * 3600_000).toISOString());
  });
  it("'all' returns since=null", () => {
    const { since, until } = timeWindowBounds("all", REF);
    expect(since).toBeNull();
    expect(until).toBe(REF.toISOString());
  });
});

describe("applyTimeWindow", () => {
  const records = [
    rec("2026-04-30T11:30:00.000Z"), // within 24h
    rec("2026-04-29T13:00:00.000Z"), // within 24h
    rec("2026-04-28T11:00:00.000Z"), // outside 24h
  ];
  it("filters records inside the window", () => {
    expect(applyTimeWindow(records, "24h", REF)).toHaveLength(2);
  });
  it("returns all records when window is 'all'", () => {
    expect(applyTimeWindow(records, "all", REF)).toHaveLength(3);
  });
  it("never includes future-dated records", () => {
    const future = rec("2027-01-01T00:00:00.000Z");
    expect(applyTimeWindow([...records, future], "24h", REF)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `time-window.ts`**

```ts
import type { DataRecord } from "../schema/data_record";
import type { TimeWindow } from "../schema/time_window";

const MS = {
  "1m":  60_000,
  "5m":  5 * 60_000,
  "15m": 15 * 60_000,
  "1h":  3600_000,
  "4h":  4 * 3600_000,
  "24h": 24 * 3600_000,
  "7d":  7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
} as const;

export interface TimeWindowBounds {
  since: string | null;  // null when window is "all"
  until: string;
}

export function timeWindowBounds(window: TimeWindow, now: Date): TimeWindowBounds {
  const until = now.toISOString();
  if (window === "all") return { since: null, until };
  const sinceMs = now.getTime() - MS[window];
  return { since: new Date(sinceMs).toISOString(), until };
}

export function applyTimeWindow(
  records: DataRecord[],
  window: TimeWindow,
  now: Date,
): DataRecord[] {
  const { since, until } = timeWindowBounds(window, now);
  return records.filter((r) => {
    if (since !== null && r.recorded_at < since) return false;
    if (r.recorded_at > until) return false;
    return true;
  });
}
```

- [ ] **Step 4: Re-export from barrel**

```ts
export * from "./lib/time-window";
```

- [ ] **Step 5: Run test, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/lib/ packages/core/src/index.ts
git commit -m "feat(core): add applyTimeWindow() and timeWindowBounds() helpers"
```

---

## Task 3: `applyFilter()` helper

**Files:**
- Create: `packages/core/src/lib/filter.ts`
- Create: `packages/core/src/lib/filter.test.ts`
- Modify: `packages/core/src/index.ts`

Filters records by `panel.config.filter` — a key-value match against `payload`. Used by every data-backed widget that supports the `filter:` config key.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { applyFilter } from "./filter";

const rec = (payload: Record<string, unknown>): DataRecord => ({
  id: "r", data_source_id: "s", payload,
  recorded_at: "2026-04-30T12:00:00.000Z",
  source_ref: null, ingested_via: "manual",
  created_at: "2026-04-30T12:00:00.000Z",
});

describe("applyFilter", () => {
  it("returns records matching all filter keys", () => {
    const result = applyFilter(
      [rec({ status: "pass" }), rec({ status: "fail" }), rec({ status: "pass" })],
      { status: "pass" },
    );
    expect(result).toHaveLength(2);
  });
  it("returns all records when filter is undefined", () => {
    const result = applyFilter([rec({ a: 1 })], undefined);
    expect(result).toHaveLength(1);
  });
  it("matches multiple keys with AND semantics", () => {
    const result = applyFilter(
      [
        rec({ status: "pass", suite: "checkout" }),
        rec({ status: "pass", suite: "auth" }),
        rec({ status: "fail", suite: "checkout" }),
      ],
      { status: "pass", suite: "checkout" },
    );
    expect(result).toHaveLength(1);
  });
  it("matches numeric and boolean values", () => {
    expect(applyFilter([rec({ retried: true }), rec({ retried: false })], { retried: true }))
      .toHaveLength(1);
    expect(applyFilter([rec({ priority: 1 }), rec({ priority: 2 })], { priority: 1 }))
      .toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `filter.ts`**

```ts
import type { DataRecord } from "../schema/data_record";

export type Filter = Record<string, string | number | boolean>;

export function applyFilter(records: DataRecord[], filter?: Filter): DataRecord[] {
  if (!filter || Object.keys(filter).length === 0) return records;
  const entries = Object.entries(filter);
  return records.filter((r) => entries.every(([k, v]) => r.payload[k] === v));
}
```

- [ ] **Step 4: Re-export from barrel**

```ts
export * from "./lib/filter";
```

- [ ] **Step 5: Run test, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/lib/ packages/core/src/index.ts
git commit -m "feat(core): add applyFilter() helper for widget config.filter"
```

---

## Task 4: `groupBucket()` helper

**Files:**
- Create: `packages/core/src/lib/group-bucket.ts`
- Create: `packages/core/src/lib/group-bucket.test.ts`
- Modify: `packages/core/src/index.ts`

Two operations the chart widgets need: group records by a payload column (for bar/pie/status_grid), and bucket records by a time bucket (for line_chart trend). Returns a stable-ordered array of `{ key, records }` pairs.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { DataRecord } from "../schema/data_record";
import { groupByColumn, bucketByTime } from "./group-bucket";

const rec = (payload: Record<string, unknown>, recorded_at: string): DataRecord => ({
  id: Math.random().toString(36), data_source_id: "s", payload, recorded_at,
  source_ref: null, ingested_via: "manual", created_at: recorded_at,
});

describe("groupByColumn", () => {
  it("groups by string column", () => {
    const groups = groupByColumn(
      [
        rec({ status: "pass" }, "2026-04-30T10:00:00.000Z"),
        rec({ status: "fail" }, "2026-04-30T11:00:00.000Z"),
        rec({ status: "pass" }, "2026-04-30T12:00:00.000Z"),
      ],
      "status",
    );
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "pass")?.records).toHaveLength(2);
    expect(groups.find((g) => g.key === "fail")?.records).toHaveLength(1);
  });
  it("returns empty array when records are empty", () => {
    expect(groupByColumn([], "status")).toEqual([]);
  });
  it("treats missing column values as the empty-string key", () => {
    const groups = groupByColumn(
      [rec({}, "2026-04-30T10:00:00.000Z"), rec({ x: "a" }, "2026-04-30T11:00:00.000Z")],
      "x",
    );
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "")).toBeDefined();
  });
});

describe("bucketByTime", () => {
  it("buckets by 1h", () => {
    const buckets = bucketByTime(
      [
        rec({}, "2026-04-30T10:15:00.000Z"),
        rec({}, "2026-04-30T10:45:00.000Z"),
        rec({}, "2026-04-30T11:30:00.000Z"),
      ],
      "1h",
    );
    expect(buckets).toHaveLength(2);
    expect(buckets[0]?.key).toBe("2026-04-30T10:00:00.000Z");
    expect(buckets[0]?.records).toHaveLength(2);
    expect(buckets[1]?.key).toBe("2026-04-30T11:00:00.000Z");
  });
  it("buckets by 1d (UTC midnight)", () => {
    const buckets = bucketByTime(
      [
        rec({}, "2026-04-29T15:00:00.000Z"),
        rec({}, "2026-04-30T01:00:00.000Z"),
        rec({}, "2026-04-30T23:00:00.000Z"),
      ],
      "1d",
    );
    expect(buckets).toHaveLength(2);
  });
  it("buckets by 30s", () => {
    const buckets = bucketByTime(
      [
        rec({}, "2026-04-30T10:00:00.000Z"),
        rec({}, "2026-04-30T10:00:15.000Z"),
        rec({}, "2026-04-30T10:00:35.000Z"),
      ],
      "30s",
    );
    expect(buckets).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `group-bucket.ts`**

```ts
import type { DataRecord } from "../schema/data_record";
import type { Bucket } from "../schema/time_window";

export interface Group<T = string> {
  key: T;
  records: DataRecord[];
}

const BUCKET_MS = {
  "30s": 30_000,
  "1m":  60_000,
  "5m":  5 * 60_000,
  "1h":  3600_000,
  "1d":  24 * 3600_000,
} as const;

export function groupByColumn(records: DataRecord[], column: string): Group[] {
  const map = new Map<string, DataRecord[]>();
  for (const r of records) {
    const raw = r.payload[column];
    const key = raw === undefined || raw === null ? "" : String(raw);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = [];
      map.set(key, bucket);
    }
    bucket.push(r);
  }
  return Array.from(map.entries()).map(([key, recs]) => ({ key, records: recs }));
}

export function bucketByTime(records: DataRecord[], bucket: Bucket): Group[] {
  const ms = BUCKET_MS[bucket];
  const map = new Map<string, DataRecord[]>();
  for (const r of records) {
    const t = new Date(r.recorded_at).getTime();
    const floored = Math.floor(t / ms) * ms;
    const key = new Date(floored).toISOString();
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(r);
  }
  return Array.from(map.entries())
    .map(([key, recs]) => ({ key, records: recs }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}
```

- [ ] **Step 4: Re-export from barrel**

```ts
export * from "./lib/group-bucket";
```

- [ ] **Step 5: Run test, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/lib/ packages/core/src/index.ts
git commit -m "feat(core): add groupByColumn() and bucketByTime() helpers"
```

---

## Task 5: `metric` widget

Renders a single big number, optionally formatted with prefix/suffix/decimals.

**Files:**
- Create: `packages/widgets/src/widgets/metric/{schema,resolve,example,MetricWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/metric/metric.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

`packages/widgets/src/widgets/metric/schema.ts`:
```ts
import { z } from "zod";

export const MetricConfig = z.object({
  value_column: z.string().regex(/^[A-Za-z0-9_]+$/).optional(),
  aggregation: z.enum(["sum", "avg", "min", "max", "count", "first", "last"]).default("count"),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(6).default(0),
});
export type MetricConfig = z.infer<typeof MetricConfig>;
```

- [ ] **Step 2: Resolver**

`packages/widgets/src/widgets/metric/resolve.ts`:
```ts
import type { WidgetData, WidgetResolverArgs } from "@aguspe/tiler-core";
import { aggregate, applyFilter, applyTimeWindow } from "@aguspe/tiler-core";
import { MetricConfig } from "./schema";

export function resolveMetric({ panel, records, now }: WidgetResolverArgs): WidgetData<number> {
  const cfg = MetricConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const value = aggregate(filtered, { aggregation: cfg.aggregation, value_column: cfg.value_column });
  return { resolved: value, empty: filtered.length === 0 };
}
```

- [ ] **Step 3: Example fixture**

`packages/widgets/src/widgets/metric/example.ts`:
```ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function MetricExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "m-1", dashboard_id: "demo", data_source_id: "ds-1",
    title: "Total runs (24h)", widget_type: "metric",
    x: 0, y: 0, width: 3, height: 2,
    config: { aggregation: "count", time_window: "24h" },
    created_at: now, updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 47 }, (_, i) => ({
    id: `r${i}`, data_source_id: "ds-1",
    payload: { status: "pass", duration_ms: 100 + i },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null, ingested_via: "webhook", created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 4: React component**

`packages/widgets/src/widgets/metric/MetricWidget.tsx`:
```tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { MetricConfig } from "./schema";

export function MetricWidget({
  panel, data,
}: {
  panel: Panel;
  data: WidgetData<number>;
}): JSX.Element {
  const cfg = MetricConfig.parse(panel.config);
  const formatted = data.resolved.toLocaleString(undefined, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  });
  return (
    <div
      className="tiler-metric"
      style={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        height: "100%", padding: 8,
      }}
    >
      <div
        className="tiler-metric__value"
        style={{ fontSize: "clamp(1.5rem, 6vw, 3rem)", fontWeight: 600, lineHeight: 1.1 }}
      >
        {cfg.prefix}{formatted}{cfg.suffix}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Registration glue**

`packages/widgets/src/widgets/metric/index.ts`:
```ts
import { defineWidget } from "@aguspe/tiler-core";
import { MetricExample } from "./example";
import { MetricWidget } from "./MetricWidget";
import { resolveMetric } from "./resolve";
import { MetricConfig } from "./schema";

defineWidget({
  meta: {
    type: "metric",
    label: "Metric",
    description: "Single aggregated number with optional prefix / suffix.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: MetricConfig,
  resolve: resolveMetric,
  component: MetricWidget,
  example: MetricExample,
});

export { MetricConfig, MetricWidget, MetricExample, resolveMetric };
```

- [ ] **Step 6: Tests**

`packages/widgets/src/widgets/metric/metric.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricExample } from "./example";
import { MetricWidget } from "./MetricWidget";
import { resolveMetric } from "./resolve";

describe("resolveMetric", () => {
  it("counts records by default", () => {
    const { panel, records } = MetricExample();
    const result = resolveMetric({ panel, records, now: new Date("2026-04-30T12:00:00.000Z") });
    expect(result.resolved).toBe(47);
    expect(result.empty).toBe(false);
  });
  it("returns empty=true on empty record set", () => {
    const { panel } = MetricExample();
    const result = resolveMetric({ panel, records: [], now: new Date("2026-04-30T12:00:00.000Z") });
    expect(result.resolved).toBe(0);
    expect(result.empty).toBe(true);
  });
});

describe("MetricWidget", () => {
  it("renders the formatted number with prefix/suffix", () => {
    const { panel } = MetricExample();
    render(
      <MetricWidget
        panel={{ ...panel, config: { aggregation: "count", time_window: "24h", prefix: "$", suffix: " runs", decimals: 0 } }}
        data={{ resolved: 1234, empty: false }}
      />,
    );
    expect(screen.getByText("$1,234 runs")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Update barrel**

Append to `packages/widgets/src/index.ts`:
```ts
import "./widgets/metric";
export { MetricConfig, MetricWidget } from "./widgets/metric";
```

- [ ] **Step 8: Run test, expect PASS**

- [ ] **Step 9: Commit**

```bash
git add packages/widgets/src/widgets/metric packages/widgets/src/index.ts
git commit -m "feat(widgets): add metric widget"
```

---

## Task 6: `number_with_delta` widget

Number + delta vs prior period + tiny SVG sparkline. Hand-rolled SVG sparkline keeps Recharts out of this widget.

**Files:**
- Create: `packages/widgets/src/widgets/number_with_delta/{schema,resolve,example,NumberWithDeltaWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/number_with_delta/Sparkline.tsx`
- Create: `packages/widgets/src/widgets/number_with_delta/number_with_delta.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";

export const NumberWithDeltaConfig = z.object({
  value_column: z.string().regex(/^[A-Za-z0-9_]+$/).optional(),
  aggregation: z.enum(["sum","avg","min","max","count","first","last"]).default("count"),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  delta_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  sparkline_bucket: z.enum(["30s","1m","5m","1h","1d"]).default("1h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  color: z.string().optional(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(6).default(0),
});
export type NumberWithDeltaConfig = z.infer<typeof NumberWithDeltaConfig>;
```

- [ ] **Step 2: Resolver**

```ts
// resolve.ts
import {
  aggregate, applyFilter, applyTimeWindow, bucketByTime,
  type WidgetData, type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { NumberWithDeltaConfig } from "./schema";

export interface NumberWithDeltaResolved {
  value: number;
  delta: number;          // current - prior
  delta_pct: number | null;  // null if prior was 0
  spark: number[];
}

export function resolveNumberWithDelta(
  { panel, records, now }: WidgetResolverArgs,
): WidgetData<NumberWithDeltaResolved> {
  const cfg = NumberWithDeltaConfig.parse(panel.config);
  const filtered = applyFilter(records, cfg.filter);
  const current = applyTimeWindow(filtered, cfg.time_window, now);

  const priorEnd = new Date(now);
  const windowMs = current.length
    ? Date.parse(now.toISOString()) - Date.parse(current[current.length - 1]?.recorded_at ?? now.toISOString())
    : 0;
  // Compute prior window: shift `delta_window` further into the past from `now`.
  const priorStart = new Date(now.getTime() - 2 * windowOf(cfg.delta_window));
  const priorEnd2  = new Date(now.getTime() - windowOf(cfg.delta_window));
  const prior = filtered.filter((r) => {
    const t = Date.parse(r.recorded_at);
    return t >= priorStart.getTime() && t < priorEnd2.getTime();
  });

  const value = aggregate(current, { aggregation: cfg.aggregation, value_column: cfg.value_column });
  const priorValue = aggregate(prior, { aggregation: cfg.aggregation, value_column: cfg.value_column });
  const delta = value - priorValue;
  const delta_pct = priorValue === 0 ? null : (delta / priorValue) * 100;

  const buckets = bucketByTime(current, cfg.sparkline_bucket);
  const spark = buckets.map((b) =>
    aggregate(b.records, { aggregation: cfg.aggregation, value_column: cfg.value_column }),
  );

  return { resolved: { value, delta, delta_pct, spark }, empty: current.length === 0 };
}

const WINDOW_MS = {
  "1m": 60_000, "5m": 5 * 60_000, "15m": 15 * 60_000,
  "1h": 3600_000, "4h": 4 * 3600_000,
  "24h": 24 * 3600_000, "7d": 7 * 24 * 3600_000, "30d": 30 * 24 * 3600_000,
  "all": Number.MAX_SAFE_INTEGER,
};
function windowOf(w: keyof typeof WINDOW_MS): number { return WINDOW_MS[w]; }
```

- [ ] **Step 3: Sparkline component**

`Sparkline.tsx`:
```tsx
export function Sparkline({
  values, color = "currentColor", height = 28,
}: {
  values: number[];
  color?: string;
  height?: number;
}): JSX.Element | null {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 100;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
         aria-hidden style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
```

- [ ] **Step 4: Example fixture**

```ts
// example.ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function NumberWithDeltaExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "nwd-1", dashboard_id: "demo", data_source_id: "ds-1",
    title: "Failures (24h)", widget_type: "number_with_delta",
    x: 0, y: 0, width: 3, height: 2,
    config: {
      aggregation: "count", time_window: "24h", delta_window: "24h",
      sparkline_bucket: "1h", filter: { status: "fail" }, color: "#ef4444",
    },
    created_at: now, updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 30 }, (_, i) => ({
    id: `r${i}`, data_source_id: "ds-1",
    payload: { status: i % 4 === 0 ? "fail" : "pass" },
    recorded_at: new Date(Date.parse(now) - i * 60 * 60_000).toISOString(),
    source_ref: null, ingested_via: "webhook", created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 5: React component**

```tsx
// NumberWithDeltaWidget.tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { Sparkline } from "./Sparkline";
import { NumberWithDeltaConfig } from "./schema";
import type { NumberWithDeltaResolved } from "./resolve";

export function NumberWithDeltaWidget({
  panel, data,
}: {
  panel: Panel;
  data: WidgetData<NumberWithDeltaResolved>;
}): JSX.Element {
  const cfg = NumberWithDeltaConfig.parse(panel.config);
  const { value, delta, delta_pct, spark } = data.resolved;
  const fmt = (n: number) => n.toLocaleString(undefined, {
    minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals,
  });
  const trend = delta > 0 ? "▲" : delta < 0 ? "▼" : "■";
  const color = cfg.color ?? "currentColor";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 8, color }}>
      <div style={{ fontSize: "clamp(1.4rem, 5vw, 2.4rem)", fontWeight: 600, lineHeight: 1.1 }}>
        {cfg.prefix}{fmt(value)}{cfg.suffix}
      </div>
      <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: 4 }}>
        {trend} {fmt(Math.abs(delta))}
        {delta_pct !== null && ` (${delta_pct.toFixed(1)}%)`}
      </div>
      <div style={{ flex: 1, marginTop: 8 }}>
        <Sparkline values={spark} color={color} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Registration glue**

```ts
// index.ts
import { defineWidget } from "@aguspe/tiler-core";
import { NumberWithDeltaExample } from "./example";
import { NumberWithDeltaWidget } from "./NumberWithDeltaWidget";
import { resolveNumberWithDelta } from "./resolve";
import { NumberWithDeltaConfig } from "./schema";

defineWidget({
  meta: {
    type: "number_with_delta",
    label: "Number + Delta",
    description: "Big number with delta vs. prior period and a small sparkline.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: NumberWithDeltaConfig,
  resolve: resolveNumberWithDelta,
  component: NumberWithDeltaWidget,
  example: NumberWithDeltaExample,
});

export { NumberWithDeltaConfig, NumberWithDeltaWidget, NumberWithDeltaExample, resolveNumberWithDelta };
```

- [ ] **Step 7: Tests**

```tsx
// number_with_delta.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NumberWithDeltaExample } from "./example";
import { NumberWithDeltaWidget } from "./NumberWithDeltaWidget";
import { resolveNumberWithDelta } from "./resolve";

describe("resolveNumberWithDelta", () => {
  it("computes value and a sparkline array", () => {
    const { panel, records } = NumberWithDeltaExample();
    const result = resolveNumberWithDelta({
      panel, records, now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.value).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.resolved.spark)).toBe(true);
  });
});

describe("NumberWithDeltaWidget", () => {
  it("renders value and trend marker", () => {
    const { panel } = NumberWithDeltaExample();
    render(
      <NumberWithDeltaWidget
        panel={panel}
        data={{
          resolved: { value: 12, delta: -3, delta_pct: -20, spark: [1, 2, 3, 4] },
          empty: false,
        }}
      />,
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/▼ 3/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Update barrel + run + commit**

Append to `packages/widgets/src/index.ts`:
```ts
import "./widgets/number_with_delta";
export { NumberWithDeltaConfig, NumberWithDeltaWidget } from "./widgets/number_with_delta";
```

`pnpm --filter @aguspe/tiler-widgets test` → expect PASS.

```bash
git add packages/widgets/src/widgets/number_with_delta packages/widgets/src/index.ts
git commit -m "feat(widgets): add number_with_delta widget with hand-rolled SVG sparkline"
```

---

## Task 7: `meter` widget

Semicircle gauge: value vs `min`/`max` with optional `target` marker. Hand-rolled SVG arc keeps Recharts out.

**Files:**
- Create: `packages/widgets/src/widgets/meter/{schema,resolve,example,MeterWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/meter/meter.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";

export const MeterConfig = z.object({
  value_column: z.string().regex(/^[A-Za-z0-9_]+$/).optional(),
  aggregation: z.enum(["sum","avg","min","max","count","first","last"]).default("avg"),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  min: z.number().default(0),
  max: z.number().default(100),
  target: z.number().optional(),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(6).default(0),
});
export type MeterConfig = z.infer<typeof MeterConfig>;
```

- [ ] **Step 2: Resolver**

```ts
// resolve.ts
import {
  aggregate, applyFilter, applyTimeWindow,
  type WidgetData, type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { MeterConfig } from "./schema";

export function resolveMeter({
  panel, records, now,
}: WidgetResolverArgs): WidgetData<number> {
  const cfg = MeterConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const value = aggregate(filtered, { aggregation: cfg.aggregation, value_column: cfg.value_column });
  return { resolved: value, empty: filtered.length === 0 };
}
```

- [ ] **Step 3: Example fixture**

```ts
// example.ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function MeterExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "meter-1", dashboard_id: "demo", data_source_id: "ds-1",
    title: "Avg duration (ms)", widget_type: "meter",
    x: 0, y: 0, width: 3, height: 2,
    config: {
      aggregation: "avg", value_column: "duration_ms", time_window: "24h",
      min: 0, max: 1000, target: 200, suffix: " ms",
    },
    created_at: now, updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 50 }, (_, i) => ({
    id: `r${i}`, data_source_id: "ds-1",
    payload: { duration_ms: 120 + (i % 10) * 30 },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null, ingested_via: "webhook", created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 4: React component**

```tsx
// MeterWidget.tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { MeterConfig } from "./schema";

export function MeterWidget({
  panel, data,
}: {
  panel: Panel;
  data: WidgetData<number>;
}): JSX.Element {
  const cfg = MeterConfig.parse(panel.config);
  const v = Math.max(cfg.min, Math.min(cfg.max, data.resolved));
  const pct = (v - cfg.min) / (cfg.max - cfg.min || 1);

  // Semicircle: arc from angle π to 0 (180° → 0°). Sweep based on pct.
  const r = 80;
  const cx = 100;
  const cy = 95;
  const angle = Math.PI - pct * Math.PI;
  const arcEndX = cx + r * Math.cos(angle);
  const arcEndY = cy - r * Math.sin(angle);
  const largeArc = pct > 0.5 ? 1 : 0;

  const target = cfg.target;
  let targetMarker: JSX.Element | null = null;
  if (target !== undefined) {
    const tPct = (target - cfg.min) / (cfg.max - cfg.min || 1);
    const tAngle = Math.PI - Math.max(0, Math.min(1, tPct)) * Math.PI;
    const x1 = cx + (r - 10) * Math.cos(tAngle);
    const y1 = cy - (r - 10) * Math.sin(tAngle);
    const x2 = cx + (r + 4) * Math.cos(tAngle);
    const y2 = cy - (r + 4) * Math.sin(tAngle);
    targetMarker = <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--tiler-color-warn)" strokeWidth={2} />;
  }

  const fmt = (n: number) => n.toLocaleString(undefined, {
    minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 8 }}>
      <svg viewBox="0 0 200 110" style={{ width: "100%", flex: 1 }} aria-hidden>
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none" stroke="var(--tiler-color-muted)" strokeWidth={10} strokeOpacity={0.25}
        />
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 ${largeArc} 1 ${arcEndX.toFixed(1)},${arcEndY.toFixed(1)}`}
          fill="none" stroke="var(--tiler-color-accent)" strokeWidth={10}
        />
        {targetMarker}
      </svg>
      <div style={{ textAlign: "center", fontSize: "1.1rem", fontWeight: 600 }}>
        {cfg.prefix}{fmt(data.resolved)}{cfg.suffix}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Registration**

```ts
// index.ts
import { defineWidget } from "@aguspe/tiler-core";
import { MeterExample } from "./example";
import { MeterWidget } from "./MeterWidget";
import { resolveMeter } from "./resolve";
import { MeterConfig } from "./schema";

defineWidget({
  meta: {
    type: "meter",
    label: "Meter",
    description: "Semicircle gauge with optional target marker.",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 4 },
  },
  configSchema: MeterConfig,
  resolve: resolveMeter,
  component: MeterWidget,
  example: MeterExample,
});

export { MeterConfig, MeterWidget, MeterExample, resolveMeter };
```

- [ ] **Step 6: Tests**

```tsx
// meter.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeterExample } from "./example";
import { MeterWidget } from "./MeterWidget";
import { resolveMeter } from "./resolve";

describe("resolveMeter", () => {
  it("returns avg of value_column", () => {
    const { panel, records } = MeterExample();
    const result = resolveMeter({ panel, records, now: new Date("2026-04-30T12:00:00.000Z") });
    expect(result.resolved).toBeGreaterThan(0);
  });
});

describe("MeterWidget", () => {
  it("renders the formatted value", () => {
    const { panel } = MeterExample();
    render(<MeterWidget panel={panel} data={{ resolved: 250, empty: false }} />);
    expect(screen.getByText("250 ms")).toBeInTheDocument();
  });
  it("clamps overshoot values to max", () => {
    const { panel } = MeterExample();
    const { container } = render(<MeterWidget panel={panel} data={{ resolved: 99999, empty: false }} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
```

- [ ] **Step 7: Update barrel + run + commit**

```ts
import "./widgets/meter";
export { MeterConfig, MeterWidget } from "./widgets/meter";
```

```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/src/widgets/meter packages/widgets/src/index.ts
git commit -m "feat(widgets): add meter widget with hand-rolled SVG arc"
```

---

## Task 8: `list` widget

Renders the most recent N records as a table-like list, with columns from config. Simpler than `table` (no pagination, no per-column formatting).

**Files:**
- Create: `packages/widgets/src/widgets/list/{schema,resolve,example,ListWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/list/list.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";

const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const ListConfig = z.object({
  columns: z.array(SafeColumn).min(1).default(["payload"]),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  limit: z.number().int().min(1).max(500).default(20),
  order_by: z.enum(["recorded_at_asc", "recorded_at_desc"]).default("recorded_at_desc"),
});
export type ListConfig = z.infer<typeof ListConfig>;
```

- [ ] **Step 2: Resolver**

```ts
// resolve.ts
import {
  applyFilter, applyTimeWindow,
  type DataRecord, type WidgetData, type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { ListConfig } from "./schema";

export function resolveList({
  panel, records, now,
}: WidgetResolverArgs): WidgetData<DataRecord[]> {
  const cfg = ListConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const sorted = filtered.slice().sort((a, b) =>
    cfg.order_by === "recorded_at_desc"
      ? (a.recorded_at < b.recorded_at ? 1 : -1)
      : (a.recorded_at > b.recorded_at ? 1 : -1),
  );
  return { resolved: sorted.slice(0, cfg.limit), empty: sorted.length === 0 };
}
```

- [ ] **Step 3: Example fixture**

```ts
// example.ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function ListExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "list-1", dashboard_id: "demo", data_source_id: "ds-1",
    title: "Recent failures (24h)", widget_type: "list",
    x: 0, y: 0, width: 6, height: 4,
    config: {
      columns: ["test_name", "suite", "duration_ms"],
      time_window: "24h",
      filter: { status: "fail" },
      limit: 10,
      order_by: "recorded_at_desc",
    },
    created_at: now, updated_at: now,
  };
  const records: DataRecord[] = Array.from({ length: 30 }, (_, i) => ({
    id: `r${i}`, data_source_id: "ds-1",
    payload: {
      test_name: `test_${i}`,
      suite: ["checkout", "auth", "search"][i % 3],
      duration_ms: 100 + i * 10,
      status: i % 3 === 0 ? "fail" : "pass",
    },
    recorded_at: new Date(Date.parse(now) - i * 60_000).toISOString(),
    source_ref: null, ingested_via: "webhook", created_at: now,
  }));
  return { panel, records };
}
```

- [ ] **Step 4: React component**

```tsx
// ListWidget.tsx
import type { DataRecord, Panel, WidgetData } from "@aguspe/tiler-core";
import { ListConfig } from "./schema";

export function ListWidget({
  panel, data,
}: {
  panel: Panel;
  data: WidgetData<DataRecord[]>;
}): JSX.Element {
  const cfg = ListConfig.parse(panel.config);
  if (data.empty) {
    return (
      <div style={{ padding: 12, opacity: 0.6, fontSize: "0.9rem" }}>No records.</div>
    );
  }
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.85rem",
        fontFamily: "var(--tiler-font-mono)",
      }}
    >
      <thead>
        <tr>
          {cfg.columns.map((col) => (
            <th
              key={col}
              style={{
                textAlign: "left",
                padding: "4px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                fontWeight: 600, opacity: 0.85,
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.resolved.map((r) => (
          <tr key={r.id}>
            {cfg.columns.map((col) => (
              <td
                key={col}
                style={{
                  padding: "4px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240,
                }}
              >
                {String(r.payload[col] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Registration + tests + commit**

```ts
// index.ts
import { defineWidget } from "@aguspe/tiler-core";
import { ListExample } from "./example";
import { ListWidget } from "./ListWidget";
import { resolveList } from "./resolve";
import { ListConfig } from "./schema";

defineWidget({
  meta: {
    type: "list",
    label: "List",
    description: "Recent records as a column-projected table.",
    requires_data_source: true,
    default_size: { w: 4, h: 4 },
    min_size: { w: 2, h: 2 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: ListConfig,
  resolve: resolveList,
  component: ListWidget,
  example: ListExample,
});

export { ListConfig, ListWidget, ListExample, resolveList };
```

```tsx
// list.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListExample } from "./example";
import { ListWidget } from "./ListWidget";
import { resolveList } from "./resolve";

describe("resolveList", () => {
  it("filters to status=fail and limits to 10", () => {
    const { panel, records } = ListExample();
    const result = resolveList({ panel, records, now: new Date("2026-04-30T12:00:00.000Z") });
    expect(result.resolved.length).toBeLessThanOrEqual(10);
    expect(result.resolved.every((r) => r.payload.status === "fail")).toBe(true);
  });
});

describe("ListWidget", () => {
  it("renders table headers from config.columns", () => {
    const { panel } = ListExample();
    render(<ListWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No records.")).toBeInTheDocument();
  });
});
```

```ts
// barrel
import "./widgets/list";
export { ListConfig, ListWidget } from "./widgets/list";
```

```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/src/widgets/list packages/widgets/src/index.ts
git commit -m "feat(widgets): add list widget"
```

---

## Task 9: `status_grid` widget

Grid of cells, one per `group_column` value, colored by latest `status_column` value within the time window. Most teams use this to surface "which suite is broken right now."

**Files:**
- Create: `packages/widgets/src/widgets/status_grid/{schema,resolve,example,StatusGridWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/status_grid/status_grid.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const StatusGridConfig = z.object({
  group_column: SafeColumn,
  status_column: SafeColumn.default("status"),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type StatusGridConfig = z.infer<typeof StatusGridConfig>;
```

- [ ] **Step 2: Resolver**

```ts
// resolve.ts
import {
  applyFilter, applyTimeWindow, groupByColumn,
  type WidgetData, type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { StatusGridConfig } from "./schema";

export interface StatusGridCell {
  key: string;
  status: string;     // latest status string in group
  count: number;
}

export function resolveStatusGrid({
  panel, records, now,
}: WidgetResolverArgs): WidgetData<StatusGridCell[]> {
  const cfg = StatusGridConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const groups = groupByColumn(filtered, cfg.group_column);
  const cells = groups.map<StatusGridCell>(({ key, records: recs }) => {
    const latest = recs.slice().sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))[0];
    return {
      key,
      status: String(latest?.payload[cfg.status_column] ?? "skip"),
      count: recs.length,
    };
  });
  cells.sort((a, b) => a.key.localeCompare(b.key));
  return { resolved: cells, empty: cells.length === 0 };
}
```

- [ ] **Step 3: Example fixture**

```ts
// example.ts
import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function StatusGridExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "sg-1", dashboard_id: "demo", data_source_id: "ds-1",
    title: "Per-suite status", widget_type: "status_grid",
    x: 0, y: 0, width: 6, height: 3,
    config: { group_column: "suite", status_column: "status", time_window: "24h" },
    created_at: now, updated_at: now,
  };
  const suites = ["checkout", "auth", "search", "billing", "profile", "settings"];
  const records: DataRecord[] = suites.flatMap((suite, i) =>
    Array.from({ length: 5 }, (_, j) => ({
      id: `${suite}-${j}`, data_source_id: "ds-1",
      payload: { suite, status: i % 4 === 0 ? "fail" : i % 4 === 1 ? "warn" : "pass" },
      recorded_at: new Date(Date.parse(now) - (i * 5 + j) * 60_000).toISOString(),
      source_ref: null, ingested_via: "webhook", created_at: now,
    })),
  );
  return { panel, records };
}
```

- [ ] **Step 4: React component**

```tsx
// StatusGridWidget.tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { StatusGridCell } from "./resolve";

const COLOR: Record<string, string> = {
  pass: "var(--tiler-color-pass)",
  fail: "var(--tiler-color-fail)",
  warn: "var(--tiler-color-warn)",
  skip: "var(--tiler-color-skip)",
};

export function StatusGridWidget({
  data,
}: {
  panel: Panel;
  data: WidgetData<StatusGridCell[]>;
}): JSX.Element {
  if (data.empty) {
    return <div style={{ padding: 12, opacity: 0.6 }}>No groups in window.</div>;
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 6, padding: 6, height: "100%", overflow: "auto",
      }}
    >
      {data.resolved.map((cell) => (
        <div
          key={cell.key}
          style={{
            padding: "8px 10px", borderRadius: 6,
            background: COLOR[cell.status] ?? "var(--tiler-color-muted)",
            color: "#0b0d12", fontWeight: 600, fontSize: "0.85rem",
            display: "flex", flexDirection: "column", justifyContent: "center",
            minHeight: 48,
          }}
          title={`${cell.key}: ${cell.status} (${cell.count})`}
        >
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cell.key}
          </div>
          <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>{cell.status} · {cell.count}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Registration + tests + commit**

```ts
// index.ts (defineWidget call mirrors prior widgets, type "status_grid", default_size {w:6,h:3})
```

```tsx
// status_grid.test.tsx
import { describe, expect, it } from "vitest";
import { StatusGridExample } from "./example";
import { resolveStatusGrid } from "./resolve";

describe("resolveStatusGrid", () => {
  it("produces one cell per suite", () => {
    const { panel, records } = StatusGridExample();
    const result = resolveStatusGrid({ panel, records, now: new Date("2026-04-30T12:00:00.000Z") });
    expect(result.resolved).toHaveLength(6);
  });
  it("each cell has the latest status string", () => {
    const { panel, records } = StatusGridExample();
    const result = resolveStatusGrid({ panel, records, now: new Date("2026-04-30T12:00:00.000Z") });
    expect(["pass", "fail", "warn", "skip"]).toEqual(expect.arrayContaining(
      result.resolved.map((c) => c.status),
    ));
  });
});
```

Update barrel, run, commit:
```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/src/widgets/status_grid packages/widgets/src/index.ts
git commit -m "feat(widgets): add status_grid widget"
```

---

## Task 10: `comments` widget

A vertical list of records rendered as comments — body, author, timestamp.

**Files:**
- Create: `packages/widgets/src/widgets/comments/{schema,resolve,example,CommentsWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/comments/comments.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const CommentsConfig = z.object({
  body_column: SafeColumn.default("body"),
  author_column: SafeColumn.default("author"),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  limit: z.number().int().min(1).max(200).default(20),
});
export type CommentsConfig = z.infer<typeof CommentsConfig>;
```

- [ ] **Step 2: Resolver**

```ts
// resolve.ts
import {
  applyFilter, applyTimeWindow,
  type DataRecord, type WidgetData, type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { CommentsConfig } from "./schema";

export function resolveComments({
  panel, records, now,
}: WidgetResolverArgs): WidgetData<DataRecord[]> {
  const cfg = CommentsConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const sorted = filtered.slice().sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1));
  return { resolved: sorted.slice(0, cfg.limit), empty: sorted.length === 0 };
}
```

- [ ] **Step 3-7: Example fixture, React component, registration, tests**

Pattern mirrors the `list` widget. Example fixture creates 12 records with `body` / `author` payload keys. Component renders `<div role="article">` per comment with `<header>` (author + relative time) and `<p>` (body). Default size `{ w: 4, h: 4 }`.

Component sketch:
```tsx
export function CommentsWidget({ data }) {
  const cfg = CommentsConfig.parse(panel.config);
  if (data.empty) return <div style={{padding:12, opacity:0.6}}>No comments.</div>;
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: 8 }}>
      {data.resolved.map((r) => (
        <article key={r.id} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <header style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            <strong>{String(r.payload[cfg.author_column] ?? "anon")}</strong>
            {" · "}
            {new Date(r.recorded_at).toLocaleString()}
          </header>
          <p style={{ margin: "4px 0 0 0", whiteSpace: "pre-wrap" }}>
            {String(r.payload[cfg.body_column] ?? "")}
          </p>
        </article>
      ))}
    </div>
  );
}
```

Tests: resolver returns sorted, limited records; component renders empty state and one `<article>` per resolved record.

Commit:
```bash
git commit -m "feat(widgets): add comments widget"
```

---

## Task 11: `table` widget

Like `list` but with per-column formatting + simple pagination.

**Files:**
- Create: `packages/widgets/src/widgets/table/{schema,resolve,example,TableWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/table/table.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const ColumnSpec = z.object({
  key: SafeColumn,
  label: z.string().optional(),
  format: z.enum(["text", "number", "datetime", "percent", "ms"]).default("text"),
});

export const TableConfig = z.object({
  columns: z.array(ColumnSpec).min(1),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  pagination: z.boolean().default(true),
  page_size: z.number().int().min(5).max(100).default(20),
  order_by: z.enum(["recorded_at_asc", "recorded_at_desc"]).default("recorded_at_desc"),
});
export type TableConfig = z.infer<typeof TableConfig>;
```

- [ ] **Step 2: Resolver**

Same shape as `list`'s resolver but applies `cfg.limit` (overall cap) before pagination, which the component does via React state.

- [ ] **Step 3-7: Example, component, registration, tests**

Component uses `useState` for the current page, slices `data.resolved` by `cfg.page_size`, renders a footer with "← Prev / page X of Y / Next →" if `cfg.pagination` is `true`. Format functions per `ColumnSpec.format`:
- `text` → `String(value)`
- `number` → `Number(value).toLocaleString()`
- `datetime` → `new Date(value).toLocaleString()`
- `percent` → `(Number(value) * 100).toFixed(1) + "%"`
- `ms` → `${Math.round(Number(value))} ms`

Default size `{ w: 6, h: 4 }`.

Tests: resolver returns sorted+limited records; component pagination clicks advance the page; format functions render numbers / datetimes / ms correctly.

Commit:
```bash
git commit -m "feat(widgets): add table widget with per-column formatting and pagination"
```

---

## Task 12: Install Recharts and add chart frame helper

**Files:**
- Modify: `packages/widgets/package.json`
- Create: `packages/widgets/src/lib/ChartFrame.tsx`
- Create: `packages/widgets/src/lib/chart-frame.test.tsx`

The chart widgets all share an empty-state, fixed-height frame. Centralizing it keeps the three chart components consistent and avoids duplicating the `ResponsiveContainer` pattern.

- [ ] **Step 1: Install recharts**

```bash
pnpm --filter @aguspe/tiler-widgets add recharts@^2.13.0
```

- [ ] **Step 2: Implement `ChartFrame`**

```tsx
// ChartFrame.tsx
import type { ReactNode } from "react";

export function ChartFrame({
  empty, children,
}: {
  empty: boolean;
  children: ReactNode;
}): JSX.Element {
  if (empty) {
    return (
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", padding: 12, opacity: 0.6, fontSize: "0.9rem",
        }}
      >
        No data in window.
      </div>
    );
  }
  return <div style={{ width: "100%", height: "100%", padding: 4 }}>{children}</div>;
}
```

- [ ] **Step 3: Test**

```tsx
// chart-frame.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartFrame } from "./ChartFrame";

describe("ChartFrame", () => {
  it("renders empty state", () => {
    render(<ChartFrame empty><div>chart</div></ChartFrame>);
    expect(screen.getByText("No data in window.")).toBeInTheDocument();
  });
  it("renders children when not empty", () => {
    render(<ChartFrame empty={false}><div data-testid="c">chart</div></ChartFrame>);
    expect(screen.getByTestId("c")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests + commit**

```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/package.json pnpm-lock.yaml packages/widgets/src/lib/
git commit -m "feat(widgets): add recharts dep and shared ChartFrame component"
```

---

## Task 13: `line_chart` widget

Recharts `LineChart` over time-bucketed records, optionally split by `group_column`.

**Files:**
- Create: `packages/widgets/src/widgets/line_chart/{schema,resolve,example,LineChartWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/line_chart/line_chart.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const LineChartConfig = z.object({
  value_column: SafeColumn.optional(),
  group_column: SafeColumn.optional(),
  aggregation: z.enum(["sum","avg","min","max","count","first","last"]).default("count"),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("7d"),
  bucket: z.enum(["30s","1m","5m","1h","1d"]).default("1h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  palette: z.array(z.string()).optional(),
});
export type LineChartConfig = z.infer<typeof LineChartConfig>;
```

- [ ] **Step 2: Resolver**

```ts
// resolve.ts
import {
  aggregate, applyFilter, applyTimeWindow, bucketByTime, groupByColumn,
  type WidgetData, type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { LineChartConfig } from "./schema";

export interface LineChartResolved {
  series: Array<{ name: string; points: Array<{ t: string; v: number }> }>;
}

export function resolveLineChart({
  panel, records, now,
}: WidgetResolverArgs): WidgetData<LineChartResolved> {
  const cfg = LineChartConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);

  const seriesGroups = cfg.group_column
    ? groupByColumn(filtered, cfg.group_column)
    : [{ key: "value", records: filtered }];

  const series = seriesGroups.map(({ key, records: recs }) => {
    const buckets = bucketByTime(recs, cfg.bucket);
    return {
      name: key,
      points: buckets.map((b) => ({
        t: b.key,
        v: aggregate(b.records, { aggregation: cfg.aggregation, value_column: cfg.value_column }),
      })),
    };
  });

  return { resolved: { series }, empty: filtered.length === 0 };
}
```

- [ ] **Step 3: Example fixture**

Create one-week records with status pass/fail/warn distribution.

- [ ] **Step 4: React component (Recharts)**

```tsx
// LineChartWidget.tsx
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "../../lib/ChartFrame";
import { chartColors } from "../../lib/chart-colors";
import type { LineChartResolved } from "./resolve";

export function LineChartWidget({
  panel, data,
}: {
  panel: Panel;
  data: WidgetData<LineChartResolved>;
}): JSX.Element {
  const colors = chartColors(panel);
  // Pivot series into recharts wide-format rows: [{ t, [seriesName]: v, ... }]
  const allTimes = Array.from(new Set(data.resolved.series.flatMap((s) => s.points.map((p) => p.t)))).sort();
  const rows = allTimes.map((t) => {
    const row: Record<string, unknown> = { t };
    for (const s of data.resolved.series) {
      row[s.name] = s.points.find((p) => p.t === t)?.v ?? 0;
    }
    return row;
  });

  return (
    <ChartFrame empty={data.empty}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <CartesianGrid strokeOpacity={0.1} />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: "currentColor" }}
                 tickFormatter={(t: string) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
          <YAxis tick={{ fontSize: 10, fill: "currentColor" }} />
          <Tooltip
            contentStyle={{ background: "var(--tiler-color-tile)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--tiler-color-text)", fontSize: 12 }}
          />
          {data.resolved.series.map((s, i) => (
            <Line key={s.name} type="monotone" dataKey={s.name} stroke={colors[i % colors.length]}
                  strokeWidth={1.6} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
```

- [ ] **Step 5: Registration + tests + commit**

Default size `{ w: 6, h: 3 }`. Tests cover the resolver (correct number of series, points sorted) and the component renders a `<svg>` (Recharts injects one) when not empty, otherwise the empty-state text.

```tsx
// line_chart.test.tsx — resolver only; component test asserts on empty state
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineChartExample } from "./example";
import { LineChartWidget } from "./LineChartWidget";
import { resolveLineChart } from "./resolve";

describe("resolveLineChart", () => {
  it("returns one series per group_column value", () => {
    const { panel, records } = LineChartExample();
    const result = resolveLineChart({ panel, records, now: new Date("2026-04-30T12:00:00.000Z") });
    expect(result.resolved.series.length).toBeGreaterThan(0);
  });
});

describe("LineChartWidget", () => {
  it("renders empty-state text when empty", () => {
    const { panel } = LineChartExample();
    render(<LineChartWidget panel={panel} data={{ resolved: { series: [] }, empty: true }} />);
    expect(screen.getByText("No data in window.")).toBeInTheDocument();
  });
});
```

```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/src/widgets/line_chart packages/widgets/src/index.ts
git commit -m "feat(widgets): add line_chart widget (recharts)"
```

---

## Task 14: `bar_chart` widget

Vertical or horizontal bars by `group_column` value.

**Files:**
- Create: `packages/widgets/src/widgets/bar_chart/{schema,resolve,example,BarChartWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/bar_chart/bar_chart.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const BarChartConfig = z.object({
  group_column: SafeColumn,
  value_column: SafeColumn.optional(),
  aggregation: z.enum(["sum","avg","min","max","count","first","last"]).default("count"),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  palette: z.array(z.string()).optional(),
  orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
  limit: z.number().int().min(1).max(50).default(10),
});
export type BarChartConfig = z.infer<typeof BarChartConfig>;
```

- [ ] **Step 2: Resolver**

```ts
// resolve.ts
import {
  aggregate, applyFilter, applyTimeWindow, groupByColumn,
  type WidgetData, type WidgetResolverArgs,
} from "@aguspe/tiler-core";
import { BarChartConfig } from "./schema";

export interface BarChartResolved {
  bars: Array<{ name: string; v: number }>;
}

export function resolveBarChart({
  panel, records, now,
}: WidgetResolverArgs): WidgetData<BarChartResolved> {
  const cfg = BarChartConfig.parse(panel.config);
  const windowed = applyTimeWindow(records, cfg.time_window, now);
  const filtered = applyFilter(windowed, cfg.filter);
  const groups = groupByColumn(filtered, cfg.group_column);
  const bars = groups
    .map(({ key, records: recs }) => ({
      name: key,
      v: aggregate(recs, { aggregation: cfg.aggregation, value_column: cfg.value_column }),
    }))
    .sort((a, b) => b.v - a.v)
    .slice(0, cfg.limit);
  return { resolved: { bars }, empty: bars.length === 0 };
}
```

- [ ] **Step 3-7: Example, component (Recharts BarChart), registration, tests**

Component uses `<BarChart>` + `<Bar>` from recharts. Vertical orientation = default x=name, y=v; horizontal = `layout="vertical"` with x=v, y=name.

```tsx
// BarChartWidget.tsx (sketch)
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const orient = cfg.orientation;
const xKey = orient === "vertical" ? "name" : "v";
const yKey = orient === "vertical" ? "v" : "name";
const layout = orient === "horizontal" ? "vertical" : "horizontal";

return (
  <ChartFrame empty={data.empty}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.resolved.bars} layout={layout}>
        <CartesianGrid strokeOpacity={0.1} />
        <XAxis dataKey={orient === "vertical" ? "name" : undefined}
               type={orient === "vertical" ? "category" : "number"}
               tick={{ fontSize: 10, fill: "currentColor" }} />
        <YAxis dataKey={orient === "vertical" ? undefined : "name"}
               type={orient === "vertical" ? "number" : "category"}
               tick={{ fontSize: 10, fill: "currentColor" }} width={80} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="v" fill={colors[0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </ChartFrame>
);
```

```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/src/widgets/bar_chart packages/widgets/src/index.ts
git commit -m "feat(widgets): add bar_chart widget (recharts)"
```

---

## Task 15: `pie_chart` widget

Pie or donut chart by `group_column`. Each slice colored from the palette.

**Files:**
- Create: `packages/widgets/src/widgets/pie_chart/{schema,resolve,example,PieChartWidget,index}.{ts,tsx}`
- Create: `packages/widgets/src/widgets/pie_chart/pie_chart.test.tsx`
- Modify: `packages/widgets/src/index.ts`

- [ ] **Step 1: Schema**

```ts
// schema.ts
import { z } from "zod";
const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);

export const PieChartConfig = z.object({
  group_column: SafeColumn,
  aggregation: z.enum(["count", "sum"]).default("count"),
  value_column: SafeColumn.optional(),
  time_window: z.enum(["1m","5m","15m","1h","4h","24h","7d","30d","all"]).default("24h"),
  filter: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  palette: z.array(z.string()).optional(),
  donut: z.boolean().default(false),
});
export type PieChartConfig = z.infer<typeof PieChartConfig>;
```

- [ ] **Step 2: Resolver**

Same shape as `bar_chart`'s resolver (slices = bars). Limit `aggregation` to count + sum since `avg`/`min`/`max` don't compose into a sensible pie.

- [ ] **Step 3-7: Example, component, registration, tests**

Component uses `<PieChart>` + `<Pie>` + `<Cell>` from recharts. Each `Cell` gets a color from the palette indexed by slice. If `cfg.donut`, set `innerRadius` to 50% of outer radius.

```tsx
// PieChartWidget.tsx (sketch)
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

return (
  <ChartFrame empty={data.empty}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data.resolved.bars} dataKey="v" nameKey="name"
             outerRadius="80%"
             innerRadius={cfg.donut ? "50%" : 0}
             isAnimationActive={false} >
          {data.resolved.bars.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  </ChartFrame>
);
```

```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/src/widgets/pie_chart packages/widgets/src/index.ts
git commit -m "feat(widgets): add pie_chart widget (recharts)"
```

---

## Task 16: Storybook stories for the 10 new widgets

**Files:**
- Create: 10 `<name>.stories.tsx` files, one per new widget directory.

Each story file follows the pattern Plan 1 established (default + 1-2 variants). Recommended variants:
- `metric` — default + 12h with prefix/suffix
- `number_with_delta` — default (positive delta) + negative delta + zero delta
- `meter` — default + at-target + over-target
- `list` — default + truncated columns
- `status_grid` — default + many groups (overflow scroll)
- `comments` — default + no comments (empty state)
- `table` — default + paginated (Page 2 baseline)
- `line_chart` — default + multi-series + empty
- `bar_chart` — vertical + horizontal
- `pie_chart` — pie + donut + empty

Build Storybook to catch any compile errors:
```bash
pnpm --filter @aguspe/tiler-widgets build-storybook
```

```bash
git add packages/widgets/src/widgets/*/*.stories.tsx
git commit -m "docs(widgets): add Storybook stories for all 10 new widgets"
```

---

## Task 17: Bump size-limit budget for `@aguspe/tiler-widgets`

**Files:**
- Modify: `packages/widgets/.size-limit.json`

The widgets package now bundles Recharts (~95 KB minified) plus 14 widgets. The Phase 1 budget of 60 KB is no longer realistic for the full bundle. Set a 175 KB ceiling to give some headroom; Phase 3 (viewer/editor packages) will lazy-load chart code and reset the user-facing budget.

```json
[
  { "name": "@aguspe/tiler-widgets (esm, full bundle)", "path": "dist/index.js", "limit": "175 KB" }
]
```

Run:
```bash
pnpm --filter @aguspe/tiler-widgets build
pnpm --filter @aguspe/tiler-widgets size
```
Expected: pass under 175 KB. If over, investigate (recharts could be tree-shaken further; check that no unintended deps are imported).

```bash
git add packages/widgets/.size-limit.json
git commit -m "chore(widgets): bump size budget to 175 KB for full 14-widget bundle"
```

---

## Task 18: Update cross-package smoke test (4 → 14 widgets)

**Files:**
- Modify: `packages/widgets/src/registry.smoke.test.ts`

```ts
import { getWidget, listWidgets } from "@aguspe/tiler-core";
import { describe, expect, it } from "vitest";
import "./index";

const ALL_TYPES = [
  "clock", "text", "image", "iframe",
  "metric", "number_with_delta", "meter",
  "list", "status_grid", "comments", "table",
  "line_chart", "bar_chart", "pie_chart",
] as const;

describe("registry smoke — all 14 widgets register", () => {
  it.each(ALL_TYPES)("%s is registered", (type) => {
    expect(getWidget(type)).toBeDefined();
  });

  it("listWidgets returns 14 widgets", () => {
    expect(listWidgets()).toHaveLength(14);
  });

  it("data-backed widgets all expose a resolver", () => {
    const dataBacked = listWidgets().filter((w) => w.meta.requires_data_source);
    expect(dataBacked.length).toBe(10);
    expect(dataBacked.every((w) => typeof w.resolve === "function")).toBe(true);
  });
});
```

```bash
pnpm --filter @aguspe/tiler-widgets test
git add packages/widgets/src/registry.smoke.test.ts
git commit -m "test(widgets): expand registry smoke test to all 14 widgets"
```

---

## Task 19: Update README + tag `v0.0.2-phase-2`

**Files:**
- Modify: `README.md`

Bump the "Status" section, the package status table, and the test counts.

- [ ] **Step 1: Edit `README.md`**

Replace:
```markdown
## Status: Phase 1 — Foundation (`v0.0.1-phase-1`)
```

With:
```markdown
## Status: Phase 2 — All 14 Widgets (`v0.0.2-phase-2`)
```

Update the bullet list to reflect that `@aguspe/tiler-widgets` ships all 14 widgets, the four shared resolver helpers landed in core, and Storybook covers everything. Adjust the test count to whatever `pnpm test` reports (~150).

In the package status table, change `@aguspe/tiler-widgets` from "✅ 4 of 14 widgets" to "✅ all 14 widgets + Storybook".

- [ ] **Step 2: Final pipeline verification**

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
pnpm deps
pnpm --filter @aguspe/tiler-widgets build-storybook
```
All seven must exit zero.

- [ ] **Step 3: Commit + tag**

```bash
git add README.md
git commit -m "docs: update README for Phase 2 (all 14 widgets)"
git tag -a v0.0.2-phase-2 -m "Phase 2 — all 14 widgets, with shared resolver helpers"
git log --oneline | head -25
git tag --list
```

---

## Phase 2 → Phase 3 handoff

**What's working at end of Phase 2:**
- `@aguspe/tiler-core` exports `aggregate`, `applyTimeWindow`, `applyFilter`, `groupByColumn`, `bucketByTime` for use by any consumer (widgets, future server resolver path, future Playwright reporter onEnd).
- `@aguspe/tiler-widgets` ships all 14 widgets registered via `defineWidget`, with full Storybook coverage and pure resolvers.
- 14-widget registry smoke test.
- Size budget enforced at 175 KB for the full bundle.
- `v0.0.2-phase-2` tag.

**What Phase 3 adds:**
- `@aguspe/tiler-viewer` — read-only React app, `<TilerDashboardViewer config={…} data={…} />`, SSR-able via `renderToString`.
- `@aguspe/tiler-playwright` — the `Reporter` implementation. Maps Playwright events → Tiler `DataRecord[]`, builds a `TilerSnapshot`, SSRs the viewer, writes `tiler-report/`.
- The `test_automation` preset in `@aguspe/tiler-core/src/presets/`.
- `examples/playwright-static/` — runnable demo: a Playwright project with `@aguspe/tiler-playwright` configured.
- Reporter self-test: a Playwright meta-test that runs a tiny 3-test fixture suite and asserts on the resulting `tiler-report/snapshot.json`.
- Visual regression tests via Playwright's `toHaveScreenshot()` against the built Storybook (deferred from Phase 2).
- Viewer bundle target ≤ 110 KB gzipped (charts code-split into a separate chunk loaded only when a chart widget is on the dashboard).

Plan 3 will be drafted as `docs/superpowers/plans/<date>-tiler-ts-phase-3-viewer-and-reporter.md` once Phase 2 is built and tagged.
