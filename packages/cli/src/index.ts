import { Command } from "commander";
import { doctorCommand } from "./commands/doctor";
import { importPlaywrightJsonCommand } from "./commands/import-playwright-json";
import { initCommand } from "./commands/init";
import { serveCommand } from "./commands/serve";

/** CLI entry — parses argv and dispatches to the right subcommand. */
export async function run(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("tiler")
    .description("CLI for tiler-ts: scaffold projects, run the server, import data.")
    .version("0.0.1");

  program
    .command("init")
    .description("Scaffold tiler.config.ts and .env.example in the current directory.")
    .option("-f, --force", "Overwrite existing files")
    .option("--store <kind>", "Store backend: sqlite or memory", "sqlite")
    .option("--port <port>", "Server port", "4567")
    .action(async (opts) => {
      await initCommand({
        force: Boolean(opts.force),
        store: opts.store,
        port: Number(opts.port),
      });
    });

  program
    .command("serve")
    .description("Boot the Fastify server using tiler.config.ts in the current directory.")
    .option("-c, --config <path>", "Path to tiler.config.ts", "./tiler.config.ts")
    .option("-p, --port <port>", "Override the configured port")
    .option("-h, --host <host>", "Override the configured host")
    .action(async (opts) => {
      await serveCommand({
        configPath: opts.config,
        ...(opts.port !== undefined && { port: Number(opts.port) }),
        ...(opts.host !== undefined && { host: String(opts.host) }),
      });
    });

  program
    .command("doctor")
    .description("Print diagnostics: Node version, config validation, store backend, widgets.")
    .option("-c, --config <path>", "Path to tiler.config.ts", "./tiler.config.ts")
    .action(async (opts) => {
      await doctorCommand({ configPath: opts.config });
    });

  program
    .command("import-playwright-json <file>")
    .description("Convert a Playwright JSON report into tiler ingestion records.")
    .option("--out <path>", "Write records to a JSON file instead of POSTing")
    .option("--server <url>", "Tiler server URL (e.g. http://localhost:4567)")
    .option("--source <slug>", "Data source slug to ingest into", "test_runs")
    .option("--secret <secret>", "HMAC webhook secret (env: TILER_WEBHOOK_SECRET)")
    .action(async (file: string, opts) => {
      await importPlaywrightJsonCommand({
        file,
        ...(opts.out !== undefined && { out: String(opts.out) }),
        ...(opts.server !== undefined && { server: String(opts.server) }),
        sourceSlug: String(opts.source),
        secret: opts.secret ?? process.env.TILER_WEBHOOK_SECRET,
      });
    });

  await program.parseAsync(argv);
}
