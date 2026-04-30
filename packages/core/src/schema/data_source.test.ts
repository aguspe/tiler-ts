import { describe, expect, it } from "vitest";
import { DataSource, IngestionMethod, SchemaField } from "./data_source";

const NOW = "2026-04-30T12:00:00.000Z";

describe("SchemaField", () => {
  it("accepts a typed field", () => {
    expect(SchemaField.safeParse({ key: "duration_ms", type: "float" }).success).toBe(true);
  });
  it("rejects an unsafe column name", () => {
    expect(SchemaField.safeParse({ key: "x;y", type: "string" }).success).toBe(false);
  });
});

describe("IngestionMethod", () => {
  it.each(["webhook", "manual", "csv"])("accepts %s", (m) => {
    expect(IngestionMethod.safeParse(m).success).toBe(true);
  });
  it("rejects unknown methods", () => {
    expect(IngestionMethod.safeParse("ftp").success).toBe(false);
  });
});

describe("DataSource", () => {
  it("requires at least one ingestion method", () => {
    expect(
      DataSource.safeParse({
        id: "01HV3",
        name: "Test Runs",
        slug: "test_runs",
        description: null,
        schema_definition: [],
        ingestion_methods: [],
        webhook_token: null,
        active: true,
        created_at: NOW,
        updated_at: NOW,
      }).success,
    ).toBe(false);
  });
  it("accepts a valid source", () => {
    const result = DataSource.parse({
      id: "01HV3",
      name: "Test Runs",
      slug: "test_runs",
      description: null,
      schema_definition: [{ key: "status", type: "string" }],
      ingestion_methods: ["webhook"],
      webhook_token: null,
      active: true,
      created_at: NOW,
      updated_at: NOW,
    });
    expect(result.slug).toBe("test_runs");
  });
});
