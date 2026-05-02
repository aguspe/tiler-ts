import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Resets the e2e SQLite db and re-runs the example server's seed before
 * Playwright boots its webServer. This guarantees every CI run sees the
 * same dashboard state — without it, tests would inherit panels from
 * earlier interactive runs and snapshot diffs would never converge.
 */
export default async function globalSetup(): Promise<void> {
  const serverDir = resolve(import.meta.dirname, "../server-live");
  const dbPath = resolve(serverDir, "tiler-e2e.db");
  // SQLite leaves -shm and -wal sidecars; remove them too or the next
  // seed run gets SQLITE_IOERR_SHORT_READ from the stale WAL.
  for (const p of [dbPath, `${dbPath}-shm`, `${dbPath}-wal`]) {
    if (existsSync(p)) rmSync(p, { force: true });
  }

  const result = spawnSync("pnpm", ["--silent", "exec", "tsx", "seed.ts"], {
    cwd: serverDir,
    env: { ...process.env, TILER_DB_PATH: dbPath },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`e2e seed failed with exit code ${result.status}`);
  }
}
