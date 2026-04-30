import { z } from "zod";
import { Id, Iso } from "./primitives";

export const PanelConfig = z.record(z.unknown());
export type PanelConfig = z.infer<typeof PanelConfig>;

export const Panel = z.object({
  id: Id,
  dashboard_id: Id,
  data_source_id: Id.nullable(),
  title: z.string().min(1).max(200),
  widget_type: z.string().min(1),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  width: z.number().int().min(1).max(12),
  height: z.number().int().min(1).max(12),
  config: PanelConfig.default({}),
  created_at: Iso,
  updated_at: Iso,
});
export type Panel = z.infer<typeof Panel>;
