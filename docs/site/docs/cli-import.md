---
title: "CLI: import-playwright-json"
sidebar_position: 4
---

`tiler import-playwright-json` is a bridge: take an existing Playwright JSON report and turn it into either a JSON file of ingest records or a stream of HMAC-signed POSTs to a running tiler server. Use it when you want to keep Playwright's default reporter and fan results out to tiler without writing custom reporter code.

## Install

```bash
npm i -D @aguspe/tiler-cli
```

## Generate the JSON report

Configure Playwright's JSON reporter to write somewhere predictable:

```ts title="playwright.config.ts"
export default defineConfig({
  reporter: [["json", { outputFile: "playwright-report.json" }]],
});
```

Run the suite:

```bash
npx playwright test
```

## Two output modes

### Write records to a file

```bash
npx tiler import-playwright-json playwright-report.json \
  --out tiler-records.json
```

Useful for inspection, snapshot testing, or piping into a custom ingestion pipeline.

The file is a JSON array of records:

```json
[
  {
    "payload": {
      "suite": "checkout",
      "test_name": "creates an order",
      "status": "passed",
      "duration_ms": 1234,
      "environment": "playwright"
    },
    "recorded_at": "2026-05-02T10:13:42.011Z"
  }
]
```

### POST to a running server

```bash
npx tiler import-playwright-json playwright-report.json \
  --server http://localhost:4567 \
  --secret "$TILER_WEBHOOK_SECRET" \
  --source test_runs
```

The CLI HMAC-signs the body with `--secret` (or `TILER_WEBHOOK_SECRET` from env) and POSTs to `/ingest/<source>`. Same wire format the live-server flow uses.

## Flag reference

| Flag | Default | Notes |
|---|---|---|
| `--out <path>` | — | Write records to a JSON file. Mutually exclusive with `--server` (you can pass both). |
| `--server <url>` | — | Tiler server URL. Implies HMAC POST. |
| `--secret <secret>` | `$TILER_WEBHOOK_SECRET` | HMAC-SHA256 secret. |
| `--source <slug>` | `test_runs` | Data source slug to ingest into. Match the slug your panels reference. |

## Suggested CI step

```yaml title=".github/workflows/test.yml"
- run: npx playwright test --reporter=json
- name: Push to tiler
  if: always()              # report failures too
  env:
    TILER_WEBHOOK_SECRET: ${{ secrets.TILER_WEBHOOK_SECRET }}
  run: |
    npx tiler import-playwright-json playwright-report.json \
      --server https://tiler.example.com \
      --source test_runs
```

The `if: always()` matters — you want to ingest failed runs too so the dashboard's failure trend isn't blank when the build is broken.
