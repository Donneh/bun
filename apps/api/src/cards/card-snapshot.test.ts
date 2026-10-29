import { describe, expect, test } from "bun:test";
import { parseCardSnapshot } from "@riftkeeper/cards/snapshot";
import snapshot from "../../data/cards.json";
import { cards } from "./card-snapshot.ts";

describe("card snapshot", () => {
  test("the Worker serves the committed snapshot exactly as the card schema parses it", () => {
    expect(cards).toEqual(parseCardSnapshot({ json: snapshot, path: "apps/api/data/cards.json" }));
  });
});
