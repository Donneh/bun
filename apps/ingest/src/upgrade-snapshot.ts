import { type Card, CardSchema, type Printing, PrintingSchema } from "@riftkeeper/cards";
import { z } from "zod";

export interface SchemaChange {
  added: string[];
  removed: string[];
}

const OutdatedSnapshotSchema = z.array(
  z.looseObject({ id: z.string(), printings: z.array(z.looseObject({ id: z.string() })) }),
);

const CARD_FIELDS: readonly string[] = CardSchema.keyof().options;
const PRINTING_FIELDS: readonly string[] = PrintingSchema.keyof().options;

function fieldsMissingFrom({
  expected,
  items,
  prefix,
}: {
  expected: readonly string[];
  items: object[];
  prefix: string;
}) {
  return expected.filter((field) => items.some((item) => !(field in item))).map((field) => `${prefix}${field}`);
}

function fieldsBeyond({ expected, items, prefix }: { expected: readonly string[]; items: object[]; prefix: string }) {
  const known = new Set(items.flatMap((item) => Object.keys(item)));
  return [...known].filter((field) => !expected.includes(field)).map((field) => `${prefix}${field}`);
}

type OutdatedCard = z.infer<typeof OutdatedSnapshotSchema>[number];

function describeSchemaChange(cards: OutdatedCard[]): SchemaChange {
  const printings = cards.flatMap((card) => card.printings);
  return {
    added: [
      ...fieldsMissingFrom({ expected: CARD_FIELDS, items: cards, prefix: "" }),
      ...fieldsMissingFrom({ expected: PRINTING_FIELDS, items: printings, prefix: "printings." }),
    ],
    removed: [
      ...fieldsBeyond({ expected: CARD_FIELDS, items: cards, prefix: "" }),
      ...fieldsBeyond({ expected: PRINTING_FIELDS, items: printings, prefix: "printings." }),
    ],
  };
}

export function isEmptySchemaChange(change: SchemaChange): boolean {
  return change.added.length === 0 && change.removed.length === 0;
}

export function renderSchemaChangeNote(change: SchemaChange): string {
  const fieldList = (label: string, fields: string[]) =>
    fields.length === 0 ? [] : [`- ${label}: ${fields.map((field) => `\`${field}\``).join(", ")}`];
  return [
    "### Snapshot rebuilt for a schema change",
    "",
    "The previous snapshot did not match the card schema, so missing fields were filled from this scrape.",
    "The changes below are real changes only.",
    "",
    ...fieldList("Added fields", change.added),
    ...fieldList("Removed fields", change.removed),
    "",
  ].join("\n");
}

function parseUpgraded({ candidate, id }: { candidate: unknown; id: string }): Card {
  const parsed = CardSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  const [first] = parsed.error.issues;
  throw new Error(
    `Cannot upgrade previous card ${id}: ${first?.path.join(".") ?? "card"}: ${first?.message ?? "invalid"}. ` +
      "Fix the schema change or the snapshot by hand.",
  );
}

function parseOutdated(previous: unknown): OutdatedCard[] {
  const parsed = OutdatedSnapshotSchema.safeParse(previous);
  if (!parsed.success) {
    throw new Error("Card snapshot is not an array of cards with an id and printings, so it cannot be rebuilt");
  }
  return parsed.data;
}

export function upgradeSnapshot({ previous, fresh }: { previous: unknown; fresh: readonly Card[] }): {
  cards: Card[];
  schemaChange: SchemaChange;
} {
  const freshById = new Map<string, Card>(fresh.map((card) => [card.id, card]));
  const outdated = parseOutdated(previous);
  const cards = outdated.map((old) => {
    const replacement = freshById.get(old.id);
    const freshPrintings = new Map<string, Printing>(replacement?.printings.map((printing) => [printing.id, printing]));
    return parseUpgraded({
      id: old.id,
      candidate: {
        ...replacement,
        ...old,
        printings: old.printings.map((printing) => ({ ...freshPrintings.get(printing.id), ...printing })),
      },
    });
  });
  return { cards, schemaChange: describeSchemaChange(outdated) };
}
