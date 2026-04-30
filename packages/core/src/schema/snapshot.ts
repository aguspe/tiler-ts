import { z } from "zod";
import { Dashboard } from "./dashboard";
import { DataRecord } from "./data_record";
import { DataSource } from "./data_source";
import { Panel } from "./panel";
import { Iso } from "./primitives";

export const TilerSnapshot = z.object({
  version: z.literal(1),
  generated_at: Iso,
  dashboard: Dashboard,
  panels: z.array(Panel),
  data_sources: z.array(DataSource),
  records: z.array(DataRecord),
});
export type TilerSnapshot = z.infer<typeof TilerSnapshot>;
