import {
  CardSetSchema,
  CardTypeSchema,
  DomainSchema,
  OrientationSchema,
  PrintingIdSchema,
  RaritySchema,
  SupertypeSchema,
} from "@riftkeeper/cards";
import { z } from "zod";

const statValue = z.object({ value: z.object({ id: z.int().nonnegative() }) });
const richText = z.object({ richText: z.object({ body: z.string() }) });

export const RawPrintingSchema = z.object({
  id: PrintingIdSchema,
  collectorNumber: z.int().nonnegative(),
  name: z.string().min(1),
  subtitle: z
    .string()
    .min(1)
    .nullish()
    .transform((subtitle) => subtitle ?? null),
  publicCode: z.string().min(1),
  set: z.object({ value: z.object({ id: CardSetSchema.shape.code, label: CardSetSchema.shape.name }) }),
  cardType: z.object({
    type: z.array(z.object({ id: CardTypeSchema })),
    superType: z.array(z.object({ id: SupertypeSchema })).optional(),
  }),
  rarity: z.object({ value: z.object({ id: RaritySchema }) }),
  domain: z.object({ values: z.array(z.object({ id: DomainSchema })) }),
  cardImage: z.object({ url: z.url() }),
  orientation: OrientationSchema,
  illustrator: z.object({ values: z.array(z.object({ label: z.string().min(1) })) }),
  text: richText.optional(),
  effect: richText.optional(),
  energy: statValue.optional(),
  power: statValue.optional(),
  might: statValue.optional(),
  mightBonus: statValue.optional(),
  tags: z.object({ tags: z.array(z.string().min(1)) }).optional(),
});
export type RawPrinting = z.infer<typeof RawPrintingSchema>;
