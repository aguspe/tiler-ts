import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface CopyClientAssetsInput {
  /** Absolute path to @aguspe/tiler-viewer's dist/client directory. */
  viewerClientDir: string;
  /** Absolute path to the report root. `assets/` is created inside it. */
  outDir: string;
}

export interface CopyClientAssetsOutput {
  /** Path relative to outDir, e.g. "assets/viewer-abc.js". */
  jsEntry: string;
  /** Path relative to outDir, e.g. "assets/viewer-abc.css". May be undefined. */
  cssEntry?: string;
}

export function copyClientAssets(input: CopyClientAssetsInput): CopyClientAssetsOutput {
  const assetsDir = join(input.outDir, "assets");
  mkdirSync(assetsDir, { recursive: true });

  let jsEntry: string | undefined;
  let cssEntry: string | undefined;

  for (const entry of readdirSync(input.viewerClientDir)) {
    const src = join(input.viewerClientDir, entry);
    if (!statSync(src).isFile()) continue;
    const dest = join(assetsDir, entry);
    copyFileSync(src, dest);
    const rel = `assets/${entry}`;
    if (entry.endsWith(".js") && !jsEntry) jsEntry = rel;
    if (entry.endsWith(".css") && !cssEntry) cssEntry = rel;
  }

  if (!jsEntry) {
    throw new Error(
      `[@aguspe/tiler-playwright] No JS bundle found in ${input.viewerClientDir}. Did you run \`pnpm --filter @aguspe/tiler-viewer build:client\`?`,
    );
  }
  return cssEntry ? { jsEntry, cssEntry } : { jsEntry };
}
