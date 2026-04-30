import { describe, expect, it } from "vitest";
import { Dashboard, DashboardSettings, ThemeTokens } from "./dashboard";

const NOW = "2026-04-30T12:00:00.000Z";

describe("ThemeTokens", () => {
  it("accepts a partial tokens object", () => {
    expect(ThemeTokens.safeParse({ page: "#000" }).success).toBe(true);
  });
  it("rejects unknown keys", () => {
    expect(ThemeTokens.safeParse({ foo: "#000" }).success).toBe(false);
  });
});

describe("DashboardSettings", () => {
  it("defaults tv_mode to false", () => {
    const result = DashboardSettings.parse({});
    expect(result.tv_mode).toBe(false);
  });
});

describe("Dashboard", () => {
  it("accepts a fully-formed dashboard", () => {
    const result = Dashboard.parse({
      id: "01HV3",
      name: "QA Cockpit",
      slug: "qa_cockpit",
      description: null,
      refresh_seconds: 60,
      settings: { tv_mode: false },
      created_at: NOW,
      updated_at: NOW,
    });
    expect(result.name).toBe("QA Cockpit");
  });
  it("rejects a non-slug slug", () => {
    expect(
      Dashboard.safeParse({
        id: "01HV3",
        name: "X",
        slug: "Has Spaces",
        description: null,
        refresh_seconds: 0,
        settings: { tv_mode: false },
        created_at: NOW,
        updated_at: NOW,
      }).success,
    ).toBe(false);
  });
  it("rejects a 121-char name", () => {
    expect(
      Dashboard.safeParse({
        id: "01HV3",
        name: "x".repeat(121),
        slug: "x",
        description: null,
        refresh_seconds: 0,
        settings: { tv_mode: false },
        created_at: NOW,
        updated_at: NOW,
      }).success,
    ).toBe(false);
  });
});
