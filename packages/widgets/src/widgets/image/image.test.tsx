import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageExample } from "./example";
import { ImageWidget } from "./ImageWidget";
import { ImageConfig } from "./schema";

describe("ImageConfig", () => {
  it("accepts https URLs", () => {
    expect(ImageConfig.safeParse({ url: "https://x.com/y.png", alt: "y" }).success).toBe(true);
  });
  it("accepts relative URLs", () => {
    expect(ImageConfig.safeParse({ url: "/static/y.png", alt: "y" }).success).toBe(true);
  });
  it("rejects javascript: URLs", () => {
    expect(ImageConfig.safeParse({ url: "javascript:alert(1)", alt: "x" }).success).toBe(false);
  });
  it("rejects http: URLs (insecure)", () => {
    expect(ImageConfig.safeParse({ url: "http://x.com/y.png", alt: "y" }).success).toBe(false);
  });
});

describe("ImageWidget", () => {
  it("renders an <img> with the given alt text", () => {
    const { panel } = ImageExample();
    render(<ImageWidget panel={panel} data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("img", { name: panel.config.alt as string })).toBeInTheDocument();
  });

  it("sets referrerPolicy=no-referrer", () => {
    const { panel } = ImageExample();
    render(<ImageWidget panel={panel} data={{ resolved: null, empty: false }} />);
    expect(screen.getByRole("img").getAttribute("referrerpolicy")).toBe("no-referrer");
  });
});
