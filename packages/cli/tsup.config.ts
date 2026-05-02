import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/tiler": "src/bin/tiler.ts",
  },
  format: ["esm", "cjs"],
  dts: { entry: { index: "src/index.ts" } },
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  shims: true,
  // Hash-bang only on the bin entry; tsup hoists it to the top of the file.
  banner: ({ format }) => ({
    js: format === "esm" ? "" : "",
  }),
  external: [
    "@aguspe/tiler-core",
    "@aguspe/tiler-server",
    "better-sqlite3",
    "fastify",
    "commander",
    "jiti",
    "kleur",
  ],
});
