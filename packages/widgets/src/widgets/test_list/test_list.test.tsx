import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestListWidget } from "./TestListWidget";
import { TestListExample } from "./example";
import { resolveTestList } from "./resolve";

describe("resolveTestList", () => {
  it("puts failures first, then skips, then passes", () => {
    const { panel, records } = TestListExample();
    const result = resolveTestList({ panel, records, now: new Date() });
    const statuses = result.resolved.map((r) => r.status);
    const firstNonFail = statuses.findIndex((s) => s !== "fail");
    const firstPass = statuses.findIndex((s) => s === "pass");
    if (firstNonFail !== -1 && firstPass !== -1) {
      expect(firstNonFail).toBeLessThanOrEqual(firstPass);
    }
  });

  it("within same status, sorts by duration_ms descending", () => {
    const { panel, records } = TestListExample();
    const result = resolveTestList({ panel, records, now: new Date() });
    const failures = result.resolved.filter((r) => r.status === "fail");
    for (let i = 1; i < failures.length; i++) {
      expect(failures[i - 1]!.duration_ms >= failures[i]!.duration_ms).toBe(true);
    }
  });

  it("respects limit", () => {
    const { panel, records } = TestListExample();
    const smallPanel = { ...panel, config: { limit: 3 } };
    const result = resolveTestList({ panel: smallPanel, records, now: new Date() });
    expect(result.resolved.length).toBeLessThanOrEqual(3);
  });

  it("extracts screenshot_data and error_message", () => {
    const { panel } = TestListExample();
    const now = "2026-04-30T12:00:00.000Z";
    const records = [
      {
        id: "x1",
        data_source_id: "ds-1",
        payload: {
          test_name: "boom",
          suite: "auth",
          status: "fail",
          duration_ms: 500,
          error_message: "AssertionError",
          screenshot_data: "data:image/png;base64,abc",
        },
        recorded_at: now,
        source_ref: null,
        ingested_via: "manual" as const,
        created_at: now,
      },
    ];
    const result = resolveTestList({ panel, records, now: new Date() });
    expect(result.resolved[0]?.error_message).toBe("AssertionError");
    expect(result.resolved[0]?.screenshot_data).toBe("data:image/png;base64,abc");
  });
});

describe("TestListWidget", () => {
  it("renders test names", () => {
    const { panel, records } = TestListExample();
    const data = resolveTestList({ panel, records, now: new Date() });
    render(<TestListWidget panel={panel} data={data} />);
    expect(screen.getByText(data.resolved[0]!.test_name)).toBeInTheDocument();
  });

  it("clicking a failed row expands it to show error_message", () => {
    const { panel } = TestListExample();
    const now = "2026-04-30T12:00:00.000Z";
    const records = [
      {
        id: "f1",
        data_source_id: "ds-1",
        payload: {
          test_name: "failing_test",
          suite: "checkout",
          status: "fail",
          duration_ms: 1200,
          error_message: "Element not found",
          screenshot_data: null,
        },
        recorded_at: now,
        source_ref: null,
        ingested_via: "manual" as const,
        created_at: now,
      },
    ];
    const data = resolveTestList({ panel, records, now: new Date() });
    render(<TestListWidget panel={panel} data={data} />);

    expect(screen.queryByText("Element not found")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("failing_test").closest("[data-testid='test-row-header']")!);
    expect(screen.getByText("Element not found")).toBeInTheDocument();
  });

  it("renders empty state when no records", () => {
    const { panel } = TestListExample();
    render(<TestListWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No test results.")).toBeInTheDocument();
  });

  it("clicking a screenshot thumbnail opens a fullscreen lightbox", () => {
    const { panel } = TestListExample();
    const now = "2026-04-30T12:00:00.000Z";
    const records = [
      {
        id: "f2",
        data_source_id: "ds-1",
        payload: {
          test_name: "broken_visuals",
          suite: "ui",
          status: "fail",
          duration_ms: 900,
          error_message: "snapshot mismatch",
          screenshot_data: "data:image/png;base64,zzz",
        },
        recorded_at: now,
        source_ref: null,
        ingested_via: "manual" as const,
        created_at: now,
      },
    ];
    const data = resolveTestList({ panel, records, now: new Date() });
    render(<TestListWidget panel={panel} data={data} />);

    fireEvent.click(screen.getByText("broken_visuals").closest("[data-testid='test-row-header']")!);
    expect(screen.queryByRole("dialog", { name: /screenshot preview/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("screenshot-thumb"));
    const dialog = screen.getByRole("dialog", { name: /screenshot preview/i });
    expect(dialog).toBeInTheDocument();
    const fullImage = dialog.querySelector("img");
    expect(fullImage?.getAttribute("src")).toBe("data:image/png;base64,zzz");

    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByRole("dialog", { name: /screenshot preview/i })).not.toBeInTheDocument();
  });
});
