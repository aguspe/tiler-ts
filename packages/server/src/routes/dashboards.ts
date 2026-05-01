import { buildSnapshot } from "@aguspe/tiler-core";
import type { TilerStore } from "@aguspe/tiler-core";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { makeBasicAuthHook, makeCsrfHook } from "../auth";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const ThemeTokensInput = z
  .object({
    page: z.string().optional(),
    tile: z.string().optional(),
    tile_header: z.string().optional(),
    gutter: z.string().optional(),
  })
  .strict();

const DashboardSettingsInput = z
  .object({
    theme: ThemeTokensInput.optional(),
    tv_mode: z.boolean().default(false),
  })
  .strict()
  .default({ tv_mode: false });

export const DashboardCreate = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9_-]+$/),
  description: z.string().nullable().default(null),
  refresh_seconds: z.number().int().min(0).default(0),
  settings: DashboardSettingsInput,
});

export const DashboardUpdate = DashboardCreate.partial();

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const dashboardsPlugin: FastifyPluginAsync = async (app) => {
  const cfg = (app as any).tilerConfig; // eslint-disable-line @typescript-eslint/no-explicit-any
  const store = cfg.store as TilerStore;
  const auth = [makeBasicAuthHook(cfg.auth), makeCsrfHook(cfg.auth)];

  // GET / — list all dashboards
  app.get("/", async () => store.listDashboards());

  // GET /:slug — full snapshot
  app.get<{ Params: { slug: string } }>("/:slug", async (req, reply) => {
    const dashboard = await store.getDashboard(req.params.slug);
    if (!dashboard) {
      return reply.code(404).send({ error: "not found" });
    }

    const panels = await store.listPanels(dashboard.id);
    const allSources = await store.listDataSources();
    const referencedSourceIds = new Set(
      panels.map((p) => p.data_source_id).filter((x): x is string => x !== null),
    );
    const dataSources = allSources.filter((s) => referencedSourceIds.has(s.id));

    const since = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
    const records = (
      await Promise.all(
        dataSources.map((s) =>
          store.queryRecords({ dataSourceId: s.id, since, orderBy: "recorded_at_desc" }),
        ),
      )
    ).flat();

    const snapshot = await buildSnapshot({
      dashboard,
      dataSources,
      panels,
      records,
      now: new Date(),
    });

    return snapshot;
  });

  // POST / — create dashboard
  app.post("/", { preHandler: auth }, async (req, reply) => {
    const parsed = DashboardCreate.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation error", issues: parsed.error.issues });
    }
    const dashboard = await store.upsertDashboard(parsed.data);
    return reply.code(201).send(dashboard);
  });

  // PATCH /:id — update dashboard
  app.patch<{ Params: { id: string } }>("/:id", { preHandler: auth }, async (req, reply) => {
    const parsed = DashboardUpdate.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation error", issues: parsed.error.issues });
    }

    // Fetch the current record by iterating (store only exposes getDashboard by slug,
    // so we list and find by id).
    const all = await store.listDashboards();
    const existing = all.find((d) => d.id === req.params.id);
    if (!existing) {
      return reply.code(404).send({ error: "not found" });
    }

    const merged = { ...existing, ...parsed.data };
    const updated = await store.upsertDashboard(merged);
    return reply.code(200).send(updated);
  });

  // DELETE /:id — delete dashboard
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: auth }, async (req, reply) => {
    const all = await store.listDashboards();
    const existing = all.find((d) => d.id === req.params.id);
    if (!existing) {
      return reply.code(404).send({ error: "not found" });
    }
    await store.deleteDashboard(req.params.id);
    return reply.code(204).send();
  });
};
