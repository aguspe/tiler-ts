import type { TilerStore } from "@aguspe/tiler-core";
import type { FastifyPluginAsync } from "fastify";
import rawBody from "fastify-raw-body";
import { verifyHmac } from "../auth";

export const ingestPlugin: FastifyPluginAsync = async (app) => {
  await app.register(rawBody, {
    field: "rawBody",
    global: false, // only routes that opt-in via config.rawBody
    encoding: "utf8",
    runFirst: true,
  });

  const cfg = (app as any).tilerConfig; // eslint-disable-line @typescript-eslint/no-explicit-any
  const store = cfg.store as TilerStore;

  app.post<{ Params: { source_slug: string } }>(
    "/:source_slug",
    { config: { rawBody: true } },
    async (req, reply) => {
      const raw = (req as any).rawBody as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
      const sigHeader = req.headers["x-tiler-signature"];

      if (typeof sigHeader !== "string" || typeof raw !== "string") {
        return reply.code(401).send({ error: "missing signature" });
      }

      const source = await store.getDataSource(req.params.source_slug);
      if (!source) {
        return reply.code(404).send({ error: "unknown source" });
      }

      // Prefer per-source token; fall back to global webhook secret.
      let secret: string | undefined;
      if (source.webhook_token) {
        secret = source.webhook_token;
      } else if (cfg.auth?.webhookSecret) {
        secret = cfg.auth.webhookSecret as string;
      }

      if (!secret) {
        return reply.code(401).send({ error: "no signing key configured" });
      }

      if (!verifyHmac(secret, raw, sigHeader)) {
        return reply.code(401).send({ error: "invalid signature" });
      }

      // Parse JSON
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return reply.code(400).send({ error: "invalid json" });
      }

      // Validate payload keys against schema_definition
      const allowedKeys = new Set(source.schema_definition.map((f) => f.key));
      const payload: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(body)) {
        if (k === "recorded_at" || k === "source_ref") continue;
        if (allowedKeys.size > 0 && !allowedKeys.has(k)) {
          return reply.code(400).send({ error: `unknown field: ${k}` });
        }
        payload[k] = v;
      }

      const recordedAt =
        typeof body["recorded_at"] === "string" ? body["recorded_at"] : new Date().toISOString();

      // Skew check
      const skewMs: number = (cfg.auth?.recordedAtSkewMs as number | undefined) ?? 30 * 24 * 3_600_000;
      const t = Date.parse(recordedAt);
      const now = Date.now();

      if (Number.isNaN(t) || t < now - skewMs || t > now + 5 * 60_000) {
        return reply.code(400).send({ error: "recorded_at outside skew window" });
      }

      const record = await store.insertRecord({
        data_source_id: source.id,
        payload,
        recorded_at: recordedAt,
        source_ref: typeof body["source_ref"] === "string" ? body["source_ref"] : null,
        ingested_via: "webhook",
      });

      return reply.code(201).send({ status: "ok", id: record.id });
    },
  );
};
