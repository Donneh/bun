export const SPARKLINE_WIDTH = 120;
export const SPARKLINE_HEIGHT = 32;
const PADDING = 2;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sparklinePath(values: readonly (number | null)[]): string {
  const amounts = values.filter((value): value is number => value !== null);
  if (amounts.length === 0) return "";
  const low = Math.min(...amounts);
  const spread = Math.max(...amounts) - low;
  const step = values.length > 1 ? SPARKLINE_WIDTH / (values.length - 1) : 0;
  const drawable = SPARKLINE_HEIGHT - PADDING * 2;
  const y = (value: number) =>
    spread === 0 ? SPARKLINE_HEIGHT / 2 : PADDING + drawable - ((value - low) / spread) * drawable;

  let path = "";
  let drawing = false;
  for (const [index, value] of values.entries()) {
    if (value === null) {
      drawing = false;
      continue;
    }
    const point = `${round(index * step)} ${round(y(value))}`;
    const isolated = !drawing && (values[index + 1] ?? null) === null;
    path += drawing ? ` L${point}` : `${path ? " " : ""}M${point}${isolated ? " h0" : ""}`;
    drawing = true;
  }
  return path;
}
