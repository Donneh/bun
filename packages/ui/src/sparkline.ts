export const SPARKLINE_WIDTH = 120;
export const SPARKLINE_HEIGHT = 32;
const PADDING = 2;

export interface SparklinePoint {
  readonly x: number;
  readonly y: number | null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function scale(values: readonly (number | null)[]) {
  const amounts = values.filter((value): value is number => value !== null);
  const low = Math.min(...amounts);
  const spread = Math.max(...amounts) - low;
  const step = values.length > 1 ? SPARKLINE_WIDTH / (values.length - 1) : 0;
  const drawable = SPARKLINE_HEIGHT - PADDING * 2;
  return {
    x: (index: number) => round(index * step),
    y: (value: number) =>
      round(spread === 0 ? SPARKLINE_HEIGHT / 2 : PADDING + drawable - ((value - low) / spread) * drawable),
  };
}

export function sparklinePath(values: readonly (number | null)[]): string {
  if (values.every((value) => value === null)) return "";
  const { x, y } = scale(values);

  let path = "";
  let drawing = false;
  for (const [index, value] of values.entries()) {
    if (value === null) {
      drawing = false;
      continue;
    }
    const point = `${x(index)} ${y(value)}`;
    const isolated = !drawing && (values[index + 1] ?? null) === null;
    path += drawing ? ` L${point}` : `${path ? " " : ""}M${point}${isolated ? " h0" : ""}`;
    drawing = true;
  }
  return path;
}

export function sparklinePoint(values: readonly (number | null)[], index: number): SparklinePoint {
  const value = values[index] ?? null;
  const { x, y } = scale(values);
  return { x: x(index), y: value === null ? null : y(value) };
}

export function nearestDay(fraction: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))));
}
