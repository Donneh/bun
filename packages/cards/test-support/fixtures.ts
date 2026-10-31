import type { z } from "zod";
import { type Card, CardSchema, type Printing, PrintingSchema } from "../src/card.ts";
import { type PriceSnapshot, PriceSnapshotSchema } from "../src/price.ts";

type PrintingOverrides = Partial<z.input<typeof PrintingSchema>>;
type CardOverrides = Partial<z.input<typeof CardSchema>>;
type PriceSnapshotOverrides = Partial<z.input<typeof PriceSnapshotSchema>>;

export function makePrinting(overrides: PrintingOverrides = {}): Printing {
  return PrintingSchema.parse({
    id: "ogn-001a-001",
    publicCode: "OGN-001a/298",
    set: { code: "OGN", name: "Origins" },
    collectorNumber: 1,
    variant: "standard",
    rarity: "common",
    artist: "Test Artist",
    imageUrl: "https://cdn.example.com/cards/ogn-001a.png?v=1",
    orientation: "portrait",
    ...overrides,
  });
}

export function makeCard(overrides: CardOverrides = {}): Card {
  const id = overrides.id ?? "test-card";
  return CardSchema.parse({
    id,
    name: "Test Card",
    subtitle: null,
    type: "unit",
    supertype: null,
    domains: ["fury"],
    energyCost: 2,
    powerCost: null,
    might: 3,
    mightBonus: null,
    ability: "Draw a card.",
    effect: null,
    tags: [],
    printings: [makePrinting({ id: `${id}-p1` })],
    ...overrides,
  });
}

export function makePriceSnapshot(overrides: PriceSnapshotOverrides = {}): PriceSnapshot {
  return PriceSnapshotSchema.parse({
    currency: "USD",
    source: "TCGplayer via TCGCSV",
    updatedAt: "2026-10-31T20:05:59.000Z",
    printings: {},
    ...overrides,
  });
}
