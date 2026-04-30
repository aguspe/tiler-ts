import { describe, expect, it } from "vitest";
import { Id, Iso, SafeColumn, Slug } from "./primitives";

describe("Id", () => {
  it("accepts a non-empty string", () => {
    expect(Id.safeParse("01HV3...").success).toBe(true);
  });
  it("rejects an empty string", () => {
    expect(Id.safeParse("").success).toBe(false);
  });
});

describe("Slug", () => {
  it.each(["foo", "foo-bar", "foo_bar", "foo123"])("accepts %s", (value) => {
    expect(Slug.safeParse(value).success).toBe(true);
  });
  it.each(["Foo", "foo bar", "foo!", ""])("rejects %s", (value) => {
    expect(Slug.safeParse(value).success).toBe(false);
  });
});

describe("Iso", () => {
  it("accepts a UTC ISO-8601 timestamp", () => {
    expect(Iso.safeParse("2026-04-30T12:34:56.000Z").success).toBe(true);
  });
  it("rejects a non-ISO string", () => {
    expect(Iso.safeParse("2026-04-30 12:34:56").success).toBe(false);
  });
});

describe("SafeColumn", () => {
  it.each(["status", "duration_ms", "Suite1"])("accepts %s", (value) => {
    expect(SafeColumn.safeParse(value).success).toBe(true);
  });
  it.each(["status; DROP TABLE", "1+1", "col-name", "col name"])("rejects %s", (value) => {
    expect(SafeColumn.safeParse(value).success).toBe(false);
  });
});
