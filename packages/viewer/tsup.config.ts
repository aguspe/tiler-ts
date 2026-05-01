import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "server/index": "src/server/index.ts" },
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,
  target: "es2022",
  splitting: false,
  external: ["react", "react-dom", "react-dom/server"],
});
