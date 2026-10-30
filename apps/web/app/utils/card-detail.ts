import type { Card, Printing, Variant } from "@riftkeeper/cards";
import type { CardFact, PrintingSummary } from "@riftkeeper/ui";

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

export function cardFacts(card: Card): CardFact[] {
  const facts: (CardFact | null)[] = [
    { label: "Type", value: joined([card.type, card.supertype].map((word) => word && capitalize(word))) },
    { label: card.domains.length === 1 ? "Domain" : "Domains", value: joined(card.domains.map(capitalize)) },
    {
      label: "Cost",
      value: joined([
        card.energyCost === null ? null : `${card.energyCost} energy`,
        card.powerCost === null ? null : `${card.powerCost} power`,
      ]),
    },
    { label: "Might", value: card.might === null ? "" : String(card.might) },
    { label: "Might bonus", value: card.mightBonus === null ? "" : `+${card.mightBonus}` },
    { label: "Tags", value: joined(card.tags) },
    card.ability ? { label: "Ability", value: card.ability, rulesText: true } : null,
    card.effect ? { label: "Effect", value: card.effect, rulesText: true } : null,
  ];
  return facts.filter((fact): fact is CardFact => fact !== null && fact.value !== "");
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
