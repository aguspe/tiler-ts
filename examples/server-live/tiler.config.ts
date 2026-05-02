import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: process.env.TILER_DB_PATH ?? "./tiler.db" }),
  // Allow CI / e2e to pick a port via env without editing config.
  port: process.env.PORT ? Number(process.env.PORT) : 4567,
  auth: {
    webhookSecret: process.env.TILER_WEBHOOK_SECRET ?? "dev-secret-please-change",
  },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],
});
