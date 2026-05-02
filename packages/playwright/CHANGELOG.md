# @aguspe/tiler-playwright

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
  - @aguspe/tiler-viewer@1.0.0
