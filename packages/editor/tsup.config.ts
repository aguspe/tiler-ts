import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "server/index": "src/server/index.tsx" },
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,
  target: "es2022",
  splitting: false,
  shims: true,
  external: ["react", "react-dom", "react-dom/server", "gridstack", "react-focus-lock"],
});
