import { describe, expect, test } from "bun:test";
import type { Card } from "@riftkeeper/cards";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import { assessSnapshot } from "./snapshot-guard.ts";

function cardsWithPrintings({ count, prefix = "card" }: { count: number; prefix?: string }): Card[] {
  return Array.from({ length: count }, (_, index) =>
    makeCard({
      id: `${prefix}-${index}`,
      printings: [makePrinting({ id: `${prefix}-${index}-p1` })],
    }),
  );
}

describe("assessSnapshot", () => {
  test("rejects a scrape with zero cards", () => {
    const previous = cardsWithPrintings({ count: 10 });

    const assessment = assessSnapshot({ previous, next: [] });

    expect(assessment.kind).toBe("rejected");
    if (assessment.kind === "rejected") {
      expect(assessment.reason).toBe("empty-snapshot");
      expect(assessment.message.length).toBeGreaterThan(0);
    }
  });

  test("accepts any non-empty scrape when there is no previous snapshot", () => {
    const next = cardsWithPrintings({ count: 3 });

    expect(assessSnapshot({ previous: [], next })).toEqual({ kind: "accepted" });
  });

  test("rejects an empty scrape even on the first run", () => {
    expect(assessSnapshot({ previous: [], next: [] }).kind).toBe("rejected");
  });

  test("accepts an unchanged snapshot", () => {
    const cards = cardsWithPrintings({ count: 20 });

    expect(assessSnapshot({ previous: cards, next: cards })).toEqual({ kind: "accepted" });
  });

  test("accepts losing exactly the limit of previous printings", () => {
    const previous = cardsWithPrintings({ count: 100 });

    expect(assessSnapshot({ previous, next: previous.slice(5) })).toEqual({ kind: "accepted" });
  });

  test("rejects losing more than the limit of previous printings", () => {
    const previous = cardsWithPrintings({ count: 100 });

    const assessment = assessSnapshot({ previous, next: previous.slice(6) });

    expect(assessment.kind).toBe("rejected");
    if (assessment.kind === "rejected") {
      expect(assessment.reason).toBe("too-many-printings-missing");
      expect(assessment.message).toContain("6 of 100");
    }
  });

  test("new printings do not offset missing ones", () => {
    const previous = cardsWithPrintings({ count: 100 });
    const additions = cardsWithPrintings({ count: 50, prefix: "new" });

    const assessment = assessSnapshot({ previous, next: [...previous.slice(6), ...additions] });

    expect(assessment.kind).toBe("rejected");
  });

  test("a printing that moved to another card is not missing", () => {
    const moving = makePrinting({ id: "moving-p1" });
    const donor = makeCard({ id: "donor", printings: [makePrinting({ id: "donor-p1" }), moving] });
    const receiver = makeCard({ id: "receiver" });

    const assessment = assessSnapshot({
      previous: [donor, receiver],
      next: [
        { ...donor, printings: [makePrinting({ id: "donor-p1" })] },
        { ...receiver, printings: [...receiver.printings, moving] },
      ],
    });

    expect(assessment).toEqual({ kind: "accepted" });
  });
});
