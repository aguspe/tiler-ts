# `@aguspe/tiler-widgets`

The 14 first-party widgets for tiler-ts plus the design-token CSS that styles them. Side-effect import to register the whole pack:

```ts
import "@aguspe/tiler-widgets";
import "@aguspe/tiler-widgets/styles/tokens.css";
```

## Widgets

| Type | Use it for |
|---|---|
| `clock` | A live clock — config picks 12h/24h, timezone, seconds. |
| `text` | Sanitized markdown. |
| `image` | URL → `<img>` with object-fit. |
| `iframe` | Embed any URL, fixed height, sandboxed. |
| `metric` | Single number from records (count/sum/avg/p95/min/max). |
| `number_with_delta` | A metric with a sparkline + WoW delta. |
| `meter` | Gauge dial against a min/max range. |
| `list` | Top-N rows from records by group. |
| `status_grid` | Pass/fail/warn cells, one per group key. |
| `comments` | Last N records as a comment feed. |
| `table` | Tabular records with column projection. |
| `line_chart`, `bar_chart`, `pie_chart` | Recharts wrappers. |

Every widget exposes the same shape:

```ts
defineWidget({
  meta,
  configSchema,        // zod
  resolve?,            // pre-render aggregation (optional for clock/text/...)
  component,           // React component
  example,             // self-contained { panel, records } for previews
});
```

## Tokens (Rails-parity design system)

`@aguspe/tiler-widgets/styles/tokens.css` ships the warm-paper light theme + a `[data-theme="dark"]` flip. Imports Space Grotesk, Inter, and JetBrains Mono from Google Fonts.

## Install

```bash
npm i @aguspe/tiler-widgets
```

## Storybook

```bash
pnpm --filter @aguspe/tiler-widgets storybook
```

## License

MIT — see [`LICENSE`](../../LICENSE).
