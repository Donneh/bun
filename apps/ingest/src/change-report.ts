import type { Card, Printing } from "@riftkeeper/cards";
import { compareStrings } from "./compare-strings.ts";
import type { CardChangeSet, ChangedCard, FieldChange } from "./diff-cards.ts";
import { isEmptyChangeSet } from "./diff-cards.ts";
import { type Block, diffBlock, indented, inlineCode, itemSection, plural, withHeading } from "./markdown.ts";

const INLINE_VALUE_MAX_LENGTH = 60;

function describeValue(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.length === 0 ? "(empty)" : value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isLongValue(text: string | null): boolean {
  return text !== null && (text.includes("\n") || text.length > INLINE_VALUE_MAX_LENGTH);
}

function renderFieldChange<T>(change: FieldChange<T>): string[] {
  const previous = describeValue(change.previous);
  const next = describeValue(change.next);
  if (isLongValue(previous) || isLongValue(next)) {
    return [`- **${change.field}**`, ...indented({ lines: diffBlock({ previous, next }), by: 2 })];
  }
  const show = (text: string | null) => (text === null ? "`null`" : inlineCode(text));
  return [`- **${change.field}**: ${show(previous)} → ${show(next)}`];
}

function printingSummary(printing: Printing): string {
  const artist = printing.artist === null ? "" : `, art by ${printing.artist}`;
  return `**${printing.publicCode}** (${inlineCode(printing.id)}), ${printing.variant}, ${printing.rarity}${artist}`;
}

function renderChangedCard(card: ChangedCard): string {
  const { printings } = card;
  return [
    `#### ${card.name} (${inlineCode(card.id)})`,
    ...card.changes.flatMap(renderFieldChange),
    ...printings.added.map((printing) => `- Printing added: ${printingSummary(printing)}`),
    ...printings.removed.map((printing) => `- Printing removed: ${printingSummary(printing)}`),
    ...printings.changed.flatMap((printing) => [
      `- Printing **${printing.publicCode}** (${inlineCode(printing.id)}) changed`,
      ...indented({ lines: printing.changes.flatMap(renderFieldChange), by: 2 }),
    ]),
  ].join("\n");
}

function cardDisplayName(card: Card): string {
  return card.subtitle === null ? card.name : `${card.name} - ${card.subtitle}`;
}

function renderCardLine(card: Card): string {
  const stats = [
    card.type ?? "untyped",
    card.domains.join("/"),
    card.energyCost === null ? null : `energy ${card.energyCost}`,
    card.powerCost === null ? null : `power ${card.powerCost}`,
    card.might === null ? null : `might ${card.might}`,
    card.printings.map((printing) => printing.publicCode).join(", "),
  ].filter((part) => part !== null);
  return `- **${cardDisplayName(card)}** ${inlineCode(card.id)} · ${stats.join(" · ")}`;
}

function firstSet(card: Card): Printing["set"] | null {
  const [first] = [...card.printings].sort((left, right) => compareStrings(left.publicCode, right.publicCode));
  return first?.set ?? null;
}

function groupBySet(cards: readonly Card[]): { code: string; heading: string; cards: Card[] }[] {
  const groups = new Map<string, { code: string; heading: string; cards: Card[] }>();
  for (const card of cards) {
    const set = firstSet(card);
    const code = set?.code ?? "";
    const heading = set ? `${set.code}: ${set.name}` : "Unknown set";
    const group = groups.get(code) ?? { code, heading, cards: [] };
    group.cards.push(card);
    groups.set(code, group);
  }
  return [...groups.values()].sort((left, right) => compareStrings(left.code, right.code));
}

function addedCardsBlocks(cards: readonly Card[]): Block[] {
  const groups = groupBySet(cards).flatMap((group) =>
    itemSection({
      heading: `##### ${group.heading} (${group.cards.length})`,
      noun: "card",
      items: group.cards.map(renderCardLine),
    }),
  );
  return withHeading({ heading: `### Added cards (${cards.length})`, blocks: groups });
}

function removedCardsBlocks(cards: readonly Card[]): Block[] {
  return itemSection({
    heading: `### Removed cards (${cards.length})`,
    noun: "card",
    items: cards.map(renderCardLine),
  });
}

function changedCardsBlocks(cards: readonly ChangedCard[]): Block[] {
  return itemSection({
    heading: `### Changed cards (${cards.length})`,
    noun: "card",
    items: cards.map(renderChangedCard),
    separator: "\n\n",
  });
}

function summaryLine(changeSet: CardChangeSet): string {
  const cardCounts = `${plural({ count: changeSet.added.length, noun: "card" })} added, ${changeSet.removed.length} removed, ${changeSet.changed.length} changed`;
  const printingsOf = (cards: readonly Card[]) => cards.reduce((total, card) => total + card.printings.length, 0);
  const sum = (pick: (card: ChangedCard) => number) => changeSet.changed.reduce((total, card) => total + pick(card), 0);
  const added = printingsOf(changeSet.added) + sum((card) => card.printings.added.length);
  const removed = printingsOf(changeSet.removed) + sum((card) => card.printings.removed.length);
  const changed = sum((card) => card.printings.changed.length);
  return `**${cardCounts}.** Printings: ${added} added, ${removed} removed, ${changed} changed.`;
}

export function changeReportBlocks(changeSet: CardChangeSet): Block[] {
  if (isEmptyChangeSet(changeSet)) return ["No changes to the card snapshot."];
  return [
    summaryLine(changeSet),
    ...addedCardsBlocks(changeSet.added),
    ...removedCardsBlocks(changeSet.removed),
    ...changedCardsBlocks(changeSet.changed),
  ];
}
