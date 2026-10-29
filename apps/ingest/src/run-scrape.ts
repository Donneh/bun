import type { Card } from "@riftkeeper/cards";
import { buildCards } from "./build-cards.ts";
import { changeReportBlocks } from "./change-report.ts";
import { diffCards, isEmptyChangeSet } from "./diff-cards.ts";
import { extractGalleryItems } from "./extract-gallery-items.ts";
import { renderBlocks } from "./markdown.ts";
import { fitPullRequestBody } from "./pull-request-body.ts";
import type { ScrapeWarning } from "./scrape-warning.ts";
import { assessSnapshot, type SnapshotRejectionReason } from "./snapshot-guard.ts";
import { isEmptySchemaChange, renderSchemaChangeNote, upgradeSnapshot } from "./upgrade-snapshot.ts";
import { warningReportBlocks } from "./warning-report.ts";

export type PreviousSnapshot = { kind: "current"; cards: readonly Card[] } | { kind: "outdated"; json: unknown };

export type ScrapeOutcome =
  | { kind: "rejected"; reason: SnapshotRejectionReason; message: string }
  | { kind: "unchanged"; cards: Card[]; warnings: ScrapeWarning[] }
  | { kind: "changed"; cards: Card[]; warnings: ScrapeWarning[]; report: string; pullRequestBody: string };

function resolvePrevious({ previous, fresh }: { previous: PreviousSnapshot; fresh: readonly Card[] }) {
  if (previous.kind === "current") return { cards: previous.cards, note: "" };
  const { cards, schemaChange } = upgradeSnapshot({ previous: previous.json, fresh });
  return { cards, note: isEmptySchemaChange(schemaChange) ? "" : renderSchemaChangeNote(schemaChange) };
}

export function runScrape({ html, previous }: { html: string; previous: PreviousSnapshot }): ScrapeOutcome {
  const { cards, warnings } = buildCards(extractGalleryItems(html));
  const baseline = resolvePrevious({ previous, fresh: cards });

  const assessment = assessSnapshot({ previous: baseline.cards, next: cards });
  if (assessment.kind === "rejected") {
    return { kind: "rejected", reason: assessment.reason, message: assessment.message };
  }

  const changeSet = diffCards({ previous: baseline.cards, next: cards });
  if (isEmptyChangeSet(changeSet) && baseline.note === "") return { kind: "unchanged", cards, warnings };

  const blocks = [
    ...(baseline.note === "" ? [] : [baseline.note.trimEnd()]),
    ...changeReportBlocks(changeSet),
    ...warningReportBlocks(warnings),
  ];
  return {
    kind: "changed",
    cards,
    warnings,
    report: renderBlocks(blocks),
    pullRequestBody: fitPullRequestBody({ blocks }),
  };
}
