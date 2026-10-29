import type { Card } from "@riftkeeper/cards";
import { matchesNode } from "./match.ts";
import { PAGE_SIZE, type SearchPage, type SearchRequest } from "./search.ts";
import { sortCards } from "./sort.ts";

function reduceToMatchingPrintings(card: Card, request: SearchRequest): Card | null {
  const { root } = request;
  if (root === null) return card;
  const printings = card.printings.filter((printing) => matchesNode(root, card, printing));
  return printings.length === 0 ? null : { ...card, printings };
}

export function searchCards(cards: readonly Card[], request: SearchRequest): SearchPage {
  const matched = cards.flatMap((card) => reduceToMatchingPrintings(card, request) ?? []);
  const sorted = sortCards(matched, request.sort, request.direction);
  const page = Math.max(1, request.page);
  const start = (page - 1) * PAGE_SIZE;
  return { cards: sorted.slice(start, start + PAGE_SIZE), page, pageSize: PAGE_SIZE, total: sorted.length };
}
