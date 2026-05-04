import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: [
    ["list"],
    ["@aguspe/tiler-playwright", {
      outDir: "tiler-report",
      config: "./tiler.config.ts",
    }],
  ],
  use: {
    baseURL: "https://playwright.dev",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
