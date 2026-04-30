import type { Panel } from "@aguspe/tiler-core";

const DEFAULT_PALETTE = [
  "var(--tiler-color-accent)",
  "var(--tiler-color-pass)",
  "var(--tiler-color-warn)",
  "var(--tiler-color-fail)",
  "var(--tiler-color-skip)",
];

export function chartColors(panel: Panel, override?: string[]): string[] {
  const cfg = panel.config as { color?: string; palette?: string[] };
  if (cfg.palette?.length) return cfg.palette;
  if (cfg.color) return [cfg.color];
  return override ?? DEFAULT_PALETTE;
}
