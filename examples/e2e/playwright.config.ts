import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression tests for the tiler-ts editor.
 *
 * Boots the `examples/server-live` Fastify server on port 4568 (so it
 * doesn't collide with a developer's dev server on 4567), runs the suite
 * against a fixed viewport, and compares Chromium screenshots to
 * committed baselines. The fonts come from Google Fonts and need a moment
 * to settle, so each test waits for the network to idle before
 * snapshotting.
 */
const PORT = 4568;
// Absolute path so the seed step in `global-setup.ts` and the server
// process spawned by `webServer.command` agree on which file to use.
// Otherwise the relative path resolves differently in each cwd and the
// server boots against an empty database.
const DB_PATH = resolve(import.meta.dirname, "../server-live/tiler-e2e.db");

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  expect: {
    // Allow tiny anti-aliasing differences; clamp to avoid false positives
    // from sub-pixel rounding when fonts re-flow.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter tiler-ts-example-server-live start",
    url: `http://127.0.0.1:${PORT}/dashboards`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: "../..",
    env: {
      PORT: String(PORT),
      TILER_DB_PATH: DB_PATH,
    },
  },
});
