# `@aguspe/tiler-cli`

The `tiler` binary. Scaffolds projects, boots the server, and converts existing Playwright reports into ingestible records — one install instead of writing a `start.ts` by hand.

## Install

```bash
npm i -D @aguspe/tiler-cli
# or globally
npm i -g @aguspe/tiler-cli
```

## Commands

### `tiler init`

Scaffolds `tiler.config.ts` + `.env.example`.

```bash
npx tiler init                    # sqlite + port 4567
npx tiler init --store memory     # in-memory store, no sqlite
npx tiler init --port 5000        # change port
npx tiler init --force            # overwrite existing files
```

### `tiler serve`

Loads `tiler.config.ts` (TypeScript at runtime via jiti) and boots the Fastify server.

```bash
npx tiler serve                       # use config defaults
npx tiler serve --port 4569           # override port
npx tiler serve --host 0.0.0.0        # listen on all interfaces
npx tiler serve --config ./tiler.prod.ts
```

### `tiler doctor`

Diagnostics — Node version, resolved config path, store backend class, listening host:port, auth flags, registered widgets, configured presets. Exits non-zero on config load failure so it's CI-safe.

```bash
npx tiler doctor
```

### `tiler import-playwright-json`

Flatten a Playwright JSON report into ingest records.

```bash
# Write records to a JSON file
npx tiler import-playwright-json results.json --out records.json

# Or HMAC-sign and POST them to a running tiler server
npx tiler import-playwright-json results.json \
  --server http://localhost:4567 \
  --secret "$TILER_WEBHOOK_SECRET" \
  --source test_runs
```

## License

MIT — see [`LICENSE`](../../LICENSE).
