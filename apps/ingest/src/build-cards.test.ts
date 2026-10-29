import { describe, expect, test } from "bun:test";
import {
  type Card,
  CardIdSchema,
  CardSchema,
  DomainSchema,
  GAMEPLAY_FIELDS,
  type Gameplay,
  PrintingIdSchema,
} from "@riftkeeper/cards";
import { loadFixturePrintings, printingById } from "../test-support/fixtures.ts";
import { buildCards, differingFields } from "./build-cards.ts";
import type { RawPrinting } from "./riot-gallery.schema.ts";
import type { ScrapeWarning } from "./scrape-warning.ts";

const cardId = (value: string) => CardIdSchema.parse(value);
const printingId = (value: string) => PrintingIdSchema.parse(value);

function cardById({ cards, id }: { cards: readonly Card[]; id: string }): Card {
  const found = cards.find((card) => card.id === id);
  if (!found) {
    throw new Error(`No card ${id} in build result`);
  }
  return found;
}

function warningsFor({ warnings, cardId: id }: { warnings: readonly ScrapeWarning[]; cardId: string }) {
  return warnings.filter((warning) => warning.cardId === id);
}

describe("buildCards on curated fixtures", () => {
  test("groups printings into one card per name and subtitle", async () => {
    const { cards } = buildCards(await loadFixturePrintings());
    const ahri = cardById({ cards, id: "ahri-inquisitive" });
    expect(ahri.name).toBe("Ahri");
    expect(ahri.subtitle).toBe("Inquisitive");
    expect(ahri.printings.map((printing) => String(printing.id))).toEqual([
      "ogn-119-298",
      "ogn-119a-298",
      "sfd-227-221",
      "sfd-227-star-221",
      "ven-sp3-006",
    ]);
    expect(ahri.printings.map((printing) => printing.variant)).toEqual([
      "standard",
      "alt-art",
      "standard",
      "signed",
      "special",
    ]);
  });

  test("produces only schema-valid cards sorted by id", async () => {
    const { cards } = buildCards(await loadFixturePrintings());
    for (const card of cards) {
      expect(CardSchema.safeParse(card).success).toBe(true);
    }
    expect(cards.map((card) => card.id)).toEqual([...cards.map((card) => card.id)].sort());
  });

  test("is deterministic regardless of input order", async () => {
    const printings = await loadFixturePrintings();
    expect(buildCards([...printings].reverse())).toEqual(buildCards(printings));
  });

  test("orders domains like DomainSchema and sorts and dedupes tags whatever the input order", async () => {
    const base = printingById({ printings: await loadFixturePrintings(), id: "ogn-119-298" });
    const scrambled: RawPrinting = {
      ...base,
      domain: { values: ["order", "fury", "colorless", "calm"].map((id) => ({ id: DomainSchema.parse(id) })) },
      tags: { tags: ["Piltover", "Noxus", "Piltover", "Ionia"] },
    };

    const { cards } = buildCards([scrambled]);

    expect(cards[0]?.domains).toEqual(
      DomainSchema.options.filter((domain) => ["order", "fury", "colorless", "calm"].includes(domain)),
    );
    expect(cards[0]?.tags).toEqual(["Ionia", "Noxus", "Piltover"]);
  });

  test("drops the query string from image urls", async () => {
    const { cards } = buildCards(await loadFixturePrintings());
    for (const printing of cards.flatMap((card) => card.printings)) {
      expect(printing.imageUrl).not.toContain("?");
    }
  });

  test("maps a landscape battlefield", async () => {
    const { cards } = buildCards(await loadFixturePrintings());
    const battlefield = cardById({ cards, id: "abandoned-hall" });
    expect(battlefield.type).toBe("battlefield");
    expect(battlefield.printings[0]?.orientation).toBe("landscape");
  });

  test("maps gear with a might bonus and keeps list text as dashed lines", async () => {
    const { cards } = buildCards(await loadFixturePrintings());
    const gear = cardById({ cards, id: "blade-of-the-exile" });
    expect(gear.type).toBe("gear");
    expect(gear.mightBonus).toBe(3);
    expect(gear.effect).toContain("[Ganking]");
    expect(gear.ability).toContain("[Equip]");
    const aphelios = cardById({ cards, id: "aphelios-exalted" });
    expect(aphelios.ability).toContain("\n- Ready 2 runes.\n- Channel 1 rune exhausted.");
  });

  test("decodes entities and keeps rich text tokens verbatim", async () => {
    const { cards } = buildCards(await loadFixturePrintings());
    const akali = cardById({ cards, id: "akali-deadly-weapon" });
    expect(akali.ability).toContain("[Empowered][>] I have +1 :rb_might:.");
  });

  test("keeps stat values and supertypes", async () => {
    const { cards } = buildCards(await loadFixturePrintings());
    const legend = cardById({ cards, id: "agonys-embrace" });
    expect(legend.type).toBe("legend");
    expect(legend.printings.map((printing) => String(printing.id))).toEqual(["rad-153-167", "rad-175-167"]);
    const ahri = cardById({ cards, id: "ahri-inquisitive" });
    expect(ahri).toMatchObject({ supertype: "champion", energyCost: 3, powerCost: 1, might: 3 });
  });

  test("takes card-level fields from the standard printing, then the lowest collector number", async () => {
    const printings = await loadFixturePrintings();
    const { cards } = buildCards([...printings].reverse());
    expect(cardById({ cards, id: "kaisa-rebel" }).might).toBe(5);
    expect(cardById({ cards, id: "aphelios-exalted" }).ability).toContain("Buff a friendly unit.");
  });

  test("does not warn when printings differ only by reminder text or omitted tags", async () => {
    const { warnings } = buildCards(await loadFixturePrintings());
    expect(warningsFor({ warnings, cardId: "ambessa-respected-and-feared" })).toEqual([]);
    expect(warningsFor({ warnings, cardId: "ambessa-the-wolf" })).toEqual([]);
    expect(warningsFor({ warnings, cardId: "ahri-inquisitive" })).toEqual([]);
  });

  test("warns when printings disagree on gameplay beyond reminder text", async () => {
    const { warnings } = buildCards(await loadFixturePrintings());
    expect(warningsFor({ warnings, cardId: "kaisa-rebel" })).toEqual([
      {
        kind: "conflicting-printings",
        cardId: cardId("kaisa-rebel"),
        canonicalPrintingId: printingId("rad-063-167"),
        fields: ["might", "ability"],
        printingIds: [printingId("rad-sp4-005")],
      },
    ]);
  });

  test("surfaces Riot's missing and inconsistent types as warnings without fixing them", async () => {
    const { cards, warnings } = buildCards(await loadFixturePrintings());
    expect(cardById({ cards, id: "fanfare" }).type).toBeNull();
    expect(warningsFor({ warnings, cardId: "fanfare" }).map((warning) => warning.kind)).toEqual([
      "untyped-card",
      "missing-domain",
    ]);
    expect(cardById({ cards, id: "fanfare" }).domains).toEqual([]);
    expect(warningsFor({ warnings, cardId: "battlefield-armorer" }).map((warning) => warning.kind)).toEqual([
      "spell-with-might",
    ]);
    expect(warningsFor({ warnings, cardId: "bushwhack-trap" }).map((warning) => warning.kind)).toEqual([
      "unit-without-might",
    ]);
    expect(cardById({ cards, id: "battlefield-armorer" }).type).toBe("spell");
  });

  test("keeps token cards and warns about a missing type", async () => {
    const { cards, warnings } = buildCards(await loadFixturePrintings());
    const buff = cardById({ cards, id: "buff" });
    expect(buff.printings[0]?.variant).toBe("token");
    expect(warningsFor({ warnings, cardId: "buff" })).toEqual([{ kind: "untyped-card", cardId: cardId("buff") }]);
  });

  test("warns about printings without an artist", async () => {
    const { cards, warnings } = buildCards(await loadFixturePrintings());
    expect(warningsFor({ warnings, cardId: "akali-brash" })).toEqual([
      { kind: "missing-artist", cardId: cardId("akali-brash"), printingId: printingId("rad-sp2-005") },
    ]);
    expect(cardById({ cards, id: "akali-brash" }).printings[0]?.artist).toBeNull();
  });

  test("throws when two different cards produce the same id", async () => {
    const printings = await loadFixturePrintings();
    const base = printingById({ printings, id: "unl-205-219" });
    const withSubtitle: RawPrinting = { ...base, id: printingId("unl-206-219"), name: "Abandoned", subtitle: "Hall" };
    expect(() => buildCards([base, withSubtitle])).toThrow("abandoned-hall");
  });

  test("throws on duplicate printing ids", async () => {
    const printings = await loadFixturePrintings();
    const base = printingById({ printings, id: "unl-205-219" });
    expect(() => buildCards([base, base])).toThrow("unl-205-219");
  });

  test("throws naming the printing when its id matches no variant pattern", async () => {
    const printings = await loadFixturePrintings();
    const base = printingById({ printings, id: "unl-205-219" });
    expect(() => buildCards([{ ...base, id: printingId("weird") }])).toThrow("weird");
  });
});

describe("differingFields", () => {
  const canonical: Gameplay = {
    type: "unit",
    supertype: "champion",
    domains: ["fury"],
    energyCost: 2,
    powerCost: 1,
    might: 3,
    mightBonus: 1,
    ability: "Draw a card.",
    effect: "Ready me.",
    tags: ["Noxus"],
  };

  function changed(value: unknown): unknown {
    if (Array.isArray(value)) return [...value, "extra"];
    if (typeof value === "number") return value + 1;
    return `${value} changed`;
  }

  test("reports an identical gameplay as agreeing", () => {
    expect(differingFields({ canonical, other: canonical })).toEqual([]);
  });

  test.each(GAMEPLAY_FIELDS)("detects a conflict in %s", (field) => {
    const other = { ...canonical, [field]: changed(canonical[field]) };

    expect(differingFields({ canonical, other })).toEqual([field]);
  });
});
