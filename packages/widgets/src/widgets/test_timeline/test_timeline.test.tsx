import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestTimelineWidget } from "./TestTimelineWidget";
import { TestTimelineExample } from "./example";
import { resolveTestTimeline } from "./resolve";

describe("resolveTestTimeline", () => {
  it("sorts by duration_ms descending and respects limit", () => {
    const { panel, records } = TestTimelineExample();
    const result = resolveTestTimeline({ panel, records, now: new Date() });
    const durations = result.resolved.rows.map((r) => r.duration_ms);
    for (let i = 1; i < durations.length; i++) {
      expect(durations[i - 1]! >= durations[i]!).toBe(true);
    }
    expect(result.resolved.rows.length).toBeLessThanOrEqual(50);
  });

  it("sets max_duration_ms to the slowest test", () => {
    const { panel, records } = TestTimelineExample();
    const result = resolveTestTimeline({ panel, records, now: new Date() });
    expect(result.resolved.max_duration_ms).toBe(result.resolved.rows[0]?.duration_ms ?? 0);
  });

  it("returns empty=true with no records", () => {
    const { panel } = TestTimelineExample();
    const result = resolveTestTimeline({ panel, records: [], now: new Date() });
    expect(result.empty).toBe(true);
  });
});

describe("TestTimelineWidget", () => {
  it("renders empty state with no records", () => {
    const { panel } = TestTimelineExample();
    render(
      <TestTimelineWidget
        panel={panel}
        data={{ resolved: { rows: [], max_duration_ms: 0 }, empty: true }}
      />,
    );
    expect(screen.getByText("No test results.")).toBeInTheDocument();
  });

  it("renders a row per test result", () => {
    const { panel, records } = TestTimelineExample();
    const data = resolveTestTimeline({ panel, records, now: new Date() });
    render(<TestTimelineWidget panel={panel} data={data} />);
    expect(screen.getByText(data.resolved.rows[0]!.test_name)).toBeInTheDocument();
  });
});
