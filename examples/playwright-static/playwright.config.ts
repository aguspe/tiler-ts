import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  reporter: [["@aguspe/tiler-playwright", { outDir: "tiler-report" }]],
  use: {
    baseURL: "https://example.com",
  },
});
