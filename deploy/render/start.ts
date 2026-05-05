import "@aguspe/tiler-widgets"; // register all widgets so resolvers run server-side
import { defineConfig } from "@aguspe/tiler-core";
import { createServer } from "@aguspe/tiler-server";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

/**
 * Tiler server entry for Render.
 *
 * - Reads PORT from Render's env (defaults to 4567 for local).
 * - Binds to 0.0.0.0 so Render's reverse proxy can reach it.
 * - Stores SQLite at TILER_DB_PATH (mount a Render Disk for persistence;
 *   defaults to ./tiler.db which is ephemeral on the free tier).
 * - Seeds the `test_automation` preset on first boot. On free-tier Render
 *   the disk is wiped on cold-restart, so the seed runs every cold boot —
 *   that's fine, it's idempotent within a boot.
 */
const config = defineConfig({
  store: new BetterSqliteStore({
    path: process.env.TILER_DB_PATH ?? "./tiler.db",
  }),
  port: process.env.PORT ? Number(process.env.PORT) : 4567,
  host: "0.0.0.0",
  auth: {
    webhookSecret: process.env.TILER_WEBHOOK_SECRET ?? "dev-secret-please-change",
  },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],
});

async function main(): Promise<void> {
  const app = await createServer({ ...config, logger: { level: "info" } });
  await app.listen({ host: config.host, port: config.port });
  console.log(`[tiler-render] listening at http://${config.host}:${config.port}`);
  console.log(`[tiler-render] dashboard: /dashboards/test_automation`);
}

void main().catch((err: unknown) => {
  console.error("[tiler-render] boot failed:", err);
  process.exit(1);
});
