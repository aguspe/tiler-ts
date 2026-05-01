import { newId, testAutomationPreset } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

const SUITES = ["checkout", "auth", "search", "billing", "profile"];
const STATUSES = ["pass", "pass", "pass", "fail", "warn"]; // weighted toward pass

async function main(): Promise<void> {
  const store = new BetterSqliteStore({ path: "./tiler.db" });
  await store.migrate();

  // Idempotent: only seed if no dashboard with this slug exists yet.
  const existing = await store.getDashboard("test_automation");
  if (existing) {
    console.log("test_automation dashboard already seeded; skipping.");
    await store.close();
    return;
  }

  const preset = testAutomationPreset({ now: new Date() });
  await store.upsertDashboard({ ...preset.dashboard, id: preset.dashboard.id });
  for (const s of preset.dataSources) {
    await store.upsertDataSource({ ...s, id: s.id });
  }
  for (const p of preset.panels) {
    await store.upsertPanel({ ...p, id: p.id });
  }

  // 200 fake records spanning the last 7 days.
  const sourceId = preset.dataSources[0]!.id;
  const records = Array.from({ length: 200 }, (_, i) => ({
    id: newId(),
    data_source_id: sourceId,
    payload: {
      suite: SUITES[i % SUITES.length],
      test_name: `tc_${String(i).padStart(3, "0")}`,
      status: STATUSES[i % STATUSES.length],
      duration_ms: 80 + ((i * 13) % 500),
      environment: "ci",
    },
    recorded_at: new Date(Date.now() - i * 30 * 60_000).toISOString(),
    source_ref: null,
    ingested_via: "manual" as const,
  }));
  const inserted = await store.insertRecordsBatch(records);
  console.log(`Seeded ${inserted} records into the test_runs source.`);

  await store.close();
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
