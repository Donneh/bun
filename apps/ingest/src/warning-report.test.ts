import { describe, expect, test } from "bun:test";
import { CardIdSchema } from "@riftkeeper/cards";
import type { ScrapeWarning } from "./scrape-warning.ts";
import { renderWarningReport } from "./warning-report.ts";

const untyped = (id: string): ScrapeWarning => ({ kind: "untyped-card", cardId: CardIdSchema.parse(id) });

describe("renderWarningReport", () => {
  test("renders nothing without warnings", () => {
    expect(renderWarningReport([])).toBe("");
  });

  test("groups warnings by kind with counts and lists short groups inline", () => {
    const report = renderWarningReport([
      untyped("fanfare"),
      { kind: "missing-domain", cardId: CardIdSchema.parse("fanfare") },
      untyped("buff"),
    ]);

    expect(report).toContain("### Scrape warnings (3)");
    expect(report).toContain("**untyped-card** (2)");
    expect(report).toContain("**missing-domain** (1)");
    expect(report).toContain("- fanfare: Riot gives no card type");
    expect(report).not.toContain("<details>");
  });

  test("collapses long groups", () => {
    const report = renderWarningReport(Array.from({ length: 30 }, (_, index) => untyped(`card-${index}`)));

    expect(report).toContain("<details>");
    expect(report).toContain("<summary>Show 30 warnings</summary>");
  });
});
