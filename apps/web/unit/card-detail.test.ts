import { describe, expect, test } from "bun:test";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import { cardFacts, cardHref, printingSummaries, selectedPrinting } from "../app/utils/card-detail.ts";

const ahri = makeCard({
  id: "ahri-inquisitive",
  name: "Ahri",
  subtitle: "Inquisitive",
  type: "unit",
  supertype: "champion",
  domains: ["mind", "calm"],
  energyCost: 3,
  powerCost: 1,
  might: 3,
  mightBonus: 2,
  ability: "When I attack, give an enemy unit -2 :rb_might:.",
  effect: "[Ganking]",
  tags: ["Ahri", "Ionia"],
  printings: [
    makePrinting({ id: "ogn-119-298", publicCode: "OGN-119/298", rarity: "epic", artist: "Six More Vodka" }),
    makePrinting({
      id: "ogn-119a-298",
      publicCode: "OGN-119a/298",
      variant: "alt-art",
      rarity: "showcase",
      artist: null,
    }),
  ],
});

const battlefield = makeCard({
  id: "abandoned-hall",
  type: "battlefield",
  supertype: null,
  domains: ["colorless"],
  energyCost: null,
  powerCost: null,
  might: null,
  mightBonus: null,
  ability: "When a player plays a spell, they may give a unit +1 :rb_might:.",
  effect: null,
  tags: [],
});

describe("cardHref", () => {
  test("links to the card page", () => {
    expect(cardHref("ahri-inquisitive")).toBe("/cards/ahri-inquisitive");
  });
});

describe("cardFacts", () => {
  test("lists every fact the card has, in reading order", () => {
    expect(cardFacts(ahri)).toEqual([
      { label: "Type", value: "Unit · Champion" },
      { label: "Domains", value: "Mind · Calm" },
      { label: "Cost", value: "3 energy · 1 power" },
      { label: "Might", value: "3" },
      { label: "Might bonus", value: "+2" },
      { label: "Tags", value: "Ahri · Ionia" },
      { label: "Ability", value: "When I attack, give an enemy unit -2 :rb_might:.", rulesText: true },
      { label: "Effect", value: "[Ganking]", rulesText: true },
    ]);
  });

  test("leaves out the facts a card does not have", () => {
    expect(cardFacts(battlefield).map((fact) => fact.label)).toEqual(["Type", "Domain", "Ability"]);
  });

  test("shows a cost of zero", () => {
    const free = makeCard({ energyCost: 0, powerCost: null });

    expect(cardFacts(free).find((fact) => fact.label === "Cost")?.value).toBe("0 energy");
  });
});

describe("printingSummaries", () => {
  test("names the set, the code and the variant, rarity and artist of each printing", () => {
    expect(printingSummaries(ahri)).toEqual([
      { id: "ogn-119-298", setName: "Origins", code: "OGN-119/298", details: ["Standard", "Epic", "Six More Vodka"] },
      { id: "ogn-119a-298", setName: "Origins", code: "OGN-119a/298", details: ["Alt art", "Showcase"] },
    ]);
  });
});

describe("selectedPrinting", () => {
  test("picks the requested printing", () => {
    expect(selectedPrinting(ahri, "ogn-119a-298").id as string).toBe("ogn-119a-298");
  });

  test("falls back to the first printing for a missing or unknown id", () => {
    expect(selectedPrinting(ahri, undefined).id as string).toBe("ogn-119-298");
    expect(selectedPrinting(ahri, "no-such-printing").id as string).toBe("ogn-119-298");
    expect(selectedPrinting(ahri, ["ogn-119a-298"]).id as string).toBe("ogn-119-298");
  });
});
