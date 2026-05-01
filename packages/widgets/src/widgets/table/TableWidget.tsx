import type { DataRecord, Panel, WidgetData } from "@aguspe/tiler-core";
import { useState } from "react";
import { formatCell } from "./format";
import { TableConfig } from "./schema";

export function TableWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<DataRecord[]>;
}): JSX.Element {
  const cfg = TableConfig.parse(panel.config);
  const [page, setPage] = useState(0);

  if (data.empty) {
    return <div style={{ padding: 12, opacity: 0.6 }}>No records.</div>;
  }

  const rows = data.resolved;
  const totalPages = cfg.pagination ? Math.max(1, Math.ceil(rows.length / cfg.page_size)) : 1;
  const visible = cfg.pagination
    ? rows.slice(page * cfg.page_size, (page + 1) * cfg.page_size)
    : rows;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: "0.85rem" }}
    >
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--tiler-font-mono)" }}>
          <thead>
            <tr>
              {cfg.columns.map((c) => (
                <th
                  key={c.key}
                  style={{
                    textAlign: "left",
                    padding: "4px 8px",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    fontWeight: 600,
                    opacity: 0.85,
                    position: "sticky",
                    top: 0,
                    background: "var(--tiler-color-tile)",
                  }}
                >
                  {c.label ?? c.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                {cfg.columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      padding: "4px 8px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatCell(r.payload[c.key], c.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cfg.pagination && totalPages > 1 && (
        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 8px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontSize: "0.75rem",
            opacity: 0.85,
          }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={paginationButtonStyle}
          >
            ← Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={paginationButtonStyle}
          >
            Next →
          </button>
        </footer>
      )}
    </div>
  );
}

const paginationButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "currentColor",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 4,
  padding: "2px 8px",
  cursor: "pointer",
};
