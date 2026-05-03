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
