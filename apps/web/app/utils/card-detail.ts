import type { Card, Domain, Printing, Variant } from "@riftkeeper/cards";
import type { CardInfoContent, CardStat, GlyphName, GlyphTextPart, PrintingSummary } from "@riftkeeper/ui";
import { isGlyphName } from "@riftkeeper/ui/glyph";
import { responsiveImage } from "./card-images.ts";

const VARIANT_LABELS: Record<Variant, string> = {
  standard: "Standard",
  "alt-art": "Alt art",
  signed: "Signed",
  special: "Special",
  token: "Token",
  rune: "Rune",
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export function cardHref(id: string): string {
  return `/cards/${encodeURIComponent(id)}`;
}

export function searchHref(query: string): string {
  return `/?q=${encodeURIComponent(query)}`;
}

function quotedValue(value: string): string {
  return /[\s"\\()]/.test(value) ? `"${value.replace(/["\\]/g, "\\$&")}"` : value;
}

export function domainGlyph(domain: Domain): GlyphName {
  return domain === "colorless" ? "colorless" : `rune_${domain}`;
}

const labelled = (name: GlyphName, value: string): GlyphTextPart[] => [
  { kind: "glyph", name, decorative: true },
  { kind: "text", text: value },
];

function kicker(card: Card): GlyphTextPart[][] {
  const typeWords = [card.supertype, card.type]
    .filter((word): word is NonNullable<typeof word> => word !== null)
    .map(capitalize)
    .join(" ");
  const domains = card.domains.map((domain) => labelled(domainGlyph(domain), capitalize(domain)));
  if (!typeWords) return domains;
  return [
    ...domains,
    card.type === null ? [{ kind: "text", text: typeWords }] : labelled(`card_type_${card.type}`, typeWords),
  ];
}

function powerGlyph(domains: readonly Domain[]): GlyphName | undefined {
  const [domain] = domains;
  return domains.length === 1 && domain !== undefined && domain !== "colorless" ? domainGlyph(domain) : undefined;
}

const stat = (label: string, value: string, glyph: GlyphName | undefined, valueShown = true): CardStat =>
  glyph === undefined ? { label, value, valueShown: true } : { label, value, glyph, valueShown };

function energyStat(energy: number): CardStat {
  const glyph = `energy_${energy}`;
  return isGlyphName(glyph) ? stat("Energy", String(energy), glyph, false) : stat("Energy", String(energy), undefined);
}

function mightStat(might: number | null, bonus: number | null): CardStat | null {
  if (might !== null) return stat("Might", bonus === null ? String(might) : `${might} +${bonus}`, "might");
  return bonus === null ? null : stat("Might bonus", `+${bonus}`, "might");
}

function stats(card: Card): CardStat[] {
  return [
    card.energyCost === null ? null : energyStat(card.energyCost),
    card.powerCost === null ? null : stat("Power", String(card.powerCost), powerGlyph(card.domains)),
    mightStat(card.might, card.mightBonus),
  ].filter((entry): entry is CardStat => entry !== null);
}

export function cardInfo(card: Card, printing: Printing): CardInfoContent {
  return {
    name: card.name,
    subtitle: card.subtitle,
    kicker: kicker(card),
    stats: stats(card),
    rules: [card.ability, card.effect].filter((text): text is string => Boolean(text)),
    tags: card.tags.map((tag) => ({ label: tag, href: searchHref(`t:${quotedValue(tag)}`) })),
    artist: printing.artist,
  };
}

export function printingSummaries(card: Card): PrintingSummary[] {
  return card.printings.map((printing) => ({
    id: printing.id,
    setName: printing.set.name,
    code: printing.publicCode,
    details: [VARIANT_LABELS[printing.variant], capitalize(printing.rarity), printing.artist].filter(
      (detail): detail is string => detail !== null,
    ),
    imageUrl: printing.imageUrl,
    srcset: responsiveImage(printing.imageUrl, printing.orientation, "thumbnail").srcset,
  }));
}

export function selectedPrinting(card: Card, requested: unknown): Printing {
  const [first] = card.printings;
  const match = card.printings.find((printing) => printing.id === requested);
  return match ?? (first as Printing);
}
