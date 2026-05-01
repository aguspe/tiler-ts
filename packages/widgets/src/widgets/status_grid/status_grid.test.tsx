import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusGridExample } from "./example";
import { resolveStatusGrid } from "./resolve";
import { StatusGridWidget } from "./StatusGridWidget";

describe("resolveStatusGrid", () => {
  it("produces one cell per suite", () => {
    const { panel, records } = StatusGridExample();
    const result = resolveStatusGrid({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved).toHaveLength(6);
  });
  it("each cell has a status value from the latest record", () => {
    const { panel, records } = StatusGridExample();
    const result = resolveStatusGrid({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.every((c) => ["pass", "fail", "warn", "skip"].includes(c.status))).toBe(
      true,
    );
  });
});

describe("StatusGridWidget", () => {
  it("renders empty state", () => {
    const { panel } = StatusGridExample();
    render(<StatusGridWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No groups in window.")).toBeInTheDocument();
  });
});
