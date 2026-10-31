import { PRICE_CURRENCY, PRICE_SOURCE, type PriceSnapshot, PriceSnapshotSchema } from "@riftkeeper/cards/prices";
import { compareStrings } from "./compare-strings.ts";
import type { PriceMatch } from "./match-prices.ts";

export const MAX_LOST_PRICED_PRINTINGS_RATIO = 0.05;
const MAX_LISTED_ITEMS = 100;

export type PriceUpdate =
  | { readonly kind: "updated" | "unchanged"; readonly snapshot: PriceSnapshot; readonly match: PriceMatch }
  | {
      readonly kind: "rejected";
      readonly message: string;
      readonly match: PriceMatch;
      readonly kept: PriceSnapshot | null;
    }
  | { readonly kind: "failed"; readonly message: string; readonly kept: PriceSnapshot | null };

export function serializePriceSnapshot(snapshot: PriceSnapshot): string {
  const printings = Object.entries(snapshot.printings)
    .toSorted(([a], [b]) => compareStrings(a, b))
    .map(([id, { normal, foil }]) => `    ${JSON.stringify(id)}: ${JSON.stringify({ normal, foil })}`);
  return [
    "{",
    `  "currency": ${JSON.stringify(snapshot.currency)},`,
    `  "source": ${JSON.stringify(snapshot.source)},`,
    `  "updatedAt": ${JSON.stringify(snapshot.updatedAt)},`,
    `  "printings": {${printings.length === 0 ? "}" : `\n${printings.join(",\n")}\n  }`}`,
    "}",
    "",
  ].join("\n");
}

function toSnapshot({ match, updatedAt }: { match: PriceMatch; updatedAt: string }): PriceSnapshot {
  return PriceSnapshotSchema.parse({
    currency: PRICE_CURRENCY,
    source: PRICE_SOURCE,
    updatedAt,
    printings: Object.fromEntries(match.printings),
  });
}

function lostPricesMessage({ previous, match }: { previous: PriceSnapshot | null; match: PriceMatch }) {
  if (match.printings.size === 0) return "TCGCSV priced none of our printings.";
  if (previous === null) return undefined;
  const lostBySet = new Map<string, { previous: number; lost: number }>();
  for (const id of Object.keys(previous.printings)) {
    const setCode = match.setCodeByPrinting.get(id);
    if (setCode === undefined) continue;
    const counts = lostBySet.get(setCode) ?? { previous: 0, lost: 0 };
    counts.previous += 1;
    if (!match.printings.has(id)) counts.lost += 1;
    lostBySet.set(setCode, counts);
  }
  const problems = [...lostBySet]
    .filter(([, counts]) => counts.lost / counts.previous > MAX_LOST_PRICED_PRINTINGS_RATIO)
    .map(([setCode, counts]) => `${setCode} lost ${counts.lost} of ${counts.previous} prices`);
  if (problems.length === 0) return undefined;
  return `${problems.join(", ")}, above the ${MAX_LOST_PRICED_PRINTINGS_RATIO * 100}% limit per set.`;
}

export function decidePriceUpdate({
  previous,
  match,
  updatedAt,
}: {
  previous: PriceSnapshot | null;
  match: PriceMatch;
  updatedAt: string;
}): PriceUpdate {
  const message = lostPricesMessage({ previous, match });
  if (message !== undefined) return { kind: "rejected", message, match, kept: previous };
  const snapshot = toSnapshot({ match, updatedAt });
  const unchanged = previous !== null && serializePriceSnapshot(previous) === serializePriceSnapshot(snapshot);
  return { kind: unchanged ? "unchanged" : "updated", snapshot, match };
}

function formatDate(isoTimestamp: string): string {
  return isoTimestamp.replace("T", " ").replace(/:\d{2}\.\d{3}Z$/, " UTC");
}

function list<T>(heading: string, items: readonly T[], render: (item: T) => string): string[] {
  if (items.length === 0) return [];
  const shown = items.slice(0, MAX_LISTED_ITEMS).map((item) => `- ${render(item)}`);
  const more = items.length > MAX_LISTED_ITEMS ? [`- and ${items.length - MAX_LISTED_ITEMS} more`] : [];
  return [`### ${heading} (${items.length})`, "", ...shown, ...more, ""];
}

function renderMatch(match: PriceMatch): string[] {
  return [
    ...list("Printings without a price", match.unpricedPrintings, (p) => `\`${p.publicCode}\` ${p.cardName}`),
    ...list(
      "TCGplayer products without a printing",
      match.unmatchedProducts,
      (p) =>
        `\`${p.publicCode}\` ${p.name} (product ${p.productId}${p.reason === "shared-number" ? ", number shared with another product" : ""})`,
    ),
  ];
}

function keptLine(kept: PriceSnapshot | null): string {
  return kept === null
    ? "There are no earlier prices to keep."
    : `Kept the prices from ${formatDate(kept.updatedAt)} (${Object.keys(kept.printings).length} printings).`;
}

export function describePriceUpdate(update: PriceUpdate): string {
  switch (update.kind) {
    case "failed":
      return `Prices failed: ${update.message.split("\n")[0]}`;
    case "rejected":
      return `Prices rejected: ${update.message}`;
    case "updated":
    case "unchanged": {
      const priced = Object.keys(update.snapshot.printings).length;
      return `Prices ${update.kind}: ${priced} of ${update.match.setCodeByPrinting.size} printings priced, TCGCSV built ${formatDate(update.snapshot.updatedAt)}`;
    }
    default: {
      const _exhaustive: never = update;
      return _exhaustive;
    }
  }
}

export function renderPriceSummary(update: PriceUpdate): string {
  const heading = [`## ${describePriceUpdate(update)}`, ""];
  switch (update.kind) {
    case "failed":
      return [...heading, keptLine(update.kept), "", "```", update.message, "```", ""].join("\n");
    case "rejected":
      return [...heading, keptLine(update.kept), "", ...renderMatch(update.match)].join("\n");
    case "updated":
    case "unchanged":
      return [...heading, ...renderMatch(update.match)].join("\n");
    default: {
      const _exhaustive: never = update;
      return _exhaustive;
    }
  }
}
