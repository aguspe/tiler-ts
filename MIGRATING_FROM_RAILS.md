# Migrating from Rails Tiler

`tiler-ts` is a TypeScript port of the [Rails `tiler` engine](https://github.com/aguspe/tiler). It keeps the design language and the widget set, but switches the runtime to Node + Fastify and the schema to first-class TypeScript types backed by Zod.

There is **no automated migration**. This guide walks you through the manual steps and calls out behavioral differences so you don't get surprised. An automated converter is a v1.1 candidate.

---

## Side-by-side cheat sheet

| Concern | Rails `tiler` | `tiler-ts` |
|---|---|---|
| Runtime | Rails 7 + sidekiq + redis | Node 20+ + Fastify 5 (single process) |
| Database | Postgres or sqlite via ActiveRecord | sqlite via better-sqlite3 (or any `TilerStore`) |
| Background jobs | Sidekiq | None — refresh loop runs in the same Node process |
| Auth | Devise / custom | HTTP basic auth + HMAC + pluggable `authorize` callback |
| Widget DSL | `Tiler::Widget` Ruby class + `*.html.erb` | `defineWidget()` + React component |
| Templates | ERB | React + JSX |
| Drag/drop | gridstack 10 + Stimulus | gridstack 11 + React |
| Real-time | Turbo Streams + ActionCable | WebSocket (`@fastify/websocket`) |
| Style | hand-rolled CSS in `app/assets/stylesheets/tiler/` | Same tokens, ported to `@aguspe/tiler-widgets/styles/tokens.css` |
| Liquid widgets | Settings → user-defined Liquid template | **Deferred to v1.1** |

---

## Step-by-step

### 1. Inventory what you actually use

Look at your Rails project and answer:

- Which **widgets** do you use? Anything beyond the 14 built-ins (clock, text, image, iframe, metric, number_with_delta, meter, list, status_grid, comments, table, line_chart, bar_chart, pie_chart) needs a port.
- Any **custom Ruby resolvers** (subclass of `Tiler::Resolver`)? Each becomes a `resolve()` function inside a `defineWidget()` call.
- Any **Liquid widgets**? Hold off — Liquid support lands in v1.1. Pin to Rails for those dashboards or rewrite them as proper React widgets.
- **Webhook signing secret** — keep it; the wire format is identical (HMAC-SHA256 over the raw body, header `X-Tiler-Signature`).

### 2. Export your data

There's no migration script today. You have a few options:

**Option A — manual JSON dump.** From Rails:

```ruby
data = {
  dashboards: Tiler::Dashboard.all.as_json,
  panels: Tiler::Panel.all.as_json,
  data_sources: Tiler::DataSource.all.as_json,
  records: Tiler::DataRecord.all.as_json,
}
File.write("tiler-export.json", data.to_json)
```

Then write a small importer that uses `@aguspe/tiler-core`'s `MemoryStore` or `BetterSqliteStore` to upsert each record. The schemas line up 1:1 except where called out in §3.

**Option B — start fresh.** If your dashboards are short-lived (test reports, one-off rollouts), just re-create them via the editor. It's faster than writing an importer.

**Option C — bridge.** Run both side by side. The Rails app stays canonical for legacy dashboards; new dashboards land in tiler-ts. The webhook secret and source slug match, so a single ingestion pipeline can fan out to both.

### 3. Schema differences

Most fields are identical. Notable shifts:

- **IDs are ULIDs** (string), not bigints. ULIDs sort by creation time and are URL-safe. If you have an existing Rails dataset, the importer needs to either preserve string IDs (set `id` explicitly on upsert) or re-generate them.
- **Timestamps are ISO 8601 strings**, not Ruby `Time` objects. ActiveRecord's default `to_json` already does this.
- **`schema_definition`** on `data_source` is now strongly typed: `{ key: string, type: "string" | "int" | "float" | "boolean" | "iso_date" }[]`. Loose Rails values may need normalizing.
- **`settings.tv_mode`** moved onto `dashboard.settings` (was a separate `dashboard.tv_mode` column in some Rails versions). The TypeScript schema enforces this nesting.
- **`Panel.config`** is `Record<string, unknown>`, validated per-widget by the widget's Zod schema. Rails' "anything goes" hashes still work, but config that doesn't match the widget's schema renders as `Invalid config — open this panel to fix it.` rather than crashing.

### 4. Custom widgets

A Ruby widget like:

```ruby
class Tiler::Widgets::FooWidget < Tiler::Widget
  config :threshold, default: 100
  def resolve(records)
    over = records.count { |r| r.payload["value"] > config[:threshold] }
    { count: over }
  end
end
```

becomes:

```ts
import { defineWidget } from "@aguspe/tiler-core";
import { z } from "zod";

const FooConfig = z.object({ threshold: z.number().default(100) });

defineWidget({
  meta: {
    type: "foo",
    label: "Foo",
    requires_data_source: true,
    default_size: { w: 3, h: 2 },
    min_size: { w: 1, h: 1 },
    max_size: { w: 12, h: 12 },
  },
  configSchema: FooConfig,
  resolve: ({ panel, records }) => {
    const cfg = FooConfig.parse(panel.config);
    const count = records.filter((r) => Number(r.payload.value) > cfg.threshold).length;
    return { resolved: { count }, empty: records.length === 0 };
  },
  component: ({ data }) => <span>{(data.resolved as any).count}</span>,
  example: () => ({ panel: /* ... */ as any, records: [] }),
});
```

Side-effect import the file at server boot:

```ts
import "@aguspe/tiler-widgets";
import "./widgets/foo"; // your custom widget
```

### 5. Webhook ingestion

The wire format is unchanged. If your Rails app already POSTs to `/ingest/:slug` with `X-Tiler-Signature: <hmac-sha256-hex>`, you can point that producer at the new server and it'll just work.

### 6. The editor's UX changes

A few things you'll notice that differ from Rails:

- **No save button.** The editor auto-saves on every change (600 ms debounce). Closing the tab won't lose work.
- **Drop preview.** Dragging a widget shows a richer cursor card and a dashed outline on the grid that snaps to the target cell.
- **Use example.** The drawer ships an `Use example` button that fills the title + config from the widget's canonical example so you can see a working preview before tweaking.
- **TV mode and dark mode are independent.** TV mode is kiosk display (hides chrome, fills viewport). Dark mode is `[data-theme="dark"]` on `<html>` and respects `prefers-color-scheme` on first load.

---

## What's not yet supported

- **Liquid widgets** — deferred to v1.1.
- **Multi-tenancy** — the server hosts one tenant. Run multiple processes if you need isolation.
- **Clustering / HA** — single-process Fastify; the WebSocket pub/sub and refresh loop assume one node.

If any of these are blockers, stay on Rails Tiler for now. The project ships a stable HTTP API surface, so you can always migrate dashboard-by-dashboard rather than all at once.
