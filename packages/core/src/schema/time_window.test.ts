import { describe, expect, it } from "vitest";
import { Bucket, DataBackedConfig, TimeWindow } from "./time_window";

describe("TimeWindow", () => {
  it.each(["1m", "5m", "15m", "1h", "4h", "24h", "7d", "30d", "all"])("accepts %s", (v) => {
    expect(TimeWindow.safeParse(v).success).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(TimeWindow.safeParse("2h").success).toBe(false);
  });
});

describe("Bucket", () => {
  it.each(["30s", "1m", "5m", "1h", "1d"])("accepts %s", (v) => {
    expect(Bucket.safeParse(v).success).toBe(true);
  });
});

describe("DataBackedConfig", () => {
  it("defaults aggregation to count and time_window to 24h", () => {
    const result = DataBackedConfig.parse({});
    expect(result.aggregation).toBe("count");
    expect(result.time_window).toBe("24h");
  });
  it("rejects an unsafe value_column", () => {
    expect(DataBackedConfig.safeParse({ value_column: "x;y" }).success).toBe(false);
  });
});
