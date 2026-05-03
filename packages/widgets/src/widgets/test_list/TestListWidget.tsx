import { useState } from "react";
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { TestListResolved } from "./resolve";
import { TestListConfig } from "./schema";

const STATUS_COLOR: Record<string, string> = {
  pass: "#10b981",
  fail: "#ef4444",
  skip: "#f59e0b",
};

export function TestListWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<TestListResolved>;
}): JSX.Element {
  const cfg = TestListConfig.parse(panel.config);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [failOnly, setFailOnly] = useState(cfg.show_failures_only);

  if (data.empty) {
    return (
      <div style={{ padding: 16, color: "var(--ink-3, #64748b)" }}>No test results.</div>
    );
  }

  const rows = failOnly ? data.resolved.filter((r) => r.status === "fail") : data.resolved;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "6px 8px", display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          style={{
            fontSize: "0.75rem",
            cursor: "pointer",
            background: failOnly ? "transparent" : "var(--tile-bg, #1e293b)",
            border: "1px solid var(--border, #334155)",
            borderRadius: 4,
            padding: "2px 8px",
            color: failOnly ? "var(--ink-3, #64748b)" : "currentColor",
          }}
          onClick={() => setFailOnly(false)}
          aria-pressed={!failOnly}
        >
          All tests
        </button>
        <button
          style={{
            fontSize: "0.75rem",
            cursor: "pointer",
            background: failOnly ? "var(--tile-bg, #1e293b)" : "transparent",
            border: "1px solid var(--border, #334155)",
            borderRadius: 4,
            padding: "2px 8px",
            color: failOnly ? "currentColor" : "var(--ink-3, #64748b)",
          }}
          onClick={() => setFailOnly(true)}
          aria-pressed={failOnly}
        >
          Failures only
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "0 8px 8px",
        }}
      >
        {rows.map((row) => {
          const isExpanded = expanded.has(row.id);
          const color = STATUS_COLOR[row.status] ?? "currentColor";
          const isFail = row.status === "fail";
          const duration =
            row.status === "skip" ? "skip" : `${(row.duration_ms / 1000).toFixed(2)}s`;
          return (
            <div
              key={row.id}
              style={{
                borderRadius: 4,
                overflow: "hidden",
                border: isExpanded ? `1px solid ${color}40` : "1px solid transparent",
              }}
            >
              <div
                data-testid="test-row-header"
                style={{
                  padding: "4px 8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: isFail ? "pointer" : "default",
                  background: isExpanded
                    ? `${color}10`
                    : "var(--tile-bg, #1e293b)",
                }}
                onClick={() => isFail && toggle(row.id)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span style={{ color, flexShrink: 0 }}>
                    {row.status === "skip" ? "◌" : "●"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.test_name}
                  </span>
                  {row.suite && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--ink-3, #64748b)",
                        background: "var(--page-bg, #0f172a)",
                        padding: "1px 5px",
                        borderRadius: 3,
                        flexShrink: 0,
                      }}
                    >
                      {row.suite}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--ink-3, #64748b)",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {duration}
                </span>
              </div>
              {isExpanded && (
                <div
                  style={{
                    padding: 8,
                    display: "flex",
                    gap: 10,
                    background: `${color}08`,
                    borderTop: `1px solid ${color}20`,
                  }}
                >
                  {row.screenshot_data && (
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={row.screenshot_data}
                        alt="screenshot"
                        style={{
                          width: 120,
                          height: 75,
                          objectFit: "cover",
                          borderRadius: 4,
                          display: "block",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {row.error_message && (
                      <pre
                        style={{
                          fontSize: "0.75rem",
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "var(--ink-1, #e2e8f0)",
                          background: "var(--page-bg, #0f172a)",
                          padding: 8,
                          borderRadius: 4,
                        }}
                      >
                        {row.error_message}
                      </pre>
                    )}
                    {row.file && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--ink-3, #64748b)",
                          marginTop: 4,
                        }}
                      >
                        {row.file}
                        {row.line != null ? `:${row.line}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
