import { defineConfig, type ResolvedTilerConfig, type TilerConfig } from "@aguspe/tiler-core";
import fastify, { type FastifyInstance } from "fastify";
import { dashboardsPlugin } from "./routes/dashboards";
import { ingestPlugin } from "./routes/ingest";
import { panelsPlugin } from "./routes/panels";
import { sourcesPlugin } from "./routes/sources";
import { viewerPagesPlugin } from "./routes/viewer-pages";

export interface CreateServerOptions extends TilerConfig {
  /** Skip auto-loading widget packages. Useful for tests. */
  skipWidgetLoad?: boolean;
  /** Override the Fastify logger config. Defaults to `{ level: "warn" }`. */
  logger?: false | { level: "fatal" | "error" | "warn" | "info" | "debug" | "trace" };
}

export interface TilerFastifyInstance extends FastifyInstance {
  tilerConfig: ResolvedTilerConfig;
}

/**
 * Build a Fastify app wired up with the given Tiler config.
 *
 * Does NOT call `.listen()` — call `app.listen({ host, port })` from the caller,
 * or use `app.inject()` for in-process testing.
 *
 * The store's `migrate()` is called as part of construction so the schema is
 * ready before any routes execute.
 */
export async function createServer(opts: CreateServerOptions): Promise<TilerFastifyInstance> {
  const cfg = defineConfig(opts);
  const logger = opts.logger ?? { level: "warn" };
  const app = fastify({ logger }) as unknown as TilerFastifyInstance;
  app.tilerConfig = cfg;

  // Ensure store schema is migrated. Idempotent for both MemoryStore and BetterSqliteStore.
  await cfg.store.migrate();

  app.get("/healthz", async () => ({ status: "ok" }));
  app.get("/", async (_req, reply) => {
    return reply.redirect("/dashboards", 302);
  });

  await app.register(dashboardsPlugin, { prefix: "/api/dashboards" });
  await app.register(panelsPlugin, { prefix: "/api/panels" });
  await app.register(sourcesPlugin, { prefix: "/api/data_sources" });
  await app.register(ingestPlugin, { prefix: "/ingest" });
  await app.register(viewerPagesPlugin);

  return app;
}
