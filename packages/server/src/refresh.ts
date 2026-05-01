import {
  buildSnapshot,
  type ResolvedEntry,
  type ResolvedTilerConfig,
  type TilerSnapshot,
  type TilerStore,
} from "@aguspe/tiler-core";

export type RefreshSubscriber = (msg: RefreshMessage) => void;

export type RefreshMessage =
  | { type: "snapshot"; snapshot: TilerSnapshot }
  | { type: "panel"; panelId: string; data: ResolvedEntry };

interface DashboardState {
  slug: string;
  subscribers: Set<RefreshSubscriber>;
  timer: NodeJS.Timeout | null;
  lastResolved: Record<string, ResolvedEntry>;
}

const RECORDS_LOOKBACK_MS = 30 * 24 * 3600_000;
const DEFAULT_REFRESH_MS = 60_000;
const MIN_REFRESH_MS = 5_000;

/**
 * Manages per-dashboard refresh loops. Handlers subscribe by slug; the manager
 * starts a single timer per dashboard, builds snapshots on tick, diffs against
 * last-pushed resolved data, and pushes only changes. Timer pauses when zero
 * subscribers remain.
 */
export class RefreshManager {
  private readonly store: TilerStore;
  private readonly dashboards = new Map<string, DashboardState>();

  constructor(cfg: Pick<ResolvedTilerConfig, "store">) {
    this.store = cfg.store;
  }

  async subscribe(slug: string, sub: RefreshSubscriber): Promise<void> {
    let state = this.dashboards.get(slug);
    if (!state) {
      state = { slug, subscribers: new Set(), timer: null, lastResolved: {} };
      this.dashboards.set(slug, state);
    }
    state.subscribers.add(sub);

    // Send the current snapshot to the new subscriber.
    const snapshot = await this.snapshot(slug);
    if (snapshot) {
      state.lastResolved = snapshot.resolved;
      sub({ type: "snapshot", snapshot });
    }

    // Arm the timer if this is the first subscriber.
    if (state.subscribers.size === 1 && !state.timer) {
      const refreshMs = await this.refreshIntervalMs(slug);
      state.timer = setInterval(() => {
        void this.tick(slug);
      }, refreshMs);
    }
  }

  unsubscribe(slug: string, sub: RefreshSubscriber): void {
    const state = this.dashboards.get(slug);
    if (!state) return;
    state.subscribers.delete(sub);
    if (state.subscribers.size === 0 && state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  /** Stop all timers. Used on server shutdown. */
  closeAll(): void {
    for (const state of this.dashboards.values()) {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
      state.subscribers.clear();
    }
    this.dashboards.clear();
  }

  private async refreshIntervalMs(slug: string): Promise<number> {
    const dashboard = await this.store.getDashboard(slug);
    if (!dashboard) return DEFAULT_REFRESH_MS;
    const seconds = dashboard.refresh_seconds || DEFAULT_REFRESH_MS / 1000;
    return Math.max(MIN_REFRESH_MS, seconds * 1000);
  }

  private async tick(slug: string): Promise<void> {
    const state = this.dashboards.get(slug);
    if (!state || state.subscribers.size === 0) return;
    const snapshot = await this.snapshot(slug);
    if (!snapshot) return;

    const changedPanels: Array<{ panelId: string; data: ResolvedEntry }> = [];
    for (const [panelId, entry] of Object.entries(snapshot.resolved)) {
      const last = state.lastResolved[panelId];
      if (!last || !entriesEqual(last, entry)) {
        changedPanels.push({ panelId, data: entry });
      }
    }
    state.lastResolved = snapshot.resolved;

    if (changedPanels.length === 0) return;
    for (const sub of state.subscribers) {
      for (const change of changedPanels) {
        sub({ type: "panel", panelId: change.panelId, data: change.data });
      }
    }
  }

  private async snapshot(slug: string): Promise<TilerSnapshot | null> {
    const dashboard = await this.store.getDashboard(slug);
    if (!dashboard) return null;
    const panels = await this.store.listPanels(dashboard.id);
    const allSources = await this.store.listDataSources();
    const referencedSourceIds = new Set(
      panels.map((p) => p.data_source_id).filter((x): x is string => x !== null),
    );
    const dataSources = allSources.filter((s) => referencedSourceIds.has(s.id));
    const since = new Date(Date.now() - RECORDS_LOOKBACK_MS).toISOString();
    const recordBatches = await Promise.all(
      dataSources.map((s) =>
        this.store.queryRecords({ dataSourceId: s.id, since, orderBy: "recorded_at_desc" }),
      ),
    );
    return buildSnapshot({
      dashboard,
      dataSources,
      panels,
      records: recordBatches.flat(),
      now: new Date(),
    });
  }
}

function entriesEqual(a: ResolvedEntry, b: ResolvedEntry): boolean {
  if (a.empty !== b.empty) return false;
  return JSON.stringify(a.resolved) === JSON.stringify(b.resolved);
}
