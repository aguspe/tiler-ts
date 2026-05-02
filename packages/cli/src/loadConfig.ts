import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ResolvedTilerConfig } from "@aguspe/tiler-core";
import { createJiti } from "jiti";

/**
 * Loads `tiler.config.ts` (or .js / .mjs) from disk and returns the
 * resolved config. Uses jiti so the config can stay in TypeScript and
 * import workspace packages without a build step.
 */
export async function loadTilerConfig(configPath: string): Promise<ResolvedTilerConfig> {
  const absolute = resolve(process.cwd(), configPath);
  if (!existsSync(absolute)) {
    throw new Error(
      `Config not found at ${absolute}. Run \`tiler init\` to scaffold one.`,
    );
  }
  const jiti = createJiti(import.meta.url, { fsCache: false, moduleCache: false });
  const mod = (await jiti.import(absolute)) as
    | { default?: ResolvedTilerConfig }
    | ResolvedTilerConfig;
  // Default-export or whole-module shape — accept both so we don't force
  // a particular export style on consumers.
  const cfg = "default" in mod && mod.default ? mod.default : (mod as ResolvedTilerConfig);
  if (!cfg || typeof cfg !== "object" || !("store" in cfg)) {
    throw new Error(
      `Config at ${absolute} did not export a tiler config (missing \`store\`).`,
    );
  }
  return cfg;
}
