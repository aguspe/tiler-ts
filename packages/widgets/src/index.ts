import "./styles/tokens.css";
import "./widgets/clock";
import "./widgets/text";
import "./widgets/image";

export const TILER_WIDGETS_VERSION = "0.0.1" as const;
export { chartColors } from "./lib/chart-colors";
export { ClockConfig, ClockWidget } from "./widgets/clock";
export { TextConfig, TextWidget } from "./widgets/text";
export { ImageConfig, ImageWidget } from "./widgets/image";
