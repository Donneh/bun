import type { PricedCard } from "@riftkeeper/cards/prices";

const cardsById = new Map<string, PricedCard>();

export function rememberCards(cards: readonly PricedCard[]) {
  for (const card of cards) cardsById.set(card.id, card);
}

export function rememberedCard(id: string): PricedCard | undefined {
  return cardsById.get(id);
}
