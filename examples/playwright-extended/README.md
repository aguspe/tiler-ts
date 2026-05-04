# tiler-playwright extended example

Demonstrates extending the Tiler Playwright reporter with:

- A custom `flaky_tests` widget (registered via `defineWidget`).
- An extra panel placed below the preset's 8 panels.
- A `coverage` data source populated by an async `collect()` hook
  reading `coverage.json` at end-of-run.
- Removing a preset panel (`Pass Rate`) via `excludePanels`.

Run:

```bash
pnpm --filter tiler-ts-example-playwright-extended demo
```

Then open `tiler-report/index.html`.
