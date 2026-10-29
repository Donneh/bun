import type { Card } from "@riftkeeper/cards";

export const MAX_MISSING_PRINTING_RATIO = 0.05;

export type SnapshotRejectionReason = "empty-snapshot" | "too-many-printings-missing";

export type SnapshotAssessment =
  | { readonly kind: "accepted" }
  | {
      readonly kind: "rejected";
      readonly reason: SnapshotRejectionReason;
      readonly message: string;
    };

function printingIds(cards: readonly Card[]): Set<string> {
  return new Set(cards.flatMap((card) => card.printings.map((printing) => printing.id)));
}

export function assessSnapshot({
  previous,
  next,
}: {
  previous: readonly Card[];
  next: readonly Card[];
}): SnapshotAssessment {
  if (next.length === 0) {
    return {
      kind: "rejected",
      reason: "empty-snapshot",
      message: "The scraped snapshot contains no cards.",
    };
  }

  const previousIds = printingIds(previous);
  if (previousIds.size === 0) return { kind: "accepted" };

  const nextIds = printingIds(next);
  const missing = [...previousIds].filter((id) => !nextIds.has(id)).length;
  if (missing / previousIds.size > MAX_MISSING_PRINTING_RATIO) {
    const percentage = ((missing / previousIds.size) * 100).toFixed(1);
    const limit = MAX_MISSING_PRINTING_RATIO * 100;
    return {
      kind: "rejected",
      reason: "too-many-printings-missing",
      message: `${missing} of ${previousIds.size} previous printings (${percentage}%) are missing from the scrape, above the ${limit}% limit.`,
    };
  }
  return { kind: "accepted" };
}
