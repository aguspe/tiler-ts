import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import kleur from "kleur";

export interface ImportPlaywrightJsonOptions {
  file: string;
  /** Write to a JSON file instead of POSTing. */
  out?: string;
  /** Tiler server URL to POST to. Mutually exclusive with `out`. */
  server?: string;
  sourceSlug: string;
  /** HMAC-SHA256 secret used to sign the body when posting. */
  secret?: string;
}

/**
 * Shape of a Playwright JSON reporter spec entry. We model only the
 * fields we use; the reporter ships many more, but we don't depend on
 * them and don't want to validate the whole tree.
 */
interface PlaywrightTest {
  title: string;
  results?: Array<{ status?: string; duration?: number }>;
}
interface PlaywrightSpec {
  title: string;
  tests?: PlaywrightTest[];
}
interface PlaywrightSuite {
  title: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}
interface PlaywrightReport {
  suites?: PlaywrightSuite[];
}

interface IngestRecord {
  payload: Record<string, unknown>;
  recorded_at: string;
}

/**
 * Convert a Playwright JSON report into ingestion records and either
 * write them to disk or HMAC-sign and POST them to a running tiler
 * server.
 *
 * The schema matches the `test_runs` preset's `schema_definition`:
 *   suite, test_name, status, duration_ms, environment.
 */
export async function importPlaywrightJsonCommand(
  opts: ImportPlaywrightJsonOptions,
): Promise<void> {
  const absolute = resolve(process.cwd(), opts.file);
  const raw = readFileSync(absolute, "utf8");
  const report = JSON.parse(raw) as PlaywrightReport;
  const records = flattenReport(report);

  if (opts.out) {
    const outPath = resolve(process.cwd(), opts.out);
    writeFileSync(outPath, JSON.stringify(records, null, 2), "utf8");
    process.stdout.write(
      `${kleur.green("✓")} wrote ${records.length} records to ${kleur.cyan(opts.out)}\n`,
    );
    return;
  }

  if (!opts.server) {
    throw new Error("Provide either --out <path> or --server <url> (or both).");
  }
  if (!opts.secret) {
    throw new Error("Webhook secret missing. Pass --secret or set TILER_WEBHOOK_SECRET.");
  }

  await postIngest(opts.server, opts.sourceSlug, opts.secret, records);
  process.stdout.write(
    `${kleur.green("✓")} ingested ${records.length} records to ${kleur.cyan(opts.server)}\n`,
  );
}

function flattenReport(report: PlaywrightReport): IngestRecord[] {
  const out: IngestRecord[] = [];
  const now = new Date().toISOString();
  // Walk suite tree; specs hold the actual tests.
  function visit(suite: PlaywrightSuite, parentTitle: string): void {
    const suiteTitle = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const result = test.results?.[0];
        out.push({
          payload: {
            suite: suiteTitle,
            test_name: spec.title,
            status: result?.status ?? "unknown",
            duration_ms: result?.duration ?? 0,
            environment: "playwright",
          },
          recorded_at: now,
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child, suiteTitle);
  }
  for (const top of report.suites ?? []) visit(top, "");
  return out;
}

async function postIngest(
  server: string,
  sourceSlug: string,
  secret: string,
  records: IngestRecord[],
): Promise<void> {
  const url = `${server.replace(/\/$/, "")}/ingest/${sourceSlug}`;
  const body = JSON.stringify({ records });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tiler-signature": signature,
    },
    body,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ingest failed: HTTP ${res.status} ${detail}`);
  }
}
