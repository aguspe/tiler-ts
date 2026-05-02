import type { Panel, WidgetData } from "@aguspe/tiler-core";
import { useEffect, useState } from "react";
import { ClockConfig } from "./schema";

export function ClockWidget({
  panel,
}: {
  panel: Panel;
  data: WidgetData<null>;
}): JSX.Element {
  const cfg = ClockConfig.parse(panel.config);
  // SSR renders an empty placeholder so the static HTML stays
  // deterministic. The first client effect populates the time and the
  // interval keeps it fresh. `suppressHydrationWarning` lets React 18
  // accept the post-effect mismatch without bailing on the rest of the
  // tree (the bail-out used to leave Recharts widgets unrendered in
  // static reports).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const period = cfg.show_seconds ? 1000 : 60_000;
    const id = setInterval(() => setNow(new Date()), period);
    return () => clearInterval(id);
  }, [cfg.show_seconds]);

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: cfg.show_seconds ? "2-digit" : undefined,
    hour12: cfg.format === "12h",
    timeZone: cfg.timezone,
  });

  return (
    <time
      dateTime={now ? now.toISOString() : ""}
      suppressHydrationWarning
    >
      {now ? formatter.format(now) : "--:--"}
    </time>
  );
}
