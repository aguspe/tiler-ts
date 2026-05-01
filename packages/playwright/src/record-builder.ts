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
