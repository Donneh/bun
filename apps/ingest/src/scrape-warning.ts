import type { CardId, GameplayField, PrintingId } from "@riftkeeper/cards";

export type ScrapeWarning =
  | { kind: "untyped-card"; cardId: CardId }
  | { kind: "unit-without-might"; cardId: CardId }
  | { kind: "spell-with-might"; cardId: CardId }
  | { kind: "missing-domain"; cardId: CardId }
  | { kind: "missing-artist"; cardId: CardId; printingId: PrintingId }
  | {
      kind: "conflicting-printings";
      cardId: CardId;
      canonicalPrintingId: PrintingId;
      fields: GameplayField[];
      printingIds: PrintingId[];
    };

export type ScrapeWarningKind = ScrapeWarning["kind"];

export function describeWarning(warning: ScrapeWarning): string {
  switch (warning.kind) {
    case "untyped-card":
      return `${warning.cardId}: Riot gives no card type`;
    case "unit-without-might":
      return `${warning.cardId}: typed as a unit but has no might`;
    case "spell-with-might":
      return `${warning.cardId}: typed as a spell but has might`;
    case "missing-domain":
      return `${warning.cardId}: Riot gives no domain`;
    case "missing-artist":
      return `${warning.cardId}: printing ${warning.printingId} has no artist`;
    case "conflicting-printings":
      return `${warning.cardId}: printings ${warning.printingIds.join(", ")} disagree with canonical printing ${warning.canonicalPrintingId} on ${warning.fields.join(", ")}`;
    default: {
      const _exhaustive: never = warning;
      return _exhaustive;
    }
  }
}
