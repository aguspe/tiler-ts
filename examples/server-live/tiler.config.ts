import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: "./tiler.db" }),
  port: 4567,
  auth: {
    webhookSecret: process.env.TILER_WEBHOOK_SECRET ?? "dev-secret-please-change",
  },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],
});
