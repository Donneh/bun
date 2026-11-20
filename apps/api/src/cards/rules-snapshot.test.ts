import { describe, expect, test } from "bun:test";
import { parseRulesSnapshot } from "@riftkeeper/cards/rules";
import snapshot from "../../data/rules.json";
import { cards } from "./card-snapshot.ts";
import { rules } from "./rules-snapshot.ts";

describe("rules snapshot", () => {
  test("the Worker serves the committed rules exactly as the rules schema parses them", () => {
    expect(rules).toEqual(parseRulesSnapshot({ json: snapshot, path: "apps/api/data/rules.json" }));
  });

  test("every ban, errata and ruling names a card in the card snapshot", () => {
    const ids = new Set<string>(cards.map((card) => card.id));
    const named = [
      ...rules.bans.map((ban) => ban.card),
      ...rules.errata.map((entry) => entry.card),
      ...rules.rulings.flatMap((ruling) => ruling.cards),
    ];

    expect(named.filter((id) => !ids.has(id))).toEqual([]);
  });
});
