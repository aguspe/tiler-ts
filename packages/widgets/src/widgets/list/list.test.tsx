import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListWidget } from "./ListWidget";
import { ListExample } from "./example";
import { resolveList } from "./resolve";

describe("resolveList", () => {
  it("filters to status=fail and limits to 10", () => {
    const { panel, records } = ListExample();
    const result = resolveList({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.length).toBeLessThanOrEqual(10);
    expect(result.resolved.every((r) => r.payload.status === "fail")).toBe(true);
  });
});

describe("ListWidget", () => {
  it("renders empty-state text when empty", () => {
    const { panel } = ListExample();
    render(<ListWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No records.")).toBeInTheDocument();
  });
});
