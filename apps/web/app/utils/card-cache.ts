import type { Card } from "@riftkeeper/cards";

const cardsById = new Map<string, Card>();

export function rememberCards(cards: readonly Card[]) {
  for (const card of cards) cardsById.set(card.id, card);
}

export function rememberedCard(id: string): Card | undefined {
  return cardsById.get(id);
}
