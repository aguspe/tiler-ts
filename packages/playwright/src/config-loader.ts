import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { createJiti } from "jiti";
import type { PlaywrightTilerConfig } from "./define-config";

/**
 * Load a tiler.config.ts (or .js/.mjs/.cjs) and return its default export.
 *
 * `path` may be absolute or relative to `process.cwd()`. We use `jiti` so
 * users can author the file in TypeScript without compiling it themselves.
 */
export function loadConfigFile(path: string): PlaywrightTilerConfig {
  const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
  if (!existsSync(abs)) {
    throw new Error(`[tiler-playwright] config file not found: ${abs}`);
  }
  const jiti = createJiti(abs, { interopDefault: false });
  const mod = jiti(abs) as { default?: PlaywrightTilerConfig };
  if (!mod || typeof mod !== "object" || !("default" in mod) || mod.default == null) {
    throw new Error(
      `[tiler-playwright] config file ${abs} has no default export — did you forget \`export default definePlaywrightConfig({...})\`?`,
    );
  }
  return mod.default;
}
