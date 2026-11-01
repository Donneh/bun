import { describe, expect, test } from "bun:test";
import type { Card } from "@riftkeeper/cards";
import { type PricedCard, type PricedPrinting, withPrices } from "@riftkeeper/cards/prices";
import { makeCard, makePriceSnapshot, makePrinting } from "@riftkeeper/cards/testing";
import { cardHref, cardInfo, printingSummaries, searchHref, selectedPrinting } from "../app/utils/card-detail.ts";

const snapshot = makePriceSnapshot({
  updatedAt: "2026-10-31T20:05:59.000Z",
  printings: {
    "ogn-119-298": {
      normal: { market: 0.1, low: 0.01, mid: 0.2, high: 5.11 },
      foil: { market: 1234.5, low: null, mid: 1300, high: 2000 },
    },
    "ogn-119a-298": { foil: { market: null, low: 3, mid: 4, high: null } },
    "abandoned-hall-p1": { foil: { market: null, low: null, mid: 2, high: null } },
  },
});

const priced = (card: Card): PricedCard => withPrices([card], snapshot)[0] as PricedCard;

const ahri = priced(
  makeCard({
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
    tags: ["Ahri", "Bandle City"],
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
  }),
);

const battlefield = priced(
  makeCard({
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
  }),
);

const unpriced = priced(makeCard({ id: "unpriced-token" }));

const firstPrinting = (card: PricedCard) => card.printings[0] as PricedPrinting;
const secondPrinting = (card: PricedCard) => card.printings[1] as PricedPrinting;

describe("cardHref", () => {
  test("links to the card page", () => {
    expect(cardHref("ahri-inquisitive")).toBe("/cards/ahri-inquisitive");
  });
});

describe("searchHref", () => {
  test("links to a search for the query", () => {
    expect(searchHref("t:Ahri")).toBe("/?q=t%3AAhri");
  });
});

describe("cardInfo", () => {
  test("names the domains and the type with their glyphs above the name", () => {
    const info = cardInfo(ahri, firstPrinting(ahri));

    expect(info.name).toBe("Ahri");
    expect(info.subtitle).toBe("Inquisitive");
    expect(info.kicker).toEqual([
      [
        { kind: "glyph", name: "rune_mind", decorative: true },
        { kind: "text", text: "Mind" },
      ],
      [
        { kind: "glyph", name: "rune_calm", decorative: true },
        { kind: "text", text: "Calm" },
      ],
      [
        { kind: "glyph", name: "card_type_unit", decorative: true },
        { kind: "text", text: "Champion Unit" },
      ],
    ]);
  });

  test("lists energy, power and might, showing the energy as its glyph alone", () => {
    expect(cardInfo(ahri, firstPrinting(ahri)).stats).toEqual([
      { label: "Energy", value: "3", glyph: "energy_3", valueShown: false },
      { label: "Power", value: "1", valueShown: true },
      { label: "Might", value: "3 +2", glyph: "might", valueShown: true },
    ]);
  });

  test("shows the power of a single-domain card with its domain rune", () => {
    const fury = priced(makeCard({ domains: ["fury"], energyCost: 2, powerCost: 1, might: null, mightBonus: null }));

    expect(cardInfo(fury, firstPrinting(fury)).stats).toEqual([
      { label: "Energy", value: "2", glyph: "energy_2", valueShown: false },
      { label: "Power", value: "1", glyph: "rune_fury", valueShown: true },
    ]);
  });

  test("spells out an energy cost that has no glyph and shows a might bonus on its own", () => {
    const gear = priced(makeCard({ energyCost: 13, powerCost: null, might: null, mightBonus: 2 }));

    expect(cardInfo(gear, firstPrinting(gear)).stats).toEqual([
      { label: "Energy", value: "13", valueShown: true },
      { label: "Might bonus", value: "+2", glyph: "might", valueShown: true },
    ]);
  });

  test("leaves out the stats, tags and parts a card does not have", () => {
    const info = cardInfo(battlefield, firstPrinting(battlefield));

    expect(info.stats).toEqual([]);
    expect(info.tags).toEqual([]);
    expect(info.rules).toEqual(["When a player plays a spell, they may give a unit +1 :rb_might:."]);
    expect(info.kicker).toEqual([
      [
        { kind: "glyph", name: "colorless", decorative: true },
        { kind: "text", text: "Colorless" },
      ],
      [
        { kind: "glyph", name: "card_type_battlefield", decorative: true },
        { kind: "text", text: "Battlefield" },
      ],
    ]);
  });

  test("keeps the ability before the effect", () => {
    expect(cardInfo(ahri, firstPrinting(ahri)).rules).toEqual([
      "When I attack, give an enemy unit -2 :rb_might:.",
      "[Ganking]",
    ]);
  });

  test("links each tag to a tag search, quoting a tag with a space", () => {
    expect(cardInfo(ahri, firstPrinting(ahri)).tags).toEqual([
      { label: "Ahri", href: searchHref("t:Ahri") },
      { label: "Bandle City", href: searchHref('t:"Bandle City"') },
    ]);
  });

  test("credits the artist of the chosen printing", () => {
    expect(cardInfo(ahri, firstPrinting(ahri)).artist).toBe("Six More Vodka");
    expect(cardInfo(ahri, secondPrinting(ahri)).artist).toBeNull();
  });

  test("prices the chosen printing in dollars per finish, with its low and high and the source and date", () => {
    expect(cardInfo(ahri, firstPrinting(ahri)).pricing).toEqual({
      finishes: [
        {
          finish: "Normal",
          market: "$0.10",
          range: [
            { label: "Low", amount: "$0.01" },
            { label: "High", amount: "$5.11" },
          ],
        },
        { finish: "Foil", market: "$1,234.50", range: [{ label: "High", amount: "$2,000.00" }] },
      ],
      attribution: "Prices: TCGplayer market price via TCGCSV, updated Oct 31, 2026",
    });
  });

  test("shows only the prices a printing has", () => {
    expect(cardInfo(ahri, secondPrinting(ahri)).pricing?.finishes).toEqual([
      { finish: "Foil", market: null, range: [{ label: "Low", amount: "$3.00" }] },
    ]);
  });

  test("leaves out the pricing of a printing without a market, low or high price", () => {
    expect(cardInfo(battlefield, firstPrinting(battlefield)).pricing).toBeNull();
    expect(cardInfo(unpriced, firstPrinting(unpriced)).pricing).toBeNull();
  });
});

describe("printingSummaries", () => {
  test("names the set, the code and the variant, rarity and artist of each printing, with a thumbnail", () => {
    const [first, second] = printingSummaries(ahri);

    expect(first).toMatchObject({
      id: "ogn-119-298",
      setName: "Origins",
      code: "OGN-119/298",
      details: ["Standard", "Epic", "Six More Vodka"],
      imageUrl: firstPrinting(ahri).imageUrl,
    });
    expect(first?.srcset).toContain(" 80w");
    expect(second).toMatchObject({ id: "ogn-119a-298", code: "OGN-119a/298", details: ["Alt art", "Showcase"] });
  });

  test("shows the market price of each finish a printing has, and none without one", () => {
    expect(printingSummaries(ahri).map((summary) => summary.prices)).toEqual([
      [
        { label: "Normal", amount: "$0.10" },
        { label: "Foil", amount: "$1,234.50" },
      ],
      [],
    ]);
    expect(printingSummaries(unpriced)[0]?.prices).toEqual([]);
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
