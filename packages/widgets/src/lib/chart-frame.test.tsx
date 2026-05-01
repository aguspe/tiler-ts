import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartFrame } from "./ChartFrame";

describe("ChartFrame", () => {
  it("renders empty state", () => {
    render(
      <ChartFrame empty>
        <div>chart</div>
      </ChartFrame>,
    );
    expect(screen.getByText("No data in window.")).toBeInTheDocument();
  });
  it("renders children when not empty", () => {
    render(
      <ChartFrame empty={false}>
        <div data-testid="c">chart</div>
      </ChartFrame>,
    );
    expect(screen.getByTestId("c")).toBeInTheDocument();
  });
});
