import { copyFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  external: ["react", "react-dom"],
  onSuccess: async () => {
    const dest = "dist/styles/tokens.css";
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync("src/styles/tokens.css", dest);
  },
});
