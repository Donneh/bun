import { z } from "zod";
import { CardIdSchema } from "./card.ts";

export const FormatSchema = z.enum(["standard", "2v2"]);
export type Format = z.infer<typeof FormatSchema>;

export const RulesSourceSchema = z.object({
  url: z.url(),
  title: z.string().min(1),
  publishedAt: z.iso.date(),
});
export type RulesSource = z.infer<typeof RulesSourceSchema>;

export const BanSchema = z.object({
  card: CardIdSchema,
  format: FormatSchema,
  effective: z.iso.date(),
  source: z.url(),
});
export type Ban = z.infer<typeof BanSchema>;

export const ErrataSchema = z.object({
  card: CardIdSchema,
  previous: z.string().min(1),
  current: z.string().min(1),
  source: z.url(),
});
export type Errata = z.infer<typeof ErrataSchema>;

export const RulingSchema = z.object({
  cards: z.array(CardIdSchema),
  question: z.string().min(1),
  answer: z.string().min(1),
  source: z.url(),
});
export type Ruling = z.infer<typeof RulingSchema>;

export const RulesSnapshotSchema = z
  .object({
    sources: z.array(RulesSourceSchema),
    bans: z.array(BanSchema),
    errata: z.array(ErrataSchema),
    rulings: z.array(RulingSchema),
  })
  .superRefine((snapshot, context) => {
    const urls = new Set(snapshot.sources.map((source) => source.url));
    for (const key of ["bans", "errata", "rulings"] as const)
      snapshot[key].forEach((entry, index) => {
        if (!urls.has(entry.source))
          context.addIssue({
            code: "custom",
            message: "Source is not listed in sources",
            path: [key, index, "source"],
          });
      });
  });
export type RulesSnapshot = z.infer<typeof RulesSnapshotSchema>;

export function parseRulesSnapshot({ json, path }: { json: unknown; path: string }): RulesSnapshot {
  const parsed = RulesSnapshotSchema.safeParse(json);
  if (parsed.success) return parsed.data;
  throw new Error(`Rules snapshot ${path} does not match the rules schema: ${z.prettifyError(parsed.error)}`);
}
