import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { useMemo } from "react";
import { renderMarkdown } from "./render-markdown";
import { TextConfig } from "./schema";

export function TextWidget({
  panel,
}: {
  panel: Panel;
  data: WidgetData<null>;
}): JSX.Element {
  const cfg = TextConfig.parse(panel.config);
  const html = useMemo(() => renderMarkdown(cfg.markdown), [cfg.markdown]);
  return (
    <div
      className="tiler-text"
      style={{ textAlign: cfg.align }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: html is sanitized via rehype-sanitize in renderMarkdown
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
