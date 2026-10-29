import { isDeepStrictEqual } from "node:util";
import { type Card, type CardId, CardSchema, type Printing, type PrintingId, PrintingSchema } from "@riftkeeper/cards";

export type FieldChange<T> = {
  readonly field: keyof T & string;
  readonly previous: T[keyof T];
  readonly next: T[keyof T];
};

type CardFields = Omit<Card, "printings">;
export type CardFieldChange = FieldChange<CardFields>;
export type PrintingFieldChange = FieldChange<Printing>;

type Changes<Item, Changed> = {
  readonly added: readonly Item[];
  readonly removed: readonly Item[];
  readonly changed: readonly Changed[];
};

export type ChangedPrinting = {
  readonly id: PrintingId;
  readonly publicCode: string;
  readonly changes: readonly PrintingFieldChange[];
};

export type PrintingChanges = Changes<Printing, ChangedPrinting>;

export type ChangedCard = {
  readonly id: CardId;
  readonly name: string;
  readonly changes: readonly CardFieldChange[];
  readonly printings: PrintingChanges;
};

export type CardChangeSet = Changes<Card, ChangedCard>;

const CARD_FIELDS = CardSchema.keyof().exclude(["id", "printings"]).options;
const PRINTING_FIELDS = PrintingSchema.keyof().exclude(["id"]).options;

function diffFields<T>({
  previous,
  next,
  fields,
}: {
  previous: T;
  next: T;
  fields: readonly (keyof T & string)[];
}): FieldChange<T>[] {
  return fields
    .filter((field) => !isDeepStrictEqual(previous[field], next[field]))
    .map((field) => ({ field, previous: previous[field], next: next[field] }));
}

function compareById(left: { id: string }, right: { id: string }): number {
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function diffById<Item extends { id: string }, Changed extends { id: string }>({
  previous,
  next,
  diffItem,
}: {
  previous: readonly Item[];
  next: readonly Item[];
  diffItem: (pair: { previous: Item; next: Item }) => Changed | null;
}): Changes<Item, Changed> {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  return {
    added: next.filter((item) => !previousById.has(item.id)).sort(compareById),
    removed: previous.filter((item) => !nextIds.has(item.id)).sort(compareById),
    changed: next
      .flatMap((item) => {
        const before = previousById.get(item.id);
        const change = before && diffItem({ previous: before, next: item });
        return change ? [change] : [];
      })
      .sort(compareById),
  };
}

export function isEmptyChangeSet(changes: Changes<unknown, unknown>): boolean {
  return changes.added.length + changes.removed.length + changes.changed.length === 0;
}

function diffPrinting({ previous, next }: { previous: Printing; next: Printing }): ChangedPrinting | null {
  const changes = diffFields({ previous, next, fields: PRINTING_FIELDS });
  return changes.length === 0 ? null : { id: next.id, publicCode: next.publicCode, changes };
}

function diffCard({ previous, next }: { previous: Card; next: Card }): ChangedCard | null {
  const changes = diffFields<CardFields>({ previous, next, fields: CARD_FIELDS });
  const printings = diffById({ previous: previous.printings, next: next.printings, diffItem: diffPrinting });
  return changes.length === 0 && isEmptyChangeSet(printings)
    ? null
    : { id: next.id, name: next.name, changes, printings };
}

export function diffCards({ previous, next }: { previous: readonly Card[]; next: readonly Card[] }): CardChangeSet {
  return diffById({ previous, next, diffItem: diffCard });
}
