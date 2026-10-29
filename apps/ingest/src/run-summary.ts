import type { Card } from "@riftkeeper/cards";
import type { ScrapeOutcome } from "./run-scrape.ts";
import { renderWarningReport } from "./warning-report.ts";

export type RunResult = ScrapeOutcome | { kind: "failed"; message: string };

function countPrintings(cards: readonly Card[]): number {
  return cards.reduce((total, card) => total + card.printings.length, 0);
}

export function firstLine(text: string): string {
  return text.split("\n")[0] ?? text;
}

export function describeRun(result: RunResult): string {
  switch (result.kind) {
    case "failed":
      return `failed: ${firstLine(result.message)}`;
    case "rejected":
      return `rejected (${result.reason}): ${result.message}`;
    case "unchanged":
    case "changed":
      return `${result.kind}: ${result.cards.length} cards, ${countPrintings(result.cards)} printings, ${result.warnings.length} warnings`;
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

export function renderRunSummary(result: RunResult): string {
  const heading = `## Card scrape ${describeRun(result)}\n`;
  if (result.kind === "unchanged" || result.kind === "changed") {
    return [heading, renderWarningReport(result.warnings)].filter((part) => part !== "").join("\n");
  }
  if (result.kind === "failed") return [heading, "```", result.message, "```", ""].join("\n");
  return heading;
}
