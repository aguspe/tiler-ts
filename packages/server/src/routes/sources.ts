import type { ResolvedTilerConfig, TilerStore } from "@aguspe/tiler-core";
import type { FastifyPluginAsync } from "fastify";
import Papa from "papaparse";
import { z } from "zod";
import { makeBasicAuthHook, makeCsrfHook } from "../auth";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const SchemaFieldInput = z
  .object({
    key: z.string().regex(/^[A-Za-z0-9_]+$/),
    type: z.enum(["string", "integer", "float", "boolean", "datetime"]),
    label: z.string().optional(),
  })
  .strict();

const IngestionMethodInput = z.enum(["webhook", "manual", "csv"]);

export const DataSourceCreate = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9_-]+$/),
  description: z.string().nullable().default(null),
  schema_definition: z.array(SchemaFieldInput).default([]),
  ingestion_methods: z.array(IngestionMethodInput).min(1),
  webhook_token: z.string().nullable().default(null),
  active: z.boolean().default(true),
});

export const DataSourceUpdate = DataSourceCreate.partial();

export const DataRecordManualInput = z.object({
  payload: z.record(z.unknown()),
  recorded_at: z.string().datetime().optional(),
  source_ref: z.string().nullable().default(null),
});

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const sourcesPlugin: FastifyPluginAsync = async (app) => {
  const cfg = (app as unknown as { tilerConfig: ResolvedTilerConfig }).tilerConfig;
  const store: TilerStore = cfg.store;
  const auth = [makeBasicAuthHook(cfg.auth), makeCsrfHook(cfg.auth)];

  // Register a content-type parser for text/csv so Fastify doesn't reject it
  app.addContentTypeParser("text/csv", { parseAs: "string" }, (_req, body, done) => {
    done(null, body);
  });

  // GET / — list all data sources
  app.get("/", async () => store.listDataSources());

  // GET /:slug — single data source
  app.get<{ Params: { slug: string } }>("/:slug", async (req, reply) => {
    const source = await store.getDataSource(req.params.slug);
    if (!source) {
      return reply.code(404).send({ error: "not found" });
    }
    return source;
  });

  // POST / — create data source
  app.post("/", { preHandler: auth }, async (req, reply) => {
    const parsed = DataSourceCreate.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation error", issues: parsed.error.issues });
    }
    const source = await store.upsertDataSource(
      parsed.data as Parameters<TilerStore["upsertDataSource"]>[0],
    );
    return reply.code(201).send(source);
  });

  // PATCH /:id — update data source
  app.patch<{ Params: { id: string } }>("/:id", { preHandler: auth }, async (req, reply) => {
    const parsed = DataSourceUpdate.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation error", issues: parsed.error.issues });
    }

    const all = await store.listDataSources();
    const existing = all.find((s) => s.id === req.params.id);
    if (!existing) {
      return reply.code(404).send({ error: "not found" });
    }

    const merged = { ...existing, ...parsed.data };
    const updated = await store.upsertDataSource(
      merged as Parameters<TilerStore["upsertDataSource"]>[0],
    );
    return reply.code(200).send(updated);
  });

  // DELETE /:id — delete data source
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: auth }, async (req, reply) => {
    const all = await store.listDataSources();
    const existing = all.find((s) => s.id === req.params.id);
    if (!existing) {
      return reply.code(404).send({ error: "not found" });
    }
    await store.deleteDataSource(req.params.id);
    return reply.code(204).send();
  });

  // POST /:slug/records — manual record insertion
  app.post<{ Params: { slug: string } }>(
    "/:slug/records",
    { preHandler: auth },
    async (req, reply) => {
      const source = await store.getDataSource(req.params.slug);
      if (!source) {
        return reply.code(404).send({ error: "unknown source" });
      }

      const parsed = DataRecordManualInput.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation error", issues: parsed.error.issues });
      }

      const record = await store.insertRecord({
        data_source_id: source.id,
        payload: parsed.data.payload,
        recorded_at: parsed.data.recorded_at ?? new Date().toISOString(),
        source_ref: parsed.data.source_ref,
        ingested_via: "manual",
      });

      return reply.code(201).send(record);
    },
  );

  // POST /:slug/import_csv — CSV bulk import
  app.post<{ Params: { slug: string } }>(
    "/:slug/import_csv",
    { preHandler: auth },
    async (req, reply) => {
      const source = await store.getDataSource(req.params.slug);
      if (!source) {
        return reply.code(404).send({ error: "unknown source" });
      }

      const csvText = req.body as string;
      if (typeof csvText !== "string" || csvText.trim().length === 0) {
        return reply.code(400).send({ error: "empty or non-string CSV body" });
      }

      const result = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        return reply
          .code(400)
          .send({ error: "csv parse error", details: result.errors.map((e) => e.message) });
      }

      const inputs = result.data.map((row) => {
        const recorded_at =
          typeof row.recorded_at === "string" && row.recorded_at.length > 0
            ? row.recorded_at
            : new Date().toISOString();

        const payload: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (k === "recorded_at") continue;
          payload[k] = v;
        }

        return {
          data_source_id: source.id,
          payload,
          recorded_at,
          source_ref: null,
          ingested_via: "csv" as const,
        };
      });

      const ingested = await store.insertRecordsBatch(inputs);
      return reply.code(201).send({ ingested });
    },
  );
};
