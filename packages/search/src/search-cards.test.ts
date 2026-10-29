import { describe, expect, test } from "bun:test";
import { type Card, CardIdSchema, type Domain, type Printing, PrintingIdSchema } from "@riftkeeper/cards";
import { parseCardSnapshot } from "@riftkeeper/cards/snapshot";
import { makeCard, makePrinting } from "@riftkeeper/cards/testing";
import snapshot from "../../../apps/api/data/cards.json";
import type { SearchNode } from "./ast.ts";
import type { ComparisonOperator, Filter, TextField } from "./filter.ts";
import { PAGE_SIZE, type SearchRequest } from "./search.ts";
import { searchCards } from "./search-cards.ts";

const span = { start: 0, end: 0 };

function filterNode(filter: Filter): SearchNode {
  return { kind: "filter", filter, keyword: filter.field, span, groupDepth: 0, negated: false };
}

function text(value: string): SearchNode {
  return { kind: "text", value };
}

function and(...children: SearchNode[]): SearchNode {
  return { kind: "and", children };
}

function or(...children: SearchNode[]): SearchNode {
  return { kind: "or", children };
}

function not(child: SearchNode): SearchNode {
  return { kind: "not", child };
}

function numeric(field: "cost" | "might" | "power", operator: ComparisonOperator, value: number): SearchNode {
  return filterNode({ field, comparison: { operator, value } });
}

function textFilter(field: TextField, value: string): SearchNode {
  return filterNode({ field, text: value });
}

function domain(parts: { anyOf?: Domain[]; allOf?: Domain[]; noneOf?: Domain[] }): SearchNode {
  return filterNode({
    field: "domain",
    anyOf: parts.anyOf ?? [],
    allOf: parts.allOf ?? [],
    noneOf: parts.noneOf ?? [],
  });
}

function request(root: SearchNode | null, overrides: Partial<SearchRequest> = {}): SearchRequest {
  return { root, sort: "name", direction: "asc", page: 1, ...overrides };
}

function names(cards: readonly Card[], root: SearchNode | null, overrides: Partial<SearchRequest> = {}): string[] {
  return searchCards(cards, request(root, overrides)).cards.map((card) => card.name);
}

type PrintingInput = Omit<NonNullable<Parameters<typeof makePrinting>[0]>, "id"> & { id: string };
type CardInput = Omit<NonNullable<Parameters<typeof makeCard>[0]>, "id" | "printings"> & {
  id: string;
  printings?: Printing[];
};

function buildPrinting({ id, ...rest }: PrintingInput): Printing {
  return makePrinting({ ...rest, id: PrintingIdSchema.parse(id) });
}

function buildCard({ id, ...rest }: CardInput): Card {
  return makeCard({ ...rest, id: CardIdSchema.parse(id) });
}

function cardWithPrintings(name: string, printings: Omit<PrintingInput, "id">[]): Card {
  const id = name.toLowerCase().replaceAll(" ", "-");
  return buildCard({
    id,
    name,
    printings: printings.map((overrides, index) => buildPrinting({ id: `${id}-p${index}`, ...overrides })),
  });
}

describe("printing-level matching", () => {
  test("keeps only the matching printings in their original order", () => {
    const card = cardWithPrintings("multi", [
      { rarity: "rare", collectorNumber: 3 },
      { rarity: "common", collectorNumber: 2 },
      { rarity: "rare", collectorNumber: 1 },
    ]);

    const [result] = searchCards([card], request(filterNode({ field: "rarity", value: "rare" }))).cards;

    expect(result?.printings.map((printing) => printing.collectorNumber)).toEqual([3, 1]);
  });

  test("requires one printing to satisfy the whole expression", () => {
    const card = cardWithPrintings("multi", [{ rarity: "rare" }, { rarity: "epic" }]);
    const both = and(filterNode({ field: "rarity", value: "rare" }), filterNode({ field: "rarity", value: "epic" }));

    expect(searchCards([card], request(both)).total).toBe(0);
  });

  test("negation applies per printing", () => {
    const card = cardWithPrintings("multi", [{ rarity: "rare" }, { rarity: "common" }]);

    const [result] = searchCards([card], request(not(filterNode({ field: "rarity", value: "rare" })))).cards;

    expect(result?.printings.map((printing) => printing.rarity)).toEqual(["common"]);
  });

  test("a null root matches every card with all its printings", () => {
    const card = cardWithPrintings("multi", [{ rarity: "rare" }, { rarity: "common" }]);

    const page = searchCards([card], request(null));

    expect(page.total).toBe(1);
    expect(page.cards[0]?.printings).toHaveLength(2);
  });

  test("or matches either side", () => {
    const cards = [
      buildCard({ id: "a", name: "Annie" }),
      buildCard({ id: "b", name: "Ashe" }),
      buildCard({ id: "c", name: "Braum" }),
    ];

    expect(names(cards, or(text("Annie"), text("Ashe")))).toEqual(["Annie", "Ashe"]);
  });
});

describe("text node", () => {
  test("matches the name case-insensitively as a substring", () => {
    const cards = [buildCard({ id: "a", name: "Annie" }), buildCard({ id: "b", name: "Ashe" })];

    expect(names(cards, text("NNI"))).toEqual(["Annie"]);
  });

  test("matches across name and subtitle joined by a comma", () => {
    const cards = [
      buildCard({ id: "a", name: "Annie", subtitle: "Fiery" }),
      buildCard({ id: "b", name: "Annie", subtitle: null }),
    ];

    expect(searchCards(cards, request(text("annie, fiery"))).cards.map((card) => String(card.id))).toEqual(["a"]);
  });

  test("matches a tag exactly, ignoring case", () => {
    const cards = [
      buildCard({ id: "a", name: "Gloomist", tags: ["Vex"] }),
      buildCard({ id: "b", name: "Unrelated", tags: ["Vexing"] }),
      buildCard({ id: "c", name: "Keyword Only", tags: [] }),
    ];

    expect(names(cards, text("VEX"))).toEqual(["Gloomist"]);
  });

  test("does not search ability text", () => {
    const cards = [buildCard({ id: "a", name: "Annie", ability: "Deal damage." })];

    expect(names(cards, text("damage"))).toEqual([]);
  });
});

describe("numeric filters", () => {
  const cards = [
    buildCard({ id: "a", name: "Cheap", energyCost: 2, powerCost: 1, might: 1 }),
    buildCard({ id: "b", name: "Strong", energyCost: 6, powerCost: 4, might: 7, mightBonus: 1 }),
    buildCard({ id: "c", name: "Blank", energyCost: null, powerCost: null, might: null }),
  ];

  test("cost compares energyCost", () => {
    expect(names(cards, numeric("cost", ">=", 5))).toEqual(["Strong"]);
  });

  test("power compares powerCost", () => {
    expect(names(cards, numeric("power", "<", 2))).toEqual(["Cheap"]);
  });

  test("might compares might and ignores mightBonus", () => {
    expect(names(cards, numeric("might", "=", 8))).toEqual([]);
    expect(names(cards, numeric("might", "=", 7))).toEqual(["Strong"]);
  });

  test.each([
    ["=", ["Cheap"]],
    ["<", []],
    ["<=", ["Cheap"]],
    [">", ["Strong"]],
    [">=", ["Cheap", "Strong"]],
    ["!=", ["Strong"]],
  ] as const)("operator %s on cost 2", (operator, expected) => {
    expect(names(cards, numeric("cost", operator, 2))).toEqual([...expected]);
  });

  test("a null stat never satisfies a comparison, including !=", () => {
    expect(names(cards, numeric("cost", "!=", 2))).not.toContain("Blank");
  });

  test("negating a comparison includes null stats", () => {
    expect(names(cards, not(numeric("cost", "=", 2)))).toEqual(["Blank", "Strong"]);
  });
});

describe("domain filter", () => {
  const cards = [
    buildCard({ id: "a", name: "Only Fury", domains: ["fury"] }),
    buildCard({ id: "b", name: "Both", domains: ["fury", "calm"] }),
    buildCard({ id: "c", name: "Calm Card", domains: ["calm"] }),
    buildCard({ id: "d", name: "Colorless", domains: [] }),
  ];

  test("anyOf matches a card with any listed domain", () => {
    expect(names(cards, domain({ anyOf: ["fury"] }))).toEqual(["Both", "Only Fury"]);
  });

  test("allOf requires every listed domain", () => {
    expect(names(cards, domain({ allOf: ["fury", "calm"] }))).toEqual(["Both"]);
  });

  test("noneOf excludes cards with a listed domain", () => {
    expect(names(cards, domain({ noneOf: ["fury"] }))).toEqual(["Calm Card", "Colorless"]);
  });

  test("the three lists are ANDed", () => {
    expect(names(cards, domain({ anyOf: ["fury", "calm"], allOf: ["calm"], noneOf: ["fury"] }))).toEqual(["Calm Card"]);
  });

  test("empty lists add no constraint", () => {
    expect(names(cards, domain({}))).toHaveLength(4);
  });
});

describe("enumerated filters", () => {
  test("type and supertype compare the card field", () => {
    const cards = [
      buildCard({ id: "a", name: "Unit", type: "unit", supertype: "champion" }),
      buildCard({ id: "b", name: "Spell", type: "spell", supertype: null }),
    ];

    expect(names(cards, filterNode({ field: "type", value: "spell" }))).toEqual(["Spell"]);
    expect(names(cards, filterNode({ field: "supertype", value: "champion" }))).toEqual(["Unit"]);
  });

  test("rarity and variant compare the printing field", () => {
    const cards = [
      cardWithPrintings("Rare One", [{ rarity: "rare", variant: "standard" }]),
      cardWithPrintings("Alt One", [{ rarity: "common", variant: "alt-art" }]),
    ];

    expect(names(cards, filterNode({ field: "rarity", value: "rare" }))).toEqual(["Rare One"]);
    expect(names(cards, filterNode({ field: "variant", value: "alt-art" }))).toEqual(["Alt One"]);
  });
});

describe("text filters", () => {
  test("tag matches exactly, ignoring case", () => {
    const cards = [
      buildCard({ id: "a", name: "Tagged", tags: ["Annie"] }),
      buildCard({ id: "b", name: "Partial", tags: ["Annie Bear"] }),
    ];

    expect(names(cards, textFilter("tag", "ANNIE"))).toEqual(["Tagged"]);
  });

  test("set matches the code exactly or the name partially, ignoring case", () => {
    const cards = [
      cardWithPrintings("In Origins", [{ set: { code: "OGN", name: "Origins" } }]),
      cardWithPrintings("In Spirits", [{ set: { code: "SFD", name: "Spiritforged" } }]),
    ];

    expect(names(cards, textFilter("set", "ogn"))).toEqual(["In Origins"]);
    expect(names(cards, textFilter("set", "SPIRIT"))).toEqual(["In Spirits"]);
    expect(names(cards, textFilter("set", "rigin"))).toEqual(["In Origins"]);
    expect(names(cards, textFilter("set", "sf"))).toEqual([]);
  });

  test("artist matches partially, ignoring case, and never matches a null artist", () => {
    const cards = [
      cardWithPrintings("Drawn By Kudos", [{ artist: "Kudos Productions" }]),
      cardWithPrintings("Someone Else", [{ artist: "Other Person" }]),
      cardWithPrintings("Unknown", [{ artist: null }]),
    ];

    expect(names(cards, textFilter("artist", "kudos"))).toEqual(["Drawn By Kudos"]);
  });

  test("ability matches the ability or the effect text", () => {
    const cards = [
      buildCard({ id: "a", name: "Has Ability", ability: "Deal 3 damage.", effect: null }),
      buildCard({ id: "b", name: "Has Effect", ability: null, effect: "Take Damage." }),
      buildCard({ id: "c", name: "Neither", ability: "Draw a card.", effect: null }),
    ];

    expect(names(cards, textFilter("ability", "DAMAGE"))).toEqual(["Has Ability", "Has Effect"]);
  });
});

describe("ported HTTP cases", () => {
  test("Annie cost:5 keeps only the Annie with cost 5", () => {
    const cards = [
      buildCard({ id: "annie-fiery", name: "Annie", subtitle: "Fiery", energyCost: 5 }),
      buildCard({ id: "annie-stubborn", name: "Annie", subtitle: "Stubborn", energyCost: 4 }),
      buildCard({ id: "ashe-frost", name: "Ashe", subtitle: "Frost", energyCost: 5 }),
    ];

    const page = searchCards(cards, request(and(text("Annie"), numeric("cost", "=", 5))));

    expect(page.cards.map((card) => String(card.id))).toEqual(["annie-fiery"]);
  });

  test("domain:fury+calm returns only the card with both", () => {
    const cards = [
      buildCard({ id: "a", name: "Only Fury", domains: ["fury"] }),
      buildCard({ id: "b", name: "Both", domains: ["fury", "calm"] }),
    ];

    expect(names(cards, domain({ allOf: ["fury", "calm"] }))).toEqual(["Both"]);
  });

  test("domain:-fury returns the calm card", () => {
    const cards = [
      buildCard({ id: "a", name: "Fury Card", domains: ["fury"] }),
      buildCard({ id: "b", name: "Calm Card", domains: ["calm"] }),
    ];

    expect(names(cards, domain({ noneOf: ["fury"] }))).toEqual(["Calm Card"]);
  });

  test("an unnamed Annie free text search matches the Annie card only", () => {
    const cards = [
      buildCard({ id: "annie-fiery", name: "Annie", subtitle: "Fiery" }),
      buildCard({ id: "ashe-frost", name: "Ashe", subtitle: "Frost" }),
    ];

    expect(searchCards(cards, request(text("Annie"))).cards.map((card) => String(card.id))).toEqual(["annie-fiery"]);
  });
});

describe("sorting", () => {
  const alpha = buildCard({
    id: "alpha",
    name: "Alpha",
    energyCost: 5,
    might: 4,
    powerCost: null,
    printings: [buildPrinting({ id: "alpha-p", publicCode: "OGN-010", collectorNumber: 10, rarity: "rare" })],
  });
  const gamma = buildCard({
    id: "gamma",
    name: "Gamma",
    energyCost: 1,
    might: null,
    powerCost: 2,
    printings: [buildPrinting({ id: "gamma-p", publicCode: "OGN-002", collectorNumber: 2, rarity: "uncommon" })],
  });
  const beta = buildCard({
    id: "beta",
    name: "Beta",
    energyCost: null,
    might: 2,
    powerCost: 1,
    printings: [buildPrinting({ id: "beta-p", publicCode: "OGN-900", collectorNumber: 900, rarity: "common" })],
  });
  const cards = [alpha, gamma, beta];

  function ids(sort: SearchRequest["sort"], direction: SearchRequest["direction"], list: readonly Card[] = cards) {
    return searchCards(list, request(null, { sort, direction })).cards.map((card) => String(card.id));
  }

  test("name descending", () => {
    expect(ids("name", "desc")).toEqual(["gamma", "beta", "alpha"]);
  });

  test("name ascending places a null subtitle first", () => {
    const withSubtitle = buildCard({ id: "x", name: "Annie", subtitle: "Fiery" });
    const without = buildCard({ id: "y", name: "Annie", subtitle: null });

    expect(ids("name", "asc", [withSubtitle, without])).toEqual(["y", "x"]);
  });

  test("cost ascending puts null costs last", () => {
    expect(ids("cost", "asc")).toEqual(["gamma", "alpha", "beta"]);
  });

  test("cost descending still puts null costs last", () => {
    expect(ids("cost", "desc")).toEqual(["alpha", "gamma", "beta"]);
  });

  test("might and power put nulls last in both directions", () => {
    expect(ids("might", "asc")).toEqual(["beta", "alpha", "gamma"]);
    expect(ids("might", "desc")).toEqual(["alpha", "beta", "gamma"]);
    expect(ids("power", "asc")).toEqual(["beta", "gamma", "alpha"]);
    expect(ids("power", "desc")).toEqual(["gamma", "beta", "alpha"]);
  });

  test("rarity descending ranks rare above uncommon above common", () => {
    expect(ids("rarity", "desc")).toEqual(["alpha", "gamma", "beta"]);
  });

  test("showcase ranks above epic", () => {
    const epic = buildCard({ id: "epic", name: "Epic", printings: [buildPrinting({ id: "e", rarity: "epic" })] });
    const showcase = buildCard({
      id: "showcase",
      name: "Showcase",
      printings: [buildPrinting({ id: "s", rarity: "showcase" })],
    });

    expect(ids("rarity", "asc", [showcase, epic])).toEqual(["epic", "showcase"]);
  });

  test("collector number sorts numerically and ignores the set", () => {
    expect(ids("collector_number", "asc")).toEqual(["gamma", "alpha", "beta"]);

    const laterSetLowNumber = buildCard({
      id: "later",
      name: "Later",
      printings: [
        buildPrinting({ id: "l", set: { code: "RAD", name: "Radiance" }, collectorNumber: 1, publicCode: "RAD-001" }),
      ],
    });
    const earlierSetHighNumber = buildCard({
      id: "earlier",
      name: "Earlier",
      printings: [
        buildPrinting({ id: "e", set: { code: "OGN", name: "Origins" }, collectorNumber: 50, publicCode: "OGN-050" }),
      ],
    });

    expect(ids("collector_number", "asc", [earlierSetHighNumber, laterSetLowNumber])).toEqual(["later", "earlier"]);
  });

  test("set sorts by release order, then collector number, then public code", () => {
    const later = buildCard({
      id: "later",
      name: "Later",
      printings: [
        buildPrinting({ id: "l", set: { code: "RAD", name: "Radiance" }, collectorNumber: 1, publicCode: "RAD-001" }),
      ],
    });
    const sameNumberB = buildCard({
      id: "b",
      name: "B",
      printings: [buildPrinting({ id: "b", collectorNumber: 5, publicCode: "OGN-005b" })],
    });
    const sameNumberA = buildCard({
      id: "a",
      name: "A",
      printings: [buildPrinting({ id: "a", collectorNumber: 5, publicCode: "OGN-005a" })],
    });
    const lowNumber = buildCard({
      id: "low",
      name: "Low",
      printings: [buildPrinting({ id: "low", collectorNumber: 2, publicCode: "OGN-002" })],
    });

    expect(ids("set", "asc", [later, sameNumberB, sameNumberA, lowNumber])).toEqual(["low", "a", "b", "later"]);
    expect(ids("set", "desc", [later, sameNumberB, sameNumberA, lowNumber])).toEqual(["later", "b", "a", "low"]);
  });

  test("uses the first matching printing, in release order, as the representative", () => {
    const card = buildCard({
      id: "multi",
      name: "Multi",
      printings: [
        buildPrinting({
          id: "m1",
          set: { code: "RAD", name: "Radiance" },
          collectorNumber: 1,
          publicCode: "RAD-001",
          rarity: "rare",
        }),
        buildPrinting({
          id: "m2",
          set: { code: "OGN", name: "Origins" },
          collectorNumber: 99,
          publicCode: "OGN-099",
          rarity: "common",
        }),
      ],
    });
    const other = buildCard({
      id: "other",
      name: "Other",
      printings: [
        buildPrinting({ id: "o", set: { code: "OGN", name: "Origins" }, collectorNumber: 50, publicCode: "OGN-050" }),
      ],
    });

    expect(ids("set", "asc", [card, other])).toEqual(["other", "multi"]);

    const onlyRad = searchCards([card, other], request(textFilter("set", "RAD"), { sort: "rarity", direction: "asc" }));
    expect(onlyRad.cards.map((result) => String(result.id))).toEqual(["multi"]);
  });

  test("direction reverses only the primary key, tie-breakers stay ascending", () => {
    const first = buildCard({ id: "z-first", name: "Same", subtitle: "A", energyCost: 3 });
    const second = buildCard({ id: "a-second", name: "Same", subtitle: "B", energyCost: 3 });
    const third = buildCard({ id: "m-third", name: "Aardvark", subtitle: null, energyCost: 3 });
    const higher = buildCard({ id: "high", name: "High", energyCost: 9 });

    expect(ids("cost", "desc", [second, first, higher, third])).toEqual(["high", "m-third", "z-first", "a-second"]);
  });

  test("falls back to card id when name and subtitle tie", () => {
    const b = buildCard({ id: "b", name: "Same", subtitle: null, energyCost: 3 });
    const a = buildCard({ id: "a", name: "Same", subtitle: null, energyCost: 3 });

    expect(ids("cost", "desc", [b, a])).toEqual(["a", "b"]);
  });
});

describe("pagination", () => {
  const cards = Array.from({ length: PAGE_SIZE + 5 }, (_, index) =>
    buildCard({ id: `card-${String(index).padStart(3, "0")}`, name: `Card ${String(index).padStart(3, "0")}` }),
  );

  test("returns PAGE_SIZE cards on the first page with the total", () => {
    const page = searchCards(cards, request(null, { page: 1 }));

    expect(page.cards).toHaveLength(PAGE_SIZE);
    expect(page.total).toBe(PAGE_SIZE + 5);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(PAGE_SIZE);
  });

  test("returns the remainder on the last page", () => {
    const page = searchCards(cards, request(null, { page: 2 }));

    expect(page.cards.map((card) => card.name)).toEqual(cards.slice(PAGE_SIZE).map((card) => card.name));
  });

  test("a page past the end has no cards but keeps the total", () => {
    const page = searchCards(cards, request(null, { page: 3 }));

    expect(page.cards).toEqual([]);
    expect(page.total).toBe(PAGE_SIZE + 5);
  });

  test.each([0, -4])("clamps page %d to 1", (requested) => {
    const page = searchCards(cards, request(null, { page: requested }));

    expect(page.page).toBe(1);
    expect(page.cards[0]?.name).toBe("Card 000");
  });
});

describe("real snapshot", () => {
  test("a null root matches every card", () => {
    const cards = parseCardSnapshot({ json: snapshot, path: "apps/api/data/cards.json" });

    const page = searchCards(cards, request(null, { sort: "set" }));

    expect(page.total).toBe(cards.length);
    expect(page.cards).toHaveLength(Math.min(PAGE_SIZE, cards.length));
  });
});
