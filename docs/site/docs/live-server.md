---
title: Live server
sidebar_position: 3
---

Run `tiler-ts` as a long-running Fastify server so test runs accumulate over time, dashboards stay editable, and TVs in the office can subscribe to live updates over WebSocket.

## One-time setup

```bash
mkdir my-tiler-app && cd my-tiler-app
npm init -y
npm i @aguspe/tiler-server @aguspe/tiler-core @aguspe/tiler-widgets
npm i -D @aguspe/tiler-cli
npx tiler init
```

`tiler init` writes:

```
my-tiler-app/
├── tiler.config.ts     ← sqlite store, port 4567, webhook secret
└── .env.example        ← template — copy to .env and fill the secret
```

Generate a webhook secret and copy the env file:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
cp .env.example .env
# paste the secret as TILER_WEBHOOK_SECRET in .env
```

## Boot

```bash
npx tiler serve
# ✓ tiler is up at http://127.0.0.1:4567
#   open http://127.0.0.1:4567/dashboards
```

The first request seeds the `test_automation` dashboard and data source if they don't exist yet.

## Wire Playwright into it

You have two production-ready paths:

### Path A — webhook from a custom reporter

Write a tiny custom reporter that POSTs each test result to `/ingest/test_runs` with an HMAC signature. The reporter is just an `onTestEnd` hook + `fetch`. Keep your existing reporters untouched.

```ts title="reporters/tiler-webhook.ts"
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { createHmac } from "node:crypto";

const SERVER = process.env.TILER_SERVER ?? "http://localhost:4567";
const SECRET = process.env.TILER_WEBHOOK_SECRET!;

export default class TilerWebhookReporter implements Reporter {
  async onTestEnd(test: TestCase, result: TestResult) {
    const body = JSON.stringify({
      records: [
        {
          payload: {
            suite: test.parent.titlePath().slice(1).join(" > "),
            test_name: test.title,
            status: result.status,
            duration_ms: result.duration,
            environment: process.env.PW_ENV ?? "ci",
          },
          recorded_at: new Date().toISOString(),
        },
      ],
    });
    const signature = createHmac("sha256", SECRET).update(body).digest("hex");
    await fetch(`${SERVER}/ingest/test_runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tiler-signature": signature,
      },
      body,
    });
  }
}
```

```ts title="playwright.config.ts"
export default defineConfig({
  reporter: [
    ["html", { open: "never" }],
    ["./reporters/tiler-webhook.ts"],
  ],
});
```

Records stream into the server one-at-a-time as tests finish. The dashboard's WebSocket pushes the resolver-diff to any open browser, so the TV updates as each suite completes.

### Path B — convert JSON post-run

Keep the default Playwright JSON reporter, then run [`tiler import-playwright-json`](./cli-import.md) once per run to bulk-ingest. Simpler, but no live updates during the run.

```ts title="playwright.config.ts"
export default defineConfig({
  reporter: [["json", { outputFile: "playwright-report.json" }]],
});
```

```bash
npx playwright test
npx tiler import-playwright-json playwright-report.json \
  --server http://localhost:4567 \
  --secret "$TILER_WEBHOOK_SECRET"
```

## Editing the dashboard

Open `http://localhost:4567/dashboards/test_automation`. The drag-and-drop editor lets you:

- **Drop new widgets** from the right-side palette (auto-prefilled from each widget's example).
- **Edit configs** in the slide-over drawer with a live preview pane.
- **Resize** any panel from any edge or corner.
- **Auto-save** on every change — no save button.
- **Toggle TV mode** to hide the chrome for a fullscreen kiosk display.
- **Toggle dark mode** independently of TV mode.

If you have a TV mounted in the office, point it at `/dashboards/test_automation`, click TV. The WebSocket subscription means it updates as new test runs come in — no polling, no refresh.

## Production checklist

- Set `TILER_WEBHOOK_SECRET` to a strong random value (`crypto.randomBytes(32)`).
- Add HTTP basic auth via `tiler.config.ts` if the server is exposed publicly:

```ts
auth: {
  basic: { user: "admin", pass: process.env.TILER_PASS },
  webhookSecret: process.env.TILER_WEBHOOK_SECRET,
},
```

- Back up `tiler.db` (just sqlite) on a schedule.
- For HA, run a primary + read replicas off a shared PG store. (PG adapter is post-v1.)
