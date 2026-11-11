import { describe, expect, test } from "vitest";
import { nearestDay, SPARKLINE_HEIGHT, SPARKLINE_WIDTH, sparklinePath, sparklinePoint } from "./sparkline.ts";

describe("sparklinePath", () => {
  test("spans the full width, with the highest value at the top and the lowest at the bottom", () => {
    expect(sparklinePath([1, 3, 2])).toBe(
      `M0 ${SPARKLINE_HEIGHT - 2} L${SPARKLINE_WIDTH / 2} 2 L${SPARKLINE_WIDTH} 16`,
    );
  });

  test("breaks the line at a missing day and draws a lone day as a dot", () => {
    const path = sparklinePath([1, 2, null, 3, null, 2, 1]);

    expect(path.match(/M/g)).toHaveLength(3);
    expect(path).toContain("M60 2 h0");
  });

  test("draws a flat line through the middle when the price never changed", () => {
    expect(sparklinePath([2, 2])).toBe(`M0 ${SPARKLINE_HEIGHT / 2} L${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT / 2}`);
  });

  test("draws nothing without a single price", () => {
    expect(sparklinePath([null, null])).toBe("");
  });
});

describe("sparklinePoint", () => {
  test("places a day on the line", () => {
    expect(sparklinePoint([1, 3, 2], 1)).toEqual({ x: SPARKLINE_WIDTH / 2, y: 2 });
  });

  test("has no height for a day without a price", () => {
    expect(sparklinePoint([1, null, 2], 1)).toEqual({ x: SPARKLINE_WIDTH / 2, y: null });
  });
});

describe("nearestDay", () => {
  test("picks the day closest to the pointer and stays inside the chart", () => {
    expect(nearestDay(0, 11)).toBe(0);
    expect(nearestDay(0.44, 11)).toBe(4);
    expect(nearestDay(0.46, 11)).toBe(5);
    expect(nearestDay(1, 11)).toBe(10);
    expect(nearestDay(-0.5, 11)).toBe(0);
    expect(nearestDay(1.5, 11)).toBe(10);
    expect(nearestDay(0.7, 1)).toBe(0);
  });
});
