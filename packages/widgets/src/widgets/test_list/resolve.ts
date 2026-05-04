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
  expected_data: string | null;
  actual_data: string | null;
  diff_data: string | null;
  video_data: string | null;
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
      expected_data: r.payload.expected_data ? String(r.payload.expected_data) : null,
      actual_data: r.payload.actual_data ? String(r.payload.actual_data) : null,
      diff_data: r.payload.diff_data ? String(r.payload.diff_data) : null,
      video_data: r.payload.video_data ? String(r.payload.video_data) : null,
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
