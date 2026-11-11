import { describe, expect, test } from "bun:test";
import { makeCard, makePriceSnapshot, makePrinting } from "../test-support/fixtures.ts";
import { PrintingIdSchema } from "./card.ts";
import { parsePriceSnapshot, withPrices } from "./price.ts";

const quote = { market: 1.25, low: 0.99, mid: 1.5, high: 4 };

describe("price snapshot", () => {
  test("rejects a printing without a normal or a foil quote", () => {
    const failure = () =>
      parsePriceSnapshot({ json: { ...makePriceSnapshot(), printings: { "ogn-001-298": {} } }, path: "prices.json" });

    expect(failure).toThrow("Price snapshot prices.json does not match the price schema");
    expect(failure).toThrow("A priced printing needs a normal or a foil quote");
  });

  test("rejects a zero or sub-cent amount, which must be null instead", () => {
    for (const market of [0, 0.004]) {
      const printings = { "ogn-001-298": { normal: { ...quote, market } } };

      expect(() => parsePriceSnapshot({ json: { ...makePriceSnapshot(), printings }, path: "prices.json" })).toThrow(
        "does not match the price schema",
      );
    }
  });

  test("rejects another currency", () => {
    expect(() =>
      parsePriceSnapshot({ json: { ...makePriceSnapshot(), currency: "EUR" }, path: "prices.json" }),
    ).toThrow("does not match the price schema");
  });
});

describe("withPrices", () => {
  test("gives each printing its quotes with the currency, source and date, and null when it has none", () => {
    const priced = makePrinting({ id: "ogn-001-298" });
    const unpriced = makePrinting({ id: "unl-t01" });
    const snapshot = makePriceSnapshot({
      printings: { [PrintingIdSchema.parse("ogn-001-298")]: { normal: quote, foil: { ...quote, market: 3 } } },
    });

    const [card] = withPrices([makeCard({ printings: [priced, unpriced] })], snapshot);

    expect(card?.printings.map((printing) => printing.prices)).toEqual([
      {
        normal: quote,
        foil: { ...quote, market: 3 },
        currency: "USD",
        source: "TCGplayer via TCGCSV",
        updatedAt: "2026-10-31T20:05:59.000Z",
      },
      null,
    ]);
  });
});
