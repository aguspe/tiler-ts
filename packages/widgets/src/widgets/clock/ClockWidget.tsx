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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
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

  return <time dateTime={now.toISOString()}>{formatter.format(now)}</time>;
}
