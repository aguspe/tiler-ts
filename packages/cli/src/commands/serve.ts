import { createServer } from "@aguspe/tiler-server";
import kleur from "kleur";
import { loadTilerConfig } from "../loadConfig";

export interface ServeOptions {
  configPath: string;
  /** Override config.port. */
  port?: number;
  /** Override config.host. */
  host?: string;
}

/**
 * Loads `tiler.config.ts`, hands it to `createServer`, and starts
 * listening. CLI flags (`--port`, `--host`) override the config so a
 * developer can quickly bind to a non-default port without touching
 * the file.
 */
export async function serveCommand(opts: ServeOptions): Promise<void> {
  const cfg = await loadTilerConfig(opts.configPath);
  const port = opts.port ?? cfg.port;
  const host = opts.host ?? cfg.host;

  const app = await createServer({
    store: cfg.store,
    auth: cfg.auth,
    logger: { level: "info" },
  });
  await app.listen({ host, port });

  const url = `http://${host}:${port}`;
  process.stdout.write(
    [
      "",
      `${kleur.green("✓")} tiler is up at ${kleur.cyan(url)}`,
      `  open ${kleur.cyan(`${url}/dashboards`)} to see your dashboards`,
      "",
    ].join("\n"),
  );

  // Keep the process alive while Fastify runs. SIGINT/SIGTERM is the
  // user's job — Fastify handles it via `app.close()` on shutdown.
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      void app.close().then(() => process.exit(0));
    });
  }
}
