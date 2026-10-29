import { isDeepStrictEqual } from "node:util";
import {
  type Card,
  DomainSchema,
  GAMEPLAY_FIELDS,
  type Gameplay,
  type GameplayField,
  type Printing,
} from "@riftkeeper/cards";
import { cardIdFor } from "./card-identity.ts";
import { compareStrings } from "./compare-strings.ts";
import { printingVariant } from "./printing-variant.ts";
import { richTextToPlainText } from "./rich-text.ts";
import type { RawPrinting } from "./riot-gallery.schema.ts";
import type { ScrapeWarning } from "./scrape-warning.ts";

export interface BuildCardsResult {
  cards: Card[];
  warnings: ScrapeWarning[];
}

const REMINDER_TEXT = /\([^()]*\)/g;
const DOMAIN_ORDER = DomainSchema.options;

function textOrNull(body: string | undefined): string | null {
  const text = body === undefined ? "" : richTextToPlainText(body);
  return text === "" ? null : text;
}

function gameplayFacts(raw: RawPrinting): Gameplay {
  return {
    type: raw.cardType.type[0]?.id ?? null,
    supertype: raw.cardType.superType?.[0]?.id ?? null,
    domains: raw.domain.values
      .map((domain) => domain.id)
      .sort((a, b) => DOMAIN_ORDER.indexOf(a) - DOMAIN_ORDER.indexOf(b)),
    energyCost: raw.energy?.value.id ?? null,
    powerCost: raw.power?.value.id ?? null,
    might: raw.might?.value.id ?? null,
    mightBonus: raw.mightBonus?.value.id ?? null,
    ability: textOrNull(raw.text?.richText.body),
    effect: textOrNull(raw.effect?.richText.body),
    tags: [...new Set(raw.tags?.tags ?? [])].sort(compareStrings),
  };
}

function withoutReminderText(text: string | null): string {
  return (text ?? "").replace(REMINDER_TEXT, "").replace(/\s+/g, " ").trim();
}

function fieldDiffers({
  canonical,
  other,
  field,
}: {
  canonical: Gameplay;
  other: Gameplay;
  field: GameplayField;
}): boolean {
  switch (field) {
    case "ability":
    case "effect":
      return withoutReminderText(canonical[field]) !== withoutReminderText(other[field]);
    case "tags":
      return other.tags.some((tag) => !canonical.tags.includes(tag));
    default:
      return !isDeepStrictEqual(canonical[field], other[field]);
  }
}

export function differingFields({ canonical, other }: { canonical: Gameplay; other: Gameplay }): GameplayField[] {
  return GAMEPLAY_FIELDS.filter((field) => fieldDiffers({ canonical, other, field }));
}

function compareCanonicalFirst(a: RawPrinting, b: RawPrinting): number {
  const standardRank = (raw: RawPrinting) => (printingVariant(raw.id) === "standard" ? 0 : 1);
  return standardRank(a) - standardRank(b) || a.collectorNumber - b.collectorNumber || compareStrings(a.id, b.id);
}

function stripQuery(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function buildPrinting(raw: RawPrinting): Printing {
  return {
    id: raw.id,
    publicCode: raw.publicCode,
    set: { code: raw.set.value.id, name: raw.set.value.label },
    collectorNumber: raw.collectorNumber,
    variant: printingVariant(raw.id),
    rarity: raw.rarity.value.id,
    artist: raw.illustrator.values[0]?.label ?? null,
    imageUrl: stripQuery(raw.cardImage.url),
    orientation: raw.orientation,
  };
}

function groupByCard(rawPrintings: readonly RawPrinting[]): Map<string, RawPrinting[]> {
  const groups = new Map<string, RawPrinting[]>();
  const identities = new Map<string, string>();
  const seenPrintingIds = new Set<string>();
  for (const raw of rawPrintings) {
    if (seenPrintingIds.has(raw.id)) {
      throw new Error(`Duplicate printing id: ${raw.id}`);
    }
    seenPrintingIds.add(raw.id);
    const identity = { name: raw.name, subtitle: raw.subtitle };
    const cardId = cardIdFor(identity);
    const identityLabel = JSON.stringify(identity);
    const knownLabel = identities.get(cardId);
    if (knownLabel !== undefined && knownLabel !== identityLabel) {
      throw new Error(`Card id ${cardId} is produced by both ${knownLabel} and ${identityLabel}`);
    }
    identities.set(cardId, identityLabel);
    groups.set(cardId, [...(groups.get(cardId) ?? []), raw]);
  }
  return groups;
}

function typeWarnings({ cardId, facts }: { cardId: Card["id"]; facts: Gameplay }): ScrapeWarning[] {
  if (facts.type === null) {
    return [{ kind: "untyped-card", cardId }];
  }
  if (facts.type === "unit" && facts.might === null) {
    return [{ kind: "unit-without-might", cardId }];
  }
  if (facts.type === "spell" && facts.might !== null) {
    return [{ kind: "spell-with-might", cardId }];
  }
  return [];
}

function buildCard(printings: readonly RawPrinting[]): { card: Card; warnings: ScrapeWarning[] } {
  const [canonicalRaw] = [...printings].sort(compareCanonicalFirst);
  if (canonicalRaw === undefined) {
    throw new Error("Cannot build a card without printings");
  }
  const facts = gameplayFacts(canonicalRaw);
  const cardId = cardIdFor({ name: canonicalRaw.name, subtitle: canonicalRaw.subtitle });
  const sortedPrintings = [...printings].sort((a, b) => compareStrings(a.id, b.id));

  const warnings: ScrapeWarning[] = typeWarnings({ cardId, facts });
  if (facts.domains.length === 0) {
    warnings.push({ kind: "missing-domain", cardId });
  }
  for (const printing of sortedPrintings) {
    if (printing.illustrator.values.length === 0) {
      warnings.push({ kind: "missing-artist", cardId, printingId: printing.id });
    }
  }
  const conflicts = sortedPrintings
    .filter((printing) => printing !== canonicalRaw)
    .map((printing) => ({
      printing,
      fields: differingFields({ canonical: facts, other: gameplayFacts(printing) }),
    }))
    .filter(({ fields }) => fields.length > 0);
  if (conflicts.length > 0) {
    warnings.push({
      kind: "conflicting-printings",
      cardId,
      canonicalPrintingId: canonicalRaw.id,
      fields: GAMEPLAY_FIELDS.filter((field) => conflicts.some((conflict) => conflict.fields.includes(field))),
      printingIds: conflicts.map(({ printing }) => printing.id),
    });
  }

  const card: Card = {
    id: cardId,
    name: canonicalRaw.name,
    subtitle: canonicalRaw.subtitle,
    ...facts,
    printings: sortedPrintings.map(buildPrinting),
  };
  return { card, warnings };
}

export function buildCards(rawPrintings: readonly RawPrinting[]): BuildCardsResult {
  const built = [...groupByCard(rawPrintings)]
    .sort(([a], [b]) => compareStrings(a, b))
    .map(([, printings]) => buildCard(printings));
  return {
    cards: built.map(({ card }) => card),
    warnings: built.flatMap(({ warnings }) => warnings),
  };
}
