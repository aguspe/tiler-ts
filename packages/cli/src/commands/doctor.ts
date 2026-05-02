import { resolve } from "node:path";
import { type ResolvedTilerConfig, listWidgets } from "@aguspe/tiler-core";
import kleur from "kleur";
import { loadTilerConfig } from "../loadConfig";

export interface DoctorOptions {
  configPath: string;
}

/**
 * Diagnostics. Prints what tiler thinks the world looks like — Node
 * version, resolved config path, store backend class, listening
 * host:port, auth flags, and the registered widgets — so a user can
 * eyeball whether their setup matches expectations before booting the
 * server.
 *
 * Exits non-zero on config load failure so it's safe to chain in CI.
 */
export async function doctorCommand(opts: DoctorOptions): Promise<void> {
  const out = process.stdout;
  out.write(`\n${kleur.bold("tiler doctor")}\n`);

  out.write(
    `  ${kleur.dim("node       ")}${process.version} (${process.platform} ${process.arch})\n`,
  );

  const absolute = resolve(process.cwd(), opts.configPath);
  out.write(`  ${kleur.dim("config     ")}${absolute}\n`);

  let cfg: ResolvedTilerConfig;
  try {
    cfg = await loadTilerConfig(opts.configPath);
  } catch (err) {
    out.write(
      `  ${kleur.red("✘ config   ")}${err instanceof Error ? err.message : String(err)}\n\n`,
    );
    process.exitCode = 1;
    return;
  }

  out.write(`  ${kleur.dim("store      ")}${cfg.store.constructor.name}\n`);
  out.write(`  ${kleur.dim("listening  ")}${cfg.host}:${cfg.port}\n`);

  const auth = cfg.auth;
  const flags: string[] = [];
  if ("basic" in auth && auth.basic) flags.push("basic");
  if ("hmac" in auth && auth.hmac) flags.push("hmac");
  if ("webhookSecret" in auth && auth.webhookSecret) flags.push("webhookSecret");
  if ("custom" in auth && auth.custom) flags.push("custom");
  out.write(
    `  ${kleur.dim("auth       ")}${flags.length === 0 ? "none (open)" : flags.join(" + ")}\n`,
  );

  const widgets = listWidgets();
  out.write(
    `  ${kleur.dim("widgets    ")}${widgets.length} registered (${widgets.map((w) => w.meta.type).join(", ")})\n`,
  );

  out.write(
    `  ${kleur.dim("presets    ")}${cfg.presets.length === 0 ? "none" : cfg.presets.join(", ")}\n\n`,
  );

  out.write(`${kleur.green("✓")} ready to ${kleur.cyan("tiler serve")}\n\n`);
}
