import { useEffect, useState } from "react";
import type { Panel, WidgetData } from "@aguspe/tiler-core";
import type { TestListResolved, TestListRow } from "./resolve";
import { TestListConfig } from "./schema";

const STATUS_COLOR: Record<string, string> = {
  pass: "#10b981",
  fail: "#ef4444",
  skip: "#f59e0b",
};

const MODAL_BUTTON_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 4,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "0.85rem",
};

function useEscToClose(onClose: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);
}

function ScreenshotLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}): JSX.Element {
  const [fit, setFit] = useState<"contain" | "actual">("contain");
  useEscToClose(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        touchAction: "pinch-zoom",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          padding: 12,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setFit((f) => (f === "contain" ? "actual" : "contain"))}
          style={MODAL_BUTTON_STYLE}
        >
          {fit === "contain" ? "Actual size" : "Fit to screen"}
        </button>
        <button type="button" aria-label="Close" onClick={onClose} style={MODAL_BUTTON_STYLE}>
          Close ✕
        </button>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: fit === "contain" ? "center" : "flex-start",
          justifyContent: "center",
          padding: fit === "contain" ? 24 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          style={
            fit === "contain"
              ? {
                  maxWidth: "100%",
                  maxHeight: "calc(100vh - 80px)",
                  objectFit: "contain",
                  display: "block",
                  cursor: "zoom-in",
                }
              : {
                  display: "block",
                  cursor: "zoom-out",
                }
          }
          onClick={() => setFit((f) => (f === "contain" ? "actual" : "contain"))}
        />
      </div>
    </div>
  );
}

function TestDetailsModal({
  row,
  onClose,
}: {
  row: TestListRow;
  onClose: () => void;
}): JSX.Element {
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);
  useEscToClose(onClose);
  const color = STATUS_COLOR[row.status] ?? "currentColor";

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${row.test_name}`}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--paper-2, #ffffff)",
            color: "var(--ink, currentColor)",
            borderRadius: 8,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            width: "min(960px, 100%)",
            maxHeight: "calc(100vh - 32px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderBottom: "1px solid var(--border, rgba(0,0,0,0.1))",
              flexShrink: 0,
            }}
          >
            <span style={{ color, flexShrink: 0, fontSize: "1rem" }}>
              {row.status === "skip" ? "◌" : "●"}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.test_name}
              </div>
              {row.suite && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--ink-3, #64748b)",
                    marginTop: 2,
                  }}
                >
                  {row.suite}
                  {row.status === "skip"
                    ? " — skipped"
                    : ` — ${(row.duration_ms / 1000).toFixed(2)}s`}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid var(--border, rgba(0,0,0,0.15))",
                borderRadius: 4,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "0.85rem",
                color: "currentColor",
                flexShrink: 0,
              }}
            >
              Close ✕
            </button>
          </div>
          <div
            style={{
              padding: 16,
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {row.screenshot_data && (
              <button
                type="button"
                data-testid="modal-screenshot"
                aria-label="Zoom screenshot"
                onClick={() => setZoomedScreenshot(row.screenshot_data)}
                style={{
                  padding: 0,
                  border: "1px solid var(--border, rgba(0,0,0,0.1))",
                  borderRadius: 6,
                  background: "transparent",
                  cursor: "zoom-in",
                  alignSelf: "flex-start",
                  maxWidth: "100%",
                }}
              >
                <img
                  src={row.screenshot_data}
                  alt={`Screenshot for ${row.test_name}`}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "min(420px, 50vh)",
                    objectFit: "contain",
                    borderRadius: 5,
                  }}
                />
              </button>
            )}
            {row.error_message && (
              <pre
                style={{
                  fontSize: "0.78rem",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--ink-1, currentColor)",
                  background: "var(--page-bg, rgba(0,0,0,0.06))",
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid var(--border, rgba(0,0,0,0.08))",
                }}
              >
                {row.error_message}
              </pre>
            )}
            {row.file && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--ink-3, #64748b)",
                  fontFamily: "var(--tiler-font-mono, ui-monospace, monospace)",
                }}
              >
                {row.file}
                {row.line != null ? `:${row.line}` : ""}
              </div>
            )}
          </div>
        </div>
      </div>
      {zoomedScreenshot && (
        <ScreenshotLightbox
          src={zoomedScreenshot}
          alt={`Screenshot for ${row.test_name}`}
          onClose={() => setZoomedScreenshot(null)}
        />
      )}
    </>
  );
}

export function TestListWidget({
  panel,
  data,
}: {
  panel: Panel;
  data: WidgetData<TestListResolved>;
}): JSX.Element {
  const cfg = TestListConfig.parse(panel.config);
  const [failOnly, setFailOnly] = useState(cfg.show_failures_only);
  const [openRow, setOpenRow] = useState<TestListRow | null>(null);

  if (data.empty) {
    return (
      <div style={{ padding: 16, color: "var(--ink-3, #64748b)" }}>No test results.</div>
    );
  }

  const rows = failOnly ? data.resolved.filter((r) => r.status === "fail") : data.resolved;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "6px 8px", display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          style={{
            fontSize: "0.75rem",
            cursor: "pointer",
            background: failOnly ? "transparent" : "var(--tile-bg, rgba(0,0,0,0.08))",
            border: "1px solid var(--border, rgba(0,0,0,0.12))",
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
            background: failOnly ? "var(--tile-bg, rgba(0,0,0,0.08))" : "transparent",
            border: "1px solid var(--border, rgba(0,0,0,0.12))",
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
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: "0 8px 8px",
        }}
      >
        {rows.map((row) => {
          const color = STATUS_COLOR[row.status] ?? "currentColor";
          const isFail = row.status === "fail";
          const duration =
            row.status === "skip" ? "skip" : `${(row.duration_ms / 1000).toFixed(2)}s`;
          return (
            <button
              key={row.id}
              type="button"
              data-testid="test-row-header"
              onClick={() => isFail && setOpenRow(row)}
              disabled={!isFail}
              style={{
                all: "unset",
                boxSizing: "border-box",
                width: "100%",
                cursor: isFail ? "pointer" : "default",
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid var(--border, rgba(0,0,0,0.08))",
                background: "var(--tile-bg, rgba(0,0,0,0.03))",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 0,
                  flex: 1,
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
                      background: "var(--page-bg, rgba(0,0,0,0.06))",
                      padding: "1px 5px",
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  >
                    {row.suite}
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--ink-3, #64748b)",
                  flexShrink: 0,
                }}
              >
                {duration}
              </span>
            </button>
          );
        })}
      </div>
      {openRow && <TestDetailsModal row={openRow} onClose={() => setOpenRow(null)} />}
    </div>
  );
}
