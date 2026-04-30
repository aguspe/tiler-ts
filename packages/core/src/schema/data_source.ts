import { z } from "zod";
import { Id, Iso, SafeColumn, Slug } from "./primitives";

export const SchemaField = z
  .object({
    key: SafeColumn,
    type: z.enum(["string", "integer", "float", "boolean", "datetime"]),
    label: z.string().optional(),
  })
  .strict();
export type SchemaField = z.infer<typeof SchemaField>;

export const IngestionMethod = z.enum(["webhook", "manual", "csv"]);
export type IngestionMethod = z.infer<typeof IngestionMethod>;

export const DataSource = z.object({
  id: Id,
  name: z.string().min(1).max(120),
  slug: Slug,
  description: z.string().nullable().default(null),
  schema_definition: z.array(SchemaField).default([]),
  ingestion_methods: z.array(IngestionMethod).min(1),
  /** bcrypt hash of the per-source token; null when no per-source override. */
  webhook_token: z.string().nullable(),
  active: z.boolean().default(true),
  created_at: Iso,
  updated_at: Iso,
});
export type DataSource = z.infer<typeof DataSource>;
