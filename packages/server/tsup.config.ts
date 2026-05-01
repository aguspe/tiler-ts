import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/store/sqlite.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  external: [
    "better-sqlite3",
    "fastify",
    "@fastify/cookie",
    "@fastify/static",
    "@fastify/websocket",
    "react",
    "react-dom",
    "react-dom/server",
  ],
});
