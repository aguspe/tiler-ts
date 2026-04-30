import { z } from "zod";
import { IngestionMethod } from "./data_source";
import { Id, Iso } from "./primitives";

export const DataRecord = z.object({
  id: Id,
  data_source_id: Id,
  payload: z.record(z.unknown()),
  recorded_at: Iso,
  source_ref: z.string().nullable().default(null),
  ingested_via: IngestionMethod,
  created_at: Iso,
});
export type DataRecord = z.infer<typeof DataRecord>;
