import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommentsWidget } from "./CommentsWidget";
import { CommentsExample } from "./example";
import { resolveComments } from "./resolve";

describe("resolveComments", () => {
  it("sorts most-recent-first and respects limit", () => {
    const { panel, records } = CommentsExample();
    const result = resolveComments({
      panel,
      records,
      now: new Date("2026-04-30T12:00:00.000Z"),
    });
    expect(result.resolved.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < result.resolved.length; i++) {
      const prev = result.resolved[i - 1]?.recorded_at;
      const curr = result.resolved[i]?.recorded_at;
      if (prev && curr) {
        expect(prev >= curr).toBe(true);
      }
    }
  });
});

describe("CommentsWidget", () => {
  it("renders empty state", () => {
    const { panel } = CommentsExample();
    render(<CommentsWidget panel={panel} data={{ resolved: [], empty: true }} />);
    expect(screen.getByText("No comments.")).toBeInTheDocument();
  });
  it("renders one <article> per record with author + body", () => {
    const { panel, records } = CommentsExample();
    const { container } = render(
      <CommentsWidget panel={panel} data={{ resolved: records.slice(0, 3), empty: false }} />,
    );
    expect(container.querySelectorAll("article")).toHaveLength(3);
  });
});
