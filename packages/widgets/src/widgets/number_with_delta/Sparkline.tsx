export function Sparkline({
  values,
  color = "currentColor",
  height = 28,
}: {
  values: number[];
  color?: string;
  height?: number;
}): JSX.Element | null {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 100;
  const stepX = width / (values.length - 1);
  const points = values
    .map(
      (v, i) =>
        `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: "block" }}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
