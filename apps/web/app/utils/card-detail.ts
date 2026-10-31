import type { Card, Domain, Printing, Variant } from "@riftkeeper/cards";
import type { CardFact, GlyphName, GlyphTextPart, PrintingSummary } from "@riftkeeper/ui";
import { isGlyphName } from "@riftkeeper/ui/glyph";

const VARIANT_LABELS: Record<Variant, string> = {
  standard: "Standard",
  "alt-art": "Alt art",
  signed: "Signed",
  special: "Special",
  token: "Token",
  rune: "Rune",
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

const joined = (values: readonly (string | null)[]) =>
  values.filter((value): value is string => Boolean(value)).join(" · ");

export function cardHref(id: string): string {
  return `/cards/${encodeURIComponent(id)}`;
}

const text = (value: string): GlyphTextPart => ({ kind: "text", text: value });

const decorated = (name: GlyphName, value: string): GlyphTextPart[] => [
  { kind: "glyph", name, decorative: true },
  text(value),
];

const SEPARATOR = text(" · ");

const interleave = (groups: readonly (readonly GlyphTextPart[])[]): GlyphTextPart[] =>
  groups.flatMap((group, index) => (index === 0 ? group : [SEPARATOR, ...group]));

export function domainGlyph(domain: Domain): GlyphName {
  return domain === "colorless" ? "colorless" : `rune_${domain}`;
}

function energyParts(energy: number): GlyphTextPart[] {
  const name = `energy_${energy}`;
  return isGlyphName(name) ? [{ kind: "glyph", name }] : [text(`${energy} energy`)];
}

function powerParts(power: number, domains: readonly Domain[]): GlyphTextPart[] {
  const [domain] = domains;
  if (domains.length !== 1 || domain === undefined || domain === "colorless") return [text(`${power} power`)];
  return [text(`${power} `), { kind: "glyph", name: domainGlyph(domain), label: `${capitalize(domain)} power` }];
}

function typeFact(card: Card): GlyphTextPart[] {
  const words = joined([card.type, card.supertype].map((word) => word && capitalize(word)));
  if (!words) return [];
  return card.type === null ? [text(words)] : decorated(`card_type_${card.type}`, words);
}

function costFact(card: Card): GlyphTextPart[] {
  return interleave([
    ...(card.energyCost === null ? [] : [energyParts(card.energyCost)]),
    ...(card.powerCost === null ? [] : [powerParts(card.powerCost, card.domains)]),
  ]);
}

export function cardFacts(card: Card): CardFact[] {
  const facts = [
    { label: "Type", value: typeFact(card) },
    {
      label: card.domains.length === 1 ? "Domain" : "Domains",
      value: interleave(card.domains.map((domain) => decorated(domainGlyph(domain), capitalize(domain)))),
    },
    { label: "Cost", value: costFact(card) },
    { label: "Might", value: card.might === null ? [] : decorated("might", String(card.might)) },
    { label: "Might bonus", value: card.mightBonus === null ? [] : decorated("might", `+${card.mightBonus}`) },
    { label: "Tags", value: card.tags.length === 0 ? [] : [text(joined(card.tags))] },
  ];
  const rules: CardFact[] = [
    ...(card.ability ? [{ label: "Ability", rulesText: card.ability }] : []),
    ...(card.effect ? [{ label: "Effect", rulesText: card.effect }] : []),
  ];
  return [...facts.filter((fact) => fact.value.length > 0), ...rules];
}

export function printingSummaries(card: Card): PrintingSummary[] {
  return card.printings.map((printing) => ({
    id: printing.id,
    setName: printing.set.name,
    code: printing.publicCode,
    details: [VARIANT_LABELS[printing.variant], capitalize(printing.rarity), printing.artist].filter(
      (detail): detail is string => detail !== null,
    ),
  }));
}

export function selectedPrinting(card: Card, requested: unknown): Printing {
  const [first] = card.printings;
  const match = card.printings.find((printing) => printing.id === requested);
  return match ?? (first as Printing);
}
