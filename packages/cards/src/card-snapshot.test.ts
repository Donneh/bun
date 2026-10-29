import { describe, expect, test } from "bun:test";
import { makeCard } from "../test-support/fixtures.ts";
import { parseCardSnapshot } from "./card-snapshot.ts";

describe("card snapshot", () => {
  test("rejects duplicate card ids", () => {
    const card = makeCard({ id: "abandon" });

    expect(() => parseCardSnapshot({ json: [card, card], path: "cards.json" })).toThrow("Card ids must be unique");
  });

  test("names the file and the rebuild command when the schema does not match", () => {
    const { subtitle: _removed, ...outdated } = makeCard();

    const failure = () => parseCardSnapshot({ json: [outdated, outdated], path: "cards.json" });

    expect(failure).toThrow("Card snapshot cards.json does not match the card schema (2 issues");
    expect(failure).toThrow("bun run scrape --rebuild");
  });
});
