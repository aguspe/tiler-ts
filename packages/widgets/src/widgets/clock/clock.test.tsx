import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClockWidget } from "./ClockWidget";
import { ClockExample } from "./example";

afterEach(() => vi.useRealTimers());

describe("ClockWidget", () => {
  it("renders 24h time when configured", () => {
    vi.setSystemTime(new Date("2026-04-30T13:42:30.000Z"));
    const { panel } = ClockExample();
    const { container } = render(
      <ClockWidget
        panel={{ ...panel, config: { format: "24h", timezone: "UTC", show_seconds: false } }}
        data={{ resolved: null, empty: false }}
      />,
    );
    const time = container.querySelector("time");
    expect(time?.textContent).toBe("13:42");
  });

  it("renders 12h time with am/pm", () => {
    vi.setSystemTime(new Date("2026-04-30T13:42:30.000Z"));
    const { panel } = ClockExample();
    const { container } = render(
      <ClockWidget
        panel={{ ...panel, config: { format: "12h", timezone: "UTC", show_seconds: false } }}
        data={{ resolved: null, empty: false }}
      />,
    );
    const time = container.querySelector("time");
    expect(time?.textContent).toMatch(/1:42\s?PM/i);
  });

  it("includes seconds when show_seconds=true", () => {
    vi.setSystemTime(new Date("2026-04-30T13:42:30.000Z"));
    const { panel } = ClockExample();
    const { container } = render(
      <ClockWidget
        panel={{ ...panel, config: { format: "24h", timezone: "UTC", show_seconds: true } }}
        data={{ resolved: null, empty: false }}
      />,
    );
    const time = container.querySelector("time");
    expect(time?.textContent).toBe("13:42:30");
  });
});
