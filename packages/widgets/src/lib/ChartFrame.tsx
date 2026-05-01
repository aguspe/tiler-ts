import type { ReactNode } from "react";

export function ChartFrame({
  empty,
  children,
}: {
  empty: boolean;
  children: ReactNode;
}): JSX.Element {
  if (empty) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 12,
          opacity: 0.6,
          fontSize: "0.9rem",
        }}
      >
        No data in window.
      </div>
    );
  }
  return <div style={{ width: "100%", height: "100%", padding: 4 }}>{children}</div>;
}
