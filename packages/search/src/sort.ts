import type { Card, Printing, Rarity } from "@riftkeeper/cards";
import type { SortDirection, SortKey } from "./search.ts";
import { setReleaseRank } from "./set-order.ts";

const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, showcase: 4 };

function compareValues<T extends string | number>(a: T, b: T): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareCollectorOrder(a: Printing, b: Printing): number {
  return compareValues(a.collectorNumber, b.collectorNumber) || compareValues(a.publicCode, b.publicCode);
}

function comparePrintings(a: Printing, b: Printing): number {
  return compareValues(setReleaseRank(a.set.code), setReleaseRank(b.set.code)) || compareCollectorOrder(a, b);
}

function compareNames(a: Card, b: Card): number {
  if (a.name !== b.name) return compareValues(a.name, b.name);
  if (a.subtitle === b.subtitle) return 0;
  if (a.subtitle === null) return -1;
  if (b.subtitle === null) return 1;
  return compareValues(a.subtitle, b.subtitle);
}

function representative(card: Card): Printing {
  return card.printings.reduce((best, printing) => (comparePrintings(printing, best) < 0 ? printing : best));
}

function compareStat(a: number | null, b: number | null, direction: SortDirection): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function comparePrimary(key: SortKey, a: Card, b: Card, direction: SortDirection): number {
  const sign = direction === "asc" ? 1 : -1;
  switch (key) {
    case "set":
      return sign * comparePrintings(representative(a), representative(b));
    case "collector_number":
      return sign * compareCollectorOrder(representative(a), representative(b));
    case "name":
      return sign * compareNames(a, b);
    case "rarity":
      return sign * (RARITY_RANK[representative(a).rarity] - RARITY_RANK[representative(b).rarity]);
    case "cost":
      return compareStat(a.energyCost, b.energyCost, direction);
    case "might":
      return compareStat(a.might, b.might, direction);
    case "power":
      return compareStat(a.powerCost, b.powerCost, direction);
  }
}

export function sortCards(cards: readonly Card[], key: SortKey, direction: SortDirection): Card[] {
  return cards.toSorted(
    (a, b) => comparePrimary(key, a, b, direction) || compareNames(a, b) || compareValues(a.id, b.id),
  );
}
