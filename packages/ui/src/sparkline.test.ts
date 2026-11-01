import { describe, expect, test } from "vitest";
import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, sparklinePath } from "./sparkline.ts";

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
});
