import type { DataRecord, Panel, WidgetData } from "@aguspe/tiler-core";
import { ListConfig } from "./schema";

export function ListWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<DataRecord[]>;
}): JSX.Element {
  const cfg = ListConfig.parse(panel.config);
  if (data.empty) {
    return <div style={{ padding: 12, opacity: 0.6, fontSize: "0.9rem" }}>No records.</div>;
  }
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.85rem",
        fontFamily: "var(--tiler-font-mono)",
      }}
    >
      <thead>
        <tr>
          {cfg.columns.map((col) => (
            <th
              key={col}
              style={{
                textAlign: "left",
                padding: "4px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                fontWeight: 600,
                opacity: 0.85,
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.resolved.map((r) => (
          <tr key={r.id}>
            {cfg.columns.map((col) => (
              <td
                key={col}
                style={{
                  padding: "4px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 240,
                }}
              >
                {String(r.payload[col] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
