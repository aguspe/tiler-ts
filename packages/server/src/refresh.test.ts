import { MemoryStore, testAutomationPreset } from "@aguspe/tiler-core";
import "@aguspe/tiler-widgets";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefreshManager, type RefreshMessage } from "./refresh";

let store: MemoryStore;
let mgr: RefreshManager;
const NOW = new Date("2026-04-30T12:00:00.000Z");

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  store = new MemoryStore();
  await store.migrate();
  const preset = testAutomationPreset({ now: NOW });
  await store.upsertDashboard({ ...preset.dashboard, id: preset.dashboard.id });
  for (const s of preset.dataSources) {
    await store.upsertDataSource({ ...s, id: s.id });
  }
  for (const p of preset.panels) {
    await store.upsertPanel({ ...p, id: p.id });
  }
  mgr = new RefreshManager({ store });
});
afterEach(() => {
  mgr.closeAll();
  vi.useRealTimers();
});

describe("RefreshManager", () => {
  it("sends an initial snapshot on subscribe", async () => {
    const messages: RefreshMessage[] = [];
    await mgr.subscribe("test_automation", (m) => messages.push(m));
    expect(messages).toHaveLength(1);
    expect(messages[0]?.type).toBe("snapshot");
  });

  it("stops the timer when the last subscriber unsubscribes", async () => {
    const sub = (_m: RefreshMessage): void => {};
    await mgr.subscribe("test_automation", sub);
    expect(vi.getTimerCount()).toBe(1);
    mgr.unsubscribe("test_automation", sub);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("only pushes changed panels on tick", async () => {
    const messages: RefreshMessage[] = [];
    await mgr.subscribe("test_automation", (m) => messages.push(m));
    const initial = messages.length;
    expect(initial).toBe(1); // snapshot

    // Advance time without changing data → no panel diffs.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(messages).toHaveLength(initial); // no extra panel pushes

    // Insert a new record. Next tick should push at least one panel change.
    const sources = await store.listDataSources();
    const src = sources[0];
    if (!src) throw new Error("preset must include a source");
    await store.insertRecord({
      data_source_id: src.id,
      payload: { suite: "checkout", test_name: "x", status: "fail", duration_ms: 100 },
      recorded_at: new Date().toISOString(),
      source_ref: null,
      ingested_via: "webhook",
    });
    await vi.advanceTimersByTimeAsync(60_000);
    const panelMsgs = messages.filter((m) => m.type === "panel");
    expect(panelMsgs.length).toBeGreaterThan(0);
  });
});
