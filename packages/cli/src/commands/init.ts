import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import kleur from "kleur";

export interface InitOptions {
  force: boolean;
  /** sqlite | memory */
  store: string;
  port: number;
}

const SQLITE_CONFIG = (port: number): string => `import { defineConfig } from "@aguspe/tiler-core";
import { BetterSqliteStore } from "@aguspe/tiler-server/sqlite";

export default defineConfig({
  store: new BetterSqliteStore({ path: "./tiler.db" }),
  port: ${port},
  auth: {
    webhookSecret: process.env.TILER_WEBHOOK_SECRET,
  },
  widgets: ["@aguspe/tiler-widgets"],
  presets: ["test_automation"],
});
`;

const MEMORY_CONFIG = (
  port: number,
): string => `import { defineConfig, MemoryStore } from "@aguspe/tiler-core";

export default defineConfig({
  store: new MemoryStore(),
  port: ${port},
  widgets: ["@aguspe/tiler-widgets"],
});
`;

const ENV_EXAMPLE = `# Used to verify HMAC-signed webhook bodies. Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
TILER_WEBHOOK_SECRET=replace-me

# Optional: HTTP basic auth credentials for the editor UI.
# TILER_BASIC_USER=admin
# TILER_BASIC_PASS=replace-me
`;

/**
 * Scaffolds a fresh tiler project in the current directory. Writes
 * `tiler.config.ts` and `.env.example`. With `--force`, overwrites any
 * existing files; otherwise refuses to clobber.
 */
export async function initCommand(opts: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = resolve(cwd, "tiler.config.ts");
  const envPath = resolve(cwd, ".env.example");

  if (!opts.force) {
    for (const p of [configPath, envPath]) {
      if (existsSync(p)) {
        throw new Error(`Refusing to overwrite ${p}. Re-run with --force to clobber.`);
      }
    }
  }

  const configBody = opts.store === "memory" ? MEMORY_CONFIG(opts.port) : SQLITE_CONFIG(opts.port);

  writeFileSync(configPath, configBody, "utf8");
  writeFileSync(envPath, ENV_EXAMPLE, "utf8");

  process.stdout.write(
    [
      `${kleur.green("✓")} wrote ${kleur.cyan("tiler.config.ts")}`,
      `${kleur.green("✓")} wrote ${kleur.cyan(".env.example")}`,
      "",
      "Next steps:",
      `  ${kleur.dim("1.")} cp .env.example .env  ${kleur.dim("# fill in TILER_WEBHOOK_SECRET")}`,
      `  ${kleur.dim("2.")} ${kleur.cyan("npx tiler serve")}`,
      "",
    ].join("\n"),
  );
}
