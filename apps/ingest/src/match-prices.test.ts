import { describe, expect, test } from "bun:test";
import { PrintingIdSchema } from "@riftkeeper/cards";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import { matchPrices } from "./match-prices.ts";
import type { TcgcsvPrice, TcgcsvProduct } from "./tcgcsv.ts";

function product(productId: number, name: string, number?: string): TcgcsvProduct {
  return { productId, name, extendedData: number === undefined ? [] : [{ name: "Number", value: number }] };
}

function price(productId: number, subTypeName: string, marketPrice: number | null): TcgcsvPrice {
  return {
    productId,
    subTypeName,
    marketPrice,
    lowPrice: marketPrice === null ? null : marketPrice / 2,
    midPrice: marketPrice,
    highPrice: marketPrice === null ? null : marketPrice * 4,
  };
}

const quote = (market: number) => ({ market, low: market / 2, mid: market, high: market * 4 });

const common = makePrinting({ id: "unl-001-219", publicCode: "UNL-001/219", set: { code: "UNL", name: "Unleashed" } });
const showcase = makePrinting({
  id: "unl-201s-219",
  publicCode: "UNL-201*/219",
  set: { code: "UNL", name: "Unleashed" },
});
const token = makePrinting({ id: "unl-t01", publicCode: "UNL-T01", set: { code: "UNL", name: "Unleashed" } });
const cards = [
  makeCard({ id: "jinx", name: "Jinx", printings: [common, showcase] }),
  makeCard({ id: "baron-pit", name: "Baron Pit", printings: [token] }),
];

const unleashed = {
  setCode: "UNL",
  products: [
    product(1, "Jinx", "001/219"),
    product(2, "Jinx (Showcase)", "201*/219"),
    product(3, "Baron Pit // Gold", "T01 // T05"),
    product(4, "Unleashed Booster Pack"),
  ],
  prices: [
    price(1, "Foil", 0.4),
    price(1, "Normal", 0.1),
    price(2, "Foil", 120),
    price(2, "Normal", null),
    price(4, "Normal", 5),
  ],
};

describe("matchPrices", () => {
  test("gives a printing sold in both finishes a normal and a foil quote", () => {
    const match = matchPrices({ cards, sets: [unleashed] });

    expect(match.printings.get(common.id)).toEqual({ normal: quote(0.1), foil: quote(0.4) });
  });

  test("leaves out a finish without any price", () => {
    const match = matchPrices({ cards, sets: [unleashed] });

    expect(match.printings.get(showcase.id)).toEqual({ foil: quote(120) });
  });

  test("lists a token without a product as unpriced and its combined product as unmatched", () => {
    const match = matchPrices({ cards, sets: [unleashed] });

    expect(match.printings.has(token.id)).toBe(false);
    expect(match.setCodeByPrinting.size).toBe(3);
    expect(match.unpricedPrintings).toEqual([{ publicCode: "UNL-T01", cardName: "Baron Pit" }]);
    expect(match.unmatchedProducts).toEqual([
      { productId: 3, publicCode: "UNL-T01 // T05", name: "Baron Pit // Gold", reason: "no-printing" },
    ]);
  });

  test("prices no printing from products that share its number", () => {
    const duplicate = { ...unleashed, products: [...unleashed.products, product(5, "Jinx (Promo)", "001/219")] };

    const match = matchPrices({ cards, sets: [duplicate] });

    expect(match.printings.has(PrintingIdSchema.parse("unl-001-219"))).toBe(false);
    expect(match.unmatchedProducts.filter((unmatched) => unmatched.reason === "shared-number")).toEqual([
      { productId: 1, publicCode: "UNL-001/219", name: "Jinx", reason: "shared-number" },
      { productId: 5, publicCode: "UNL-001/219", name: "Jinx (Promo)", reason: "shared-number" },
    ]);
  });

  test("prices nothing in a set TCGCSV did not return", () => {
    const match = matchPrices({ cards, sets: [] });

    expect(match.printings.size).toBe(0);
    expect(match.unpricedPrintings).toHaveLength(3);
  });
});
