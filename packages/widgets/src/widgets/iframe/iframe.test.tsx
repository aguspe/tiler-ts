import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IframeExample } from "./example";
import { IframeWidget } from "./IframeWidget";
import { IframeConfig, SANDBOX_ALLOWLIST } from "./schema";

describe("IframeConfig", () => {
  it("accepts an https URL with default sandbox", () => {
    expect(IframeConfig.safeParse({ url: "https://x.com" }).success).toBe(true);
  });
  it("rejects javascript: URLs", () => {
    expect(IframeConfig.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
  });
  it("rejects sandbox tokens outside the allowlist", () => {
    expect(
      IframeConfig.safeParse({ url: "https://x.com", sandbox: ["allow-top-navigation"] }).success,
    ).toBe(false);
  });
  it("accepts allowlisted sandbox tokens", () => {
    expect(
      IframeConfig.safeParse({
        url: "https://x.com",
        sandbox: ["allow-forms", "allow-scripts"],
      }).success,
    ).toBe(true);
  });
  it("allowlist excludes top-navigation and modals", () => {
    expect(SANDBOX_ALLOWLIST).not.toContain("allow-top-navigation");
    expect(SANDBOX_ALLOWLIST).not.toContain("allow-modals");
  });
});

describe("IframeWidget", () => {
  it("renders an iframe with the sandbox tokens joined", () => {
    const { panel } = IframeExample();
    const { container } = render(
      <IframeWidget panel={panel} data={{ resolved: null, empty: false }} />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("sandbox")?.split(" ").sort()).toEqual(["allow-scripts"]);
  });

  it("includes consumer-added sandbox tokens", () => {
    const { panel } = IframeExample();
    const merged = { ...panel, config: { url: "https://x.com", sandbox: ["allow-forms"] } };
    const { container } = render(
      <IframeWidget panel={merged} data={{ resolved: null, empty: false }} />,
    );
    expect(container.querySelector("iframe")?.getAttribute("sandbox")?.split(" ").sort()).toEqual([
      "allow-forms",
      "allow-scripts",
    ]);
  });
});
