import type { ComponentType } from "react";
import type { ZodTypeAny } from "zod";
import type { DataRecord } from "./schema/data_record";
import type { Panel } from "./schema/panel";

export interface WidgetSize {
  w: number;
  h: number;
}

export interface WidgetMeta {
  type: string;
  label: string;
  description?: string;
  icon?: string | { url: string };
  requires_data_source: boolean;
  default_size: WidgetSize;
  min_size: WidgetSize;
  max_size: WidgetSize;
}

export interface WidgetData<TResolved = unknown> {
  resolved: TResolved;
  empty: boolean;
}

export interface WidgetResolverArgs {
  panel: Panel;
  records: DataRecord[];
  now: Date;
}

export type WidgetResolver<TResolved> = (
  args: WidgetResolverArgs,
) => Promise<WidgetData<TResolved>> | WidgetData<TResolved>;

export interface WidgetDefinition<TConfig extends ZodTypeAny = ZodTypeAny, TResolved = unknown> {
  meta: WidgetMeta;
  configSchema: TConfig;
  resolve?: WidgetResolver<TResolved>;
  component: ComponentType<{ panel: Panel; data: WidgetData<TResolved> }>;
  example: () => { panel: Panel; records: DataRecord[] };
}
