# tiler-ts example: server-live

A standalone Node project demonstrating `@aguspe/tiler-server` with sqlite
persistence, the `test_automation` preset, 200 fake seeded records, and live
WebSocket updates.

## Run

```bash
pnpm install   # from monorepo root
pnpm --filter tiler-ts-example-server-live seed   # creates tiler.db with seeded data
pnpm --filter tiler-ts-example-server-live start  # binds localhost:4567
open http://localhost:4567/dashboards/test_automation
```

## Push a webhook event

The seed inserts records as `ingested_via: "manual"`. Push a webhook event
(signed with the dev secret) to see live diff push over WebSocket:

```bash
BODY='{"suite":"checkout","test_name":"manual","status":"fail","duration_ms":42}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "dev-secret-please-change" -hex | sed 's/^.*= //')
curl -sS -X POST http://localhost:4567/ingest/test_runs \
  -H "X-Tiler-Signature: sha256=$SIG" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

The dashboard's failures count and per-suite status grid update within the
refresh interval (default 60s; `refresh_seconds: 0` on the seeded dashboard
falls back to the manager's default).

## Reset

```bash
rm tiler.db tiler.db-* && pnpm seed
```
