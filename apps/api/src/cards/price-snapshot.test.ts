import { describe, expect, test } from "bun:test";
import { parsePriceSnapshot } from "@riftkeeper/cards/prices";
import snapshot from "../../data/prices.json";
import { prices } from "./price-snapshot.ts";

describe("price snapshot", () => {
  test("the Worker serves the committed prices exactly as the price schema parses them", () => {
    expect(prices).toEqual(parsePriceSnapshot({ json: snapshot, path: "apps/api/data/prices.json" }));
  });
});
