import "@aguspe/tiler-widgets"; // register all widgets so resolvers run server-side
import { createServer } from "@aguspe/tiler-server";
import config from "./tiler.config";

async function main(): Promise<void> {
  const app = await createServer({
    store: config.store,
    auth: config.auth,
    logger: { level: "info" },
  });
  await app.listen({ host: config.host, port: config.port });
  console.log(`Tiler server listening at http://${config.host}:${config.port}`);
  console.log(`  Open: http://${config.host}:${config.port}/dashboards/test_automation`);
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
