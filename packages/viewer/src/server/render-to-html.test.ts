import "@aguspe/tiler-widgets";
import { describe, expect, it } from "vitest";
import { renderToHtml } from "./render-to-html";

const NOW = "2026-04-30T12:00:00.000Z";
const SNAPSHOT = {
  version: 1 as const,
  generated_at: NOW,
  dashboard: {
    id: "d",
    name: "QA",
    slug: "qa",
    description: null,
    refresh_seconds: 0,
    settings: { tv_mode: false },
    created_at: NOW,
    updated_at: NOW,
  },
  panels: [],
  data_sources: [],
  records: [],
  resolved: {},
};

describe("renderToHtml", () => {
  it("returns a full HTML document with the dashboard name in the title", () => {
    const html = renderToHtml(SNAPSHOT, { clientAssetPath: "./assets/viewer-abc.js" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>QA — tiler-ts</title>");
  });

  it("embeds the snapshot as a JSON script tag with valid JSON", () => {
    const html = renderToHtml(SNAPSHOT, { clientAssetPath: "./assets/viewer-abc.js" });
    expect(html).toContain('<script id="tiler-snapshot" type="application/json">');
    const match = html.match(/<script id="tiler-snapshot"[^>]*>([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    expect(() => JSON.parse(match?.[1] ?? "")).not.toThrow();
  });

  it("links the client bundle and CSS via the asset paths", () => {
    const html = renderToHtml(SNAPSHOT, {
      clientAssetPath: "./assets/viewer-abc.js",
      cssAssetPath: "./assets/viewer-abc.css",
    });
    expect(html).toContain('src="./assets/viewer-abc.js"');
    expect(html).toContain('href="./assets/viewer-abc.css"');
  });

  it("escapes </script> in the embedded snapshot", () => {
    const malicious = {
      ...SNAPSHOT,
      dashboard: { ...SNAPSHOT.dashboard, name: "</script><script>alert(1)</script>" },
    };
    const html = renderToHtml(malicious, { clientAssetPath: "./viewer.js" });
    const match = html.match(/<script id="tiler-snapshot"[^>]*>([\s\S]*?)<\/script>/);
    expect(match?.[1]).not.toMatch(/<\/script/i);
  });
});
