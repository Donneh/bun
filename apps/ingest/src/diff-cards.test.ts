import { describe, expect, test } from "bun:test";
import { isDeepStrictEqual } from "node:util";
import { CardSchema, PrintingSchema } from "@riftkeeper/cards";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import { diffCards, isEmptyChangeSet } from "./diff-cards.ts";

const ids = (items: readonly { id: string }[]): string[] => items.map((item) => item.id);
const fieldNames = (changes: readonly { field: string }[] | undefined): string[] =>
  (changes ?? []).map((change) => change.field);

const ahri = makeCard({ id: "ahri-inquisitive", name: "Ahri, Inquisitive" });
const garen = makeCard({ id: "garen-rugged", name: "Garen, Rugged" });

describe("diffCards", () => {
  test("identical snapshots produce an empty change set", () => {
    const changeSet = diffCards({ previous: [ahri, garen], next: [garen, ahri] });

    expect(isEmptyChangeSet(changeSet)).toBe(true);
  });

  test("reports a card only in next as added", () => {
    const changeSet = diffCards({ previous: [ahri], next: [ahri, garen] });

    expect(changeSet.added).toEqual([garen]);
    expect(changeSet.removed).toEqual([]);
    expect(changeSet.changed).toEqual([]);
    expect(isEmptyChangeSet(changeSet)).toBe(false);
  });

  test("reports a card only in previous as removed", () => {
    const changeSet = diffCards({ previous: [ahri, garen], next: [ahri] });

    expect(changeSet.removed).toEqual([garen]);
    expect(changeSet.added).toEqual([]);
  });

  test("reports an ability errata with the old and new text", () => {
    const errata = { ...ahri, ability: "Draw 2 cards." };

    const { changed } = diffCards({ previous: [ahri], next: [errata] });

    expect(changed).toHaveLength(1);
    expect(ids(changed)).toEqual(["ahri-inquisitive"]);
    expect(changed[0]?.changes).toEqual([{ field: "ability", previous: "Draw a card.", next: "Draw 2 cards." }]);
  });

  test("reports a cost change", () => {
    const { changed } = diffCards({
      previous: [ahri],
      next: [{ ...ahri, energyCost: 4 }],
    });

    expect(changed[0]?.changes).toEqual([{ field: "energyCost", previous: 2, next: 4 }]);
  });

  test("reports a type fixed from null to unit", () => {
    const mislabeled = makeCard({ id: "mislabeled", type: null });

    const { changed } = diffCards({
      previous: [mislabeled],
      next: [{ ...mislabeled, type: "unit" }],
    });

    expect(changed[0]?.changes).toEqual([{ field: "type", previous: null, next: "unit" }]);
  });

  test("reports every changed field of a card", () => {
    const { changed } = diffCards({
      previous: [ahri],
      next: [{ ...ahri, name: "Ahri, Reworked", might: 5, effect: "Gain 1." }],
    });

    expect(fieldNames(changed[0]?.changes)).toEqual(["name", "might", "effect"]);
  });

  test("reports a new printing on an existing card", () => {
    const altArt = makePrinting({ id: "ahri-inquisitive-p2", publicCode: "OGN-066b/298", variant: "alt-art" });

    const { changed } = diffCards({
      previous: [ahri],
      next: [{ ...ahri, printings: [...ahri.printings, altArt] }],
    });

    expect(changed[0]?.changes).toEqual([]);
    expect(changed[0]?.printings.added).toEqual([altArt]);
    expect(changed[0]?.printings.removed).toEqual([]);
  });

  test("reports a removed printing on a card that remains", () => {
    const altArt = makePrinting({ id: "ahri-inquisitive-p2", publicCode: "OGN-066b/298" });
    const withTwo = { ...ahri, printings: [...ahri.printings, altArt] };

    const { changed } = diffCards({ previous: [withTwo], next: [ahri] });

    expect(changed[0]?.printings.removed).toEqual([altArt]);
    expect(changed[0]?.printings.added).toEqual([]);
  });

  test("reports an imageUrl whose path changed", () => {
    const newArt = makePrinting({
      ...ahri.printings[0],
      imageUrl: "https://cdn.example.com/cards/ogn-001a-v2.png?v=1",
    });

    const { changed } = diffCards({ previous: [ahri], next: [{ ...ahri, printings: [newArt] }] });

    expect(changed[0]?.printings.changed).toEqual([
      {
        id: newArt.id,
        publicCode: newArt.publicCode,
        changes: [
          {
            field: "imageUrl",
            previous: "https://cdn.example.com/cards/ogn-001a.png?v=1",
            next: "https://cdn.example.com/cards/ogn-001a-v2.png?v=1",
          },
        ],
      },
    ]);
  });

  test("reports a change inside a nested printing field such as set", () => {
    const renamed = makePrinting({
      ...ahri.printings[0],
      set: { code: "OGN", name: "Origins Reprint" },
    });

    const { changed } = diffCards({ previous: [ahri], next: [{ ...ahri, printings: [renamed] }] });

    expect(fieldNames(changed[0]?.printings.changed[0]?.changes)).toEqual(["set"]);
  });

  test("reports domains and tags whose membership changed", () => {
    const dual = makeCard({ id: "dual", domains: ["fury", "calm"], tags: ["ahri"] });
    const edited = makeCard({ id: "dual", domains: ["fury", "mind"], tags: ["ahri", "sage"] });

    const { changed } = diffCards({ previous: [dual], next: [edited] });

    expect(fieldNames(changed[0]?.changes)).toEqual(["domains", "tags"]);
  });

  test("a printing that moves between cards is removed from one and added to the other", () => {
    const moving = makePrinting({ id: "moving-p1", publicCode: "OGN-100/298" });
    const donorKept = makePrinting({ id: "donor-p1" });
    const receiverKept = makePrinting({ id: "receiver-p1" });
    const donor = makeCard({ id: "donor", printings: [donorKept, moving] });
    const receiver = makeCard({ id: "receiver", printings: [receiverKept] });

    const { changed } = diffCards({
      previous: [donor, receiver],
      next: [
        { ...donor, printings: [donorKept] },
        { ...receiver, printings: [receiverKept, moving] },
      ],
    });

    expect(ids(changed)).toEqual(["donor", "receiver"]);
    expect(changed[0]?.printings.removed).toEqual([moving]);
    expect(changed[1]?.printings.added).toEqual([moving]);
  });

  test("produces identical output regardless of input order", () => {
    const cards = ["delta", "alpha", "charlie", "bravo"].map((id) => makeCard({ id }));
    const previous = cards.slice(0, 3);
    const next = [...cards.slice(1), makeCard({ id: "echo" })].map((card) =>
      card.id === "charlie" ? { ...card, might: 9 } : card,
    );

    const forward = diffCards({ previous, next });
    const shuffled = diffCards({ previous: [...previous].reverse(), next: [...next].reverse() });

    expect(shuffled).toEqual(forward);
    expect(ids(forward.added)).toEqual(["bravo", "echo"]);
    expect(ids(forward.changed)).toEqual(["charlie"]);
  });

  describe("coverage of the schema", () => {
    const base = makeCard({ id: "base-card" });
    const alternative = makeCard({
      id: "base-card",
      name: "Other Name",
      subtitle: "Other Subtitle",
      type: "spell",
      supertype: "champion",
      domains: ["mind", "order"],
      energyCost: 7,
      powerCost: 3,
      might: 8,
      mightBonus: 2,
      ability: "Other ability.",
      effect: "Other effect.",
      tags: ["other"],
    });
    const basePrinting = makePrinting();
    const alternativePrinting = makePrinting({
      publicCode: "SFD-999/999",
      set: { code: "SFD", name: "Spiritforged" },
      collectorNumber: 99,
      variant: "signed",
      rarity: "epic",
      artist: "Other Artist",
      imageUrl: "https://cdn.example.com/other/path.png",
      orientation: "landscape",
    });

    const cardFields = Object.keys(CardSchema.shape).filter((field) => field !== "id" && field !== "printings");
    const printingFields = Object.keys(PrintingSchema.shape).filter((field) => field !== "id");

    test("fixtures differ in every diffable field so the checks below are meaningful", () => {
      for (const field of cardFields) {
        expect(isDeepStrictEqual(Reflect.get(base, field), Reflect.get(alternative, field))).toBe(false);
      }
      for (const field of printingFields) {
        expect(isDeepStrictEqual(Reflect.get(basePrinting, field), Reflect.get(alternativePrinting, field))).toBe(
          false,
        );
      }
    });

    test.each(cardFields)("card field %s is diffed", (field) => {
      const next = CardSchema.parse({ ...base, [field]: Reflect.get(alternative, field) });

      const { changed } = diffCards({ previous: [base], next: [next] });

      expect(fieldNames(changed[0]?.changes)).toEqual([field]);
    });

    test.each(printingFields)("printing field %s is diffed", (field) => {
      const host = makeCard({ id: "host", printings: [basePrinting] });
      const changedPrinting = PrintingSchema.parse({
        ...basePrinting,
        [field]: Reflect.get(alternativePrinting, field),
      });

      const { changed } = diffCards({
        previous: [host],
        next: [{ ...host, printings: [changedPrinting] }],
      });

      expect(fieldNames(changed[0]?.printings.changed[0]?.changes)).toEqual([field]);
    });
  });
});
