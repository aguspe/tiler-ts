import type { DataRecord, Panel, WidgetData } from "@aguspe/tiler-core";
import { CommentsConfig } from "./schema";

export function CommentsWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<DataRecord[]>;
}): JSX.Element {
  const cfg = CommentsConfig.parse(panel.config);
  if (data.empty) {
    return <div style={{ padding: 12, opacity: 0.6 }}>No comments.</div>;
  }
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: 8 }}>
      {data.resolved.map((r) => (
        <article
          key={r.id}
          style={{
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <header style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            <strong>{String(r.payload[cfg.author_column] ?? "anon")}</strong>
            {" · "}
            <time dateTime={r.recorded_at}>{new Date(r.recorded_at).toLocaleString()}</time>
          </header>
          <p style={{ margin: "4px 0 0 0", whiteSpace: "pre-wrap" }}>
            {String(r.payload[cfg.body_column] ?? "")}
          </p>
        </article>
      ))}
    </div>
  );
}
