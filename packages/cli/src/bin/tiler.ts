#!/usr/bin/env node
import { run } from "../index";

void run(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`tiler: ${msg}\n`);
  process.exit(1);
});
