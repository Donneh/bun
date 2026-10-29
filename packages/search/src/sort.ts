import type { Card, Printing, Rarity } from "@riftkeeper/cards";
import type { SortDirection, SortKey } from "./search.ts";
import { setReleaseRank } from "./set-order.ts";

type PrintingSortKey = Extract<SortKey, "set" | "collector_number" | "rarity">;
type CardSortKey = Exclude<SortKey, PrintingSortKey>;

interface Representative {
  readonly printing: Printing;
  readonly setRank: number;
}

interface RankedCard {
  readonly card: Card;
  readonly representative: Representative;
}

const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, showcase: 4 };

function compareValues<T extends string | number>(a: T, b: T): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareCollectorOrder(a: Printing, b: Printing): number {
  return compareValues(a.collectorNumber, b.collectorNumber) || compareValues(a.publicCode, b.publicCode);
}

function compareRepresentatives(a: Representative, b: Representative): number {
  return compareValues(a.setRank, b.setRank) || compareCollectorOrder(a.printing, b.printing);
}

function compareNames(a: Card, b: Card): number {
  if (a.name !== b.name) return compareValues(a.name, b.name);
  if (a.subtitle === b.subtitle) return 0;
  if (a.subtitle === null) return -1;
  if (b.subtitle === null) return 1;
  return compareValues(a.subtitle, b.subtitle);
}

function compareTieBreakers(a: Card, b: Card): number {
  return compareNames(a, b) || compareValues(a.id, b.id);
}

function representative(card: Card): Representative {
  let best: Representative | null = null;
  for (const printing of card.printings) {
    const candidate = { printing, setRank: setReleaseRank(printing.set.code) };
    if (best === null || compareRepresentatives(candidate, best) < 0) best = candidate;
  }
  if (best === null) throw new Error(`Card ${card.id} has no printings`);
  return best;
}

function compareStat(a: number | null, b: number | null, direction: SortDirection): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function comparePrintingKey(key: PrintingSortKey, a: Representative, b: Representative): number {
  switch (key) {
    case "set":
      return compareRepresentatives(a, b);
    case "collector_number":
      return compareCollectorOrder(a.printing, b.printing);
    case "rarity":
      return RARITY_RANK[a.printing.rarity] - RARITY_RANK[b.printing.rarity];
  }
}

function compareCardKey(key: CardSortKey, a: Card, b: Card, direction: SortDirection): number {
  switch (key) {
    case "name":
      return (direction === "asc" ? 1 : -1) * compareNames(a, b);
    case "cost":
      return compareStat(a.energyCost, b.energyCost, direction);
    case "might":
      return compareStat(a.might, b.might, direction);
    case "power":
      return compareStat(a.powerCost, b.powerCost, direction);
  }
}

function isPrintingSortKey(key: SortKey): key is PrintingSortKey {
  return key === "set" || key === "collector_number" || key === "rarity";
}

export function sortCards(cards: readonly Card[], key: SortKey, direction: SortDirection): Card[] {
  if (!isPrintingSortKey(key)) {
    return cards.toSorted((a, b) => compareCardKey(key, a, b, direction) || compareTieBreakers(a, b));
  }

  const sign = direction === "asc" ? 1 : -1;
  return cards
    .map((card): RankedCard => ({ card, representative: representative(card) }))
    .sort(
      (a, b) =>
        sign * comparePrintingKey(key, a.representative, b.representative) || compareTieBreakers(a.card, b.card),
    )
    .map((ranked) => ranked.card);
}
