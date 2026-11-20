import type { Card, CardId, CardType } from "@riftkeeper/cards";

export type NameMatch =
  | { readonly kind: "found"; readonly id: CardId }
  | { readonly kind: "missing" }
  | { readonly kind: "ambiguous"; readonly ids: readonly CardId[] };

export type CardNames = {
  readonly resolve: (name: string, type?: CardType | null) => NameMatch;
  readonly mentions: (text: string) => CardId[];
};

export function straightQuotes(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

export function nameKey(name: string): string {
  return straightQuotes(name)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "");
}

function namesOf(card: Card): string[] {
  const own = [card.name, card.subtitle === null ? null : `${card.name} ${card.subtitle}`];
  const titled =
    card.type === "legend"
      ? card.tags.flatMap((tag) => [
          `${tag} ${card.name}`,
          card.subtitle === null ? null : `${tag} ${card.name} ${card.subtitle}`,
        ])
      : [];
  return [...own, ...titled].filter((name): name is string => name !== null);
}

function mentionedNames(card: Card): string[] {
  if (card.type === "rune") return [];
  const full = card.subtitle === null ? card.name : `${card.name}, ${card.subtitle}`;
  const titled = card.type === "legend" ? card.tags.map((tag) => `${tag}, ${card.name}`) : [];
  return [full, ...titled].map(straightQuotes);
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function cardNames({
  cards,
  aliases,
}: {
  cards: readonly Card[];
  aliases: Readonly<Record<string, CardId>>;
}): CardNames {
  const byKey = new Map<string, Card[]>();
  for (const card of cards)
    for (const key of new Set(namesOf(card).map(nameKey))) byKey.set(key, [...(byKey.get(key) ?? []), card]);
  const aliasByKey = new Map(Object.entries(aliases).map(([name, id]) => [nameKey(name), id]));

  const idByMention = new Map<string, CardId>();
  for (const card of cards)
    for (const name of mentionedNames(card)) if (!idByMention.has(name)) idByMention.set(name, card.id);
  const mention = new RegExp(
    `(?<![\\p{L}\\p{N}])(${[...idByMention.keys()]
      .sort((left, right) => right.length - left.length)
      .map(escapeRegExp)
      .join("|")})(?![\\p{L}\\p{N}])`,
    "gu",
  );

  return {
    resolve(name, type = null) {
      const key = nameKey(name);
      const alias = aliasByKey.get(key);
      if (alias !== undefined) return { kind: "found", id: alias };
      const all = byKey.get(key) ?? [];
      const typed = type === null ? all : all.filter((card) => card.type === type);
      const [only, ...rest] = typed;
      if (only === undefined) return { kind: "missing" };
      if (rest.length > 0) return { kind: "ambiguous", ids: [only, ...rest].map((card) => card.id) };
      return { kind: "found", id: only.id };
    },
    mentions(text) {
      const ids = [...straightQuotes(text).matchAll(mention)].flatMap((match) => idByMention.get(match[1] ?? "") ?? []);
      return [...new Set(ids)];
    },
  };
}
