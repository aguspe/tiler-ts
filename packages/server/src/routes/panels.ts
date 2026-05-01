import type { ResolvedTilerConfig, TilerStore } from "@aguspe/tiler-core";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { makeBasicAuthHook, makeCsrfHook } from "../auth";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

export const PanelCreate = z.object({
  id: z.string().optional(),
  dashboard_id: z.string().min(1),
  data_source_id: z.string().nullable().default(null),
  title: z.string().min(1).max(200),
  widget_type: z.string().min(1),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  width: z.number().int().min(1).max(12),
  height: z.number().int().min(1).max(12),
  config: z.record(z.unknown()).default({}),
});

export const PanelUpdate = PanelCreate.partial();

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const panelsPlugin: FastifyPluginAsync = async (app) => {
  const cfg = (app as unknown as { tilerConfig: ResolvedTilerConfig }).tilerConfig;
  const store: TilerStore = cfg.store;
  const auth = [makeBasicAuthHook(cfg.auth), makeCsrfHook(cfg.auth)];

  // POST / — create panel
  app.post("/", { preHandler: auth }, async (req, reply) => {
    const parsed = PanelCreate.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation error", issues: parsed.error.issues });
    }
    const panel = await store.upsertPanel(parsed.data as Parameters<TilerStore["upsertPanel"]>[0]);
    return reply.code(201).send(panel);
  });

  // PATCH /:id — update panel
  app.patch<{ Params: { id: string } }>("/:id", { preHandler: auth }, async (req, reply) => {
    const parsed = PanelUpdate.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation error", issues: parsed.error.issues });
    }

    // Retrieve existing panel. Store doesn't expose getPanel by id, so we fetch
    // the panel list for the dashboard_id if available, otherwise scan.
    // Since we only have listPanels(dashboardId), we need to know the dashboard_id.
    // If not supplied in the patch body, we find it from the existing record by
    // brute-forcing through the dashboards list.
    const dashboards = await store.listDashboards();
    let existing = null;
    for (const db of dashboards) {
      const panels = await store.listPanels(db.id);
      existing = panels.find((p) => p.id === req.params.id) ?? null;
      if (existing) break;
    }
    if (!existing) {
      return reply.code(404).send({ error: "not found" });
    }

    const merged = { ...existing, ...parsed.data };
    const updated = await store.upsertPanel(merged as Parameters<TilerStore["upsertPanel"]>[0]);
    return reply.code(200).send(updated);
  });

  // DELETE /:id — delete panel
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: auth }, async (req, reply) => {
    // Verify it exists before deleting (same scan as above)
    const dashboards = await store.listDashboards();
    let found = false;
    for (const db of dashboards) {
      const panels = await store.listPanels(db.id);
      if (panels.some((p) => p.id === req.params.id)) {
        found = true;
        break;
      }
    }
    if (!found) {
      return reply.code(404).send({ error: "not found" });
    }
    await store.deletePanel(req.params.id);
    return reply.code(204).send();
  });
};
