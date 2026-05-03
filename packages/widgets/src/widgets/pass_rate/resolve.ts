import type { WidgetData, WidgetResolverArgs } from "@aguspe/tiler-core";
import { PassRateConfig } from "./schema";

export interface PassRateResolved {
  value: number;
  total: number;
  passed: number;
}

export function resolvePassRate({
  panel,
  records,
}: WidgetResolverArgs): WidgetData<PassRateResolved> {
  const cfg = PassRateConfig.parse(panel.config);
  const total = records.length;
  if (total === 0) {
    return { resolved: { value: 0, total: 0, passed: 0 }, empty: true };
  }
  const passed = records.filter((r) => r.payload[cfg.status_column] === cfg.pass_value).length;
  const value = (passed / total) * 100;
  return { resolved: { value, total, passed }, empty: false };
}
