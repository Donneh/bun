import type { Card, Printing } from "@riftkeeper/cards";
import type { PricedCard, PricedPrinting } from "@riftkeeper/cards/prices";
import type { CardSummary, CollectionValue, ImportPreview } from "@riftkeeper/ui";
import { cardHref } from "./card-detail.ts";
import { responsiveImage } from "./card-images.ts";
import { type Collection, entryFor, type ImportMode, importChanges } from "./collection.ts";

export interface CardOwnership {
  readonly code: string;
  readonly owned: number;
  readonly wishlisted: boolean;
  readonly copiesOfCard: number;
  readonly ownedPrintings: number;
  readonly printingCount: number;
}

export function cardOwnership(collection: Collection, card: Card, selected: Printing): CardOwnership {
  const owned = card.printings.map((printing) => entryFor(collection, printing.publicCode).owned);
  const entry = entryFor(collection, selected.publicCode);
  return {
    code: selected.publicCode,
    owned: entry.owned,
    wishlisted: entry.wishlist,
    copiesOfCard: owned.reduce((sum, count) => sum + count, 0),
    ownedPrintings: owned.filter((count) => count > 0).length,
    printingCount: card.printings.length,
  };
}

interface CataloguePrinting {
  readonly card: PricedCard;
  readonly printing: PricedPrinting;
}

interface OwnedPrinting {
  readonly entry: CataloguePrinting;
  readonly count: number;
}

export interface CollectionView {
  readonly owned: readonly CardSummary[];
  readonly wishlist: readonly CardSummary[];
  readonly unknown: number;
  readonly value: CollectionValue | null;
}

const IMPORT_MODES: readonly ImportMode[] = ["merge", "replace"];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function tile({ card, printing }: CataloguePrinting, count?: number): CardSummary {
  return {
    id: printing.publicCode,
    name: card.name,
    subtitle: card.subtitle,
    imageUrl: printing.imageUrl,
    orientation: printing.orientation,
    href: `${cardHref(card.id)}?printing=${encodeURIComponent(printing.id)}`,
    ...responsiveImage(printing.imageUrl, printing.orientation),
    ...(count === undefined ? {} : { count }),
  };
}

function unitPrice(printing: PricedPrinting): number | null {
  return printing.prices?.normal?.market ?? printing.prices?.foil?.market ?? null;
}

function collectionValue(owned: readonly OwnedPrinting[]): CollectionValue | null {
  const origin = owned.find(({ entry }) => unitPrice(entry.printing) !== null)?.entry.printing.prices;
  if (!origin) return null;
  const amount = owned.reduce((sum, { entry, count }) => sum + (unitPrice(entry.printing) ?? 0) * count, 0);
  return {
    amount: usd.format(amount),
    source: `${origin.source} market prices, ${day.format(new Date(origin.updatedAt))}`,
  };
}

export function collectionView(collection: Collection, catalogue: readonly PricedCard[]): CollectionView {
  const byCode = new Map(
    catalogue.flatMap((card) => card.printings.map((printing) => [printing.publicCode, { card, printing }] as const)),
  );
  const inCatalogueOrder = [...byCode.entries()].filter(([code]) => collection.printings[code] !== undefined);
  const owned = inCatalogueOrder.flatMap(([code, entry]) => {
    const count = entryFor(collection, code).owned;
    return count > 0 ? [{ entry, count }] : [];
  });
  return {
    owned: owned.map(({ entry, count }) => tile(entry, count)),
    wishlist: inCatalogueOrder.filter(([code]) => entryFor(collection, code).wishlist).map(([, entry]) => tile(entry)),
    unknown: Object.keys(collection.printings).filter((code) => !byCode.has(code)).length,
    value: collectionValue(owned),
  };
}

export function importPreview(fileName: string, current: Collection, incoming: Collection): ImportPreview {
  return {
    fileName,
    printings: Object.keys(incoming.printings).length,
    options: IMPORT_MODES.map((mode) => ({ mode, ...importChanges(current, incoming, mode) })),
  };
}
