# tiler-ts example: playwright-static

A minimal Playwright project demonstrating the `@aguspe/tiler-playwright` reporter.

## Run

```bash
pnpm install   # from monorepo root
pnpm --filter tiler-ts-example-playwright-static exec playwright install chromium
pnpm --filter tiler-ts-example-playwright-static demo
open tiler-report/index.html
```

Three of the four tests pass; one intentionally fails so the dashboard has
data to show in failure-related panels.
