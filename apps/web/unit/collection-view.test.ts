import { describe, expect, test } from "bun:test";
import { withPrices } from "@riftkeeper/cards/prices";
import { makeCard, makePriceSnapshot, makePrinting } from "@riftkeeper/cards/testing";
import type { Collection } from "../app/utils/collection.ts";
import { cardOwnership, collectionView, importPreview } from "../app/utils/collection-view.ts";

const standard = makePrinting({ id: "ogn-001-298", publicCode: "OGN-001/298" });
const altArt = makePrinting({ id: "ogn-001a-298", publicCode: "OGN-001a/298", variant: "alt-art" });
const other = makePrinting({ id: "ogn-002-298", publicCode: "OGN-002/298" });
const jinx = makeCard({ id: "jinx", name: "Jinx", printings: [standard, altArt] });
const vi = makeCard({ id: "vi", name: "Vi", printings: [other] });

const collection: Collection = {
  version: 1,
  printings: {
    "OGN-001a/298": { owned: 2, wishlist: false },
    "OGN-002/298": { owned: 1, wishlist: true },
    "XXX-999/999": { owned: 1, wishlist: false },
  },
};

describe("cardOwnership", () => {
  test("sums the copies of every printing of the card and reports the selected one", () => {
    expect(cardOwnership(collection, jinx, standard)).toEqual({
      code: "OGN-001/298",
      owned: 0,
      wishlisted: false,
      copiesOfCard: 2,
      ownedPrintings: 1,
      printingCount: 2,
    });
  });
});

describe("collectionView", () => {
  const catalogue = withPrices(
    [jinx, vi],
    makePriceSnapshot({
      printings: {
        "ogn-001a-298": { normal: { market: 1.5, low: null, mid: null, high: null } },
        "ogn-002-298": { foil: { market: 10, low: null, mid: null, high: null } },
      },
    }),
  );

  test("shows each owned printing with its count and a link to that printing", () => {
    const view = collectionView(collection, catalogue);

    expect(view.owned.map(({ id, name, count, href }) => ({ id, name, count, href }))).toEqual([
      { id: "OGN-001a/298", name: "Jinx", count: 2, href: "/cards/jinx?printing=ogn-001a-298" },
      { id: "OGN-002/298", name: "Vi", count: 1, href: "/cards/vi?printing=ogn-002-298" },
    ]);
    expect(view.wishlist.map(({ id, count }) => ({ id, count }))).toEqual([{ id: "OGN-002/298", count: undefined }]);
  });

  test("counts printings the card list does not know", () => {
    expect(collectionView(collection, catalogue).unknown).toBe(1);
  });

  test("values the owned copies at the market price, normal before foil, with the source and date", () => {
    expect(collectionView(collection, catalogue).value).toEqual({
      amount: "$13.00",
      source: "TCGplayer via TCGCSV market prices, 31 Oct 2026",
    });
  });

  test("has no value without prices", () => {
    expect(collectionView(collection, withPrices([jinx, vi], makePriceSnapshot())).value).toBeNull();
  });
});

describe("importPreview", () => {
  test("names the file and previews merging and replacing", () => {
    const incoming: Collection = { version: 1, printings: { "OGN-001/298": { owned: 1, wishlist: false } } };

    expect(importPreview("backup.json", collection, incoming)).toEqual({
      fileName: "backup.json",
      printings: 1,
      options: [
        { mode: "merge", added: 1, changed: 0, removed: 0, copies: 5, wishlist: 1 },
        { mode: "replace", added: 1, changed: 0, removed: 3, copies: 1, wishlist: 0 },
      ],
    });
  });
});
