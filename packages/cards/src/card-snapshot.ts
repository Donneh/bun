import { z } from "zod";
import { type Card, CardSchema } from "./card.ts";

export const REBUILD_COMMAND = "bun run scrape --rebuild";

export const CardSnapshotSchema = z
  .array(CardSchema)
  .refine((cards) => new Set(cards.map((card) => card.id)).size === cards.length, "Card ids must be unique");

export function parseCardSnapshot({ json, path }: { json: unknown; path: string }): Card[] {
  const parsed = CardSnapshotSchema.safeParse(json);
  if (parsed.success) return parsed.data;
  const [first] = parsed.error.issues;
  const where = first === undefined ? "" : `, first issue at ${first.path.join(".") || "root"}: ${first.message}`;
  throw new Error(
    `Card snapshot ${path} does not match the card schema (${parsed.error.issues.length} issues${where}). ` +
      `If the schema changed, run \`${REBUILD_COMMAND}\`.`,
  );
}
