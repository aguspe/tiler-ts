import { describe, expect, it } from "vitest";
import { newId } from "./ulid";

describe("newId", () => {
  it("returns a 26-character ULID string", () => {
    const id = newId();
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("two consecutive calls produce sortable values", () => {
    const a = newId();
    const b = newId();
    expect(b > a).toBe(true);
  });

  it("returns 100 unique ids in a tight loop", () => {
    const ids = Array.from({ length: 100 }, () => newId());
    expect(new Set(ids).size).toBe(100);
  });
});
