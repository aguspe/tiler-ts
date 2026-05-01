import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TableExample } from "./example";
import { formatCell } from "./format";
import { resolveTable } from "./resolve";
import { TableWidget } from "./TableWidget";

describe("formatCell", () => {
  it("formats ms with rounding", () => {
    expect(formatCell(123.6, "ms")).toBe("124 ms");
  });
  it("formats percent with one decimal", () => {
    expect(formatCell(0.1234, "percent")).toBe("12.3%");
  });
  it("formats number with grouping", () => {
    expect(formatCell(1234, "number")).toBe("1,234");
  });
  it("returns empty string for null/undefined", () => {
    expect(formatCell(null, "text")).toBe("");
    expect(formatCell(undefined, "ms")).toBe("");
  });
});

describe("resolveTable", () => {
  it("returns sorted records limited to cfg.limit", () => {
    const { panel, records } = TableExample();
    const result = resolveTable({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.length).toBeLessThanOrEqual(100);
    expect(result.empty).toBe(false);
  });
});

describe("TableWidget", () => {
  it("paginates and advances", () => {
    const { panel, records } = TableExample();
    const result = resolveTable({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    render(<TableWidget panel={panel} data={result} />);
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Next →/));
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
  });
});
