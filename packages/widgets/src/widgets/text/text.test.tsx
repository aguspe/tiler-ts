import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextExample } from "./example";
import { TextWidget } from "./TextWidget";

describe("TextWidget", () => {
  it("renders markdown headers and paragraphs", () => {
    const { panel } = TextExample();
    render(
      <TextWidget
        panel={{ ...panel, config: { markdown: "# Hello\n\nBody.", align: "left" } }}
        data={{ resolved: null, empty: false }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Hello" })).toBeInTheDocument();
    expect(screen.getByText("Body.")).toBeInTheDocument();
  });

  it("strips <script> tags", () => {
    const { panel } = TextExample();
    const { container } = render(
      <TextWidget
        panel={{
          ...panel,
          config: { markdown: "Before\n\n<script>alert(1)</script>\n\nAfter", align: "left" },
        }}
        data={{ resolved: null, empty: false }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("strips javascript: URLs in links", () => {
    const { panel } = TextExample();
    const md = '[click](javascript:alert(1) "x")';
    const { container } = render(
      <TextWidget
        panel={{ ...panel, config: { markdown: md, align: "left" } }}
        data={{ resolved: null, empty: false }}
      />,
    );
    const link = container.querySelector("a");
    // sanitizer either drops the href entirely or removes the link node;
    // either way, no surviving anchor should carry a javascript: URL.
    const href = link?.getAttribute("href");
    expect(href === null || href === undefined || !/^javascript:/i.test(href)).toBe(true);
  });
});
