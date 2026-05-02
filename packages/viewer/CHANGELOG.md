# @aguspe/tiler-viewer

## 1.0.3

### Patch Changes

- fix(viewer): inline panel layout styles so static reports don't need editor.css

  The panel layout (`height: 100%; display: flex; flex-direction: column`)
  lived only in `editor.css`, which the static viewer never ships. The
  result was a panel that collapsed to its header height in static
  reports — Recharts then mounted into a zero-height body and the pie /
  line / bar charts stayed invisible.

  Layout styles are now inlined on `TilerWidgetTile` via the `style`
  prop. Visual tokens (colors, fonts, hairlines) still come from
  `@aguspe/tiler-widgets/styles/tokens.css`, which the reporter does
  ship.

## 1.0.2

### Patch Changes

- fix(widgets/clock): defer time render to client to avoid SSR hydration
  mismatch.

  The clock widget was reading `new Date()` during server render, so a
  report SSR'd at 14:43 mismatched the client's current time at view
  time. React 18 marks the whole tree as needing a full re-render on
  that first mismatch, which broke Recharts' measurement-dependent
  mounts and left the pie / line charts blank in static reports.

  The clock now SSRs as a `--:--` placeholder and populates from
  `useEffect`. Bumps every consuming package because the widget bundle
  ships with each.

- Updated dependencies
  - @aguspe/tiler-widgets@1.0.2

## 1.0.1

### Patch Changes

- fix(viewer): stretch panel wrappers so charts have a measurable height

  The static viewer rendered each panel inside a plain `<div>` whose
  `display: block` content-sized to its child. Recharts'
  `ResponsiveContainer` then mounted into a near-zero-height box and
  the pie/line charts stayed invisible. The wrapper now uses
  `display: flex; flex-direction: column` so descendants with
  `height: 100%` measure against the full grid-cell height.

  Bumping `@aguspe/tiler-playwright` too because its generated HTML
  embeds the viewer's SSR output.

## 1.0.0

### Major Changes

- First stable release. See `CHANGELOG.md` at the repo root for the full
  v0.x → v1.0 narrative; the package-level READMEs cover what each one
  does and how to install it.

  Highlights:

  - Schema-first core with a pluggable `TilerStore` interface and
    `defineWidget()` for third-party widgets.
  - 14 first-party widgets and the design-token CSS.
  - Read-only viewer with SSR + hydration.
  - Live Fastify server with sqlite, HMAC ingestion, manual entry / CSV
    import, and a WebSocket refresh loop.
  - Drag-and-drop editor with auto-save, undo/redo, TV mode, dark mode,
    and a live drawer preview.
  - Playwright reporter that emits a static dashboard.
  - `tiler` CLI binary (`init` / `serve` / `doctor` /
    `import-playwright-json`).

### Patch Changes

- Updated dependencies
  - @aguspe/tiler-core@1.0.0
  - @aguspe/tiler-widgets@1.0.0
