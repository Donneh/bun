import { describe, expect, test } from "bun:test";
import { CardIdSchema, PrintingIdSchema } from "@riftkeeper/cards";
import { describeWarning, type ScrapeWarning } from "./scrape-warning.ts";

const cardId = CardIdSchema.parse("jinx-loose-cannon");
const printingId = PrintingIdSchema.parse("ogn-030-298");

const conflict: ScrapeWarning = {
  kind: "conflicting-printings",
  cardId,
  canonicalPrintingId: printingId,
  fields: ["might", "ability"],
  printingIds: [PrintingIdSchema.parse("ogn-030a-298")],
};

const WARNINGS: readonly ScrapeWarning[] = [
  { kind: "untyped-card", cardId },
  { kind: "unit-without-might", cardId },
  { kind: "spell-with-might", cardId },
  { kind: "missing-domain", cardId },
  { kind: "missing-artist", cardId, printingId },
  conflict,
];

describe("describeWarning", () => {
  test.each(WARNINGS)("describes $kind with the card id", (warning) => {
    expect(describeWarning(warning)).toStartWith("jinx-loose-cannon: ");
  });

  test("names the conflicting fields and printings", () => {
    const description = describeWarning(conflict);
    expect(description).toContain("ogn-030a-298");
    expect(description).toContain("might, ability");
  });
});
