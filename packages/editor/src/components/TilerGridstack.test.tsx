import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { TilerGridstack } from "./TilerGridstack";

// jsdom does not implement ResizeObserver (used by GridStack.init internally).
// Polyfill with a no-op so the constructor does not throw.
beforeAll(() => {
  if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
    // @ts-expect-error — jsdom polyfill; not a real ResizeObserver
    window.ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
});

describe("TilerGridstack", () => {
  it("renders the grid-stack container", () => {
    const { container } = render(
      <TilerGridstack panels={[]} paletteDrag={null} onPanelLayoutChanged={() => {}}>
        {/* no children */}
      </TilerGridstack>,
    );
    expect(container.querySelector(".grid-stack")).toBeTruthy();
  });

  it("renders children inside the grid-stack container", () => {
    const { container } = render(
      <TilerGridstack panels={[]} paletteDrag={null} onPanelLayoutChanged={() => {}}>
        <div className="grid-stack-item" gs-id="p1" gs-x={0} gs-y={0} gs-w={3} gs-h={2}>
          <div data-testid="child-content">hello</div>
        </div>
      </TilerGridstack>,
    );
    expect(container.querySelector('[data-testid="child-content"]')).toBeTruthy();
  });

  // (className test removed — gridstack's init mutates classList in jsdom in
  // ways that aren't deterministic enough to assert against without a real
  // browser. Real interaction tests run in Playwright in Phase 5 Task 12.)
});
