import {
  type PresetOutput,
  type ResolvedTilerConfig,
  type TilerStore,
  getPreset,
  playwrightConfigToPresetOutput,
} from "@aguspe/tiler-core";

/**
 * Seed dashboards into the store from the resolved Tiler config.
 *
 * Idempotent by `dashboard.slug`. If a dashboard with that slug already
 * exists in the store, the entire seed is skipped (no partial seeding,
 * no overwrite of editor edits). Errors during seeding throw, aborting
 * the server boot — a misconfigured seed is a deploy-time failure.
 */
export async function seedDashboards(
  cfg: ResolvedTilerConfig,
  store: TilerStore,
): Promise<void> {
  const seeds: PresetOutput[] = [];
  const now = new Date();

  for (const name of cfg.presets) {
    const factory = getPreset(name);
    if (!factory) {
      throw new Error(`[tiler-server] unknown preset "${name}" — seeding aborted`);
    }
    seeds.push(factory({ now }));
  }

  for (const dash of cfg.dashboards) {
    seeds.push(playwrightConfigToPresetOutput({ config: dash, now }));
  }

  // Pre-flight: error on duplicate slugs in the seed list itself.
  const slugs = new Set<string>();
  for (const s of seeds) {
    if (slugs.has(s.dashboard.slug)) {
      throw new Error(
        `[tiler-server] duplicate dashboard slug "${s.dashboard.slug}" in seed config`,
      );
    }
    slugs.add(s.dashboard.slug);
  }

  for (const seed of seeds) {
    const existing = await store.getDashboard(seed.dashboard.slug);
    if (existing) {
      console.info(
        `[tiler-server] dashboard "${seed.dashboard.slug}" already exists, skipping seed`,
      );
      continue;
    }
    await store.upsertDashboard(seed.dashboard);
    for (const ds of seed.dataSources) {
      await store.upsertDataSource(ds);
    }
    for (const p of seed.panels) {
      await store.upsertPanel(p);
    }
    console.info(
      `[tiler-server] seeded "${seed.dashboard.slug}" — ${seed.panels.length} panels, ${seed.dataSources.length} sources`,
    );
  }
}
