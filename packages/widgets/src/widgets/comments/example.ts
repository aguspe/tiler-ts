import type { DataRecord, Panel } from "@aguspe/tiler-core";

export function CommentsExample(): { panel: Panel; records: DataRecord[] } {
  const now = "2026-04-30T12:00:00.000Z";
  const panel: Panel = {
    id: "c-1",
    dashboard_id: "demo",
    data_source_id: "ds-1",
    title: "Recent comments",
    widget_type: "comments",
    x: 0,
    y: 0,
    width: 4,
    height: 4,
    config: { body_column: "body", author_column: "author", time_window: "24h", limit: 12 },
    created_at: now,
    updated_at: now,
  };
  const samples = [
    { author: "alice", body: "Auth flow regression on staging — opened ticket TQA-1024." },
    { author: "bob", body: "Deploy looks clean. Monitoring overnight." },
    { author: "carol", body: "Cleared queue backlog from yesterday's incident." },
    { author: "dan", body: "Updated the runbook with the new rotation schedule." },
    { author: "eve", body: "Cache invalidation fixed in PR #2241." },
  ];
  const records: DataRecord[] = Array.from({ length: 12 }, (_, i) => {
    const sample = samples[i % samples.length];
    return {
      id: `c${i}`,
      data_source_id: "ds-1",
      payload: { author: sample?.author ?? "anon", body: sample?.body ?? "" },
      recorded_at: new Date(Date.parse(now) - i * 30 * 60_000).toISOString(),
      source_ref: null,
      ingested_via: "manual" as const,
      created_at: now,
    };
  });
  return { panel, records };
}
