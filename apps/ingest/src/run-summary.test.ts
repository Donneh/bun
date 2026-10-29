import { describe, expect, test } from "bun:test";
import { makeCard } from "@riftkeeper/cards/testing";
import { describeRun, renderRunSummary } from "./run-summary.ts";
import type { ScrapeWarning } from "./scrape-warning.ts";
import { renderWarningReport } from "./warning-report.ts";

const card = makeCard();
const warnings: ScrapeWarning[] = [{ kind: "untyped-card", cardId: card.id }];

describe("describeRun", () => {
  test("counts cards, printings and warnings for a completed run", () => {
    expect(describeRun({ kind: "unchanged", cards: [card], warnings })).toBe(
      "unchanged: 1 cards, 1 printings, 1 warnings",
    );
  });

  test("names the reason and message of a rejected scrape", () => {
    const line = describeRun({ kind: "rejected", reason: "empty-snapshot", message: "no cards" });
    expect(line).toBe("rejected (empty-snapshot): no cards");
  });

  test("carries the failure message", () => {
    expect(describeRun({ kind: "failed", message: "boom" })).toBe("failed: boom");
  });
});

describe("renderRunSummary", () => {
  test("is a heading only when a completed run has no warnings", () => {
    const summary = renderRunSummary({ kind: "unchanged", cards: [card], warnings: [] });
    expect(summary).toBe("## Card scrape unchanged: 1 cards, 1 printings, 0 warnings\n");
  });

  test("appends the warning report after the outcome line, also for an unchanged run", () => {
    const summary = renderRunSummary({ kind: "unchanged", cards: [card], warnings });
    expect(summary.startsWith("## Card scrape unchanged:")).toBe(true);
    expect(summary.endsWith(renderWarningReport(warnings))).toBe(true);
  });

  test("shows the whole failure message in a code block under the first line", () => {
    const summary = renderRunSummary({ kind: "failed", message: "boom\n- detail" });
    expect(summary).toBe("## Card scrape failed: boom\n\n```\nboom\n- detail\n```\n");
  });
});
