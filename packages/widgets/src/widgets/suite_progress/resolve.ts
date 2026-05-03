import { type WidgetData, type WidgetResolverArgs, groupByColumn } from "@aguspe/tiler-core";
import { SuiteProgressConfig } from "./schema";

export interface SuiteProgressRow {
  suite: string;
  total: number;
  passed: number;
  pass_rate: number;
}

export type SuiteProgressResolved = SuiteProgressRow[];

export function resolveSuiteProgress({
  panel,
  records,
}: WidgetResolverArgs): WidgetData<SuiteProgressResolved> {
  SuiteProgressConfig.parse(panel.config);
  const groups = groupByColumn(records, "suite");
  const rows: SuiteProgressRow[] = groups
    .map(({ key, records: recs }) => {
      const total = recs.length;
      const passed = recs.filter((r) => r.payload.status === "pass").length;
      const pass_rate = total > 0 ? (passed / total) * 100 : 0;
      return { suite: key, total, passed, pass_rate };
    })
    .sort((a, b) => a.pass_rate - b.pass_rate);
  return { resolved: rows, empty: rows.length === 0 };
}
