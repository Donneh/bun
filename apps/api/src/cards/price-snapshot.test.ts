import { describe, expect, test } from "bun:test";
import { parsePriceHistory } from "@riftkeeper/cards/price-history";
import { parsePriceSnapshot } from "@riftkeeper/cards/prices";
import historySnapshot from "../../data/price-history.json";
import snapshot from "../../data/prices.json";
import { priceHistory, prices } from "./price-snapshot.ts";

describe("price snapshot", () => {
  test("the Worker serves the committed prices exactly as the price schema parses them", () => {
    expect(prices).toEqual(parsePriceSnapshot({ json: snapshot, path: "apps/api/data/prices.json" }));
  });

  test("the Worker serves the committed price history exactly as the price history schema parses it", () => {
    expect(priceHistory).toEqual(
      parsePriceHistory({ json: historySnapshot, path: "apps/api/data/price-history.json" }),
    );
  });

  test("the price history ends no later than the day of the committed prices", () => {
    expect((priceHistory.dates.at(-1) ?? "") <= prices.updatedAt.slice(0, 10)).toBe(true);
  });
});
